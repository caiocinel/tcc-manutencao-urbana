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

function formDataToObject(formData) {
  const obj = {};
  formData.forEach((value, key) => { obj[key] = value; });
  return obj;
}

async function salvarOffline(formData) {
  const db = await openOfflineDB();
  const tx = db.transaction('defeitos', 'readwrite');
  tx.objectStore('defeitos').add({
    dados: formDataToObject(formData),
    token: localStorage.getItem('token'),
    criado_em: new Date().toISOString(),
  });
  await tx.done;
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-defeitos');
  }
}

async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ciu-offline', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('defeitos', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function uploadDefeito(formData) {
  const token = localStorage.getItem('token');
  const csrfToken = await getCsrfToken();

  try {
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
  } catch (err) {
    if (!navigator.onLine || err.message === 'Failed to fetch') {
      await salvarOffline(formData);
      return { offline: true, message: 'Chamado salvo offline. Será enviado quando houver conexão.' };
    }
    throw err;
  }
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

  createDefeito: uploadDefeito,

  updateDefeito: (id, data) =>
    request(`/api/defeitos/${id}`, { method: 'PATCH', body: data }),

  listMunicipios: () =>
    request('/api/municipios'),

  getMunicipio: (codigo) =>
    request(`/api/municipios/${codigo}`),

  listCategorias: () =>
    request('/api/categorias'),

  updateMunicipio: (municipio_id) =>
    request('/api/auth/municipio', { method: 'PATCH', body: { municipio_id } }),

  meusDefeitos: () =>
    request('/api/defeitos/meus'),

  adminEstatisticas: () =>
    request('/api/auth/admin/estatisticas'),

  adminListUsers: () =>
    request('/api/auth/admin/users'),

  adminToggleAdmin: (userId, admin) =>
    request(`/api/auth/admin/users/${userId}/admin`, { method: 'PATCH', body: { admin } }),

  updatePassword: (senha_atual, nova_senha) =>
    request('/api/auth/senha', { method: 'PATCH', body: { senha_atual, nova_senha } }),

  verificarEmail: (codigo) =>
    request('/api/auth/verificar-email', { method: 'POST', body: { codigo } }),

  pushKey: () =>
    request('/api/auth/push/key'),

  pushSubscribe: (subscription) =>
    request('/api/auth/push/subscribe', { method: 'POST', body: { subscription } }),

  reenviarCodigo: () =>
    request('/api/auth/reenviar-codigo', { method: 'POST' }),

  updateProfile: (data) =>
    request('/api/auth/profile', { method: 'PATCH', body: data }),

  atenderDefeito: (id) =>
    request(`/api/defeitos/${id}/atender`, { method: 'PATCH' }),
};
