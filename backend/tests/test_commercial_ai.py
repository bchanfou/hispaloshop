"""
Tests for Commercial AI tools and endpoints.
Tool functions use module-level `db` from core.database, so we patch that.
"""
import os
import pytest
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Minimal env vars so modules can be imported without a real .env
os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-hispaloshop-32chars!")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/hispaloshop_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("AUTH_BACKEND_URL", "http://localhost:8000")


# ── Static data tests (no DB needed) ─────────────────────

class TestMarketData:

    def test_market_data_has_9_countries(self):
        """MARKET_DATA must contain exactly 9 export markets."""
        from services.commercial_ai_tools import MARKET_DATA
        assert len(MARKET_DATA) >= 9
        expected = {"DE", "FR", "GB", "US", "JP", "IT", "NL", "SE", "AE"}
        assert expected.issubset(set(MARKET_DATA.keys()))

    def test_each_market_has_required_fields(self):
        """Every market entry must have the core analysis fields."""
        from services.commercial_ai_tools import MARKET_DATA
        required = {
            "name", "flag", "population_m", "gdp_per_capita_eur",
            "spanish_food_imports_eur_m", "growth_yoy_pct",
            "top_categories", "tariff_pct", "certifications_required",
        }
        for code, data in MARKET_DATA.items():
            missing = required - set(data.keys())
            assert not missing, f"{code} missing fields: {missing}"

    def test_resolve_country_fuzzy(self):
        """_resolve_country resolves Spanish names, English names, and codes."""
        from services.commercial_ai_tools import _resolve_country
        assert _resolve_country("Alemania")["name"] == "Alemania"
        assert _resolve_country("DE")["name"] == "Alemania"
        assert _resolve_country("germany")["name"] == "Alemania"
        assert _resolve_country("Francia")["name"] == "Francia"
        assert _resolve_country("EEUU")["name"] == "Estados Unidos"
        assert _resolve_country("dubai")["name"] == "Emiratos Árabes"
        assert _resolve_country("xyznoexiste") is None


# ── Tool function tests (mock DB) ────────────────────────

def _mock_db():
    """Create a mock db with importers and producers collections."""
    mock = MagicMock()

    # importers.find().limit().to_list()
    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=[])
    mock.importers.find.return_value.limit.return_value = mock_cursor
    mock.importers.count_documents = AsyncMock(return_value=0)

    # producers.find_one
    mock.producers.find_one = AsyncMock(return_value={
        "user_id": "user_001",
        "plan": "elite",
    })

    # users.find_one
    mock.users.find_one = AsyncMock(return_value={
        "user_id": "user_001",
        "username": "testproducer",
        "name": "Test Producer",
    })

    # products.count_documents
    mock.products.count_documents = AsyncMock(return_value=12)

    return mock


class TestAnalyzeMarket:

    @pytest.mark.asyncio
    async def test_returns_germany_data(self):
        """analyze_market('DE', 'aceite de oliva') returns structured market data."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import analyze_market
            result = await analyze_market("DE", "aceite de oliva")

        assert result["country"] == "Alemania"
        assert result["flag"] == "🇩🇪"
        assert "market_size_eur_m" in result
        assert "growth_yoy_pct" in result
        assert "tariff_pct" in result
        assert "certifications_required" in result
        assert "competitors" in result
        assert isinstance(result["key_retailers"], list)

    @pytest.mark.asyncio
    async def test_unknown_country_returns_error(self):
        """analyze_market with unknown country returns error dict."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import analyze_market
            result = await analyze_market("Atlantida", "aceite")

        assert "error" in result


class TestSearchImporters:

    @pytest.mark.asyncio
    async def test_returns_list(self):
        """search_importers always returns a list."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import search_importers
            result = await search_importers("DE", "aceite de oliva")

        assert isinstance(result, list)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_with_db_results(self):
        """search_importers returns DB importers when available."""
        mock = _mock_db()
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {
                "_id": "imp_001",
                "company_name": "Deutsche Delikatessen GmbH",
                "country": "Alemania",
                "categories": ["aceite", "conservas"],
                "min_volume_kg": 500,
                "certifications": ["BIO", "HACCP"],
            }
        ])
        mock.importers.find.return_value.limit.return_value = mock_cursor

        with patch("services.commercial_ai_tools.db", mock):
            from services.commercial_ai_tools import search_importers
            result = await search_importers("Alemania")

        assert result[0]["company"] == "Deutsche Delikatessen GmbH"
        assert result[0]["contact_available"] is True


class TestPredictDemand:

    @pytest.mark.asyncio
    async def test_returns_monthly_forecast(self):
        """predict_demand returns monthly forecast array."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import predict_demand
            result = await predict_demand("aceite de oliva", "DE", months=3)

        assert result["country"] == "Alemania"
        assert len(result["monthly_forecast"]) == 3
        for month in result["monthly_forecast"]:
            assert "month" in month
            assert "estimated_volume_kg" in month
            assert "estimated_price_eur_kg" in month
            assert "is_peak" in month
        assert "total_estimated_volume_kg" in result
        assert result["confidence"] in ["alta", "media", "baja"]

    @pytest.mark.asyncio
    async def test_unknown_country_returns_error(self):
        """predict_demand with unknown country returns error."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import predict_demand
            result = await predict_demand("aceite", "Narnia")

        assert "error" in result


class TestGenerateContract:

    @pytest.mark.asyncio
    async def test_returns_contract_structure(self):
        """generate_contract returns all required contract fields."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import generate_contract
            result = await generate_contract(
                producer_name="Finca El Olivo",
                importer_name="Deutsche Delikatessen GmbH",
                product="Aceite de oliva virgen extra",
                country="Alemania",
                volume_kg=5000,
                price_eur_kg=9.50,
                incoterm="FOB",
            )

        assert result["seller"] == "Finca El Olivo"
        assert result["buyer"] == "Deutsche Delikatessen GmbH"
        assert result["destination"] == "Alemania"
        assert result["volume_kg"] == 5000
        assert result["total_eur"] == 47500.0
        assert result["incoterm"] == "FOB"
        assert "payment_terms" in result
        assert "status" in result
        assert "BORRADOR" in result["status"]


class TestCheckProducerPlan:

    @pytest.mark.asyncio
    async def test_elite_producer(self):
        """check_producer_plan detects ELITE plan."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import check_producer_plan
            result = await check_producer_plan("user_001")

        assert result["plan"] == "ELITE"
        assert result["can_use_commercial_ai"] is True
        assert result["can_generate_contracts"] is True

    @pytest.mark.asyncio
    async def test_unknown_producer(self):
        """check_producer_plan returns error for unknown producer."""
        mock = _mock_db()
        mock.producers.find_one = AsyncMock(return_value=None)

        with patch("services.commercial_ai_tools.db", mock):
            from services.commercial_ai_tools import check_producer_plan
            result = await check_producer_plan("nonexistent")

        assert "error" in result


class TestExecuteTool:

    @pytest.mark.asyncio
    async def test_dispatches_analyze_market(self):
        """execute_tool dispatches to analyze_market."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import execute_tool
            result = await execute_tool(
                "analyze_market",
                {"country": "Francia", "product_category": "vino"},
                "user_001",
            )

        assert result["country"] == "Francia"

    @pytest.mark.asyncio
    async def test_unknown_tool_returns_error(self):
        """execute_tool returns error for unknown tool name."""
        with patch("services.commercial_ai_tools.db", _mock_db()):
            from services.commercial_ai_tools import execute_tool
            result = await execute_tool("nonexistent_tool", {}, "user_001")

        assert "error" in result


# ── Endpoint tests ────────────────────────────────────────

class TestCommercialAIEndpoints:

    @pytest.fixture
    async def client(self):
        async with AsyncClient(
            transport=ASGITransport(app=None),
            base_url="http://test",
        ) as c:
            yield c

    @pytest.mark.asyncio
    async def test_markets_endpoint(self):
        """GET /api/v1/commercial-ai/markets returns list of markets."""
        from main import app
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get("/api/v1/commercial-ai/markets")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 9
        for market in data:
            assert "code" in market
            assert "name" in market
            assert "flag" in market
            assert "growth_pct" in market
