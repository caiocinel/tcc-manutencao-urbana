import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/button';

export default function SuperAdmin() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!user?.admin) { navigate('/'); return; }
    api.adminListUsers().then(setUsers).catch(() => {});
  }, [isAuthenticated, user, navigate]);

  const toggleAdmin = async (id, current) => {
    try {
      await api.adminToggleAdmin(id, !current);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, admin: !current } : u));
    } catch { /**/ }
  };

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Gerenciar Usuários</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Administre os usuários do sistema</p>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
              <div>
                <span className="text-sm font-semibold block" style={{ color: 'var(--color-text-primary)' }}>{u.nome}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u.email}</span>
                <div className="flex gap-1 mt-1">
                  {u.admin && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(76,175,125,0.12)', color: 'var(--color-success)' }}>Admin</span>}
                  {u.super_admin && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,160,23,0.12)', color: 'var(--color-gold-500)' }}>Super Admin</span>}
                </div>
              </div>
              {!u.super_admin && (
                <Button variant={u.admin ? 'danger' : 'secondary'} size="xs" onClick={() => toggleAdmin(u.id, u.admin)}>
                  {u.admin ? 'Remover Admin' : 'Promover Admin'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
