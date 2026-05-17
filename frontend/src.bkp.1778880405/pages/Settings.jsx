import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import SearchableSelect from '../components/SearchableSelect';

export default function Settings() {
  const { user, isAuthenticated, updateUser, logout } = useAuth();
  const addToast = useToast();
  const [municipioId, setMunicipioId] = useState(() => user?.municipio?.codigo || '');
  const [municipios, setMunicipios] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    api.listMunicipios()
      .then(setMunicipios)
      .catch(() => {});
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setMunicipioId(user?.municipio?.codigo || '');
  }, [user?.municipio?.codigo]);

  async function handleSave() {
    setSaving(true);
    try {
      const data = await api.updateMunicipio(municipioId);
      updateUser({ municipio: data.municipio });
      addToast('Município atualizado com sucesso!');
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h1>Configurações</h1>
        <p className="chamado-meta">{user?.email}</p>

        <label className="chamado-meta" style={{ fontWeight: 'var(--weight-semibold)' }}>Município</label>
        <SearchableSelect
          options={municipios}
          value={municipioId}
          onChange={setMunicipioId}
          placeholder="Pesquise um município..."
          groupBy="uf_sigla"
        />

        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        <div className="modal-actions" style={{ marginTop: 'var(--space-1)' }}>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary" style={{ flex: 1 }}>
            Voltar ao Mapa
          </button>
          <button type="button" onClick={logout} className="btn-secondary" style={{ flex: 1 }}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
