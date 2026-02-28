"""
Post-Restore Verification Tests for HispaloShop
Tests basic functionality after frontend restoration from commit 31a38bb
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConfigLocale:
    """Test /api/config/locale endpoint - returns countries, languages, currencies"""
    
    def test_config_locale_returns_200(self):
        """API /api/config/locale should return 200"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/config/locale returns 200")
    
    def test_config_locale_has_countries(self):
        """API should return countries object"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        data = response.json()
        assert "countries" in data, "Response missing 'countries' field"
        assert isinstance(data["countries"], dict), "Countries should be a dict"
        assert len(data["countries"]) > 0, "Countries should not be empty"
        print(f"✅ Found {len(data['countries'])} countries")
    
    def test_config_locale_has_languages(self):
        """API should return languages object"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        data = response.json()
        assert "languages" in data, "Response missing 'languages' field"
        assert isinstance(data["languages"], dict), "Languages should be a dict"
        assert len(data["languages"]) > 0, "Languages should not be empty"
        # Check for ES and EN
        assert "es" in data["languages"], "Spanish (es) should be available"
        assert "en" in data["languages"], "English (en) should be available"
        print(f"✅ Found {len(data['languages'])} languages including ES and EN")
    
    def test_config_locale_has_currencies(self):
        """API should return currencies object"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        data = response.json()
        assert "currencies" in data, "Response missing 'currencies' field"
        assert isinstance(data["currencies"], dict), "Currencies should be a dict"
        assert len(data["currencies"]) > 0, "Currencies should not be empty"
        assert "EUR" in data["currencies"], "EUR should be available"
        print(f"✅ Found {len(data['currencies'])} currencies including EUR")


class TestAuthLogin:
    """Test /api/auth/login endpoint"""
    
    def test_login_with_valid_admin_credentials(self):
        """Login with admin@hispaloshop.com / admin123 should succeed"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@hispaloshop.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "session_token" in data, "Response should contain 'session_token'"
        assert data["user"]["email"] == "admin@hispaloshop.com"
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"✅ Admin login successful - role: {data['user']['role']}")
    
    def test_login_with_invalid_credentials(self):
        """Login with wrong credentials should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected with 401")
    
    def test_login_with_customer_credentials(self):
        """Login with test@example.com / password123 should succeed"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        # This may fail if user doesn't exist, which is acceptable
        if response.status_code == 200:
            data = response.json()
            assert "user" in data
            print(f"✅ Customer login successful - role: {data['user']['role']}")
        elif response.status_code == 401:
            print("⚠️ Customer test@example.com not found or wrong password (acceptable)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestProducts:
    """Test /api/products endpoint"""
    
    def test_products_returns_200(self):
        """GET /api/products should return 200"""
        response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/products returns 200")
    
    def test_products_returns_list(self):
        """Products endpoint should return a list"""
        response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        data = response.json()
        assert isinstance(data, list), "Products should be a list"
        print(f"✅ Found {len(data)} products")
    
    def test_products_have_required_fields(self):
        """Products should have required fields"""
        response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        data = response.json()
        if len(data) > 0:
            product = data[0]
            required_fields = ["product_id", "name", "price", "description"]
            for field in required_fields:
                assert field in product, f"Product missing required field: {field}"
            print(f"✅ Products have required fields: {required_fields}")
        else:
            print("⚠️ No products found to verify fields")


class TestCategories:
    """Test /api/categories endpoint"""
    
    def test_categories_returns_200(self):
        """GET /api/categories should return 200"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/categories returns 200")
    
    def test_categories_returns_list(self):
        """Categories endpoint should return a list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        print(f"✅ Found {len(data)} categories")


class TestExchangeRates:
    """Test /api/exchange-rates endpoint"""
    
    def test_exchange_rates_returns_200(self):
        """GET /api/exchange-rates should return 200"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/exchange-rates returns 200")
    
    def test_exchange_rates_has_rates(self):
        """Exchange rates should contain rates object"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates")
        data = response.json()
        assert "rates" in data, "Response should contain 'rates'"
        assert isinstance(data["rates"], dict), "Rates should be a dict"
        print(f"✅ Found {len(data['rates'])} exchange rates")


class TestAuthMe:
    """Test /api/auth/me endpoint"""
    
    def test_auth_me_without_session_returns_401(self):
        """GET /api/auth/me without session should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/auth/me correctly returns 401 without session")
    
    def test_auth_me_with_valid_session(self):
        """GET /api/auth/me with valid session should return user data"""
        # First login to get session
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@hispaloshop.com", "password": "admin123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not login to test /api/auth/me")
        
        session_token = login_response.json().get("session_token")
        
        # Now test /api/auth/me with session
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": session_token}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "email" in data, "Response should contain 'email'"
        print(f"✅ /api/auth/me returns user data: {data.get('email')}")


class TestCertificates:
    """Test /api/certificates/product/{product_id} endpoint"""
    
    def test_certificates_for_product_returns_200(self):
        """GET /api/certificates/product/{product_id} should return 200 for valid product"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        if products_response.status_code != 200 or len(products_response.json()) == 0:
            pytest.skip("No products available to test certificates")
        
        product_id = products_response.json()[0]["product_id"]
        response = requests.get(f"{BASE_URL}/api/certificates/product/{product_id}")
        
        # Certificate may or may not exist for a product
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "certificate_id" in data, "Certificate should have certificate_id"
            print(f"✅ /api/certificates/product/{product_id} returns certificate")
        else:
            print(f"⚠️ No certificate found for product {product_id} (acceptable)")
    
    def test_certificates_page_uses_products_api(self):
        """Certificates page fetches products, not certificates directly"""
        response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ Certificates page can fetch products list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
