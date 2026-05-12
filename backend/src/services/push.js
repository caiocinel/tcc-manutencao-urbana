const webpush = require('web-push');
const { query } = require('../config/database');
const logger = require('../services/logger');

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  try {
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    logger.info('Chaves VAPID geradas automaticamente. Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env para persistência.');
    logger.info(`VAPID_PUBLIC_KEY=${vapidPublicKey}`);
    logger.info(`VAPID_PRIVATE_KEY=${vapidPrivateKey}`);
  } catch (err) {
    logger.warn('Não foi possível gerar chaves VAPID. Notificações push desabilitadas.');
  }
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@centralurbana.app',
    vapidPublicKey,
    vapidPrivateKey
  );
}

function getPublicKey() {
  return vapidPublicKey || '';
}

async function saveSubscription(usuarioId, subscription) {
  const { endpoint, keys } = subscription;
  await query(
    `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, criado_em)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
    [usuarioId, endpoint, keys.p256dh, keys.auth, new Date().toISOString()]
  );
}

async function getSubscriptions(usuarioId) {
  const { rows } = await query('SELECT * FROM push_subscriptions WHERE usuario_id = $1', [usuarioId]);
  return rows;
}

async function notifyUser(usuarioId, title, body, url) {
  if (!vapidPublicKey || !vapidPrivateKey) return;
  const subscriptions = await getSubscriptions(usuarioId);
  const payload = JSON.stringify({ title, body, url });
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
      }
    }
  }
}

module.exports = { getPublicKey, saveSubscription, notifyUser };
