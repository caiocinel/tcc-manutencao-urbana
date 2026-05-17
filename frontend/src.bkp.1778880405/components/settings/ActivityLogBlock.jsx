import { useState } from 'react';

const sampleActivity = [
  { date: '2026-05-14 14:32', action: 'Login realizado', details: 'Autenticação via email e senha' },
  { date: '2026-05-14 10:15', action: 'Chamado criado', details: 'Buraco na Rua das Flores, 123' },
  { date: '2026-05-13 22:04', action: 'Senha alterada', details: 'Alteração de senha solicitada' },
  { date: '2026-05-13 18:40', action: 'Chamado apoiado', details: 'Apoiou chamado #4521' },
  { date: '2026-05-12 09:00', action: 'Configuração alterada', details: 'Município atualizado' },
];

export default function ActivityLogBlock() {
  const [activities] = useState(sampleActivity);

  return (
    <div style={{ background: '#1a1a1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0eff5', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Histórico de Atividades
      </h2>

      {activities.length === 0 ? (
        <p style={{ fontSize: 14, color: '#5c5b6e', textAlign: 'center', padding: 32 }}>
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#5c5b6e', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.03em' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#5c5b6e', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.03em' }}>Ação</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#5c5b6e', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.03em' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{a.date}</td>
                  <td style={{ padding: '12px', color: '#f0eff5', fontWeight: 500 }}>{a.action}</td>
                  <td style={{ padding: '12px', color: 'var(--color-text-tertiary)' }}>{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
