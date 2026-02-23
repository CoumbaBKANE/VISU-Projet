import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function ScatterPlot({ data, region }) {
  const svgRef = useRef();
  const [selectedCulture, setSelectedCulture] = useState('Toutes');

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Filtrer les données selon la culture sélectionnée
    const filteredData = selectedCulture === 'Toutes' 
      ? data 
      : data.filter(d => d.Culture === selectedCulture);

    // Dimensions
    const width = 700;
    const height = 500;
    const margin = { top: 40, right: 180, bottom: 70, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Nettoyer le SVG existant
    d3.select(svgRef.current).selectAll("*").remove();

    // Créer le SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Échelles
    const xScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.Anomalie_temp_C)).nice()
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.Anomalie_rendement_pct)).nice()
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(["Blé", "Maïs", "Tournesol"])
      .range(["#e74c3c", "#f39c12", "#2ecc71"]);

    // Grille
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat("")
      );

    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat("")
      );

    // Axes
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(8));

    xAxis.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 45)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .text("Anomalie de température (°C)");

    const yAxis = g.append("g")
      .call(d3.axisLeft(yScale).ticks(8));

    yAxis.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -50)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .text("Anomalie de rendement (%)");

    // Lignes de référence (0,0)
    g.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#95a5a6")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 1.5);

    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#95a5a6")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 1.5);

    // Fonction de régression linéaire
    function linearRegression(data, xKey, yKey) {
      const n = data.length;
      if (n < 2) return null;

      const sumX = d3.sum(data, d => d[xKey]);
      const sumY = d3.sum(data, d => d[yKey]);
      const sumXY = d3.sum(data, d => d[xKey] * d[yKey]);
      const sumX2 = d3.sum(data, d => d[xKey] * d[xKey]);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calcul R²
      const yMean = sumY / n;
      const ssTotal = d3.sum(data, d => Math.pow(d[yKey] - yMean, 2));
      const ssResidual = d3.sum(data, d => {
        const predicted = slope * d[xKey] + intercept;
        return Math.pow(d[yKey] - predicted, 2);
      });
      const r2 = 1 - (ssResidual / ssTotal);
      const r = Math.sqrt(Math.abs(r2)) * (slope < 0 ? -1 : 1);

      return { slope, intercept, r, r2 };
    }

    // Lignes de régression par culture
    const cultures = selectedCulture === 'Toutes' 
      ? ["Blé", "Maïs", "Tournesol"]
      : [selectedCulture];

    cultures.forEach(culture => {
      const cultData = filteredData.filter(d => d.Culture === culture);
      if (cultData.length < 2) return;

      const reg = linearRegression(cultData, "Anomalie_temp_C", "Anomalie_rendement_pct");
      if (!reg) return;

      const xMin = d3.min(cultData, d => d.Anomalie_temp_C);
      const xMax = d3.max(cultData, d => d.Anomalie_temp_C);

      // Ligne de régression
      g.append("line")
        .attr("x1", xScale(xMin))
        .attr("y1", yScale(reg.slope * xMin + reg.intercept))
        .attr("x2", xScale(xMax))
        .attr("y2", yScale(reg.slope * xMax + reg.intercept))
        .attr("stroke", colorScale(culture))
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.7)
        .attr("stroke-dasharray", "5,3");
    });

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "scatter-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("border", "1px solid #ddd")
      .style("border-radius", "6px")
      .style("padding", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "12px")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
      .style("z-index", 1000);

    // Points
    g.selectAll("circle")
      .data(filteredData)
      .join("circle")
        .attr("cx", d => xScale(d.Anomalie_temp_C))
        .attr("cy", d => yScale(d.Anomalie_rendement_pct))
        .attr("r", 6)
        .attr("fill", d => colorScale(d.Culture))
        .attr("opacity", 0.75)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 9)
            .attr("opacity", 1)
            .attr("stroke-width", 3);

          tooltip
            .style("opacity", 1)
            .html(`
              <div style="border-bottom: 2px solid ${colorScale(d.Culture)}; padding-bottom: 5px; margin-bottom: 8px;">
                <strong style="font-size: 13px;">${d.Culture}</strong>
              </div>
              <div style="line-height: 1.6;">
                <strong>Année:</strong> ${d.Année}<br/>
                <strong>Anomalie temp:</strong> ${(d.Anomalie_temp_C ?? 0) > 0 ? '+' : ''}${(d.Anomalie_temp_C ?? 0).toFixed(2)}°C<br/>
                <strong>Anomalie rendement:</strong> ${(d.Anomalie_rendement_pct ?? 0) > 0 ? '+' : ''}${(d.Anomalie_rendement_pct ?? 0).toFixed(1)}%<br/>
                <strong>Rendement:</strong> ${(d.Rendement_qha ?? 0).toFixed(1)} q/ha
              </div>
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 6)
            .attr("opacity", 0.75)
            .attr("stroke-width", 2);

          tooltip.style("opacity", 0);
        });

    // Légende
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth + 20}, 0)`);

    legend.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("Cultures:");

    cultures.forEach((culture, i) => {
      const cultData = filteredData.filter(d => d.Culture === culture);
      if (cultData.length < 2) return;

      const reg = linearRegression(cultData, "Anomalie_temp_C", "Anomalie_rendement_pct");
      if (!reg) return;

      const y = i * 85;

      // Cercle de couleur
      legend.append("circle")
        .attr("cx", 8)
        .attr("cy", y + 8)
        .attr("r", 6)
        .attr("fill", colorScale(culture))
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      // Nom de la culture
      legend.append("text")
        .attr("x", 20)
        .attr("y", y + 8)
        .attr("alignment-baseline", "middle")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .text(culture);

      // Statistiques
      legend.append("text")
        .attr("x", 20)
        .attr("y", y + 26)
        .style("font-size", "11px")
        .style("fill", "#666")
        .text(`Corrélation: ${reg.r.toFixed(3)}`);

      legend.append("text")
        .attr("x", 20)
        .attr("y", y + 40)
        .style("font-size", "11px")
        .style("fill", "#666")
        .text(`R² = ${reg.r2.toFixed(3)}`);

      legend.append("text")
        .attr("x", 20)
        .attr("y", y + 54)
        .style("font-size", "11px")
        .style("fill", "#666")
        .text(`n = ${cultData.length} points`);

      // Ligne de régression miniature
      legend.append("line")
        .attr("x1", 20)
        .attr("x2", 50)
        .attr("y1", y + 65)
        .attr("y2", y + 65)
        .attr("stroke", colorScale(culture))
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,3");
    });

    // Titre
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "15px")
      .style("font-weight", "bold")
      .text(`${region} - Impact de la température sur les rendements`);

    // Cleanup
    return () => {
      tooltip.remove();
    };

  }, [data, region, selectedCulture]);

  // Extraire les cultures disponibles
  const cultures = data ? [...new Set(data.map(d => d.Culture))].sort() : [];

  return (
    <div className="scatter-plot-container">
      <div className="chart-controls">
        <label htmlFor="culture-select" style={{ marginRight: '10px', fontWeight: '500' }}>
          Afficher:
        </label>
        <select 
          id="culture-select"
          value={selectedCulture} 
          onChange={(e) => setSelectedCulture(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '13px',
            cursor: 'pointer',
            backgroundColor: 'white'
          }}
        >
          <option value="Toutes">Toutes les cultures</option>
          {cultures.map(culture => (
            <option key={culture} value={culture}>{culture}</option>
          ))}
        </select>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default ScatterPlot;