// Página de criação de defeito - formulário com foto e geolocalização
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function CreateDefect() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [imagem, setImagem] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Obtém coordenadas via GPS do navegador
  function getLocation() {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      () => setError('Não foi possível obter localização')
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    // Monta FormData para enviar texto + arquivo
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('descricao', descricao);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    if (imagem) formData.append('imagem', imagem);

    try {
      await api.createDefeito(formData);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="form-container">
      <h1>Reportar Defeito</h1>
      <form onSubmit={handleSubmit} className="defect-form">
        {error && <p className="error">{error}</p>}

        <input type="text" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} required />

        <textarea placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} rows={4} />

        <div className="coord-row">
          <input type="number" step="any" placeholder="Latitude" value={latitude} onChange={e => setLatitude(e.target.value)} required />
          <input type="number" step="any" placeholder="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} required />
          <button type="button" onClick={getLocation} className="btn-gps">📍 GPS</button>
        </div>

        <input type="file" accept="image/*" onChange={e => setImagem(e.target.files[0])} />

        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
