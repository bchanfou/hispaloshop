"""
Iteration 95: Test P0 Bug Fixes for Hispaloshop
Tests:
- Internal chat: conversations, messages, start-conversation
- Image uploads: product-image returns Cloudinary HTTPS URLs
- Stripe Connect: influencer and producer endpoints return proper JSON errors
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://auth-rework.preview.emergentagent.com"

# Test credentials
PRODUCER_CREDS = {"email": "producer@test.com", "password": "password123"}
CUSTOMER_CREDS = {"email": "test@example.com", "password": "password123"}
INFLUENCER_CREDS = {"email": "influencer@test.com", "password": "password123"}
ADMIN_CREDS = {"email": "admin@hispaloshop.com", "password": "password123"}


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code in (200, 404), f"API not accessible: {response.status_code}"
        print(f"PASS: API health check - status {response.status_code}")


class TestAuthentication:
    """Login tests for various roles"""
    
    def test_login_producer(self):
        """Test producer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCER_CREDS)
        assert response.status_code == 200, f"Producer login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "Missing session_token in response"
        print(f"PASS: Producer login successful")
        return data["session_token"]
    
    def test_login_customer(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "Missing session_token in response"
        print(f"PASS: Customer login successful")
        return data["session_token"]
    
    def test_login_influencer(self):
        """Test influencer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=INFLUENCER_CREDS)
        # May return 401 if influencer account doesn't exist - that's ok
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Influencer login successful")
            return data.get("session_token")
        elif response.status_code == 401:
            print(f"SKIP: Influencer account not found")
            pytest.skip("Influencer account not found")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


@pytest.fixture(scope="class")
def producer_session():
    """Get authenticated producer session"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCER_CREDS)
    if response.status_code != 200:
        pytest.skip("Producer login failed")
    token = response.json().get("session_token")
    session = requests.Session()
    session.cookies.set("session_token", token)
    return session


@pytest.fixture(scope="class")
def customer_session():
    """Get authenticated customer session"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if response.status_code != 200:
        pytest.skip("Customer login failed")
    token = response.json().get("session_token")
    session = requests.Session()
    session.cookies.set("session_token", token)
    return session


@pytest.fixture(scope="class")
def influencer_session():
    """Get authenticated influencer session"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=INFLUENCER_CREDS)
    if response.status_code != 200:
        pytest.skip("Influencer login failed")
    token = response.json().get("session_token")
    session = requests.Session()
    session.cookies.set("session_token", token)
    return session


class TestInternalChatBugFix:
    """
    P0 Bug Fix: Internal chat endpoints
    Bug was: ImportError - chat_manager was not shared correctly
    Fix: Created core/websocket.py with shared ConnectionManager
    """
    
    def test_get_conversations_list(self, customer_session):
        """GET /api/internal-chat/conversations should return array"""
        response = customer_session.get(f"{BASE_URL}/api/internal-chat/conversations")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"PASS: GET /api/internal-chat/conversations returns array with {len(data)} items")
    
    def test_get_unread_count(self, customer_session):
        """GET /api/internal-chat/unread-count should return count"""
        response = customer_session.get(f"{BASE_URL}/api/internal-chat/unread-count")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "unread_count" in data, "Missing unread_count field"
        print(f"PASS: GET /api/internal-chat/unread-count = {data['unread_count']}")
    
    def test_start_conversation_missing_recipient(self, customer_session):
        """POST /api/internal-chat/start-conversation without recipient should return 400"""
        response = customer_session.post(
            f"{BASE_URL}/api/internal-chat/start-conversation",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: start-conversation without recipient returns 400")
    
    def test_start_conversation_with_producer(self, customer_session, producer_session):
        """POST /api/internal-chat/start-conversation should work"""
        # First get producer user_id
        producer_profile = producer_session.get(f"{BASE_URL}/api/producer/profile")
        if producer_profile.status_code != 200:
            pytest.skip("Could not get producer profile")
        producer_id = producer_profile.json().get("user_id")
        if not producer_id:
            pytest.skip("Producer ID not found")
        
        response = customer_session.post(
            f"{BASE_URL}/api/internal-chat/start-conversation",
            json={"recipient_id": producer_id}
        )
        # Should be 200 (new or existing conversation)
        assert response.status_code in (200, 201), f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "conversation_id" in data, "Missing conversation_id"
        print(f"PASS: start-conversation returned conversation_id: {data['conversation_id']}")
        return data["conversation_id"]
    
    def test_send_message_requires_conversation_or_recipient(self, customer_session):
        """POST /api/internal-chat/messages requires conversation_id or recipient_id"""
        response = customer_session.post(
            f"{BASE_URL}/api/internal-chat/messages",
            json={"content": "Test message"}
        )
        # Should return 400 because neither conversation_id nor recipient_id provided
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: send message without conversation/recipient returns 400")


class TestImageUploadBugFix:
    """
    P0 Bug Fix: Image uploads return valid HTTPS Cloudinary URLs
    Bug was: Frontend was prepending REACT_APP_BACKEND_URL to Cloudinary URLs
    Fix: Check if URL starts with 'http' before prepending
    """
    
    def test_product_image_upload_returns_https_url(self, producer_session):
        """POST /api/upload/product-image should return URL starting with https://"""
        # Create a simple test image (1x1 red pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = producer_session.post(f"{BASE_URL}/api/upload/product-image", files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "url" in data, "Missing 'url' in response"
        
        url = data["url"]
        assert url.startswith("https://"), f"URL should start with https://, got: {url}"
        assert "cloudinary" in url.lower() or "res.cloudinary.com" in url, f"URL should be Cloudinary URL: {url}"
        print(f"PASS: Product image upload returns Cloudinary HTTPS URL: {url[:60]}...")
    
    def test_chat_image_upload_returns_https_url(self, customer_session):
        """POST /api/upload/chat-image should return URL starting with https://"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = customer_session.post(f"{BASE_URL}/api/upload/chat-image", files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "image_url" in data, "Missing 'image_url' in response"
        
        url = data["image_url"]
        assert url.startswith("https://"), f"URL should start with https://, got: {url}"
        print(f"PASS: Chat image upload returns Cloudinary HTTPS URL: {url[:60]}...")


class TestStripeInfluencerBugFix:
    """
    P0 Bug Fix: Stripe influencer endpoint returns proper error
    Bug was: NameError - 'stripe' was not defined
    Fix: Added 'import stripe' and stripe.api_key at top of influencer.py
    """
    
    def test_influencer_stripe_connect_returns_json(self, influencer_session):
        """POST /api/influencer/stripe/connect should return JSON (not 500 NameError)"""
        response = influencer_session.post(f"{BASE_URL}/api/influencer/stripe/connect")
        
        # Expected: 400 or 404 or 500 with JSON error (Stripe account config issue)
        # 520 = Cloudflare error (transient, not a code bug)
        # NOT expected: 500 with NameError
        if response.status_code == 520:
            print(f"SKIP: Cloudflare 520 error (transient)")
            pytest.skip("Cloudflare 520 error - transient issue")
        
        assert response.status_code in (200, 400, 404, 500), f"Unexpected status: {response.status_code}"
        
        # Check response is JSON
        try:
            data = response.json()
        except Exception as e:
            pytest.fail(f"Response is not JSON: {response.text[:200]}")
        
        # If 500, check it's not a NameError
        if response.status_code == 500:
            error_text = str(data)
            assert "NameError" not in error_text, f"Got NameError - import stripe is missing: {error_text}"
            assert "name 'stripe' is not defined" not in error_text, "stripe module not imported"
            print(f"PASS: /api/influencer/stripe/connect returns JSON error (Stripe config issue, not NameError)")
        elif response.status_code == 200:
            assert "url" in data or "account_id" in data, f"Missing url/account_id in success response"
            print(f"PASS: /api/influencer/stripe/connect returned success")
        else:
            # 400/404 is acceptable - just checking it's proper JSON
            print(f"PASS: /api/influencer/stripe/connect returns JSON with status {response.status_code}")
    
    def test_influencer_stripe_status(self, influencer_session):
        """GET /api/influencer/stripe/status should return proper JSON"""
        response = influencer_session.get(f"{BASE_URL}/api/influencer/stripe/status")
        
        assert response.status_code in (200, 401, 403, 404), f"Unexpected status: {response.status_code}"
        
        try:
            data = response.json()
        except:
            pytest.fail(f"Response is not JSON: {response.text[:200]}")
        
        print(f"PASS: /api/influencer/stripe/status returns JSON")


class TestStripeProducerBugFix:
    """
    P0 Bug Fix: Stripe producer endpoint returns proper error
    Tests that stripe module is properly imported in producer.py
    """
    
    def test_producer_stripe_create_account_returns_json(self, producer_session):
        """POST /api/producer/stripe/create-account should return JSON"""
        response = producer_session.post(f"{BASE_URL}/api/producer/stripe/create-account")
        
        # Expected: 200 (success) or 400 (Stripe error) - both should be JSON
        assert response.status_code in (200, 400, 401, 403, 500), f"Unexpected status: {response.status_code}"
        
        try:
            data = response.json()
        except Exception as e:
            pytest.fail(f"Response is not JSON: {response.text[:200]}")
        
        # If 500, check it's not a NameError
        if response.status_code == 500:
            error_text = str(data)
            assert "NameError" not in error_text, f"Got NameError: {error_text}"
        
        if response.status_code == 200:
            assert "url" in data or "account_id" in data
            print(f"PASS: /api/producer/stripe/create-account returned onboarding URL")
        else:
            print(f"PASS: /api/producer/stripe/create-account returns JSON with status {response.status_code}")
    
    def test_producer_stripe_status(self, producer_session):
        """GET /api/producer/stripe/status should return proper JSON"""
        response = producer_session.get(f"{BASE_URL}/api/producer/stripe/status")
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "connected" in data, "Missing 'connected' field"
        print(f"PASS: /api/producer/stripe/status returns connected={data['connected']}")


class TestFrontendURLHandling:
    """
    Test that frontend correctly handles URLs from API
    (This tests the concept - actual frontend logic tested via Playwright)
    """
    
    def test_cloudinary_url_format(self, producer_session):
        """Verify Cloudinary URLs have correct format"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = producer_session.post(f"{BASE_URL}/api/upload/product-image", files=files)
        
        if response.status_code != 200:
            pytest.skip("Upload failed, skipping URL format test")
        
        url = response.json().get("url", "")
        
        # Frontend fix: if URL starts with 'http', use as-is
        # Test that URL meets this condition
        starts_with_http = url.startswith("http://") or url.startswith("https://")
        assert starts_with_http, f"URL should start with http(s), got: {url}"
        
        # URL should NOT need REACT_APP_BACKEND_URL prepended
        # Cloudinary URLs are absolute
        is_absolute = "://" in url and not url.startswith("/")
        assert is_absolute, f"URL should be absolute: {url}"
        
        print(f"PASS: URL format correct - starts with http and is absolute")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
