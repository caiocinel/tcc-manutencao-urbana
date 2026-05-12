// Serviço de API - comunicação com o backend
// Usa fetch nativo com suporte a JWT, CSRF e FormData
const API_URL = import.meta.env.VITE_API_URL || '';

// Obtém um token CSRF do servidor (necessário para mutations)
async function getCsrfToken() {
  const res = await fetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}

// Função genérica de requisição com tratamento de erros
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isMutation = options.method && !['GET', 'HEAD'].includes(options.method);
  let csrfToken;

  if (isMutation) {
    csrfToken = await getCsrfToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: token }),
    ...(isMutation && csrfToken && { 'X-XSRF-TOKEN': csrfToken }),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, fetchOptions);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || 'Erro na requisição');
  }

  return res.json();
}

// Upload de defeito com FormData (para enviar imagem junto)
async function uploadDefeito(formData) {
  const token = localStorage.getItem('token');
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_URL}/api/defeitos`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'X-XSRF-TOKEN': csrfToken,
    },
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || 'Erro na requisição');
  }

  return res.json();
}

export const api = {
  login: (email, senha) =>
    request('/api/auth/login', { method: 'POST', body: { email, senha } }),

  register: (nome, email, senha, municipio_id, cpf) =>
    request('/api/auth/registro', { method: 'POST', body: { nome, email, senha, municipio_id, cpf } }),

  listDefeitos: (params = {}) => {
    const q = new URLSearchParams();
    if (params.ordenar) q.set('ordenar', params.ordenar);
    if (params.dias) q.set('dias', params.dias);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return request(`/api/defeitos${qs ? '?' + qs : ''}`);
  },

  getDefeito: (id) =>
    request(`/api/defeitos/${id}`),

  createDefeito: uploadDefeito,

  updateDefeito: (id, data) =>
    request(`/api/defeitos/${id}`, { method: 'PATCH', body: data }),

  listMunicipios: () =>
    request('/api/municipios'),

  listCategorias: () =>
    request('/api/categorias'),

  updateMunicipio: (municipio_id) =>
    request('/api/auth/municipio', { method: 'PATCH', body: { municipio_id } }),

  meusDefeitos: () =>
    request('/api/defeitos/meus'),

  listClusters: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/defeitos/clusters${q ? '?' + q : ''}`);
  },

  encerrarLote: (ids) =>
    request('/api/defeitos/encerrar-lote', { method: 'POST', body: { ids } }),

  regioesDefeitos: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return request(`/api/defeitos/regioes${qs ? '?' + qs : ''}`);
  },

  adminEstatisticas: () =>
    request('/api/auth/admin/estatisticas'),

  adminListUsers: () =>
    request('/api/auth/admin/users'),

  adminUpdateUserMunicipio: (userId, municipio_id) =>
    request(`/api/auth/admin/users/${userId}`, { method: 'PATCH', body: { municipio_id } }),

  adminToggleAdmin: (userId, admin) =>
    request(`/api/auth/admin/users/${userId}/admin`, { method: 'PATCH', body: { admin } }),

  updatePassword: (senha_atual, nova_senha) =>
    request('/api/auth/senha', { method: 'PATCH', body: { senha_atual, nova_senha } }),

  validarCpf: (cpf) =>
    request('/api/auth/validar-cpf', { method: 'POST', body: { cpf } }),

  verificarEmail: (codigo) =>
    request('/api/auth/verificar-email', { method: 'POST', body: { codigo } }),

  apoiarDefeito: (id) =>
    request(`/api/defeitos/${id}/apoiar`, { method: 'POST' }),

  pushKey: () =>
    request('/api/auth/push/key'),

  pushSubscribe: (subscription) =>
    request('/api/auth/push/subscribe', { method: 'POST', body: { subscription } }),

  anexarDefeito: async (id, formData) => {
    const token = localStorage.getItem('token');
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${API_URL}/api/defeitos/${id}/anexar`, {
      method: 'PATCH',
      headers: { Authorization: token, 'X-XSRF-TOKEN': csrfToken },
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
  },

  reenviarCodigo: () =>
    request('/api/auth/reenviar-codigo', { method: 'POST' }),

  enviar2fa: (email) =>
    request('/api/auth/enviar-2fa', { method: 'POST', body: { email } }),

  verificar2fa: (email, codigo) =>
    request('/api/auth/verificar-2fa', { method: 'POST', body: { email, codigo } }),
};
