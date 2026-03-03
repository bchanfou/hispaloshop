import stripe

from config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_connect_account(email: str, country: str = "ES") -> str:
    account = stripe.Account.create(type="express", country=country, email=email, capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}})
    return account.id


def create_onboarding_link(account_id: str) -> str:
    link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=f"{settings.FRONTEND_URL}/producer/settings?stripe=refresh",
        return_url=f"{settings.FRONTEND_URL}/producer/settings?stripe=return",
        type="account_onboarding",
    )
    return link.url
