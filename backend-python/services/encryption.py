import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _get_key():
    secret = settings.ENCRYPTION_KEY
    if not secret:
        raise ValueError('ENCRYPTION_KEY not configured')
    return hashlib.sha256(secret.encode()).digest()


def encrypt_text(text: str) -> str:
    key = _get_key()
    aesgcm = AESGCM(key)
    iv = os.urandom(16)
    ciphertext = aesgcm.encrypt(iv, text.encode(), None)
    tag = ciphertext[-16:]
    encrypted = ciphertext[:-16]
    return f"{iv.hex()}:{tag.hex()}:{encrypted.hex()}"


def decrypt_text(encoded: str) -> str:
    parts = encoded.split(':')
    if len(parts) != 3:
        raise ValueError('Invalid encrypted format')
    iv = bytes.fromhex(parts[0])
    tag = bytes.fromhex(parts[1])
    data = bytes.fromhex(parts[2])
    key = _get_key()
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, data + tag, None)
    return plaintext.decode()


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()
