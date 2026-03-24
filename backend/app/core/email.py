"""
Email service using Resend.
"""
import time
import resend
from fastapi import HTTPException
from ..core.config import RESEND_API_KEY, EMAIL_FROM, logger

# Initialize Resend
if RESEND_API_KEY and RESEND_API_KEY != 'PLACEHOLDER_RESEND_KEY':
    resend.api_key = RESEND_API_KEY
    logger.info("[EMAIL] Resend API key configured successfully")
else:
    logger.warning("[EMAIL] Resend API key not configured - email sending will fail")


def send_email(to: str, subject: str, html: str):
    """
    Send email using Resend.
    This is the ONLY function that should send emails.
    Raises HTTPException if sending fails.
    """
    if not RESEND_API_KEY or RESEND_API_KEY == 'PLACEHOLDER_RESEND_KEY':
        logger.error(f"[EMAIL] Cannot send email to {to}: Resend not configured")
        raise HTTPException(
            status_code=500,
            detail="Email service not configured. Please contact support."
        )
    
    max_retries = 3
    last_error = None
    for attempt in range(max_retries):
        try:
            params = {
                "from": EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html
            }
            response = resend.Emails.send(params)
            logger.info(f"[EMAIL] Successfully sent '{subject}' to {to}")
            return response
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                wait = 2 ** attempt  # 1s, 2s
                logger.warning(f"[EMAIL] Attempt {attempt + 1} failed for {to}, retrying in {wait}s: {e}")
                time.sleep(wait)
            else:
                logger.error(f"[EMAIL] Failed to send email to {to} after {max_retries} attempts: {e}")
    raise HTTPException(
        status_code=500,
        detail=f"Failed to send email after {max_retries} attempts: {str(last_error)}"
    )
