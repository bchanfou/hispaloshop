"""
Test Account Deletion Feature
Tests DELETE /api/account/delete endpoint for both customer and producer roles
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAccountDeletion:
    """Test account deletion endpoint"""
    
    @pytest.fixture
    def customer_session(self):
        """Login as customer and return session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        data = response.json()
        session = requests.Session()
        session.cookies.set('session_token', data.get('session_token', ''))
        session.headers.update({'Authorization': f"Bearer {data.get('session_token', '')}"})
        return session
    
    @pytest.fixture
    def producer_session(self):
        """Login as producer and return session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "producer@test.com",
            "password": "producer123"
        })
        if response.status_code != 200:
            pytest.skip("Producer login failed")
        data = response.json()
        session = requests.Session()
        session.cookies.set('session_token', data.get('session_token', ''))
        session.headers.update({'Authorization': f"Bearer {data.get('session_token', '')}"})
        return session
    
    def test_delete_account_requires_auth(self):
        """Test that delete account requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/account/delete", json={
            "password": "test123",
            "confirmation": "DELETE"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Delete account requires authentication (401)")
    
    def test_delete_account_requires_confirmation(self, customer_session):
        """Test that delete account requires DELETE confirmation"""
        response = customer_session.delete(f"{BASE_URL}/api/account/delete", json={
            "password": "password123",
            "confirmation": "delete"  # lowercase should fail
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "DELETE" in data.get("detail", ""), f"Expected DELETE error message, got: {data}"
        print("✓ Delete account requires uppercase DELETE confirmation")
    
    def test_delete_account_requires_correct_password(self, customer_session):
        """Test that delete account requires correct password"""
        response = customer_session.delete(f"{BASE_URL}/api/account/delete", json={
            "password": "wrongpassword",
            "confirmation": "DELETE"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "password" in data.get("detail", "").lower(), f"Expected password error, got: {data}"
        print("✓ Delete account requires correct password")
    
    def test_delete_account_endpoint_exists(self, customer_session):
        """Test that the delete account endpoint exists and validates input"""
        # Test with empty body
        response = customer_session.delete(f"{BASE_URL}/api/account/delete", json={})
        # Should return 422 (validation error) or 400, not 404
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Delete account endpoint exists and validates input")
    
    def test_producer_delete_account_validation(self, producer_session):
        """Test producer account deletion validation"""
        response = producer_session.delete(f"{BASE_URL}/api/account/delete", json={
            "password": "wrongpassword",
            "confirmation": "DELETE"
        })
        # Should fail with incorrect password
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Producer delete account validates password")


class TestAccountDeletionWithTestUser:
    """Test actual account deletion with a test user (creates and deletes)"""
    
    def test_create_and_delete_test_customer(self):
        """Create a test customer and delete their account"""
        # Create unique test user
        test_email = f"test_delete_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "testpassword123"
        
        # Register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "name": "Test Delete User",
            "password": test_password,
            "role": "customer",
            "country": "ES"
        })
        
        if register_response.status_code != 200:
            pytest.skip(f"Registration failed: {register_response.text}")
        
        print(f"✓ Created test user: {test_email}")
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        session_token = login_response.json().get('session_token', '')
        
        # Create session
        session = requests.Session()
        session.cookies.set('session_token', session_token)
        session.headers.update({'Authorization': f"Bearer {session_token}"})
        
        # Verify user exists
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"Get me failed: {me_response.text}"
        print("✓ Test user logged in successfully")
        
        # Delete account
        delete_response = session.delete(f"{BASE_URL}/api/account/delete", json={
            "password": test_password,
            "confirmation": "DELETE"
        })
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        data = delete_response.json()
        assert "deleted" in data.get("message", "").lower(), f"Expected success message, got: {data}"
        print("✓ Account deleted successfully")
        
        # Verify user cannot login anymore
        login_again = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        assert login_again.status_code == 401, f"Expected 401 after deletion, got {login_again.status_code}"
        print("✓ Deleted user cannot login anymore")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
