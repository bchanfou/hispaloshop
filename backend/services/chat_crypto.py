"""
AES-256-GCM encryption service for internal chat messages.

Messages are encrypted before storing in MongoDB and decrypted on read.
Set CHAT_ENCRYPTION_KEY env var to a base64-encoded 32-byte secret.

Generate a key:
    python -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
"""
import os
import base64
import logging

logger = logging.getLogger(__name__)

_raw_key = os.environ.get("CHAT_ENCRYPTION_KEY", "")
try:
    CHAT_KEY: bytes | None = base64.b64decode(_raw_key) if _raw_key else None
    if CHAT_KEY and len(CHAT_KEY) != 32:
        logger.warning("[CHAT_CRYPTO] CHAT_ENCRYPTION_KEY must be 32 bytes after base64 decode. Encryption disabled.")
        CHAT_KEY = None
except Exception:
    CHAT_KEY = None

if CHAT_KEY:
    logger.info("[CHAT_CRYPTO] AES-256-GCM encryption ENABLED for chat messages.")
else:
    logger.warning("[CHAT_CRYPTO] CHAT_ENCRYPTION_KEY not set — messages stored as plaintext.")

# Marker prefix so we can distinguish encrypted from legacy plaintext
_ENC_PREFIX = "enc:"


def encrypt_message(plaintext: str) -> str:
    """
    Encrypt plaintext using AES-256-GCM.
    Returns 'enc:<base64(nonce + ciphertext + tag)>' or plaintext unchanged if no key.
    """
    if not CHAT_KEY or not plaintext:
        return plaintext
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        nonce = os.urandom(12)  # 96-bit nonce — unique per message
        aesgcm = AESGCM(CHAT_KEY)
        ct_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        payload = base64.b64encode(nonce + ct_with_tag).decode("utf-8")
        return _ENC_PREFIX + payload
    except Exception as e:
        logger.error(f"[CHAT_CRYPTO] encrypt failed: {e}")
        return plaintext


def decrypt_message(ciphertext: str) -> str:
    """
    Decrypt an encrypted message.
    Gracefully falls back to returning the original string for legacy plaintext.
    """
    if not CHAT_KEY or not ciphertext:
        return ciphertext
    if not ciphertext.startswith(_ENC_PREFIX):
        # Legacy plaintext — return as-is
        return ciphertext
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        payload = base64.b64decode(ciphertext[len(_ENC_PREFIX):].encode("utf-8"))
        nonce, ct_with_tag = payload[:12], payload[12:]
        aesgcm = AESGCM(CHAT_KEY)
        return aesgcm.decrypt(nonce, ct_with_tag, None).decode("utf-8")
    except Exception as e:
        logger.error(f"[CHAT_CRYPTO] decrypt failed: {e}")
        return "[mensaje cifrado no legible]"


def decrypt_message_dict(msg: dict) -> dict:
    """Decrypt 'content' field in a message dict in-place. Returns the dict."""
    if msg and "content" in msg and msg["content"]:
        msg["content"] = decrypt_message(msg["content"])
    return msg
