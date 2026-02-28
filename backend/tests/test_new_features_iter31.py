"""
Test Suite for Iteration 31 New Features:
1. Email notification on chat message - POST /api/chat/conversations/{id}/messages sends email
2. Customer followed stores API - GET /api/customer/followed-stores
3. Producer Health Score API - GET /api/producer/health-score
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"


class TestSetup:
    """Setup and utility methods"""
    
    @staticmethod
    def login(email: str, password: str) -> dict:
        """Login and return session info"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            # Extract session token from cookie or response
            session_token = data.get("session_token")
            if not session_token:
                cookies = response.cookies
                session_token = cookies.get("session_token")
            return {
                "session_token": session_token,
                "user": data.get("user"),
                "cookies": response.cookies
            }
        return None


class TestCustomerFollowedStores:
    """Test GET /api/customer/followed-stores endpoint"""
    
    def test_followed_stores_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/followed-stores")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Followed stores endpoint requires authentication")
    
    def test_followed_stores_with_customer_auth(self):
        """Test followed stores with customer authentication"""
        # Login as customer
        login_data = TestSetup.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if not login_data:
            pytest.skip("Customer login failed - user may not exist")
        
        session_token = login_data["session_token"]
        
        # Get followed stores
        response = requests.get(
            f"{BASE_URL}/api/customer/followed-stores",
            headers={"Authorization": f"Bearer {session_token}"},
            cookies={"session_token": session_token}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are followed stores, verify structure
        if len(data) > 0:
            store = data[0]
            # Check expected fields
            assert "store_id" in store or "name" in store, "Store should have store_id or name"
            print(f"✓ Customer has {len(data)} followed stores")
        else:
            print("✓ Customer has no followed stores (empty list returned)")
        
        print("✓ GET /api/customer/followed-stores works correctly")


class TestProducerHealthScore:
    """Test GET /api/producer/health-score endpoint"""
    
    def test_health_score_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/producer/health-score")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Health score endpoint requires authentication")
    
    def test_health_score_requires_producer_role(self):
        """Test that endpoint requires producer role"""
        # Login as customer (not producer)
        login_data = TestSetup.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if not login_data:
            pytest.skip("Customer login failed")
        
        session_token = login_data["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/producer/health-score",
            headers={"Authorization": f"Bearer {session_token}"},
            cookies={"session_token": session_token}
        )
        
        # Should return 403 Forbidden for non-producer
        assert response.status_code == 403, f"Expected 403 for non-producer, got {response.status_code}"
        print("✓ Health score endpoint correctly rejects non-producer users")
    
    def test_health_score_with_producer_auth(self):
        """Test health score with producer authentication"""
        # Login as producer
        login_data = TestSetup.login(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        if not login_data:
            pytest.skip("Producer login failed - user may not exist")
        
        session_token = login_data["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/producer/health-score",
            headers={"Authorization": f"Bearer {session_token}"},
            cookies={"session_token": session_token}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "total_score" in data, "Response should have total_score"
        assert "max_score" in data, "Response should have max_score"
        assert "status" in data, "Response should have status"
        assert "status_label" in data, "Response should have status_label"
        assert "status_color" in data, "Response should have status_color"
        assert "breakdown" in data, "Response should have breakdown"
        assert "metrics" in data, "Response should have metrics"
        assert "recommendations" in data, "Response should have recommendations"
        
        # Verify breakdown structure
        breakdown = data["breakdown"]
        assert "sales" in breakdown, "Breakdown should have sales"
        assert "followers" in breakdown, "Breakdown should have followers"
        assert "reviews" in breakdown, "Breakdown should have reviews"
        assert "products" in breakdown, "Breakdown should have products"
        assert "profile" in breakdown, "Breakdown should have profile"
        
        # Verify each breakdown item has score, max, label
        for key, item in breakdown.items():
            assert "score" in item, f"Breakdown {key} should have score"
            assert "max" in item, f"Breakdown {key} should have max"
            assert "label" in item, f"Breakdown {key} should have label"
        
        # Verify metrics structure
        metrics = data["metrics"]
        assert "orders_30d" in metrics, "Metrics should have orders_30d"
        assert "revenue_30d" in metrics, "Metrics should have revenue_30d"
        assert "follower_count" in metrics, "Metrics should have follower_count"
        assert "review_count" in metrics, "Metrics should have review_count"
        assert "avg_rating" in metrics, "Metrics should have avg_rating"
        
        # Verify score is within valid range
        assert 0 <= data["total_score"] <= 100, f"Score should be 0-100, got {data['total_score']}"
        
        # Verify status_color is valid
        valid_colors = ["green", "blue", "yellow", "orange", "red"]
        assert data["status_color"] in valid_colors, f"Invalid status_color: {data['status_color']}"
        
        print(f"✓ Producer health score: {data['total_score']}/100 ({data['status_label']})")
        print(f"  - Sales: {breakdown['sales']['score']}/{breakdown['sales']['max']}")
        print(f"  - Followers: {breakdown['followers']['score']}/{breakdown['followers']['max']}")
        print(f"  - Reviews: {breakdown['reviews']['score']}/{breakdown['reviews']['max']}")
        print(f"  - Products: {breakdown['products']['score']}/{breakdown['products']['max']}")
        print(f"  - Profile: {breakdown['profile']['score']}/{breakdown['profile']['max']}")
        print("✓ GET /api/producer/health-score works correctly")


class TestChatMessagesEndpoint:
    """Test POST /api/chat/conversations/{id}/messages endpoint"""
    
    def test_chat_messages_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations/test-conv-id/messages",
            json={"content": "Test message"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Chat messages endpoint requires authentication")
    
    def test_chat_messages_invalid_conversation(self):
        """Test that endpoint returns 404 for invalid conversation"""
        # Login as customer
        login_data = TestSetup.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if not login_data:
            pytest.skip("Customer login failed")
        
        session_token = login_data["session_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations/invalid-conv-id/messages",
            json={"content": "Test message"},
            headers={"Authorization": f"Bearer {session_token}"},
            cookies={"session_token": session_token}
        )
        
        # Should return 404 for non-existent conversation
        assert response.status_code == 404, f"Expected 404 for invalid conversation, got {response.status_code}"
        print("✓ Chat messages endpoint returns 404 for invalid conversation")


class TestChatConversationsEndpoint:
    """Test GET /api/chat/conversations endpoint"""
    
    def test_conversations_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Chat conversations endpoint requires authentication")
    
    def test_conversations_with_auth(self):
        """Test conversations list with authentication"""
        # Login as customer
        login_data = TestSetup.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if not login_data:
            pytest.skip("Customer login failed")
        
        session_token = login_data["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {session_token}"},
            cookies={"session_token": session_token}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ User has {len(data)} conversations")
        print("✓ GET /api/chat/conversations works correctly")


class TestAuthEndpoints:
    """Test authentication endpoints work correctly"""
    
    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        
        if response.status_code == 401:
            print(f"⚠ Customer login failed - user {CUSTOMER_EMAIL} may not exist")
            pytest.skip("Customer user not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should have user"
        assert "session_token" in data, "Response should have session_token"
        
        user = data["user"]
        assert user.get("email") == CUSTOMER_EMAIL, "Email should match"
        assert user.get("role") == "customer", f"Role should be customer, got {user.get('role')}"
        
        print(f"✓ Customer login successful: {user.get('name')}")
    
    def test_producer_login(self):
        """Test producer login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PRODUCER_EMAIL, "password": PRODUCER_PASSWORD}
        )
        
        if response.status_code == 401:
            print(f"⚠ Producer login failed - user {PRODUCER_EMAIL} may not exist")
            pytest.skip("Producer user not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should have user"
        
        user = data["user"]
        assert user.get("email") == PRODUCER_EMAIL, "Email should match"
        assert user.get("role") == "producer", f"Role should be producer, got {user.get('role')}"
        
        print(f"✓ Producer login successful: {user.get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
