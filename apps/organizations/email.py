"""
Отправка писем через Resend HTTP API (без доп. SDK — прямой POST-запрос).
Требует RESEND_API_KEY в env. Без ключа функция логирует предупреждение
и не падает — signup endpoint должен решить, что делать в этом случае
(см. apps/organizations/signup.py).
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'


def send_confirmation_email(to_email: str, confirm_url: str) -> bool:
    """Возвращает True при успешной отправке, False при ошибке или отсутствии ключа."""
    if not settings.RESEND_API_KEY:
        logger.warning('RESEND_API_KEY не задан — письмо на %s не отправлено', to_email)
        return False

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={'Authorization': f'Bearer {settings.RESEND_API_KEY}'},
            json={
                'from': 'Sheber Qonaq <onboarding@resend.dev>',
                'to': [to_email],
                'subject': 'Подтвердите регистрацию в Sheber Qonaq',
                'html': (
                    f'<p>Здравствуйте!</p>'
                    f'<p>Для завершения регистрации перейдите по ссылке:</p>'
                    f'<p><a href="{confirm_url}">{confirm_url}</a></p>'
                    f'<p>Ссылка действует 24 часа.</p>'
                ),
            },
            timeout=10,
        )
        response.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception('Ошибка отправки письма через Resend на %s', to_email)
        return False
