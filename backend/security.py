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
    """
    Verifies a plain password against a hashed password.

    :param plain_password: The plain text password.
    :param hashed_password: The hashed password.
    :return: True if the password is correct, otherwise False.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hashes a password using bcrypt.

    :param password: The plain text password.
    :return: The hashed password.
    """
    return pwd_context.hash(password)


def _create_token(data: dict, token_type: str, expires_delta: timedelta) -> str:
    """
    Creates a JWT token.

    :param data: The data to encode in the token.
    :param token_type: The type of token (e.g., 'access', 'refresh').
    :param expires_delta: The expiration time for the token.
    :return: The encoded JWT token.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "token_type": token_type})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates an access token.

    :param data: The data to encode in the token.
    :param expires_delta: The expiration time for the token.
    :return: The encoded access token.
    """
    return _create_token(data, token_type="access", expires_delta=expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(data: dict) -> str:
    """
    Creates a refresh token.

    :param data: The data to encode in the token.
    :return: The encoded refresh token.
    """
    return _create_token(data, token_type="refresh", expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> dict:
    """
    Decodes a JWT token.

    :param token: The JWT token to decode.
    :return: The decoded token payload.
    :raises ValueError: If the token is invalid.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def decode_access_token(token: str) -> dict:
    """
    Decodes an access token.

    :param token: The access token to decode.
    :return: The decoded token payload.
    :raises ValueError: If the token is not an access token or is invalid.
    """
    payload = decode_token(token)
    if payload.get("token_type") != "access":
        raise ValueError("Invalid token")
    return payload


def decode_refresh_token(token: str) -> dict:
    """
    Decodes a refresh token.

    :param token: The refresh token to decode.
    :return: The decoded token payload.
    :raises ValueError: If the token is not a refresh token or is invalid.
    """
    payload = decode_token(token)
    if payload.get("token_type") != "refresh":
        raise ValueError("Invalid token")
    return payload
