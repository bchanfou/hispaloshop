"""
Iteration 91 Tests - Logo, Mobile Responsiveness, Translations, Certificates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://auth-rework.preview.emergentagent.com')

class TestCertificatesEndpoint:
    """Test the new certificates products endpoint"""
    
    def test_get_certificates_products_endpoint_exists(self):
        """GET /api/certificates/products should return 200"""
        response = requests.get(f"{BASE_URL}/api/certificates/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/certificates/products returns 200")
    
    def test_certificates_products_returns_products_array(self):
        """Response should have products array"""
        response = requests.get(f"{BASE_URL}/api/certificates/products")
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        assert isinstance(data["products"], list), "Products should be a list"
        print(f"PASS: Response contains products array with {len(data['products'])} items")
    
    def test_certificates_products_have_certifications(self):
        """Products should have certifications array"""
        response = requests.get(f"{BASE_URL}/api/certificates/products")
        data = response.json()
        
        if len(data["products"]) == 0:
            pytest.skip("No certified products found")
        
        # Check first product has certifications
        first_product = data["products"][0]
        assert "certifications" in first_product, "Product should have certifications field"
        assert isinstance(first_product["certifications"], list), "Certifications should be a list"
        print(f"PASS: Products have certifications array. First product: {first_product.get('name', 'Unknown')}")
        print(f"  Certifications: {first_product['certifications']}")
    
    def test_certificates_products_have_required_fields(self):
        """Products should have required fields for display"""
        response = requests.get(f"{BASE_URL}/api/certificates/products")
        data = response.json()
        
        if len(data["products"]) == 0:
            pytest.skip("No certified products found")
        
        required_fields = ["product_id", "name", "images", "certifications"]
        first_product = data["products"][0]
        
        for field in required_fields:
            assert field in first_product, f"Product should have '{field}' field"
        
        print(f"PASS: Products have all required fields: {required_fields}")


class TestAuthTranslations:
    """Test login/register endpoints exist"""
    
    def test_login_endpoint_exists(self):
        """POST /api/auth/login should exist"""
        # Just test that endpoint exists (don't need valid login)
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "invalid"
        })
        # 401 means endpoint exists but credentials invalid
        assert response.status_code in [200, 401, 422], f"Expected 200/401/422, got {response.status_code}"
        print(f"PASS: Login endpoint exists (status: {response.status_code})")
    
    def test_register_endpoint_exists(self):
        """POST /api/auth/register should exist"""
        # Just test endpoint exists with invalid data
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@test.com"
        })
        # 422 validation error is expected
        assert response.status_code in [200, 201, 400, 422], f"Expected 200/201/400/422, got {response.status_code}"
        print(f"PASS: Register endpoint exists (status: {response.status_code})")


class TestStoresEndpoint:
    """Test stores endpoint"""
    
    def test_stores_endpoint_exists(self):
        """GET /api/stores should return stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Stores response should be a list"
        print(f"PASS: GET /api/stores returns {len(data)} stores")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
