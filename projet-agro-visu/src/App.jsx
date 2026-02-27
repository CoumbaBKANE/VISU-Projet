import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import FranceMap from './components/FranceMap';
import RegionDetail from './components/RegionDetail';
import './App.css';
import { DATA_PATHS } from './config';

function App() {
  const [data, setData] = useState([]);
  const [tendances, setTendances] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      d3.csv(DATA_PATHS.dataFinal, d3.autoType),
      d3.csv(d3.csv(DATA_PATHS.tendances, d3.autoType))
    ]).then(([dataFinal, dataTendances]) => {
       console.log('Données chargées:', {
        dataFinal: dataFinal.length,
        dataTendances: dataTendances.length
      });
      console.log('Aperçu tendances:', dataTendances);
      console.log('Aperçu data:', dataFinal.slice(0, 3));

      setData(dataFinal);
      setTendances(dataTendances);
      setLoading(false);
    }).catch(err => {
      console.error('Erreur chargement données:', err);
      setError(`Erreur: ${err.message}`);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading">Chargement des données...</div>;

  if (error) {
    return (
      <div className="loading">
        <p style={{ color: 'red' }}>{error}</p>
        <p>Vérifiez que les fichiers sont dans public/data/</p>
      </div>
    );
  }
  if (data.length === 0 || tendances.length === 0) {
    return (
      <div className="loading">
        <p>Aucune donnée chargée. Vérifiez:</p>
        <ul>
          <li>Les fichiers sont dans public/data/</li>
          <li>data_final_avec_anomalies.csv existe</li>
          <li>tendances_climatiques_regionales.csv existe</li>
        </ul>
        <p>Data: {data.length} lignes</p>
        <p>Tendances: {tendances.length} lignes</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Changement climatique et Agriculture en France</h1>
        <p className="subtitle">
          Comment l'évolution du climat affecte-t-elle les rendements agricoles du blé, du maïs et du tournesol entre 2010 et 2019 ?
        </p>
      </header>

      <main className="app-main">
        <section className="map-section">
          <h2>
            {selectedRegion 
              ? `Région sélectionnée : ${selectedRegion}` 
              : "Cliquez sur une région pour explorer les données"}
          </h2>
          <FranceMap
            tendances={tendances}
            selectedRegion={selectedRegion}
            onRegionClick={setSelectedRegion}
          />
        </section>

        {selectedRegion && (
          <section className="detail-section">
            <RegionDetail
              data={data.filter(d => d.Région === selectedRegion)}
              region={selectedRegion}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
