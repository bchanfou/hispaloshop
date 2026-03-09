from typing import Iterable, List, Optional


def normalize_market_code(country_code: Optional[str]) -> Optional[str]:
    if not country_code:
        return None
    normalized = str(country_code).strip().upper()
    return normalized or None


def normalize_markets(markets: Optional[Iterable[str]]) -> List[str]:
    normalized: List[str] = []
    seen = set()
    for market in markets or []:
        code = normalize_market_code(market)
        if code and code not in seen:
            normalized.append(code)
            seen.add(code)
    return normalized


def get_product_target_markets(product: Optional[dict]) -> List[str]:
    if not product:
        return []
    if "target_markets" in product and product.get("target_markets") is not None:
        return normalize_markets(product.get("target_markets"))
    return normalize_markets(product.get("available_countries"))


def is_product_available_in_country(product: Optional[dict], country_code: Optional[str]) -> bool:
    markets = get_product_target_markets(product)
    if not markets:
        return True
    normalized_country = normalize_market_code(country_code)
    if not normalized_country:
        return False
    return normalized_country in markets
