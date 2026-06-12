"""
Утилиты для шифрования чувствительных данных (ИИН).
Используется Fernet симметричное шифрование.
"""
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
import base64
import hashlib


def _get_fernet():
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        # В development используем fallback ключ — НИКОГДА не использовать в production
        key = base64.urlsafe_b64encode(hashlib.sha256(b'dev-fallback-key').digest()).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_value(value: str) -> str:
    """Шифрует строку. Возвращает base64-encoded зашифрованную строку."""
    if not value:
        return ''
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    """Расшифровывает строку. Возвращает оригинальное значение."""
    if not encrypted_value:
        return ''
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_value.encode()).decode()
    except (InvalidToken, Exception):
        return ''


def hash_for_search(value: str) -> str:
    """
    Создаёт хэш для поиска по зашифрованному полю.
    Позволяет искать по ИИН без расшифровки всех записей.
    """
    if not value:
        return ''
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()
