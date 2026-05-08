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

  register: (nome, email, senha) =>
    request('/api/auth/registro', { method: 'POST', body: { nome, email, senha } }),

  listDefeitos: () =>
    request('/api/defeitos'),

  getDefeito: (id) =>
    request(`/api/defeitos/${id}`),

  createDefeito: uploadDefeito,

  updateDefeito: (id, data) =>
    request(`/api/defeitos/${id}`, { method: 'PATCH', body: data }),
};
