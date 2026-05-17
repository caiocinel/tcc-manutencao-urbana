import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!isAuthenticated) { navigate('/login'); } }, [isAuthenticated, navigate]);
  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Configurações</h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Página de configurações.</p>
    </div>
  );
}
