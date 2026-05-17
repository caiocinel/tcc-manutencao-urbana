import json
import logging
from pywebpush import webpush, WebPushException
from django.conf import settings

logger = logging.getLogger(__name__)

VAPID_CLAIMS = {
    'sub': 'mailto:admin@centralurbana.app',
}


def get_public_key() -> str:
    return settings.VAPID_PUBLIC_KEY or ''


def notify_user(subscription: dict, title: str, body: str, url: str = '/') -> bool:
    vapid_private_key = settings.VAPID_PRIVATE_KEY
    vapid_public_key = settings.VAPID_PUBLIC_KEY
    if not vapid_private_key or not vapid_public_key:
        logger.warning('VAPID keys not configured, skipping push')
        return False

    payload = json.dumps({'title': title, 'body': body, 'url': url})

    try:
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims={**VAPID_CLAIMS, 'aud': subscription.get('endpoint', '')},
        )
        return True
    except WebPushException as exc:
        if exc.status_code in (410, 404):
            logger.info(f'Push subscription expired/gone: {exc.status_code}')
            return False
        logger.error(f'Push notification failed: {exc}')
        return False
