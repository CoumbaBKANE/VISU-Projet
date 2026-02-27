import TimelineChart from './TimelineChart';
import ScatterPlot from './ScatterPlot';
import './RegionDetail.css';

function RegionDetail({ data, region }) {
  
  // Vérifier que les données existent
  if (!data || data.length === 0) {
    return <div className="region-detail"><p>Aucune donnée disponible pour cette région.</p></div>;
  }

  // Calculer quelques statistiques pour la région
  const cultures = [...new Set(data.map(d => d.Culture))];
  
  // Statistiques globales
  const stats = {
    nbAnnees: [...new Set(data.map(d => d.Année))].length,
    anomalieTempMoyenne: data.length > 0 ? (data.reduce((sum, d) => sum + (d.Anomalie_temp_C || 0), 0) / data.length).toFixed(2) : '0',
    rendementMoyen: {},
    correlations: {}
  };

  // Calculer rendement moyen et corrélation par culture
  cultures.forEach(culture => {
    const cultData = data.filter(d => d.Culture === culture);
    stats.rendementMoyen[culture] = cultData.length > 0 ? (
      cultData.reduce((sum, d) => sum + (d.Rendement_qha || 0), 0) / cultData.length
    ).toFixed(1) : '0';

    // Corrélation simplifiée (Pearson)
    const n = cultData.length;
    if (n < 2) {
      stats.correlations[culture] = 0;
      return;
    }
    
    const sumX = cultData.reduce((sum, d) => sum + (d.Anomalie_temp_C || 0), 0);
    const sumY = cultData.reduce((sum, d) => sum + (d.Anomalie_rendement_pct || 0), 0);
    const sumXY = cultData.reduce((sum, d) => sum + (d.Anomalie_temp_C || 0) * (d.Anomalie_rendement_pct || 0), 0);
    const sumX2 = cultData.reduce((sum, d) => sum + (d.Anomalie_temp_C || 0) * (d.Anomalie_temp_C || 0), 0);
    const sumY2 = cultData.reduce((sum, d) => sum + (d.Anomalie_rendement_pct || 0) * (d.Anomalie_rendement_pct || 0), 0);
    
    const denominator = (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY);
    const correlation = denominator > 0 ? (n * sumXY - sumX * sumY) / Math.sqrt(denominator) : 0;
    
    stats.correlations[culture] = isNaN(correlation) ? 0 : correlation;
  });

  return (
    <div className="region-detail">
      
      {/* En-tête avec statistiques clés */}
      {/*
      <div className="region-header">
        <h2>{region}</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Période analysée</div>
            <div className="stat-value">{stats.nbAnnees} années</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Anomalie de température</div>
            <div className="stat-value">{stats.anomalieTempMoyenne > 0 ? '+' : ''}{stats.anomalieTempMoyenne}°C</div>
          </div>
          {cultures.map(culture => (
            <div className="stat-card" key={culture}>
              <div className="stat-label">{culture}</div>
              <div className="stat-value">
                {stats.rendementMoyen[culture]} q/ha
              </div>
              <div className="stat-correlation" 
                   style={{color: (stats.correlations[culture] || 0) < -0.3 ? '#e74c3c' : '#95a5a6'}}>
                r = {(stats.correlations[culture] || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
        */}
      {/* Graphiques principaux */}
      <div className="charts-container">
        
        {/* Graphique 1 : Timeline */}
        <div className="chart-section">
          <div className="chart-header">
            <h3>Évolution des rendements et de la température</h3>
            <p className="chart-description">
              Les rendements baissent-ils les années les plus chaudes ?
            </p>
          </div>
          <div className="chart-wrapper">
            <TimelineChart data={data} region={region} />
          </div>
        
          {/*<div className="chart-insights">
            <h4>Ce qu'on observe :</h4>
            <ul>
              <li>Les années chaudes (ligne rouge en pointillés) correspondent souvent à des baisses de rendement</li>
              <li>2018-2019 montrent des anomalies de température positives avec impact sur les cultures</li>
              <li>Chaque culture réagit différemment</li>
            </ul>
          </div> */}
        </div>

        {/* Graphique 2 : Scatter Plot */}
        <div className="chart-section">
          <div className="chart-header">
            <h3>Corrélation température - rendement</h3>
            <p className="chart-description">
              Chaque point = une année. La pente de la ligne montre l'impact de la chaleur.
            </p>
          </div>
          <div className="chart-wrapper">
            <ScatterPlot data={data} region={region} />
          </div>
          <div className="chart-insights">
            <h4>Interprétation :</h4>
            <ul>
              {cultures.map(culture => {
                const r = stats.correlations[culture] || 0;
                let interpretation = "";
                if (r < -0.5) {
                  interpretation = "Forte corrélation négative : la chaleur réduit significativement les rendements";
                } else if (r < -0.3) {
                  interpretation = "Corrélation négative modérée : la chaleur tend à réduire les rendements";
                } else if (r > 0.3) {
                  interpretation = "Corrélation positive : la chaleur favorise les rendements";
                } else {
                  interpretation = "Pas de corrélation claire avec la température";
                }
                
                return (
                  <li key={culture}>
                    <strong>{culture}</strong> (r = {r.toFixed(2)}) : {interpretation}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

      </div>

     
    </div>
  );
}

export default RegionDetail;