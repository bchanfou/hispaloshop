from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings

ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _create_token(data: dict, token_type: str, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "token_type": token_type})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    return _create_token(data, token_type="access", expires_delta=expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(data: dict) -> str:
    return _create_token(data, token_type="refresh", expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def decode_access_token(token: str) -> dict:
    payload = decode_token(token)
    if payload.get("token_type") != "access":
        raise ValueError("Invalid token")
    return payload


def decode_refresh_token(token: str) -> dict:
    payload = decode_token(token)
    if payload.get("token_type") != "refresh":
        raise ValueError("Invalid token")
    return payload
