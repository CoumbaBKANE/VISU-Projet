import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function TimelineChart({ data, region }) {
  const svgRef = useRef();
  const [climateVariable, setClimateVariable] = useState('temperature');

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = 650;
    const height = 400;
    const margin = { top: 40, right: 80, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const cultures = ["Blé", "Maïs", "Tournesol"];
    const colorScale = d3.scaleOrdinal()
      .domain(cultures)
      .range(["#e74c3c", "#f39c12", "#2ecc71"]);

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const annees = [...new Set(data.map(d => d.Année))].sort();

    // Échelle X
    const xScale = d3.scaleLinear()
      .domain(d3.extent(annees))
      .range([0, innerWidth]);

    // Échelle Y gauche : rendement anomalie (%)
    const yScaleRendement = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Anomalie_rendement_pct)).nice()
      .range([innerHeight, 0]);

    // Échelle Y droite : température anomalie (°C)
    const climateData = climateVariable === 'temperature' 
      ? data.map(d => d.Anomalie_temp_C || 0)
      : data.map(d => d.Anomalie_precip_pct || 0);

    const yScaleClimate = d3.scaleLinear()
      .domain(d3.extent(climateData)).nice()
      .range([innerHeight, 0]);

    // Configuration selon la variable climatique choisie
    const climateConfig = climateVariable === 'temperature' 
      ? {
          color: "#c0392b",
          label: "Température (écart à la normale, °C)",
          unit: "°C",
          dataKey: "Anomalie_temp_C"
        }
      : {
          color: "#3498db",
          label: "Précipitations (écart à la normale, %)",
          unit: "%",
          dataKey: "Anomalie_precip_pct"
        };  

    // Axe X
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(annees.length))
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 45)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Année");

    // Axe Y gauche
    g.append("g")
      .call(d3.axisLeft(yScaleRendement).tickFormat(d => `${d}%`))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -55)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Performance du rendement (%)");

    // Axe Y droit (température)
    // Axe Y droit (variable climatique)
    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(d3.axisRight(yScaleClimate).tickFormat(d => `${d}${climateConfig.unit}`))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", 60)
      .attr("fill", climateConfig.color)
      .attr("text-anchor", "middle")
      .text(climateConfig.label);

    // Ligne de référence 0
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScaleRendement(0))
      .attr("y2", yScaleRendement(0))
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "4");

    // Courbes de rendement par culture
    const line = d3.line()
      .x(d => xScale(d.Année))
      .y(d => yScaleRendement(d.Anomalie_rendement_pct));

    cultures.forEach(culture => {
      const cultData = data
        .filter(d => d.Culture === culture)
        .sort((a, b) => a.Année - b.Année);

      if (cultData.length === 0) return;

      g.append("path")
        .datum(cultData)
        .attr("fill", "none")
        .attr("stroke", colorScale(culture))
        .attr("stroke-width", 2)
        .attr("d", line);

      // Points
      g.selectAll(`.dot-${culture}`)
        .data(cultData)
        .join("circle")
        .attr("cx", d => xScale(d.Année))
        .attr("cy", d => yScaleRendement(d.Anomalie_rendement_pct))
        .attr("r", 4)
        .attr("fill", colorScale(culture));
    });

    // Courbe de la variable climatique (en pointillé)
    const climateDataFiltered = data
      .filter(d => d.Culture === "Blé") // une culture suffit pour le climat
      .sort((a, b) => a.Année - b.Année);
      
    const lineClimate = d3.line()
      .x(d => xScale(d.Année))
      .y(d => yScaleClimate(d[climateConfig.dataKey]));

    g.append("path")
      .datum(climateDataFiltered)
      .attr("fill", "none")
      .attr("stroke", climateConfig.color)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,3")
      .attr("d", lineClimate);

    // Légende
    const legendData = [
      ...cultures.map(c => ({ label: c, color: colorScale(c), dash: null })),
      { 
        label: climateVariable === 'temperature' ? "Température" : "Précipitations", 
        color: climateConfig.color, 
        dash: "6,3" }
    ];

    const legend = g.append("g")
      .attr("transform", `translate(0, -30)`);

    legendData.forEach((item, i) => {
      const lx = i * 120;

      legend.append("line")
        .attr("x1", lx)
        .attr("x2", lx + 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", item.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", item.dash || null);

      legend.append("text")
        .attr("x", lx + 25)
        .attr("y", 4)
        .style("font-size", "11px")
        .text(item.label);
    });

  }, [data, region, climateVariable]);

  return (
    <div className="timeline-chart-container">
      <div className="chart-controls">
        <label htmlFor="climate-select" style={{ marginRight: '10px', fontWeight: '500' }}>
          Variable :
        </label>
        <select 
          id="climate-select"
          value={climateVariable} 
          onChange={(e) => setClimateVariable(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '13px',
            cursor: 'pointer',
            backgroundColor: 'white'
          }}
        >
          <option value="temperature">Température</option>
          <option value="precipitation">Précipitations</option>
        </select>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default TimelineChart;