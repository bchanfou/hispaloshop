"""
Iteration 68 - Config Routes Modularization Tests

Tests the extracted routes from server.py to routes/config.py:
- Config endpoints (countries, languages, currencies, locale)
- Categories CRUD
- Regions by country
- Exchange rates
- User locale
- User address
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"


class TestAuthentication:
    """Authentication tests to get session tokens"""
    
    def test_admin_login(self):
        """Login as admin for subsequent tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful")
        return data["session_token"]
    
    def test_customer_login(self):
        """Login as customer for subsequent tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        print(f"✓ Customer login successful")
        return data["session_token"]


class TestConfigCountries:
    """Test /api/config/countries endpoint"""
    
    def test_get_countries_returns_18(self):
        """GET /api/config/countries should return 18 countries"""
        response = requests.get(f"{BASE_URL}/api/config/countries")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected dict of countries"
        country_count = len(data)
        assert country_count == 18, f"Expected 18 countries, got {country_count}"
        
        # Verify key countries exist
        assert "ES" in data, "Spain not in countries"
        assert "US" in data, "US not in countries"
        assert "KR" in data, "South Korea not in countries"
        
        # Verify country structure
        spain = data["ES"]
        assert "name" in spain
        assert "currency" in spain
        print(f"✓ GET /api/config/countries returns {country_count} countries")


class TestConfigLanguages:
    """Test /api/config/languages endpoint"""
    
    def test_get_languages(self):
        """GET /api/config/languages should return language list"""
        response = requests.get(f"{BASE_URL}/api/config/languages")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected dict of languages"
        assert len(data) > 0, "Languages should not be empty"
        
        # Verify key languages
        assert "en" in data or "English" in str(data), "English not in languages"
        assert "es" in data or "Spanish" in str(data), "Spanish not in languages"
        print(f"✓ GET /api/config/languages returns {len(data)} languages")


class TestConfigCurrencies:
    """Test /api/config/currencies endpoint"""
    
    def test_get_currencies(self):
        """GET /api/config/currencies should return currency list"""
        response = requests.get(f"{BASE_URL}/api/config/currencies")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected dict of currencies"
        assert len(data) > 0, "Currencies should not be empty"
        
        # Verify key currencies
        assert "EUR" in data, "EUR not in currencies"
        assert "USD" in data, "USD not in currencies"
        print(f"✓ GET /api/config/currencies returns {len(data)} currencies")


class TestConfigLocale:
    """Test /api/config/locale full locale config endpoint"""
    
    def test_get_full_locale_config(self):
        """GET /api/config/locale should return full locale config with defaults"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "countries" in data, "Missing countries"
        assert "languages" in data, "Missing languages"
        assert "currencies" in data, "Missing currencies"
        assert "default_country" in data, "Missing default_country"
        assert "default_language" in data, "Missing default_language"
        assert "default_currency" in data, "Missing default_currency"
        
        # Verify defaults
        assert data["default_country"] == "ES", f"Expected default_country ES, got {data['default_country']}"
        assert data["default_language"] == "en", f"Expected default_language en, got {data['default_language']}"
        assert data["default_currency"] == "EUR", f"Expected default_currency EUR, got {data['default_currency']}"
        print(f"✓ GET /api/config/locale returns full config with correct defaults")


class TestConfigRegions:
    """Test /api/config/regions endpoints"""
    
    def test_get_all_regions(self):
        """GET /api/config/regions should return all regions"""
        response = requests.get(f"{BASE_URL}/api/config/regions")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should be a dict with country codes as keys
        assert isinstance(data, dict), "Expected dict of regions by country"
        assert "ES" in data, "Spain regions missing"
        assert "US" in data, "US regions missing"
        assert "KR" in data, "South Korea regions missing"
        print(f"✓ GET /api/config/regions returns regions for {len(data)} countries")
    
    def test_get_spain_regions_has_19(self):
        """GET /api/config/regions/ES should return 19 regions for Spain"""
        response = requests.get(f"{BASE_URL}/api/config/regions/ES")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "name" in data, "Missing country name"
        assert "regions" in data, "Missing regions list"
        assert data["name"] == "España", f"Expected name España, got {data['name']}"
        
        regions = data["regions"]
        region_count = len(regions)
        assert region_count == 19, f"Expected 19 regions for Spain, got {region_count}"
        
        # Verify region structure
        assert all("code" in r and "name" in r for r in regions), "Regions missing code or name"
        
        # Verify some specific regions exist
        region_codes = [r["code"] for r in regions]
        assert "AN" in region_codes, "Andalucía missing"
        assert "CT" in region_codes, "Cataluña missing"
        assert "MD" in region_codes, "Madrid missing"
        print(f"✓ GET /api/config/regions/ES returns {region_count} regions")
    
    def test_get_us_regions(self):
        """GET /api/config/regions/US should return US states"""
        response = requests.get(f"{BASE_URL}/api/config/regions/US")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "name" in data
        assert "regions" in data
        assert data["name"] == "United States"
        
        regions = data["regions"]
        assert len(regions) >= 50, f"Expected at least 50 US states, got {len(regions)}"
        
        # Verify some specific states
        state_codes = [r["code"] for r in regions]
        assert "CA" in state_codes, "California missing"
        assert "NY" in state_codes, "New York missing"
        assert "TX" in state_codes, "Texas missing"
        print(f"✓ GET /api/config/regions/US returns {len(regions)} states")
    
    def test_get_invalid_country_returns_404(self):
        """GET /api/config/regions/INVALID should return 404"""
        response = requests.get(f"{BASE_URL}/api/config/regions/INVALID")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/config/regions/INVALID returns 404")
    
    def test_case_insensitive_country_code(self):
        """GET /api/config/regions/es should work (lowercase)"""
        response = requests.get(f"{BASE_URL}/api/config/regions/es")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == "España"
        print(f"✓ GET /api/config/regions/es (lowercase) works")


class TestExchangeRates:
    """Test /api/exchange-rates endpoint"""
    
    def test_get_exchange_rates(self):
        """GET /api/exchange-rates should return EUR base rates"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "base" in data, "Missing base currency"
        assert "rates" in data, "Missing rates"
        assert "updated_at" in data, "Missing updated_at"
        
        # Verify base is EUR
        assert data["base"] == "EUR", f"Expected base EUR, got {data['base']}"
        
        # Verify rates structure
        rates = data["rates"]
        assert isinstance(rates, dict), "Rates should be dict"
        
        # Verify key currencies in rates
        assert "USD" in rates, "USD rate missing"
        assert "GBP" in rates, "GBP rate missing"
        assert "EUR" in rates, "EUR rate missing"
        
        # EUR rate should be 1.0
        assert rates["EUR"] == 1.0, f"EUR rate should be 1.0, got {rates['EUR']}"
        
        # USD rate should be reasonable (0.5 - 2.0)
        assert 0.5 < rates["USD"] < 2.0, f"USD rate {rates['USD']} seems unreasonable"
        
        print(f"✓ GET /api/exchange-rates returns EUR-based rates with {len(rates)} currencies")


class TestCategories:
    """Test /api/categories endpoints"""
    
    def test_get_categories(self):
        """GET /api/categories should return categories list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of categories"
        print(f"✓ GET /api/categories returns {len(data)} categories")
    
    def test_create_category_requires_admin(self):
        """POST /api/categories without admin should fail"""
        # Login as customer
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        customer_token = login_resp.json()["session_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            json={"name": "Test Category", "description": "Test"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ POST /api/categories requires admin (returns 403 for customer)")
    
    def test_create_category_as_admin(self):
        """POST /api/categories as admin should work"""
        # Login as admin
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        admin_token = login_resp.json()["session_token"]
        
        # Create test category
        test_name = f"TEST_Category_{datetime.now().strftime('%H%M%S')}"
        response = requests.post(
            f"{BASE_URL}/api/categories",
            json={"name": test_name, "description": "Test category for iteration 68"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "category_id" in data, "Missing category_id"
        assert data["name"] == test_name
        assert "slug" in data
        
        # Cleanup - delete the test category
        category_id = data["category_id"]
        cleanup_resp = requests.delete(
            f"{BASE_URL}/api/categories/{category_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert cleanup_resp.status_code == 200, f"Cleanup failed: {cleanup_resp.text}"
        
        print(f"✓ POST /api/categories as admin creates category successfully")


class TestUserLocale:
    """Test /api/user/locale endpoints (authenticated)"""
    
    def test_get_user_locale_unauthenticated_fails(self):
        """GET /api/user/locale without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/user/locale")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/user/locale requires auth (returns 401)")
    
    def test_get_user_locale_authenticated(self):
        """GET /api/user/locale with auth should return locale settings"""
        # Login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = login_resp.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/user/locale",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify locale structure
        assert "country" in data, "Missing country"
        assert "language" in data, "Missing language"
        assert "currency" in data, "Missing currency"
        print(f"✓ GET /api/user/locale returns locale settings")
    
    def test_update_user_locale(self):
        """PUT /api/user/locale should update locale settings"""
        # Login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = login_resp.json()["session_token"]
        
        # Update locale
        response = requests.put(
            f"{BASE_URL}/api/user/locale",
            json={"country": "US", "language": "en", "currency": "USD"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify update
        get_resp = requests.get(
            f"{BASE_URL}/api/user/locale",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = get_resp.json()
        assert data["country"] == "US"
        assert data["currency"] == "USD"
        
        # Restore original locale (ES/EUR)
        requests.put(
            f"{BASE_URL}/api/user/locale",
            json={"country": "ES", "language": "en", "currency": "EUR"},
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"✓ PUT /api/user/locale updates locale successfully")


class TestUserAddress:
    """Test /api/user/address endpoints (authenticated)"""
    
    def test_get_user_address_unauthenticated_fails(self):
        """GET /api/user/address without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/user/address")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/user/address requires auth (returns 401)")
    
    def test_get_user_address_authenticated(self):
        """GET /api/user/address with auth should work"""
        # Login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = login_resp.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/user/address",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "address" in data, "Missing address field"
        print(f"✓ GET /api/user/address returns address data")
    
    def test_update_user_address(self):
        """PUT /api/user/address should update address"""
        # Login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        token = login_resp.json()["session_token"]
        
        # Update address
        test_address = {
            "full_name": "Test User Iteration 68",
            "street": "123 Test Street",
            "city": "Barcelona",
            "postal_code": "08001",
            "country": "ES",
            "phone": "+34600000000"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/user/address",
            json=test_address,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify update
        assert "address" in data
        assert data["address"]["street"] == "123 Test Street"
        assert data["address"]["city"] == "Barcelona"
        print(f"✓ PUT /api/user/address updates address successfully")


class TestProductsStillWork:
    """Verify products listing still works after modularization"""
    
    def test_get_products(self):
        """GET /api/products should still work"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of products"
        print(f"✓ GET /api/products still works, returns {len(data)} products")


class TestAuthStillWorks:
    """Verify auth still works after modularization"""
    
    def test_auth_login(self):
        """POST /api/auth/login should still work"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        print(f"✓ POST /api/auth/login still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
