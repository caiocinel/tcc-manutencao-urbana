// Contexto de autenticação - gerencia estado do login em toda a aplicação
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Ao iniciar ou mudar o token, tenta decodificar o JWT para obter dados do usuário
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.userId, email: payload.email });
      } catch {
        logout();
      }
    }
  }, [token]);

  function login(tokenData, userData) {
    localStorage.setItem('token', tokenData);
    setToken(tokenData);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para acessar o contexto de autenticação em qualquer componente
export const useAuth = () => useContext(AuthContext);
