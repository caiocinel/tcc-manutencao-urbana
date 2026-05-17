import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const subscribeToPush = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyRes = await api.pushKey();
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyRes.publicKey,
        });
      }
      await api.pushSubscribe(sub);
    } catch {
      // falha silenciosa - notificações são auxiliares
    }
  }, []);

  useEffect(() => {
    const payload = decodeToken(token);
    if (payload) {
      const stored = localStorage.getItem('userData');
      const userData = stored ? JSON.parse(stored) : {};
      const userBase = {
        id: payload.userId,
        email: payload.email,
        municipio_id: payload.municipio_id || userData.municipio_id || null,
        admin: payload.admin || userData.admin || false,
        municipio: userData.municipio || null,
        nome: userData.nome || '',
        email_verificado: userData.email_verificado || false,
      };
      setUser(userBase);
      subscribeToPush();
      const precisaMunicipio = !userBase.municipio || !userBase.municipio.poligono_json;
      if (precisaMunicipio && userBase.municipio_id) {
        api.getMunicipio(userBase.municipio_id).then(mun => {
          setUser(prev => ({ ...prev, municipio: mun }));
          const stored2 = JSON.parse(localStorage.getItem('userData') || '{}');
          stored2.municipio = mun;
          localStorage.setItem('userData', JSON.stringify(stored2));
        }).catch(() => {});
      }
    } else if (token) {
      logout();
    }
    setLoading(false);
  }, [token, subscribeToPush]);

  function login(tokenData, userData) {
    localStorage.setItem('token', tokenData);
    if (userData) localStorage.setItem('userData', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
    subscribeToPush();
  }

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      const stored = { ...JSON.parse(localStorage.getItem('userData') || '{}'), ...updates };
      localStorage.setItem('userData', JSON.stringify(stored));
      return next;
    });
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setToken(null);
    setUser(null);
  }

  return (
      <AuthContext.Provider value={{ user, token, login, updateUser, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
