from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone


SESSION_COOKIE_NAME = "fershop_session"
SESSION_DURATION_DAYS = 30


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    clean_password = str(password or "")
    if not clean_password:
        raise ValueError("La contraseña no puede estar vacía.")

    if salt_hex is None:
        salt_hex = secrets.token_hex(16)

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        clean_password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        120_000,
    )
    return salt_hex, derived_key.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    _, candidate_hash = hash_password(password, salt_hex=salt_hex)
    return hmac.compare_digest(candidate_hash, expected_hash_hex)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def build_session_expiry() -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DURATION_DAYS)
    return expires_at.isoformat()
