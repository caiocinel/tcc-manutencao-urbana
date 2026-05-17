import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function HeatmapLayer({ pontos, ativo }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!ativo || !pontos || pontos.length === 0) {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      return;
    }
    const pontosHeat = pontos
      .filter(p => p.latitude && p.longitude)
      .map(p => [p.latitude, p.longitude, 0.8]);
    if (pontosHeat.length === 0) return;

    let canceled = false;
    import('leaflet.heat').then(() => {
      if (canceled) return;
      if (heatRef.current) map.removeLayer(heatRef.current);
      const heat = L.heatLayer(pontosHeat, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.4: 'rgb(34,197,94)', 0.6: 'rgb(212,160,23)', 0.8: 'rgb(255,140,0)', 1.0: 'rgb(239,68,68)' },
      });
      heat.addTo(map);
      heatRef.current = heat;
    }).catch(() => {});
    return () => { canceled = true; if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; } };
  }, [map, pontos, ativo]);

  return null;
}
