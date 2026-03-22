"""
Input sanitization utilities to prevent MongoDB operator injection and XSS.
"""
import re
import html


def sanitize_text(text: str, max_length: int = 2200) -> str:
    """Strip HTML tags and dangerous content from user text input."""
    if not text:
        return ""
    # Strip HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Remove javascript: protocol
    clean = re.sub(r'javascript:', '', clean, flags=re.IGNORECASE)
    # Decode HTML entities then re-escape to prevent entity-based XSS
    clean = html.escape(html.unescape(clean))
    # Trim to max length
    return clean[:max_length].strip()


def sanitize_username(username: str) -> str:
    """Only allow alphanumeric, dots, underscores."""
    if not username:
        return ""
    return re.sub(r'[^a-zA-Z0-9._]', '', username)[:30]


def strip_mongo_operators(data: dict) -> dict:
    """Recursively strip keys starting with '$' from a dict to prevent
    MongoDB operator injection (e.g., {"$gt": ""} in user input).
    """
    if not isinstance(data, dict):
        return data
    cleaned = {}
    for key, value in data.items():
        if isinstance(key, str) and key.startswith("$"):
            continue  # Strip MongoDB operators
        if isinstance(value, dict):
            cleaned[key] = strip_mongo_operators(value)
        elif isinstance(value, list):
            cleaned[key] = [
                strip_mongo_operators(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            cleaned[key] = value
    return cleaned


def sanitize_search_input(q: str, max_length: int = 100) -> str:
    """Escape regex special characters and truncate to prevent ReDoS."""
    return re.escape(q.strip()[:max_length])


# Sensitive fields that must never appear in API responses
SENSITIVE_FIELDS = {
    "password", "password_hash", "hashed_password",
    "jwt_secret", "stripe_secret_key", "api_key",
    "secret", "token", "refresh_token",
}


def filter_sensitive_fields(data: dict) -> dict:
    """Remove sensitive fields from a dict before returning to client."""
    if not isinstance(data, dict):
        return data
    return {
        key: filter_sensitive_fields(value) if isinstance(value, dict) else value
        for key, value in data.items()
        if key.lower() not in SENSITIVE_FIELDS
    }
