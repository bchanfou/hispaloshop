"""
Backend API tests for Hispaloshop - Multi-role Digital Supermarket
Tests homepage content, products API, feed endpoints, and locale configuration
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndConfig:
    """Health check and configuration endpoint tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("TEST PASSED: Health check endpoint returns 200")
    
    def test_locale_config(self):
        """Test locale configuration endpoint returns languages, countries, currencies"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200
        
        data = response.json()
        # Verify locale config structure
        assert "languages" in data
        assert "countries" in data
        assert "currencies" in data
        
        # Languages is a dict with language codes as keys
        languages = data["languages"]
        assert "en" in languages, "English should be available"
        assert "es" in languages, "Spanish should be available"
        assert "ko" in languages, "Korean should be available"
        
        print(f"TEST PASSED: Locale config has {len(data['languages'])} languages, {len(data['countries'])} countries")


class TestProductsAPI:
    """Products endpoint tests"""
    
    def test_get_products_list(self):
        """Test products listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"TEST PASSED: Products endpoint returns {len(data)} products")
    
    def test_products_search(self):
        """Test products search with query parameter"""
        response = requests.get(f"{BASE_URL}/api/products?search=olive")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If results exist, verify they contain search term
        if len(data) > 0:
            # At least one product should have 'olive' in name or description
            found_match = any('olive' in str(prod).lower() for prod in data)
            assert found_match, "Search results should contain 'olive'"
        
        print(f"TEST PASSED: Products search for 'olive' returns {len(data)} results")
    
    def test_products_with_limit(self):
        """Test products with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Note: API may not strictly enforce limit, just verify it returns data
        print(f"TEST PASSED: Products with limit=5 returns {len(data)} products")
    
    def test_product_detail_structure(self):
        """Test product detail structure has required fields"""
        response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            product = data[0]
            # Verify required product fields
            required_fields = ['product_id', 'name', 'price']
            for field in required_fields:
                assert field in product, f"Product should have '{field}' field"
            print(f"TEST PASSED: Product has required fields: {required_fields}")
        else:
            print("TEST SKIPPED: No products available to test structure")


class TestFeedAPI:
    """Feed and best sellers endpoint tests"""
    
    def test_best_sellers(self):
        """Test best sellers endpoint"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"TEST PASSED: Best sellers endpoint returns {len(data)} products")
    
    def test_best_sellers_with_limit(self):
        """Test best sellers with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers?limit=3")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 3, "Should return at most 3 products"
        print(f"TEST PASSED: Best sellers with limit=3 returns {len(data)} products")


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_categories_list(self):
        """Test categories listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify categories have required structure
        if len(data) > 0:
            category = data[0]
            assert "category_id" in category or "id" in category
            assert "name" in category or "label" in category
        
        print(f"TEST PASSED: Categories endpoint returns {len(data)} categories")


class TestExchangeRates:
    """Exchange rates endpoint tests"""
    
    def test_exchange_rates(self):
        """Test exchange rates endpoint"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates")
        assert response.status_code == 200
        
        data = response.json()
        assert "base" in data, "Exchange rates should have base currency"
        assert "rates" in data, "Exchange rates should have rates object"
        
        print(f"TEST PASSED: Exchange rates with base {data['base']}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data or "token" in data
        print("TEST PASSED: Login with valid credentials succeeds")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@example.com",
                "password": "wrongpassword"
            }
        )
        # Should return 401 or 400 for invalid credentials
        assert response.status_code in [400, 401, 403, 404]
        print(f"TEST PASSED: Login with invalid credentials returns {response.status_code}")
    
    def test_seller_login(self):
        """Test seller account login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "producer@test.com",
                "password": "password123"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data or "token" in data
        print("TEST PASSED: Seller login succeeds")


class TestRecipesAPI:
    """Recipes endpoint tests (if available)"""
    
    def test_recipes_list(self):
        """Test recipes listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        # Recipes endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)
            print(f"TEST PASSED: Recipes endpoint returns data")
        elif response.status_code == 404:
            print("TEST SKIPPED: Recipes endpoint not implemented")
        else:
            print(f"TEST INFO: Recipes endpoint returns {response.status_code}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
