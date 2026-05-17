import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import Header from '../components/Header';

export default function ProfileSettings() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const fileInputRef = useRef(null);

  const [nome, setNome] = useState(user?.nome || '');
  const [bio, setBio] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); }
  }, [isAuthenticated, navigate]);

  function getInitials() {
    if (!user?.nome) return '?';
    return user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Formato não suportado. Use JPG, PNG ou WEBP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Arquivo muito grande. Máximo 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Formato não suportado. Use JPG, PNG ou WEBP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Arquivo muito grande. Máximo 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!nome.trim()) {
      addToast('Nome é obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = await api.updateProfile({ nome: nome.trim() });
      updateUser({ nome: data.nome });
      addToast('Perfil atualizado com sucesso!');
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="admin-page" style={{ background: '#0f0f11' }}>
      <Header />
      <div className="settings-wrapper" style={{ background: '#0f0f11', padding: '32px 24px', alignItems: 'flex-start' }}>
        <div style={{
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          background: '#1a1a1e',
          borderRadius: '16px',
          border: '0.5px solid rgba(255,255,255,0.08)',
          padding: '32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f0eff5', letterSpacing: '-0.02em', margin: 0 }}>
                Profile Settings
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', marginTop: '4px', marginBottom: 0 }}>
                Manage your profile information and avatar
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px',
                background: 'var(--color-gold-500)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
            padding: '24px',
            background: '#111114',
            borderRadius: '12px',
            border: dragging ? '2px dashed var(--color-gold-500)' : '0.5px solid rgba(255,255,255,0.06)',
            transition: 'border-color 0.15s',
          }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: avatarPreview ? `url(${avatarPreview}) center/cover no-repeat` : 'var(--color-gold-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {!avatarPreview && getInitials()}
            </div>
            <div>
              <button
                onClick={handleAvatarClick}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: 'var(--color-gold-500)',
                  border: '0.5px solid rgba(124,111,255,0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Upload Photo
              </button>
              <p style={{ fontSize: '12px', color: '#66657a', marginTop: '6px', marginBottom: 0 }}>
                Drag & drop or click to upload. JPG, PNG or WEBP. Max 5MB.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0eff5', marginBottom: '16px', marginTop: 0 }}>
            Personal Info
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                Name <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Your full name"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                Email
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    background: '#0d0d0f',
                    color: '#66657a',
                    outline: 'none',
                    minHeight: '44px',
                    cursor: 'not-allowed',
                  }}
                />
                <a href="/login" style={{
                  color: 'var(--color-gold-500)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '0.5px solid rgba(124,111,255,0.3)',
                  transition: 'all 0.15s',
                }}>Change Email</a>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 500))}
                placeholder="Tell us a little about yourself"
                maxLength={500}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
              <p style={{ fontSize: '12px', color: '#66657a', marginTop: '4px', marginBottom: 0, textAlign: 'right' }}>
                {bio.length}/500
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                Location
              </label>
              <input
                type="text"
                value={localizacao}
                onChange={e => setLocalizacao(e.target.value)}
                placeholder="City, State"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0eff5', marginBottom: '16px', marginTop: 0 }}>
            Social Links
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                Twitter / X
              </label>
              <input
                type="text"
                value={twitter}
                onChange={e => setTwitter(e.target.value)}
                placeholder="https://x.com/username"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                GitHub
              </label>
              <input
                type="text"
                value={github}
                onChange={e => setGithub(e.target.value)}
                placeholder="https://github.com/username"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>
                LinkedIn
              </label>
              <input
                type="text"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: '#111114',
                  color: '#f0eff5',
                  outline: 'none',
                  minHeight: '44px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
