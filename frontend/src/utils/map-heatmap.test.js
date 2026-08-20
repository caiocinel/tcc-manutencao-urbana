// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { haversineDistance, filterByRadius } from './map-heatmap';

describe('haversineDistance', () => {
  it('retorna ~0 para o mesmo ponto', () => {
    expect(haversineDistance(-21.17, -47.81, -21.17, -47.81)).toBeLessThan(1);
  });

  it('calcula ~111km para 1 grau de latitude', () => {
    const d = haversineDistance(-21.17, -47.81, -22.17, -47.81);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('é simétrico (ordem dos pontos não importa)', () => {
    const a = haversineDistance(-21.17, -47.81, -21.18, -47.83);
    const b = haversineDistance(-21.18, -47.83, -21.17, -47.81);
    expect(a).toBeCloseTo(b, 2);
  });
});

describe('filterByRadius', () => {
  const defeitos = [
    { id: 1, latitude: -21.17, longitude: -47.81 }, // ~0m
    { id: 2, latitude: -21.1705, longitude: -47.81 }, // ~55m
    { id: 3, latitude: -21.18, longitude: -47.81 }, // ~1100m
  ];

  it('filtra defeitos dentro do raio (200m) do ponto', () => {
    const ids = filterByRadius(defeitos, -21.17, -47.81, 200).map(d => d.id);
    expect(ids).toEqual([1, 2]);
  });

  it('retorna todos quando o raio é grande o suficiente', () => {
    const ids = filterByRadius(defeitos, -21.17, -47.81, 5000).map(d => d.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('retorna vazio quando nenhum defeito está no raio', () => {
    const ids = filterByRadius(defeitos, -21.30, -47.90, 200).map(d => d.id);
    expect(ids).toEqual([]);
  });
});