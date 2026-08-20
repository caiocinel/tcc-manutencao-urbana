// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getInitialHeatmapState } from './map-heatmap';

describe('getInitialHeatmapState', () => {
  it('desliga o heatmap por padrao no modo demo (pontos de chamados visiveis)', () => {
    expect(getInitialHeatmapState(true)).toBe(false);
  });

  it('mantem o heatmap ligado por padrao para usuarios comuns', () => {
    expect(getInitialHeatmapState(false)).toBe(true);
  });
});