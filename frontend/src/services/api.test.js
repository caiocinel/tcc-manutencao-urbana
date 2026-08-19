import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

const apiModule = await import('./api');

describe('api request helper com FormData', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia FormData sem Content-Type e com Authorization', async () => {
    localStorage.setItem('token', 'tok123');
    const fd = new FormData();
    fd.append('status', 'atendido');
    fd.append('foto_resolucao', new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'atendido' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const res = await apiModule.api.updateDefeitoComArquivo('abc-123', fd);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/defeitos/abc-123/status/');
    expect(opts.method).toBe('PATCH');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
    expect(opts.headers['Content-Type']).toBeUndefined();
    expect(opts.body).toBe(fd);
    expect(res).toEqual({ status: 'atendido' });
  });

  it('inclui X-Demo-Mode no header quando em modo demo', async () => {
    localStorage.setItem('token', 'tok123');
    localStorage.setItem('ciu-demo-mode', 'true');
    const fd = new FormData();
    fd.append('status', 'atendido');

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'atendido' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await apiModule.api.updateDefeitoComArquivo('abc-123', fd);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-Demo-Mode']).toBe('true');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('renova token no 401 e reenvia FormData com novo token', async () => {
    localStorage.setItem('token', 'token-expirado');
    localStorage.setItem('refresh', 'refresh-tok');
    const fd = new FormData();
    fd.append('status', 'atendido');

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Token expirado' }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: 'novo-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'atendido' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

    const res = await apiModule.api.updateDefeitoComArquivo('abc-123', fd);

    expect(localStorage.getItem('token')).toBe('novo-token');
    const retryCall = fetchMock.mock.calls[2];
    expect(retryCall[1].headers.Authorization).toBe('Bearer novo-token');
    expect(retryCall[1].headers['Content-Type']).toBeUndefined();
    expect(retryCall[1].body).toBe(fd);
    expect(res).toEqual({ status: 'atendido' });
  });

  it('envia FormData no POST de novo defeito (createDefeito)', async () => {
    localStorage.setItem('token', 'tok123');
    const fd = new FormData();
    fd.append('titulo', 'Buraco na rua');
    fd.append('file', new File(['img'], 'img.jpg', { type: 'image/jpeg' }));

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'def-1', titulo: 'Buraco na rua' }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    );

    const res = await apiModule.api.createDefeito(fd);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/defeitos/');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(fd);
    expect(opts.headers['Content-Type']).toBeUndefined();
    expect(res.id).toBe('def-1');
  });

  it('lança erro com mensagem do servidor quando PATCH falha', async () => {
    localStorage.setItem('token', 'tok123');
    const fd = new FormData();
    fd.append('status', 'atendido');

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Foto de resolucao obrigatoria' }), { status: 400, headers: { 'Content-Type': 'application/json' } }),
    );

    await expect(apiModule.api.updateDefeitoComArquivo('abc-123', fd)).rejects.toThrow(
      'Foto de resolucao obrigatoria',
    );
  });
});