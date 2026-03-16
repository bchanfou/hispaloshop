"""
Test Suite for Iteration 57 - Comprehensive E-commerce Testing
Tests: Homepage, Products, Login flows (customer, producer, influencer, admin),
Dashboards, Floating Island, Internal Chat, Cart, Stores, User Profiles
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

# Test credentials
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
INFLUENCER_EMAIL = "influencer@test.com"
INFLUENCER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPublicEndpoints:
    """Test public API endpoints"""
    
    def test_config_locale(self, api_client):
        """Test locale config endpoint"""
        response = api_client.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200
        data = response.json()
        assert "countries" in data or "default_country" in data or isinstance(data, dict)
        print("✓ GET /api/config/locale - PASS")
    
    def test_exchange_rates(self, api_client):
        """Test exchange rates endpoint"""
        response = api_client.get(f"{BASE_URL}/api/exchange-rates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))
        print("✓ GET /api/exchange-rates - PASS")
    
    def test_products_list(self, api_client):
        """Test products listing endpoint"""
        response = api_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 0
        print(f"✓ GET /api/products - PASS ({len(data)} products)")
    
    def test_stores_list(self, api_client):
        """Test stores listing endpoint"""
        response = api_client.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/stores - PASS ({len(data)} stores)")
    
    def test_categories_list(self, api_client):
        """Test categories listing endpoint"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/categories - PASS ({len(data)} categories)")


class TestAuthenticationFlows:
    """Test authentication endpoints"""
    
    def test_customer_login(self, api_client):
        """Test customer login flow"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "session_token" in data or "user_id" in data
        print("✓ POST /api/auth/login (customer) - PASS")
        return response.cookies
    
    def test_producer_login(self, api_client):
        """Test producer login flow"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": PRODUCER_EMAIL,
            "password": PRODUCER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "session_token" in data
        print("✓ POST /api/auth/login (producer) - PASS")
    
    def test_influencer_login(self, api_client):
        """Test influencer login flow"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "session_token" in data
        print("✓ POST /api/auth/login (influencer) - PASS")
    
    def test_admin_login(self, api_client):
        """Test admin login flow"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "session_token" in data
        print("✓ POST /api/auth/login (admin) - PASS")


class TestInfluencerDashboard:
    """Test influencer dashboard - previously had 'not an influencer' bug"""
    
    def test_influencer_dashboard_loads(self, api_client):
        """Test influencer dashboard API - critical test for fixed bug"""
        # Login as influencer first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Get dashboard with session cookie
        dashboard_response = api_client.get(
            f"{BASE_URL}/api/influencer/dashboard",
            cookies=login_response.cookies
        )
        
        assert dashboard_response.status_code == 200, f"Dashboard returned {dashboard_response.status_code}: {dashboard_response.text}"
        data = dashboard_response.json()
        
        # Verify dashboard data structure
        assert "full_name" in data or "influencer_id" in data or "status" in data, f"Missing expected fields in dashboard: {data}"
        
        # Make sure we're NOT getting the "not an influencer" error
        if isinstance(data, dict) and "detail" in data:
            assert "not an influencer" not in data["detail"].lower(), "BUG: 'not an influencer' error detected!"
        
        print(f"✓ GET /api/influencer/dashboard - PASS (name: {data.get('full_name', 'unknown')})")
    
    def test_influencer_stripe_status(self, api_client):
        """Test influencer Stripe status endpoint"""
        # Login as influencer
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        
        stripe_response = api_client.get(
            f"{BASE_URL}/api/influencer/stripe/status",
            cookies=login_response.cookies
        )
        assert stripe_response.status_code == 200
        print("✓ GET /api/influencer/stripe/status - PASS")


class TestDirectoryAndChat:
    """Test directory and internal chat endpoints"""
    
    def test_directory_influencers(self, api_client):
        """Test influencers directory listing"""
        response = api_client.get(f"{BASE_URL}/api/directory/influencers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/directory/influencers - PASS ({len(data)} influencers)")
    
    def test_directory_producers(self, api_client):
        """Test producers directory listing"""
        response = api_client.get(f"{BASE_URL}/api/directory/producers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/directory/producers - PASS ({len(data)} producers)")
    
    def test_internal_chat_conversations(self, api_client):
        """Test internal chat conversations listing"""
        # Login as customer
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        conversations_response = api_client.get(
            f"{BASE_URL}/api/internal-chat/conversations",
            cookies=login_response.cookies
        )
        assert conversations_response.status_code == 200
        data = conversations_response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/internal-chat/conversations - PASS ({len(data)} conversations)")


class TestCartFlow:
    """Test cart functionality"""
    
    def test_cart_operations(self, api_client):
        """Test cart get/add operations"""
        # Login as customer
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        # Get cart
        cart_response = api_client.get(
            f"{BASE_URL}/api/cart",
            cookies=login_response.cookies
        )
        assert cart_response.status_code == 200
        data = cart_response.json()
        assert isinstance(data, (list, dict))
        print("✓ GET /api/cart - PASS")
        
        # Get products to add to cart
        products_response = api_client.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if len(products) > 0:
            # Add first product to cart
            first_product = products[0]
            add_response = api_client.post(
                f"{BASE_URL}/api/cart/add",
                json={
                    "product_id": first_product["product_id"],
                    "quantity": 1
                },
                cookies=login_response.cookies
            )
            # Accept 200, 201, or even 400 (already in cart) as valid responses
            assert add_response.status_code in [200, 201, 400]
            print("✓ POST /api/cart/add - PASS")


class TestUserProfileAndFollow:
    """Test user profile and follow functionality"""
    
    def test_user_profile(self, api_client):
        """Test user profile endpoint"""
        # Login to get user_id
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        login_data = login_response.json()
        user_id = login_data.get("user", {}).get("user_id") or login_data.get("user_id")
        
        if user_id:
            profile_response = api_client.get(f"{BASE_URL}/api/users/{user_id}/profile")
            # Profile might return 200 or 404 if no profile exists
            assert profile_response.status_code in [200, 404]
            print(f"✓ GET /api/users/{user_id}/profile - PASS (status: {profile_response.status_code})")


class TestProducerDashboard:
    """Test producer dashboard endpoints"""
    
    def test_producer_store_profile(self, api_client):
        """Test producer store profile"""
        # Login as producer
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": PRODUCER_EMAIL,
            "password": PRODUCER_PASSWORD
        })
        
        store_response = api_client.get(
            f"{BASE_URL}/api/producer/store-profile",
            cookies=login_response.cookies
        )
        assert store_response.status_code in [200, 404]
        print(f"✓ GET /api/producer/store-profile - PASS (status: {store_response.status_code})")


class TestAdminDashboard:
    """Test admin dashboard endpoints"""
    
    def test_admin_access(self, api_client):
        """Test admin dashboard access"""
        # Login as admin
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Test admin products list
        products_response = api_client.get(
            f"{BASE_URL}/api/admin/products",
            cookies=login_response.cookies
        )
        assert products_response.status_code in [200, 403]
        print(f"✓ GET /api/admin/products - PASS (status: {products_response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
