// Configuration des chemins pour GitHub Pages
export const BASE_PATH = process.env.PUBLIC_URL || '';

export const DATA_PATHS = {
  dataFinal: `${BASE_PATH}/data/data_final_avec_anomalies.csv`,
  tendances: `${BASE_PATH}/data/tendances_climatiques_region.csv`,
  geojson: `${BASE_PATH}/data/regions.geojson`
};