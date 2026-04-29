"""
CICLO 1.2 — Tipos de cambio dinámicos (Exchange Rates)

Unit tests for:
1. fetch_ecb_rates() — parses ECB XML correctly
2. update_exchange_rates() — stores rates in DB (upsert by date)
3. get_rate_to_usd() — reads from DB; fallback to static when DB is empty
4. get_all_rates_to_usd() — returns full dict from DB; fallback when empty
5. ledger._get_rates_to_usd() — caches DB rates and refreshes daily
6. ECB timeout → fallback to static rates without crash
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


# ─── helpers ────────────────────────────────────────────────────────────────

_SAMPLE_ECB_XML = """<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
                 xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender>
  <Cube>
    <Cube time="2026-04-29">
      <Cube currency="USD" rate="1.0856"/>
      <Cube currency="GBP" rate="0.8567"/>
      <Cube currency="KRW" rate="1520.00"/>
      <Cube currency="JPY" rate="163.00"/>
      <Cube currency="CNY" rate="7.85"/>
      <Cube currency="AUD" rate="1.66"/>
    </Cube>
  </Cube>
</gesmes:Envelope>
"""


def _make_fake_db_rates(rates_to_usd: dict | None = None) -> MagicMock:
    """Build a minimal mock of db.exchange_rates for exchange_rates service."""
    col = MagicMock()
    if rates_to_usd is not None:
        doc = {"base": "USD", "date": "2026-04-29", "rates": rates_to_usd}
        col.find_one = AsyncMock(return_value=doc)
    else:
        col.find_one = AsyncMock(return_value=None)
    col.update_one = AsyncMock()
    return col


# ─── 1. fetch_ecb_rates ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_ecb_rates_parses_xml_correctly(monkeypatch):
    """fetch_ecb_rates() must return a dict keyed by currency code with EUR=1.0."""

    class _FakeResponse:
        text = _SAMPLE_ECB_XML
        def raise_for_status(self):
            pass

    class _FakeClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *_):
            pass
        async def get(self, url):
            return _FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kw: _FakeClient())

    from services.exchange_rates import fetch_ecb_rates
    rates = await fetch_ecb_rates()

    assert rates["EUR"] == 1.0
    assert rates["USD"] == pytest.approx(1.0856)
    assert rates["GBP"] == pytest.approx(0.8567)
    assert rates["KRW"] == pytest.approx(1520.00)
    assert rates["JPY"] == pytest.approx(163.00)
    assert "CNY" in rates
    assert "AUD" in rates


@pytest.mark.asyncio
async def test_fetch_ecb_rates_ecb_timeout_raises(monkeypatch):
    """fetch_ecb_rates() propagates network errors so callers can catch them."""
    import httpx

    class _TimeoutClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *_):
            pass
        async def get(self, url):
            raise httpx.TimeoutException("timed out")

    monkeypatch.setattr("httpx.AsyncClient", lambda **kw: _TimeoutClient())

    from services.exchange_rates import fetch_ecb_rates
    with pytest.raises(Exception):
        await fetch_ecb_rates()


# ─── 2. update_exchange_rates ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_exchange_rates_stores_in_db(monkeypatch):
    """update_exchange_rates() must upsert a document in db.exchange_rates."""
    import services.exchange_rates as er_mod

    # Patch fetch_ecb_rates so we don't hit the network
    async def _fake_fetch():
        return {"EUR": 1.0, "USD": 1.0856, "GBP": 0.8567, "KRW": 1520.0}

    monkeypatch.setattr(er_mod, "fetch_ecb_rates", _fake_fetch)

    fake_col = MagicMock()
    fake_col.update_one = AsyncMock()
    monkeypatch.setattr(er_mod, "db", MagicMock(exchange_rates=fake_col))

    doc = await er_mod.update_exchange_rates()

    fake_col.update_one.assert_awaited_once()
    call_args = fake_col.update_one.call_args
    filter_doc, update_doc = call_args[0]

    assert "date" in filter_doc
    assert "$set" in update_doc
    assert update_doc["$set"]["source"] == "ECB"
    assert update_doc["$set"]["base"] == "USD"
    assert isinstance(update_doc["$set"]["rates"], dict)
    assert update_doc["$set"]["rates"]["USD"] == 1.0
    assert "GBP" in update_doc["$set"]["rates"]
    assert doc["date"] == datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ─── 3. get_rate_to_usd — reads from DB ──────────────────────────────────────

@pytest.mark.asyncio
async def test_get_rate_to_usd_reads_from_db(monkeypatch):
    """get_rate_to_usd() must return the rate from the DB document."""
    import services.exchange_rates as er_mod

    db_rates = {"USD": 1.0, "EUR": 1.0856, "KRW": 0.00065}
    fake_col = _make_fake_db_rates(db_rates)
    monkeypatch.setattr(er_mod, "db", MagicMock(exchange_rates=fake_col))

    rate = await er_mod.get_rate_to_usd("KRW")
    assert rate == pytest.approx(0.00065)


@pytest.mark.asyncio
async def test_get_rate_to_usd_usd_is_always_1(monkeypatch):
    """get_rate_to_usd('USD') must return 1.0 without touching the DB."""
    import services.exchange_rates as er_mod

    fake_col = MagicMock()
    fake_col.find_one = AsyncMock(return_value=None)
    monkeypatch.setattr(er_mod, "db", MagicMock(exchange_rates=fake_col))

    rate = await er_mod.get_rate_to_usd("USD")
    assert rate == 1.0
    fake_col.find_one.assert_not_awaited()


# ─── 4. get_rate_to_usd — fallback when DB empty ─────────────────────────────

@pytest.mark.asyncio
async def test_get_rate_to_usd_fallback_when_db_empty(monkeypatch):
    """When DB has no rates, get_rate_to_usd() falls back to FALLBACK_RATES_TO_USD."""
    import services.exchange_rates as er_mod

    fake_col = _make_fake_db_rates(None)
    monkeypatch.setattr(er_mod, "db", MagicMock(exchange_rates=fake_col))

    rate = await er_mod.get_rate_to_usd("EUR")
    # Should match the static fallback
    assert rate == er_mod.FALLBACK_RATES_TO_USD["EUR"]


@pytest.mark.asyncio
async def test_get_all_rates_to_usd_fallback_when_db_empty(monkeypatch):
    """When DB has no rates, get_all_rates_to_usd() returns the static fallback dict."""
    import services.exchange_rates as er_mod

    fake_col = _make_fake_db_rates(None)
    monkeypatch.setattr(er_mod, "db", MagicMock(exchange_rates=fake_col))

    rates = await er_mod.get_all_rates_to_usd()
    assert rates == er_mod.FALLBACK_RATES_TO_USD


# ─── 5. get_all_rates_to_usd — reads from DB ─────────────────────────────────

@pytest.mark.asyncio
async def test_get_all_rates_to_usd_reads_from_db(monkeypatch):
    """get_all_rates_to_usd() returns the full rates dict from the latest DB document."""
    import services.exchange_rates as er_mod

    db_rates = {"USD": 1.0, "EUR": 1.0856, "KRW": 0.00065, "GBP": 1.27}
    fake_col = _make_fake_db_rates(db_rates)
    monkeypatch.setattr(er_mod, "db", MagicMock(exchange_rates=fake_col))

    rates = await er_mod.get_all_rates_to_usd()
    assert rates == db_rates


# ─── 6. ECB timeout → fallback without crash ─────────────────────────────────

@pytest.mark.asyncio
async def test_update_exchange_rates_ecb_timeout_uses_fallback(monkeypatch):
    """
    If fetch_ecb_rates() raises (network error / timeout), update_exchange_rates()
    must propagate the error so the caller (cron) can log and handle it gracefully,
    rather than silently storing stale data.
    """
    import services.exchange_rates as er_mod
    import httpx

    class _TimeoutClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *_):
            pass
        async def get(self, url):
            raise httpx.TimeoutException("timed out")

    monkeypatch.setattr("httpx.AsyncClient", lambda **kw: _TimeoutClient())

    with pytest.raises(Exception):
        await er_mod.update_exchange_rates()


# ─── 7. ledger reads from DB (cache refreshes daily) ─────────────────────────

@pytest.mark.asyncio
async def test_ledger_reads_rates_from_db(monkeypatch):
    """
    ledger._get_rates_to_usd() must delegate to exchange_rates.get_all_rates_to_usd
    and cache the result for the current day.
    """
    import services.ledger as ledger_mod

    db_rates = {"USD": 1.0, "EUR": 1.0856, "KRW": 0.00065}
    mock_get_all = AsyncMock(return_value=db_rates)
    monkeypatch.setattr("services.exchange_rates.get_all_rates_to_usd", mock_get_all)

    # Reset the module-level cache so we get a fresh fetch
    ledger_mod._rates_cache = {}
    ledger_mod._rates_cache_date = ""

    rates = await ledger_mod._get_rates_to_usd()
    assert rates == db_rates
    mock_get_all.assert_awaited_once()


@pytest.mark.asyncio
async def test_ledger_cache_not_refreshed_same_day(monkeypatch):
    """
    ledger._get_rates_to_usd() must NOT call get_all_rates_to_usd again
    if the cache was already populated today.
    """
    import services.ledger as ledger_mod
    from datetime import date

    today = date.today().isoformat()
    cached_rates = {"USD": 1.0, "EUR": 1.09}
    ledger_mod._rates_cache = cached_rates
    ledger_mod._rates_cache_date = today

    mock_get_all = AsyncMock(return_value={})
    monkeypatch.setattr("services.exchange_rates.get_all_rates_to_usd", mock_get_all)

    rates = await ledger_mod._get_rates_to_usd()
    assert rates == cached_rates
    mock_get_all.assert_not_awaited()


# ─── 8. convert_ecb_to_usd helper ────────────────────────────────────────────

def test_convert_ecb_to_usd_usd_is_always_1():
    """convert_ecb_to_usd must set USD=1.0 regardless of input."""
    from services.exchange_rates import convert_ecb_to_usd
    rates_vs_eur = {"EUR": 1.0, "USD": 1.0856, "KRW": 1520.0}
    result = convert_ecb_to_usd(rates_vs_eur)
    assert result["USD"] == 1.0


def test_convert_ecb_to_usd_eur_equals_usd_rate():
    """convert_ecb_to_usd: EUR rate should equal the EUR→USD conversion."""
    from services.exchange_rates import convert_ecb_to_usd
    rates_vs_eur = {"EUR": 1.0, "USD": 1.0856}
    result = convert_ecb_to_usd(rates_vs_eur)
    assert result["EUR"] == pytest.approx(1.0856)


def test_convert_ecb_to_usd_krw_conversion():
    """convert_ecb_to_usd: KRW/USD = EUR/USD ÷ KRW/EUR."""
    from services.exchange_rates import convert_ecb_to_usd
    rates_vs_eur = {"EUR": 1.0, "USD": 1.0856, "KRW": 1520.0}
    result = convert_ecb_to_usd(rates_vs_eur)
    expected_krw_to_usd = round(1.0856 / 1520.0, 8)
    assert result["KRW"] == pytest.approx(expected_krw_to_usd)
