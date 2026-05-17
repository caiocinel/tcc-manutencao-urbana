const API_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, fetchOptions);

  if (!res.ok) {
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refresh');
      if (refreshToken && !endpoint.includes('/auth/login/') && !endpoint.includes('/auth/register/')) {
        const refreshRes = await fetch(`${API_URL}/api/v1/auth/login/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (refreshRes.ok) {
          const { access } = await refreshRes.json();
          localStorage.setItem('token', access);
          options.headers = { ...options.headers, Authorization: `Bearer ${access}` };
          const retryRes = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers: options.headers });
          if (!retryRes.ok) {
            const retryErr = await retryRes.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(retryErr.error || 'Erro na requisição');
          }
          return retryRes.json();
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userData');
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    }
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || 'Erro na requisição');
  }

  return res.json();
}

async function paginated(endpoint, options = {}) {
  const data = await request(endpoint, options);
  return data?.results ?? data;
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

  try {
    const res = await fetch(`${API_URL}/api/v1/defeitos/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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
    request('/api/v1/auth/login/', { method: 'POST', body: { email, password: senha } }),

  register: (nome, email, senha) =>
    request('/api/v1/auth/register/', { method: 'POST', body: { nome, email, password: senha, confirm_password: senha } }),

  listDefeitos: (params = {}) => {
    const q = new URLSearchParams();
    if (params.ordenar) q.set('ordering', params.ordenar === 'recentes' ? '-criado_em' : '-curtidas');
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return paginated(`/api/v1/defeitos/${qs ? '?' + qs : ''}`);
  },

  createDefeito: uploadDefeito,

  updateDefeito: (id, data) =>
    request(`/api/v1/defeitos/${id}/`, { method: 'PATCH', body: data }),

  listMunicipios: () =>
    paginated('/api/v1/municipios/'),

  getMunicipio: (codigo) =>
    request(`/api/v1/municipios/${codigo}/`),

  listCategorias: () =>
    paginated('/api/v1/categorias/'),

  meusDefeitos: () =>
    paginated('/api/v1/defeitos/meus/'),

  pushKey: () =>
    request('/api/v1/auth/public-key/'),

  pushSubscribe: (subscription) =>
    request('/api/v1/auth/subscribe/', { method: 'POST', body: { subscription } }),

  updateProfile: (data) =>
    request('/api/v1/auth/profile/', { method: 'PATCH', body: data }),

  updatePassword: (senhaAtual, novaSenha) =>
    request('/api/v1/auth/senha/', { method: 'PATCH', body: { senha_atual: senhaAtual, nova_senha: novaSenha } }),

  updateMunicipio: (municipioId) =>
    request('/api/v1/auth/municipio/', { method: 'PATCH', body: { municipio_id: municipioId } }),

  verificarEmail: (codigo) =>
    request('/api/v1/auth/verificar-email/', { method: 'POST', body: { codigo } }),

  reenviarCodigo: () =>
    request('/api/v1/auth/reenviar-codigo/', { method: 'POST' }),

  apoiarDefeito: (id) =>
    request(`/api/v1/defeitos/${id}/apoiar/`, { method: 'POST' }),

  apoiei: () =>
    request('/api/v1/defeitos/apoiei/'),

  detalharDefeito: (id) =>
    request(`/api/v1/defeitos/${id}/`),

  anexarImagem: async (id, file) => {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/api/v1/defeitos/${id}/anexar/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Erro' })); throw new Error(err.error); }
    return res.json();
  },

  atenderDefeito: (id) =>
    request(`/api/v1/defeitos/${id}/atender/`, { method: 'PATCH' }),

  adminListUsers: () =>
    request('/api/v1/auth/admin/users/'),

  adminToggleAdmin: (id, admin) =>
    request(`/api/v1/auth/admin/users/${id}/admin/`, { method: 'PATCH', body: { admin } }),

  adminSetMunicipio: (id, municipioId) =>
    request(`/api/v1/auth/admin/users/${id}/municipio/`, { method: 'PATCH', body: { municipio_id: municipioId } }),

  adminEstatisticas: () =>
    request('/api/v1/auth/admin/estatisticas/'),

  getMunicipiosComAdmin: () =>
    request('/api/v1/municipios/com_admin/'),
};
