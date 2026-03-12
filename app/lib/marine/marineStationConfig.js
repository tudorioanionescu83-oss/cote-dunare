export const CONSTANTA_MARINE_STATION = {
  id: "constanta_marine",
  name: "Constanta",
  kind: "marine",
  sourceType: "copernicus",
  lat: 44.17,
  lon: 28.65,
  lng: 28.65,
  displayName: "Constanta - Marea Neagra",
  bbox: {
    minLat: 43.7,
    maxLat: 45.25,
    minLon: 28.45,
    maxLon: 30.15,
  },
};

export const COPERNICUS_DATASETS = {
  physical: "BLKSEA_ANALYSISFORECAST_PHY_007_001",
  waves: "BLKSEA_ANALYSISFORECAST_WAV_007_003",
};

export const COPERNICUS_VARIABLES = {
  physical: ["thetao", "uo", "vo", "so"],
  waves: ["VHM0", "VMDR", "VTPK"],
};
