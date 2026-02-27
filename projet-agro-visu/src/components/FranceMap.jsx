import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DATA_PATHS } from '../config';

function FranceMap({ tendances, selectedRegion, onRegionClick }) {
  const svgRef = useRef();
  const [geoData, setGeoData] = useState(null);

  // Charger le GeoJSON
  useEffect(() => {
    d3.json(DATA_PATHS.geojson)
        .then(data => {
            // Charger TOUTE la France, pas juste 3 régions
            setGeoData(data);
        })
        .catch(err => {
          console.error('Erreur chargement GeoJSON:', err);
          // Essayer avec le chemin alternatif
          d3.json('data/regions.geojson').catch(e => console.error('Erreur avec chemin alternatif:', e));
        });

  }, []);

  useEffect(() => {
    if (!tendances || tendances.length === 0 || !geoData) return;

    const width = 800;
    const height = 700;
    const margin = { top: 20, right: 20, bottom: 80, left: 20 };

    // Créer une projection pour la France
    const projection = d3.geoMercator()
      .center([2.5, 46.5])  // Centre de la France
      .scale(2500)
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Échelle de couleur
    const maxRechauffement = d3.max(tendances, d => Math.abs(d.Réchauffement_total_période));
    
    const colorScale = d3.scaleSequential()
      .domain([0, maxRechauffement])
      .interpolator(d3.interpolateYlOrRd);

    // Créer un map pour associer nom région → données tendances
    const tendancesMap = new Map(
      tendances.map(d => [d.Région, d])
    );

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    // Fond
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#e8f4f8");

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "map-tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "12px")
      .style("z-index", 1000);

    // Dessiner les régions
    svg.selectAll("path")
      .data(geoData.features)
      .join("path")
        .attr("d", pathGenerator)
        .attr("fill", d => {
          const regionData = tendancesMap.get(d.properties.nom);
          return regionData 
            ? colorScale(regionData.Réchauffement_total_période)
            : "#ccc";
        })
        .attr("stroke", d => {
          const isSelected = selectedRegion === d.properties.nom;
          return isSelected ? "#1a1a2e" : "#ffffff";
        })
        .attr("stroke-width", d => {
          const isSelected = selectedRegion === d.properties.nom;
          return isSelected ? 3 : 1.5;
        })
        .attr("opacity", d => {
          const isSelected = selectedRegion === d.properties.nom;
          return isSelected ? 1 : 0.85;
        })
        .style("cursor", "pointer")
        .on("click", function(event, d) {
          // Permettre les clics sur TOUTES les régions, même sans données
          onRegionClick(d.properties.nom);
        })
        .on("mouseover", function(event, d) {
          const regionData = tendancesMap.get(d.properties.nom);
          const isSelected = selectedRegion === d.properties.nom;
          if (!isSelected) {
            d3.select(this).attr("opacity", 1);
          }

          // Afficher tooltip si données disponibles
          if (regionData) {
            tooltip
              .style("opacity", 1)
              .html(`
                <strong>${d.properties.nom}</strong><br/>
                Réchauffement: +${(regionData.Réchauffement_total_période ?? 0).toFixed(2)}°C<br/>
                Tendance: ${(regionData.Tendance_temp_par_an ?? 0) > 0 ? '+' : ''}${(regionData.Tendance_temp_par_an ?? 0).toFixed(3)}°C/an<br/>
                <em>Cliquer pour voir les détails</em>
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          }
        })
        .on("mouseout", function(event, d) {
          const isSelected = selectedRegion === d.properties.nom;
          if (!isSelected) {
            d3.select(this).attr("opacity", 0.85);
          }
          tooltip.style("opacity", 0);
        });

    // Labels des régions
    svg.selectAll("text.region-label")
      .data(geoData.features)
      .join("text")
        .attr("class", "region-label")
        .attr("transform", d => {
          const centroid = pathGenerator.centroid(d);
          return `translate(${centroid[0]},${centroid[1]})`;
        })
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#1a1a2e")
        .style("pointer-events", "none")
        .style("text-shadow", "1px 1px 2px white, -1px -1px 2px white")
        .text(d => d.properties.nom);

    // Valeurs de réchauffement
    svg.selectAll("text.region-value")
      .data(geoData.features)
      .join("text")
        .attr("class", "region-value")
        .attr("transform", d => {
          const centroid = pathGenerator.centroid(d);
          return `translate(${centroid[0]},${centroid[1] + 18})`;
        })
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#c0392b")
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .style("text-shadow", "1px 1px 2px white, -1px -1px 2px white")
        .text(d => {
          const regionData = tendancesMap.get(d.properties.nom);
          if (regionData && regionData.Réchauffement_total_période != null) {
            const value = regionData.Réchauffement_total_période;
            return `${value > 0 ? '+' : ''}${value.toFixed(2)}°C`;
          }
          return "";
        });

    // Légende
    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = 30;
    const legendY = height - 60;

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "heatGradient");

    gradient.selectAll("stop")
      .data([
        { offset: "0%", color: colorScale(0) },
        { offset: "100%", color: colorScale(maxRechauffement) }
      ])
      .join("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#heatGradient)")
      .style("stroke", "#333")
      .style("stroke-width", 1);

    svg.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 8)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("Réchauffement 2010-2019");

    svg.append("text")
      .attr("x", legendX)
      .attr("y", legendY + legendHeight + 15)
      .style("font-size", "11px")
      .text("0°C");

    svg.append("text")
      .attr("x", legendX + legendWidth)
      .attr("y", legendY + legendHeight + 15)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .text(`+${(maxRechauffement ?? 0).toFixed(1)}°C`);

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [geoData, tendances, selectedRegion, onRegionClick]);

  if (!geoData) {
    return <div>Chargement de la carte...</div>;
  }

  return (
    <div className="map-container">
      <svg ref={svgRef}></svg>
      <p className="map-hint">
        Couleur = intensité du réchauffement sur la période 2010-2019
      </p>
    </div>
  );
}

export default FranceMap;