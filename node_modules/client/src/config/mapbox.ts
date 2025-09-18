
export const MAPBOX_CONFIG = {
  accessToken: 'pk.eyJ1IjoiamFzdXJzYWRpY292IiwiYSI6ImNtZjV0M2dnNDA5NjYydnF5eno4cG9hM2gifQ.kmauoI5WamyCbjOW3EOb_g', // Вставьте сюда ваш токен
  styles: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12'
  },
  defaultStyle: 'mapbox://styles/mapbox/streets-v12',
  defaultZoom: 13,
  defaultCenter: [69.2401, 41.2995], // Ташкент [lng, lat]
  marker: {
    color: '#3b82f6',
    draggable: true
  }
};