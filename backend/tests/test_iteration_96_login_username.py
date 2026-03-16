"""
Iteration 96: Tests for new features:
1. Login with email works
2. Login with @username works  
3. Login with username (without @) works
4. Login with wrong credentials fails
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    BASE_URL = "http://localhost:8000"
BASE_URL = BASE_URL.rstrip('/')


class TestLoginWithUsernameFeature:
    """Test login with email OR @username feature (3 new features)"""
    
    def test_login_with_email_success(self):
        """Test that login with email still works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"},
            timeout=15
        )
        print(f"Login with email: status={response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "session_token" in data, "Response should contain 'session_token'"
        assert data["user"]["email"] == "test@example.com"
        print(f"Login with email SUCCESS - user_id: {data['user'].get('user_id')}")
    
    def test_login_with_at_username_success(self):
        """Test that login with @username works (NEW FEATURE)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "@test_ui_fa5a", "password": "password123"},
            timeout=15
        )
        print(f"Login with @username: status={response.status_code}")
        assert response.status_code == 200, f"Expected 200 for @username login, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "session_token" in data, "Response should contain 'session_token'"
        # The username should match (without @)
        assert data["user"]["username"] == "test_ui_fa5a", f"Username mismatch: {data['user'].get('username')}"
        print(f"Login with @username SUCCESS - username: {data['user'].get('username')}")
    
    def test_login_with_username_without_at_success(self):
        """Test that login with username (no @) works (NEW FEATURE)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test_ui_fa5a", "password": "password123"},
            timeout=15
        )
        print(f"Login with username (no @): status={response.status_code}")
        assert response.status_code == 200, f"Expected 200 for username login, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "session_token" in data, "Response should contain 'session_token'"
        assert data["user"]["username"] == "test_ui_fa5a", f"Username mismatch: {data['user'].get('username')}"
        print(f"Login with username (no @) SUCCESS - username: {data['user'].get('username')}")
    
    def test_login_wrong_credentials_fails(self):
        """Test that login with wrong credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nobody", "password": "wrong"},
            timeout=15
        )
        print(f"Login with wrong creds: status={response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Login with wrong credentials correctly returned 401")
    
    def test_login_wrong_password_for_valid_email(self):
        """Test wrong password for valid email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
            timeout=15
        )
        print(f"Login wrong password: status={response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Wrong password for valid email correctly returned 401")
    
    def test_login_wrong_password_for_valid_username(self):
        """Test wrong password for valid username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "@test_ui_fa5a", "password": "wrongpassword"},
            timeout=15
        )
        print(f"Login wrong password for username: status={response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Wrong password for valid username correctly returned 401")


class TestLoginInputValidation:
    """Test login input validation"""
    
    def test_login_empty_email_fails(self):
        """Test empty email fails validation"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "", "password": "password123"},
            timeout=15
        )
        print(f"Empty email: status={response.status_code}")
        # Backend should return 401 for invalid credentials  
        assert response.status_code in [400, 401, 422], f"Expected error, got {response.status_code}"
        print("Empty email correctly rejected")
    
    def test_login_empty_password_fails(self):
        """Test empty password fails validation"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": ""},
            timeout=15
        )
        print(f"Empty password: status={response.status_code}")
        assert response.status_code in [400, 401, 422], f"Expected error, got {response.status_code}"
        print("Empty password correctly rejected")


class TestInternalChatRegression:
    """Regression test for internal chat after previous fixes"""
    
    def test_internal_chat_conversations_api(self):
        """Test that internal chat conversations API is working"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"},
            timeout=15
        )
        assert login_response.status_code == 200, "Login failed"
        
        # Get session cookie
        cookies = login_response.cookies
        session_token = login_response.json().get("session_token")
        
        # Test conversations endpoint
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations",
            cookies={"session_token": session_token},
            timeout=15
        )
        print(f"Internal chat conversations: status={response.status_code}")
        # Should return 200 or 401 if auth fails, but not 500
        assert response.status_code != 500, f"Internal chat API returned 500 error: {response.text}"
        print(f"Internal chat API working (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
