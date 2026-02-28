"""
Iteration 94 Tests: Hispalostories (24h ephemeral stories) + BottomNavBar feature
Tests for:
- POST /api/stories - create a story
- GET /api/stories - get all active story groups  
- GET /api/stories/mine - get own stories
- DELETE /api/stories/{story_id} - delete a story
- POST /api/stories/{story_id}/view - mark story as viewed
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
SELLER_EMAIL = "producer@test.com"
SELLER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_session():
    """Authenticated customer session"""
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if login_res.status_code != 200:
        pytest.skip(f"Customer login failed: {login_res.status_code}")
    return session


@pytest.fixture(scope="module")
def seller_session():
    """Authenticated seller session"""
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": SELLER_EMAIL,
        "password": SELLER_PASSWORD
    })
    if login_res.status_code != 200:
        pytest.skip(f"Seller login failed: {login_res.status_code}")
    return session


def create_test_image():
    """Create a simple test image"""
    img = Image.new('RGB', (100, 100), color='green')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return buf


class TestHispaloStoriesAPI:
    """Test Hispalostories CRUD operations"""
    
    created_story_id = None
    
    def test_get_stories_feed_unauthenticated(self, api_client):
        """GET /api/stories should work without auth (public feed)"""
        response = api_client.get(f"{BASE_URL}/api/stories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Stories feed should be a list"
        print(f"PASS: GET /api/stories returns list with {len(data)} groups")
    
    def test_create_story_requires_auth(self, api_client):
        """POST /api/stories should require authentication"""
        img_buf = create_test_image()
        files = {'file': ('test.jpg', img_buf, 'image/jpeg')}
        data = {'caption': 'Test story'}
        response = api_client.post(f"{BASE_URL}/api/stories", files=files, data=data)
        # Should fail with 401 or 403
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: POST /api/stories requires authentication")
    
    def test_create_story_success(self, customer_session):
        """POST /api/stories creates a story successfully"""
        img_buf = create_test_image()
        files = {'file': ('test_story.jpg', img_buf, 'image/jpeg')}
        data = {'caption': 'Test story from iteration 94'}
        
        response = customer_session.post(f"{BASE_URL}/api/stories", files=files, data=data)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        story = response.json()
        assert 'story_id' in story, "Response should have story_id"
        assert story.get('caption') == 'Test story from iteration 94', "Caption should match"
        assert 'image_url' in story, "Response should have image_url"
        assert 'expires_at' in story, "Response should have expires_at"
        
        # Save for later tests
        TestHispaloStoriesAPI.created_story_id = story['story_id']
        print(f"PASS: POST /api/stories created story {story['story_id']}")
    
    def test_get_my_stories(self, customer_session):
        """GET /api/stories/mine returns user's own stories"""
        response = customer_session.get(f"{BASE_URL}/api/stories/mine")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        stories = response.json()
        assert isinstance(stories, list), "Should return a list"
        
        # Should include the story we just created
        if TestHispaloStoriesAPI.created_story_id:
            found = any(s.get('story_id') == TestHispaloStoriesAPI.created_story_id for s in stories)
            assert found, f"Created story {TestHispaloStoriesAPI.created_story_id} should be in my stories"
        
        print(f"PASS: GET /api/stories/mine returns {len(stories)} stories")
    
    def test_get_stories_feed_authenticated(self, customer_session):
        """GET /api/stories shows stories grouped by user when authenticated"""
        response = customer_session.get(f"{BASE_URL}/api/stories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of user groups"
        
        if len(data) > 0:
            # Verify structure of a story group
            group = data[0]
            assert 'user_id' in group, "Group should have user_id"
            assert 'user_name' in group, "Group should have user_name"
            assert 'stories' in group, "Group should have stories array"
            assert isinstance(group['stories'], list), "Stories should be a list"
        
        print(f"PASS: GET /api/stories (authenticated) returns {len(data)} groups")
    
    def test_view_story(self, seller_session):
        """POST /api/stories/{story_id}/view marks story as viewed"""
        if not TestHispaloStoriesAPI.created_story_id:
            pytest.skip("No story created to view")
        
        story_id = TestHispaloStoriesAPI.created_story_id
        response = seller_session.post(f"{BASE_URL}/api/stories/{story_id}/view")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('status') == 'ok', "View should return status ok"
        print(f"PASS: POST /api/stories/{story_id}/view marks as viewed")
    
    def test_delete_story_unauthorized(self, seller_session):
        """DELETE /api/stories/{story_id} fails for non-owner"""
        if not TestHispaloStoriesAPI.created_story_id:
            pytest.skip("No story created to delete")
        
        story_id = TestHispaloStoriesAPI.created_story_id
        response = seller_session.delete(f"{BASE_URL}/api/stories/{story_id}")
        # Should fail with 403 (not authorized)
        assert response.status_code == 403, f"Expected 403 for non-owner, got {response.status_code}"
        print(f"PASS: DELETE /api/stories/{story_id} correctly rejects non-owner")
    
    def test_delete_story_success(self, customer_session):
        """DELETE /api/stories/{story_id} deletes own story"""
        if not TestHispaloStoriesAPI.created_story_id:
            pytest.skip("No story created to delete")
        
        story_id = TestHispaloStoriesAPI.created_story_id
        response = customer_session.delete(f"{BASE_URL}/api/stories/{story_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('status') == 'deleted', "Delete should return status deleted"
        
        # Verify it's gone
        verify = customer_session.get(f"{BASE_URL}/api/stories/mine")
        stories = verify.json()
        found = any(s.get('story_id') == story_id for s in stories)
        assert not found, "Deleted story should not appear in /stories/mine"
        
        print(f"PASS: DELETE /api/stories/{story_id} successfully deleted story")
    
    def test_delete_nonexistent_story(self, customer_session):
        """DELETE /api/stories/{story_id} returns 404 for nonexistent story"""
        response = customer_session.delete(f"{BASE_URL}/api/stories/story_doesnotexist123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: DELETE /api/stories for nonexistent returns 404")


class TestSocialFeedEndpoints:
    """Test social feed endpoints still work"""
    
    def test_feed_endpoint(self, api_client):
        """GET /api/feed returns social feed"""
        response = api_client.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'posts' in data, "Feed should have posts"
        assert 'total' in data, "Feed should have total"
        assert 'has_more' in data, "Feed should have has_more"
        print(f"PASS: GET /api/feed returns {len(data['posts'])} posts")
    
    def test_trending_endpoint(self, api_client):
        """GET /api/feed/trending returns trending posts"""
        response = api_client.get(f"{BASE_URL}/api/feed/trending?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'posts' in data, "Trending should have posts"
        print(f"PASS: GET /api/feed/trending returns {len(data['posts'])} posts")
    
    def test_discover_profiles(self, api_client):
        """GET /api/discover/profiles returns discoverable profiles"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'profiles' in data, "Discover should have profiles"
        assert 'total' in data, "Discover should have total"
        print(f"PASS: GET /api/discover/profiles returns {len(data['profiles'])} profiles")


class TestUserProfileEndpoints:
    """Test user profile endpoints"""
    
    def test_get_user_profile(self, customer_session):
        """GET /api/users/{user_id}/profile returns profile data"""
        # First get current user
        me_res = customer_session.get(f"{BASE_URL}/api/auth/me")
        if me_res.status_code != 200:
            pytest.skip("Could not get current user")
        
        user_id = me_res.json().get('user_id')
        response = customer_session.get(f"{BASE_URL}/api/users/{user_id}/profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        profile = response.json()
        assert 'user_id' in profile, "Profile should have user_id"
        assert 'name' in profile, "Profile should have name"
        assert 'followers_count' in profile, "Profile should have followers_count"
        assert 'following_count' in profile, "Profile should have following_count"
        assert 'posts_count' in profile, "Profile should have posts_count"
        print(f"PASS: GET /api/users/{user_id}/profile returns profile for {profile.get('name')}")
    
    def test_get_user_posts(self, api_client):
        """GET /api/users/{user_id}/posts returns user posts"""
        # Get any user from discover
        discover = api_client.get(f"{BASE_URL}/api/discover/profiles?limit=1")
        if discover.status_code != 200 or not discover.json().get('profiles'):
            pytest.skip("No users found")
        
        user_id = discover.json()['profiles'][0]['user_id']
        response = api_client.get(f"{BASE_URL}/api/users/{user_id}/posts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        posts = response.json()
        assert isinstance(posts, list), "User posts should be a list"
        print(f"PASS: GET /api/users/{user_id}/posts returns {len(posts)} posts")


class TestAuthAndHealth:
    """Basic health and auth tests"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health returns healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("PASS: GET /api/health returns 200")
    
    def test_customer_login(self, api_client):
        """Customer can log in"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.status_code}"
        data = response.json()
        assert 'user' in data or 'user_id' in data or 'role' in data, "Login should return user data"
        print(f"PASS: Customer login successful")
    
    def test_seller_login(self, api_client):
        """Seller can log in"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.status_code}"
        print("PASS: Seller login successful")
