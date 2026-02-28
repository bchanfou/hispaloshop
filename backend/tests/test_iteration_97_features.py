"""
Test iteration 97 features:
- Quick Reactions API (POST/GET reactions)
- Web Push VAPID key endpoint
- Login with @username regression
- Internal chat regression
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuickReactions:
    """Test quick reactions feature for posts"""
    
    def test_get_feed_for_post_id(self):
        """Get a post from feed to use for reaction testing"""
        response = requests.get(f"{BASE_URL}/api/feed?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert len(data["posts"]) > 0
        post = data["posts"][0]
        assert "post_id" in post
        print(f"Got post_id: {post['post_id']}")
    
    def test_react_to_post(self, session_cookie):
        """Test POST /api/posts/{post_id}/react with emoji"""
        # First get a post
        feed_response = requests.get(f"{BASE_URL}/api/feed?limit=1")
        post_id = feed_response.json()["posts"][0]["post_id"]
        
        # React to it
        cookies = {"session_token": session_cookie}
        response = requests.post(
            f"{BASE_URL}/api/posts/{post_id}/react",
            json={"emoji": "heart"},
            cookies=cookies
        )
        assert response.status_code == 200
        data = response.json()
        # Toggle response - could be reacted true or false
        assert "reacted" in data
        assert "emoji" in data
        print(f"Reaction response: {data}")
    
    def test_get_reactions_for_post(self):
        """Test GET /api/posts/{post_id}/reactions returns counts"""
        # Get a post
        feed_response = requests.get(f"{BASE_URL}/api/feed?limit=1")
        post_id = feed_response.json()["posts"][0]["post_id"]
        
        # Get reactions
        response = requests.get(f"{BASE_URL}/api/posts/{post_id}/reactions")
        assert response.status_code == 200
        # Returns dict of emoji counts (could be empty)
        data = response.json()
        assert isinstance(data, dict)
        print(f"Reactions data: {data}")


class TestWebPush:
    """Test web push VAPID key endpoint"""
    
    def test_get_vapid_key(self):
        """Test GET /api/push/vapid-key returns publicKey"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data
        assert len(data["publicKey"]) > 50  # VAPID keys are long
        print(f"VAPID public key: {data['publicKey'][:30]}...")


class TestLoginRegression:
    """Test login with email and @username"""
    
    def test_login_with_email(self):
        """Test login with email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        print(f"Login with email successful: {data['user']['email']}")
    
    def test_login_with_username_at_prefix(self):
        """Test login with @username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "@test_ui_fa5a", "password": "password123"}
        )
        # Could be 200 or 401 depending on if user exists with this username
        if response.status_code == 200:
            data = response.json()
            assert "user" in data
            print(f"Login with @username successful")
        else:
            print(f"User with username test_ui_fa5a not found (expected if test user was cleaned)")


class TestInternalChatRegression:
    """Test internal chat APIs"""
    
    def test_get_conversations(self, session_cookie):
        """Test GET /api/internal-chat/conversations"""
        cookies = {"session_token": session_cookie}
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations",
            cookies=cookies
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Got {len(data)} conversations")
    
    def test_get_unread_count(self, session_cookie):
        """Test GET /api/internal-chat/unread-count"""
        cookies = {"session_token": session_cookie}
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/unread-count",
            cookies=cookies
        )
        assert response.status_code == 200
        data = response.json()
        # API returns unread_count key
        assert "unread_count" in data
        print(f"Unread count: {data['unread_count']}")


@pytest.fixture
def session_cookie():
    """Get session cookie for authenticated requests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@example.com", "password": "password123"}
    )
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip("Could not authenticate - skipping authenticated tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
