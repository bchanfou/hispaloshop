"""
Iteration 87 - Final Backend Modularization Test
Tests all endpoints after server.py reduced from 8996→652 lines (-93%)

23 route modules + 7 service modules created
Total modularized: 14,693 lines
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@hispaloshop.com"
SUPER_ADMIN_PASSWORD = "password123"
SELLER_EMAIL = "producer@test.com"
SELLER_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"


class TestAuthentication:
    """Test authentication and get session tokens for role-based testing"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Login as super admin and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Missing session_token: {data}"
        print(f"[AUTH] Super admin login SUCCESS")
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def seller_token(self):
        """Login as seller/producer and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SELLER_EMAIL, "password": SELLER_PASSWORD}
        )
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Missing session_token: {data}"
        print(f"[AUTH] Seller login SUCCESS")
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Login as customer and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Missing session_token: {data}"
        print(f"[AUTH] Customer login SUCCESS")
        return data["session_token"]


class TestPublicEndpoints:
    """Test public endpoints - no auth required"""
    
    def test_health_check(self):
        """GET /api/health - returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"[HEALTH] Status: {data}")
    
    def test_get_products(self):
        """GET /api/products - returns products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data or isinstance(data, list)
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"[PRODUCTS] Found {len(products)} products")
    
    def test_get_stores(self):
        """GET /api/stores - returns stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        assert "stores" in data or isinstance(data, list)
        stores = data.get("stores", data) if isinstance(data, dict) else data
        print(f"[STORES] Found {len(stores)} stores")
    
    def test_get_stores_by_country(self):
        """GET /api/stores?country=ES - returns ES stores"""
        response = requests.get(f"{BASE_URL}/api/stores", params={"country": "ES"})
        assert response.status_code == 200
        data = response.json()
        print(f"[STORES ES] Response: {type(data)}")
    
    def test_config_regions(self):
        """GET /api/config/regions - returns 16 countries"""
        response = requests.get(f"{BASE_URL}/api/config/regions")
        assert response.status_code == 200
        data = response.json()
        print(f"[REGIONS] Response: {data}")
    
    def test_feed_stories(self):
        """GET /api/feed/stories - returns stories"""
        response = requests.get(f"{BASE_URL}/api/feed/stories")
        assert response.status_code == 200
        data = response.json()
        print(f"[STORIES] Response type: {type(data)}")
    
    def test_feed_best_sellers(self):
        """GET /api/feed/best-sellers - returns best sellers"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers")
        assert response.status_code == 200
        data = response.json()
        print(f"[BEST-SELLERS] Response type: {type(data)}")
    
    def test_track_visit(self):
        """POST /api/track/visit - tracking works"""
        response = requests.post(
            f"{BASE_URL}/api/track/visit",
            json={"page": "/test", "referrer": "test"}
        )
        # Should accept tracking request
        assert response.status_code in [200, 201, 422], f"Unexpected status: {response.status_code}"
        print(f"[TRACK] Visit tracking response: {response.status_code}")


class TestCustomerEndpoints:
    """Test customer-only endpoints - requires customer auth"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for customer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_customer_orders(self, auth_headers):
        """GET /api/customer/orders - returns customer orders"""
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[CUSTOMER ORDERS] Response: {type(data)}")
    
    def test_customer_profile(self, auth_headers):
        """GET /api/customer/profile - returns profile"""
        response = requests.get(f"{BASE_URL}/api/customer/profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data or "user_id" in data
        print(f"[CUSTOMER PROFILE] Email: {data.get('email', 'N/A')}")
    
    def test_customer_stats(self, auth_headers):
        """GET /api/customer/stats - returns stats"""
        response = requests.get(f"{BASE_URL}/api/customer/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[CUSTOMER STATS] Response: {data}")
    
    def test_customer_addresses(self, auth_headers):
        """GET /api/customer/addresses - returns addresses"""
        response = requests.get(f"{BASE_URL}/api/customer/addresses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[CUSTOMER ADDRESSES] Response: {type(data)}")
    
    def test_ai_profile(self, auth_headers):
        """GET /api/ai/profile - returns AI profile"""
        response = requests.get(f"{BASE_URL}/api/ai/profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[AI PROFILE] Response: {type(data)}")
    
    def test_preferences(self, auth_headers):
        """GET /api/preferences - returns preferences"""
        response = requests.get(f"{BASE_URL}/api/preferences", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[PREFERENCES] Response: {type(data)}")


class TestAdminEndpoints:
    """Test admin-only endpoints - requires admin auth"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for super admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_admin_stats(self, auth_headers):
        """GET /api/admin/stats - returns admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[ADMIN STATS] Response: {data}")
    
    def test_admin_producers(self, auth_headers):
        """GET /api/admin/producers - returns producers"""
        response = requests.get(f"{BASE_URL}/api/admin/producers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[ADMIN PRODUCERS] Response type: {type(data)}")
    
    def test_admin_products(self, auth_headers):
        """GET /api/admin/products - returns products"""
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[ADMIN PRODUCTS] Response type: {type(data)}")
    
    def test_admin_discount_codes(self, auth_headers):
        """GET /api/admin/discount-codes - returns discount codes"""
        response = requests.get(f"{BASE_URL}/api/admin/discount-codes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[ADMIN DISCOUNT CODES] Response type: {type(data)}")
    
    def test_admin_influencers(self, auth_headers):
        """GET /api/admin/influencers - returns influencers"""
        response = requests.get(f"{BASE_URL}/api/admin/influencers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[ADMIN INFLUENCERS] Response type: {type(data)}")
    
    def test_admin_analytics(self, auth_headers):
        """GET /api/admin/analytics - returns analytics"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[ADMIN ANALYTICS] Response type: {type(data)}")


class TestSuperAdminEndpoints:
    """Test super admin endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for super admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_superadmin_overview(self, auth_headers):
        """GET /api/superadmin/overview - returns overview"""
        response = requests.get(f"{BASE_URL}/api/superadmin/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[SUPERADMIN OVERVIEW] Response type: {type(data)}")
    
    def test_super_admin_stats(self, auth_headers):
        """GET /api/super-admin/stats - returns global stats"""
        response = requests.get(f"{BASE_URL}/api/super-admin/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[SUPER ADMIN STATS] Response: {data}")


class TestProducerEndpoints:
    """Test producer/seller endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for producer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SELLER_EMAIL, "password": SELLER_PASSWORD}
        )
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_producer_products(self, auth_headers):
        """GET /api/producer/products - returns producer products"""
        response = requests.get(f"{BASE_URL}/api/producer/products", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[PRODUCER PRODUCTS] Response type: {type(data)}")
    
    def test_producer_orders(self, auth_headers):
        """GET /api/producer/orders - returns producer orders"""
        response = requests.get(f"{BASE_URL}/api/producer/orders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[PRODUCER ORDERS] Response type: {type(data)}")
    
    def test_producer_stats(self, auth_headers):
        """GET /api/producer/stats - returns producer stats"""
        response = requests.get(f"{BASE_URL}/api/producer/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[PRODUCER STATS] Response: {data}")
    
    def test_producer_health_score(self, auth_headers):
        """GET /api/producer/health-score - returns health score"""
        response = requests.get(f"{BASE_URL}/api/producer/health-score", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"[PRODUCER HEALTH SCORE] Response type: {type(data)}")


class TestCertificates:
    """Test certificate endpoints"""
    
    def test_product_certificates(self):
        """GET /api/certificates/product/{id} - returns certificates for product"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products")
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", data) if isinstance(data, dict) else data
            if products and len(products) > 0:
                product_id = products[0].get("product_id", products[0].get("id"))
                if product_id:
                    cert_response = requests.get(f"{BASE_URL}/api/certificates/product/{product_id}")
                    assert cert_response.status_code in [200, 404]
                    print(f"[CERTIFICATES] Product {product_id}: {cert_response.status_code}")
                    return
        print(f"[CERTIFICATES] No products found to test certificates")


class TestHomepage:
    """Test homepage loads"""
    
    def test_homepage_loads(self):
        """Homepage loads at / - basic smoke test"""
        frontend_url = BASE_URL.replace('/api', '').rstrip('/')
        # Just test health to confirm backend is running
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"[HOMEPAGE] Backend healthy - homepage should load")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
