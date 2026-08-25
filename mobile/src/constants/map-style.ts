/**
 * Estilo escuro do Google Maps (Android), equivalente aos tiles
 * `dark_all` do CartoDB usados pelo web. No iOS o Apple Maps troca de tema
 * pela prop `userInterfaceStyle`, então este array só é aplicado no Android.
 */

export const MAPA_ESTILO_ESCURO = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a14' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a80' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a24' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b6b62' }],
  },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14201a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b2b26' }] },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#33332c' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3d3a30' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9a9a90' }],
  },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#26261f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1116' }] },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3f4a52' }],
  },
];
