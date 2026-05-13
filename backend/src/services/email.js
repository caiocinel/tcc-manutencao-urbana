const logger = require('./logger');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Central Urbana <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  const codeMatch = html.match(/>(\d{6})</);
  if (codeMatch) logger.info({ to, code: codeMatch[1] }, 'Código de verificação enviado');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ err, to }, 'Erro ao enviar email');
    logger.info({ to, code: codeMatch ? codeMatch[1] : null }, 'Código disponível no log');
    return { id: null, fallback: true };
  }

  return res.json();
}

function sendVerificationCode(email, code) {
  return sendEmail({
    to: email,
    subject: 'Confirme seu email - Central de Inteligência Urbana',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Confirme seu email</h2>
      <p>Seu código de verificação é:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px">${code}</p>
      <p>Ele expira em 10 minutos.</p>
      <p style="color:#888;font-size:12px">Central de Inteligência Urbana</p>
    </div>`,
  });
}

function send2faCode(email, code) {
  return sendEmail({
    to: email,
    subject: 'Seu código de acesso - Central de Inteligência Urbana',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Código de verificação em duas etapas</h2>
      <p>Use o código abaixo para acessar sua conta:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px">${code}</p>
      <p>Ele expira em 5 minutos.</p>
      <p style="color:#888;font-size:12px">Central de Inteligência Urbana</p>
    </div>`,
  });
}

module.exports = { sendEmail, sendVerificationCode, send2faCode };
