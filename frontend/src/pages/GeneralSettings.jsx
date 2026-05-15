import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Bell, Lock, Eye, GearSix, Clock, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import AccountBlock from '../components/settings/AccountBlock';
import NotificationsBlock from '../components/settings/NotificationsBlock';
import SecurityBlock from '../components/settings/SecurityBlock';
import PrivacyBlock from '../components/settings/PrivacyBlock';
import PreferencesBlock from '../components/settings/PreferencesBlock';
import ActivityLogBlock from '../components/settings/ActivityLogBlock';

const navItems = [
  { key: 'account', label: 'Conta', icon: MapPin },
  { key: 'notifications', label: 'Notificações', icon: Bell },
  { key: 'security', label: 'Segurança', icon: Lock },
  { key: 'privacy', label: 'Privacidade', icon: Eye },
  { key: 'preferences', label: 'Preferências', icon: GearSix },
  { key: 'activity', label: 'Histórico', icon: Clock },
];

const blockComponents = {
  account: AccountBlock,
  notifications: NotificationsBlock,
  security: SecurityBlock,
  privacy: PrivacyBlock,
  preferences: PreferencesBlock,
  activity: ActivityLogBlock,
};

export default function GeneralSettings() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const ActiveBlock = blockComponents[activeSection];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f11' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside style={{
          width: 220,
          flexShrink: 0,
          background: '#1a1a1e',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '12px 0',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 20px',
                    border: 'none',
                    background: isActive ? 'rgba(124,111,255,0.15)' : 'transparent',
                    color: isActive ? '#7c6fff' : '#9998a8',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    borderRight: isActive ? '2px solid #7c6fff' : '2px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: '0 12px' }}>
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: 8,
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <SignOut size={18} />
              Sair
            </button>
          </div>
        </aside>
        <main style={{
          flex: 1,
          padding: 32,
          maxWidth: 720,
          overflowY: 'auto',
        }}>
          <ActiveBlock />
        </main>
      </div>
    </div>
  );
}
