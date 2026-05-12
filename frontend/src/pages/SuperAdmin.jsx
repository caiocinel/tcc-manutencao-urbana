import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import SearchableSelect from '../components/SearchableSelect';

export default function SuperAdmin() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [municipios, setMunicipios] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.admin) { navigate('/login'); return; }
    loadData();
  }, [isAuthenticated, user]);

  async function loadData() {
    try {
      const [u, m] = await Promise.all([
        api.adminListUsers(),
        api.listMunicipios(),
      ]);
      setUsuarios(u);
      setMunicipios(m);
    } catch (err) {
      addToast('Erro ao carregar dados: ' + err.message, 'error');
    }
  }

  async function handleUpdateUser(userId, municipioId) {
    try {
      await api.adminUpdateUserMunicipio(userId, municipioId || null);
      addToast('Usuário atualizado!');
      loadData();
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    }
  }

  async function handleToggleAdmin(userId, tornarAdmin) {
    try {
      await api.adminToggleAdmin(userId, tornarAdmin);
      addToast(tornarAdmin ? 'Usuário promovido a admin!' : 'Admin removido!');
      loadData();
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    }
  }

  return (
    <div className="admin-page">
      <Header />

      <div className="admin-usuarios">
        <h2>Gerenciar Usuários</h2>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
          Atribua municípios e gerencie permissões de admin.
        </p>
        <div className="usuarios-grid">
          {usuarios.map(u => (
            <div key={u.id} className="usuario-card">
              <div className="usuario-info">
                <strong>{u.nome}</strong>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{u.email}</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {u.admin && <span className="badge badge-admin">Admin</span>}
                  {u.email === 'josemurilorodriguessabalo@gmail.com' && (
                    <span className="badge badge-super">Supremo</span>
                  )}
                </div>
              </div>
              <div className="usuario-municipio" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {u.email !== 'josemurilorodriguessabalo@gmail.com' && (
                  <button
                    onClick={() => handleToggleAdmin(u.id, !u.admin)}
                    className={`btn-sm ${u.admin ? 'btn-remover-admin' : 'btn-promover'}`}
                  >
                    {u.admin ? 'Remover Admin' : 'Promover Admin'}
                  </button>
                )}
                <SearchableSelect
                  options={municipios}
                  value={u.municipio_id || ''}
                  onChange={(val) => handleUpdateUser(u.id, val)}
                  placeholder="Atribuir município..."
                  groupBy="uf_sigla"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
