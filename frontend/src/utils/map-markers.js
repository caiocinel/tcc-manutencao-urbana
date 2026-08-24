import L from 'leaflet';
import { getStatusColor } from '../components/ui/status-utils';

export function createPlacementPinIcon() {
  return L.divIcon({
    html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));cursor:pointer;text-align:center;">📍</div>`,
    className: 'emoji-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Bandeira de demarcacao: mastro plantado na coordenada + etiqueta de acao.
// Tudo em um unico divIcon — o mastro nasce no ponto ancora, entao nao existe desalinhamento possivel.
const FLAG_W = 150;
const FLAG_H = 70;

export function createOpenCallIcon(label = 'Abrir chamado') {
  return L.divIcon({
    html: `<div class="map-flag">
      <span class="map-flag__tip"></span>
      <span class="map-flag__mast"></span>
      <span class="map-flag__tag" role="button" tabindex="-1">${label}</span>
    </div>`,
    className: 'map-flag-icon',
    iconSize: [FLAG_W, FLAG_H],
    iconAnchor: [0, FLAG_H],
  });
}

export function createDefectIcon(status, concluido_em) {
  const color = getStatusColor(status, concluido_em);
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    className: 'defect-dot',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}
