"""
Bug Fixes Testing - Iteration 103
Tests for 6 reported bugs in Hispaloshop:
- Bug Fix 1 (P0): Hi AI Chat LANGUAGE_NAMES fix
- Bug Fix 2 (P1): Profile Button Navigation to /user/{user_id}
- Bug Fix 3 (P1): Seller Earnings Page useTranslation fix
- Bug Fix 4 (P2): Create Recipe Form Mobile responsive layout
- Bug Fix 5 (P2): Mobile Post Creation gallery-first flow
- Bug Fix 6 (P1): Sales Assistant Chat UI white text
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://auth-rework.preview.emergentagent.com').rstrip('/')


class TestAIChatBugFix:
    """Bug Fix 1: AI Chat endpoint LANGUAGE_NAMES fix"""
    
    def test_chat_message_endpoint_no_500_error(self):
        """POST /api/chat/message should return 200, not 500"""
        # First login to get session
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        
        session_token = login_response.json().get("session_token")
        cookies = {"session_token": session_token}
        
        # Test chat message endpoint
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            json={"message": "Hola", "language": "es"},
            cookies=cookies,
            timeout=60
        )
        
        # Should NOT return 500 (the bug was LANGUAGE_NAMES not defined)
        assert response.status_code != 500, f"Chat endpoint returned 500 error: {response.text}"
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        print(f"SUCCESS: Chat endpoint returned 200 with response: {data.get('response', '')[:100]}...")


class TestProducerPaymentsEndpoint:
    """Bug Fix 3: Producer Payments endpoint (tests backend part)"""
    
    def test_producer_payments_endpoint(self):
        """GET /api/producer/payments should return 200 for producer"""
        # Login as producer
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        
        session_token = login_response.json().get("session_token")
        cookies = {"session_token": session_token}
        
        # Test producer payments endpoint
        response = requests.get(
            f"{BASE_URL}/api/producer/payments",
            cookies=cookies
        )
        
        assert response.status_code == 200, f"Producer payments returned {response.status_code}: {response.text}"
        
        data = response.json()
        # Check expected fields exist
        assert "total_gross" in data
        assert "total_net" in data
        print(f"SUCCESS: Producer payments endpoint works. Gross: {data.get('total_gross', 0)}€")


class TestSellerAIAssistantEndpoint:
    """Bug Fix 6: Seller AI Assistant endpoint (tests backend part)"""
    
    def test_seller_ai_assistant_requires_subscription(self):
        """POST /api/ai/seller-assistant should work for PRO/ELITE plans"""
        # Login as producer
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        
        session_token = login_response.json().get("session_token")
        cookies = {"session_token": session_token}
        
        # Test seller AI endpoint (may require PRO plan)
        response = requests.post(
            f"{BASE_URL}/api/ai/seller-assistant",
            json={"message": "Analiza mis ventas"},
            cookies=cookies,
            timeout=60
        )
        
        # Either 200 (if PRO/ELITE) or 403 (if FREE plan)
        assert response.status_code in [200, 403], f"Seller AI returned unexpected status: {response.status_code}"
        
        if response.status_code == 403:
            print("INFO: Producer is on FREE plan - upgrade required for Seller AI")
        else:
            print("SUCCESS: Seller AI endpoint works for this producer")


class TestAuthEndpoints:
    """Test auth endpoints work correctly"""
    
    def test_login_customer(self):
        """Customer login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["user_id"] == "user_test123"
        assert data["user"]["role"] == "customer"
        print(f"SUCCESS: Customer login works, user_id: {data['user']['user_id']}")
    
    def test_login_producer(self):
        """Producer login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "producer"
        print(f"SUCCESS: Producer login works, user_id: {data['user']['user_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
