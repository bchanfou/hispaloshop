"""
Iteration 58 - Tests for Discover Page and User Profile Features

Testing:
1. GET /api/discover/profiles - profiles listing with filters
2. POST /api/users/upload-avatar - avatar upload
3. POST /api/users/update-profile - bio update
4. POST /api/users/{user_id}/follow - follow user
5. DELETE /api/users/{user_id}/follow - unfollow user  
6. POST /api/posts - create post with image
7. GET /api/users/{user_id}/posts - get user posts
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CUSTOMER_EMAIL = "test@example.com"
TEST_CUSTOMER_PASSWORD = "password123"
TEST_PRODUCER_EMAIL = "producer@test.com"
TEST_PRODUCER_PASSWORD = "password123"
TEST_INFLUENCER_EMAIL = "influencer@test.com"
TEST_INFLUENCER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_session():
    """Get authenticated customer session"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CUSTOMER_EMAIL,
        "password": TEST_CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return session
    pytest.skip("Customer authentication failed")


@pytest.fixture(scope="module")
def influencer_session():
    """Get authenticated influencer session"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_INFLUENCER_EMAIL,
        "password": TEST_INFLUENCER_PASSWORD
    })
    if response.status_code == 200:
        return session
    pytest.skip("Influencer authentication failed")


@pytest.fixture(scope="module")
def producer_session():
    """Get authenticated producer session"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_PRODUCER_EMAIL,
        "password": TEST_PRODUCER_PASSWORD
    })
    if response.status_code == 200:
        return session
    pytest.skip("Producer authentication failed")


class TestDiscoverProfiles:
    """Tests for GET /api/discover/profiles endpoint"""

    def test_get_all_profiles(self, api_client):
        """GET /api/discover/profiles returns list of profiles"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "profiles" in data, "Response should have 'profiles' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["profiles"], list), "profiles should be a list"
        print(f"PASS: GET /api/discover/profiles - {len(data['profiles'])} profiles, total: {data['total']}")

    def test_filter_by_influencer_role(self, api_client):
        """GET /api/discover/profiles?role=influencer filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles?role=influencer")
        assert response.status_code == 200
        
        data = response.json()
        profiles = data.get("profiles", [])
        # All returned profiles should be influencers
        for p in profiles:
            assert p.get("role") == "influencer", f"Expected influencer role, got {p.get('role')}"
        print(f"PASS: Filter by influencer role - {len(profiles)} influencers found")

    def test_filter_by_producer_role(self, api_client):
        """GET /api/discover/profiles?role=producer filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles?role=producer")
        assert response.status_code == 200
        
        data = response.json()
        profiles = data.get("profiles", [])
        for p in profiles:
            assert p.get("role") == "producer", f"Expected producer role, got {p.get('role')}"
        print(f"PASS: Filter by producer role - {len(profiles)} producers found")

    def test_filter_by_customer_role(self, api_client):
        """GET /api/discover/profiles?role=customer filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles?role=customer")
        assert response.status_code == 200
        
        data = response.json()
        profiles = data.get("profiles", [])
        for p in profiles:
            assert p.get("role") == "customer", f"Expected customer role, got {p.get('role')}"
        print(f"PASS: Filter by customer role - {len(profiles)} customers found")

    def test_search_by_name(self, api_client):
        """GET /api/discover/profiles?search=Test searches by name"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles?search=Test")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: Search by name - {len(data.get('profiles', []))} profiles match 'Test'")

    def test_profile_structure(self, api_client):
        """Verify profile structure contains required fields"""
        response = api_client.get(f"{BASE_URL}/api/discover/profiles?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        profiles = data.get("profiles", [])
        if len(profiles) > 0:
            profile = profiles[0]
            required_fields = ["user_id", "name", "role", "followers_count", "posts_count"]
            for field in required_fields:
                assert field in profile, f"Profile missing required field: {field}"
            print(f"PASS: Profile structure verified with fields: {list(profile.keys())}")
        else:
            print("SKIP: No profiles to verify structure")


class TestUserFollow:
    """Tests for user follow/unfollow functionality"""

    def test_follow_user(self, customer_session, producer_session):
        """POST /api/users/{user_id}/follow follows a user"""
        # First get a user to follow (producer)
        producer_response = producer_session.get(f"{BASE_URL}/api/me")
        if producer_response.status_code != 200:
            pytest.skip("Cannot get producer user info")
        
        producer_user_id = producer_response.json().get("user_id")
        
        # Now customer follows producer
        response = customer_session.post(f"{BASE_URL}/api/users/{producer_user_id}/follow")
        # Can be 200 or 400 (if already following)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 200:
            print(f"PASS: Customer followed producer {producer_user_id}")
        else:
            print(f"PASS: Already following producer {producer_user_id}")

    def test_unfollow_user(self, customer_session, producer_session):
        """DELETE /api/users/{user_id}/follow unfollows a user"""
        # Get producer user ID
        producer_response = producer_session.get(f"{BASE_URL}/api/me")
        if producer_response.status_code != 200:
            pytest.skip("Cannot get producer user info")
        
        producer_user_id = producer_response.json().get("user_id")
        
        # Unfollow producer
        response = customer_session.delete(f"{BASE_URL}/api/users/{producer_user_id}/follow")
        # Can be 200 or 404 (if not following)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            print(f"PASS: Customer unfollowed producer {producer_user_id}")
        else:
            print(f"PASS: Was not following producer {producer_user_id}")


class TestUserProfile:
    """Tests for user profile endpoints"""

    def test_update_profile_bio(self, customer_session):
        """POST /api/users/update-profile updates bio"""
        response = customer_session.post(
            f"{BASE_URL}/api/users/update-profile",
            json={"bio": "Test bio from iteration 58"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", "Expected status 'ok'"
        print("PASS: User profile bio updated")

    def test_upload_avatar(self, customer_session):
        """POST /api/users/upload-avatar uploads avatar and returns URL"""
        # Create a simple test image (1x1 pixel red PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_avatar.png', io.BytesIO(png_data), 'image/png')
        }
        
        # Remove content-type header for multipart
        headers = dict(customer_session.headers)
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        response = requests.post(
            f"{BASE_URL}/api/users/upload-avatar",
            files=files,
            cookies=customer_session.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "image_url" in data, "Response should contain image_url"
        assert data["image_url"].startswith("/uploads/avatars/"), f"Unexpected image URL: {data['image_url']}"
        print(f"PASS: Avatar uploaded - URL: {data['image_url']}")


class TestPosts:
    """Tests for post creation"""

    def test_create_post(self, customer_session):
        """POST /api/posts creates a new post with image upload"""
        # Create a simple test image
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_post.png', io.BytesIO(png_data), 'image/png')
        }
        data = {
            'caption': 'Test post from iteration 58'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/posts",
            files=files,
            data=data,
            cookies=customer_session.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        post = response.json()
        assert "post_id" in post, "Response should contain post_id"
        assert "image_url" in post, "Response should contain image_url"
        assert post.get("caption") == "Test post from iteration 58"
        print(f"PASS: Post created - ID: {post['post_id']}, Image: {post['image_url']}")
        
        return post["post_id"]

    def test_get_user_posts(self, customer_session):
        """GET /api/users/{user_id}/posts returns user's posts"""
        # Get customer user ID
        me_response = customer_session.get(f"{BASE_URL}/api/me")
        if me_response.status_code != 200:
            pytest.skip("Cannot get user info")
        
        user_id = me_response.json().get("user_id")
        
        response = customer_session.get(f"{BASE_URL}/api/users/{user_id}/posts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        posts = response.json()
        assert isinstance(posts, list), "Response should be a list"
        print(f"PASS: GET user posts - {len(posts)} posts found")


class TestInfluencerDashboard:
    """Verify influencer dashboard still works correctly"""

    def test_influencer_dashboard_loads(self, influencer_session):
        """GET /api/influencer/dashboard should NOT return 'not an influencer' error"""
        response = influencer_session.get(f"{BASE_URL}/api/influencer/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should NOT contain error message about not being an influencer
        if "detail" in data and "not an influencer" in str(data.get("detail", "")).lower():
            pytest.fail("Influencer dashboard shows 'not an influencer' error - BUG!")
        
        print(f"PASS: Influencer dashboard loads correctly - data keys: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
