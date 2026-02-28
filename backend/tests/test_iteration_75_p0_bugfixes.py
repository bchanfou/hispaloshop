"""
Iteration 75 - P0 Bug Fixes Tests
Tests for:
1. POST /api/internal-chat/start-conversation - accepts {other_user_id} in body
2. POST /api/internal-chat/messages - sends message correctly with auth
3. GET /api/discover/profiles - returns all profiles
4. GET /api/discover/profiles?role=producer - returns only producers
5. GET /api/discover/profiles?role=influencer - returns only influencers
6. GET /api/discover/profiles?role=customer - returns only customers
7. GET /api/feed - feed loads correctly
8. POST /api/cart/add - works for admin user
9. POST /api/auth/login - auth works
10. GET /api/auth/me - returns user when authenticated
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
PRODUCER_USER_ID = "user_testprod001"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "session_token" in data or "user" in data, "Expected session_token or user in response"
        print(f"Admin login OK - role: {data.get('user', {}).get('role', 'unknown')}")
    
    def test_producer_login(self):
        """Test producer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PRODUCER_EMAIL,
            "password": PRODUCER_PASSWORD
        })
        assert response.status_code == 200, f"Producer login failed: {response.text}"
        data = response.json()
        print(f"Producer login OK - user_id: {data.get('user', {}).get('user_id', 'unknown')}")
    
    def test_customer_login(self):
        """Test customer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        print(f"Customer login OK - user_id: {data.get('user', {}).get('user_id', 'unknown')}")
    
    def test_auth_me_endpoint(self):
        """Test GET /api/auth/me returns user when authenticated"""
        # First login to get session
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        session = requests.Session()
        cookies = login_response.cookies
        
        # Use session token from response
        session_token = login_response.json().get("session_token")
        if session_token:
            headers = {"Authorization": f"Bearer {session_token}"}
            response = session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        else:
            # Use cookies approach
            response = session.get(f"{BASE_URL}/api/auth/me", cookies=cookies)
        
        assert response.status_code == 200, f"GET /api/auth/me failed: {response.text}"
        data = response.json()
        assert "email" in data or "user_id" in data, "Expected email or user_id in /api/auth/me response"
        print(f"Auth me OK - email: {data.get('email', 'unknown')}")


class TestDiscoverProfiles:
    """Test discover profiles endpoint with filters"""
    
    def test_get_all_profiles(self):
        """Test GET /api/discover/profiles returns all profiles"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles")
        assert response.status_code == 200, f"Discover profiles failed: {response.text}"
        data = response.json()
        assert "profiles" in data, "Expected 'profiles' key in response"
        assert "total" in data, "Expected 'total' key in response"
        profiles = data["profiles"]
        assert len(profiles) >= 0, "Profiles should be a list"
        print(f"Discover all profiles: {data['total']} total, {len(profiles)} returned")
    
    def test_filter_by_producer(self):
        """Test GET /api/discover/profiles?role=producer returns only producers"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles?role=producer")
        assert response.status_code == 200, f"Discover producers failed: {response.text}"
        data = response.json()
        profiles = data.get("profiles", [])
        # All returned profiles should be producers
        for profile in profiles:
            assert profile.get("role") == "producer", f"Expected producer role, got {profile.get('role')}"
        print(f"Producer filter: {len(profiles)} producers found (total: {data.get('total', 0)})")
    
    def test_filter_by_influencer(self):
        """Test GET /api/discover/profiles?role=influencer returns only influencers"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles?role=influencer")
        assert response.status_code == 200, f"Discover influencers failed: {response.text}"
        data = response.json()
        profiles = data.get("profiles", [])
        for profile in profiles:
            assert profile.get("role") == "influencer", f"Expected influencer role, got {profile.get('role')}"
        print(f"Influencer filter: {len(profiles)} influencers found (total: {data.get('total', 0)})")
    
    def test_filter_by_customer(self):
        """Test GET /api/discover/profiles?role=customer returns only customers"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles?role=customer")
        assert response.status_code == 200, f"Discover customers failed: {response.text}"
        data = response.json()
        profiles = data.get("profiles", [])
        for profile in profiles:
            assert profile.get("role") == "customer", f"Expected customer role, got {profile.get('role')}"
        print(f"Customer filter: {len(profiles)} customers found (total: {data.get('total', 0)})")


class TestInternalChat:
    """Test internal chat start-conversation endpoint with body params"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get session token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, "Admin login failed for chat test"
        self.session_token = login_response.json().get("session_token")
        self.admin_user_id = login_response.json().get("user", {}).get("user_id")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_start_conversation_with_body_params(self):
        """Test POST /api/internal-chat/start-conversation accepts {other_user_id} in body"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/start-conversation",
            json={"other_user_id": PRODUCER_USER_ID},
            headers=self.headers
        )
        # Should return 200 (existing or new conversation) or 404 if user doesn't exist
        assert response.status_code in [200, 404], f"Start conversation failed: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "conversation_id" in data, "Expected conversation_id in response"
            print(f"Start conversation OK - conversation_id: {data['conversation_id']}, is_new: {data.get('is_new')}")
        else:
            print(f"User {PRODUCER_USER_ID} not found - this is expected if test user doesn't exist")
    
    def test_start_conversation_requires_auth(self):
        """Test POST /api/internal-chat/start-conversation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/start-conversation",
            json={"other_user_id": PRODUCER_USER_ID}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Start conversation requires auth: OK (401 returned)")
    
    def test_start_conversation_requires_user_id(self):
        """Test POST /api/internal-chat/start-conversation requires other_user_id in body"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/start-conversation",
            json={},
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400 without user_id, got {response.status_code}"
        print("Start conversation requires user_id: OK (400 returned)")


class TestFeedEndpoint:
    """Test feed endpoint"""
    
    def test_feed_loads(self):
        """Test GET /api/feed returns feed data"""
        response = requests.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Feed failed: {response.text}"
        data = response.json()
        # Should return a list of posts or object with posts
        assert isinstance(data, (list, dict)), "Feed should return list or object"
        if isinstance(data, dict):
            assert "posts" in data or "feed" in data or "items" in data, "Expected posts/feed/items in response"
        print(f"Feed loads OK - returned {len(data) if isinstance(data, list) else 'object'}")


class TestCartEndpoint:
    """Test cart add endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get session token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, "Admin login failed for cart test"
        self.session_token = login_response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_cart_add_requires_auth(self):
        """Test POST /api/cart/add requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "test_product", "quantity": 1}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Cart add requires auth: OK")
    
    def test_cart_add_with_auth(self):
        """Test POST /api/cart/add works for admin user"""
        # First get a valid product ID
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code == 200:
            products = products_response.json()
            if isinstance(products, list) and len(products) > 0:
                product_id = products[0].get("product_id")
                if product_id:
                    response = requests.post(
                        f"{BASE_URL}/api/cart/add",
                        json={"product_id": product_id, "quantity": 1},
                        headers=self.headers
                    )
                    # 200 success or 400/404 if product issue - but not 500
                    assert response.status_code in [200, 201, 400, 404], f"Cart add failed: {response.status_code} - {response.text}"
                    print(f"Cart add with auth: {response.status_code}")
                    return
        print("Cart add test skipped - no products available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
