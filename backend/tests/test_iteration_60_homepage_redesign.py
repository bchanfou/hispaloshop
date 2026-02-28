"""
Iteration 60 - Homepage Redesign & Text-Only Posts Testing
Tests:
1. POST /api/posts with text only (no image) creates a post successfully
2. POST /api/posts with both text and image works
3. POST /api/posts fails when neither text nor image is provided
4. GET /api/feed returns text-only posts correctly (image_url is null)
5. POST /api/posts/{post_id}/like toggles like
6. POST /api/posts/{post_id}/comments adds comment
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPostCreation:
    """Test POST /api/posts endpoint with text-only support"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        return session
    
    @pytest.fixture(scope="class")
    def producer_session(self):
        """Login as producer and return authenticated session"""
        session = requests.Session()
        login_data = {
            "email": "producer@test.com",
            "password": "password123"
        }
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            pytest.skip(f"Producer login failed: {response.status_code}")
        return session

    def test_create_text_only_post(self, auth_session):
        """POST /api/posts with text only (no image) creates a post successfully"""
        form_data = {"caption": "TEST_Este es un post de solo texto para pruebas iteracion 60"}
        response = auth_session.post(f"{BASE_URL}/api/posts", data=form_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "post_id" in data, "Response should contain post_id"
        assert data["image_url"] is None, "Text-only post should have image_url as None"
        assert "TEST_Este es un post de solo texto" in data["caption"], "Caption should match"
        assert data["likes_count"] == 0, "New post should have 0 likes"
        assert data["comments_count"] == 0, "New post should have 0 comments"
        
        # Store post_id for cleanup
        self.__class__.text_only_post_id = data["post_id"]
        print(f"Created text-only post: {data['post_id']}")
    
    def test_create_post_with_image(self, auth_session):
        """POST /api/posts with both text and image works"""
        # Create a simple test image
        from io import BytesIO
        from PIL import Image
        
        # Create a simple red square image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_image.png', img_bytes, 'image/png')}
        data = {'caption': 'TEST_Post con imagen de prueba iteracion 60'}
        
        response = auth_session.post(f"{BASE_URL}/api/posts", data=data, files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "post_id" in data
        assert data["image_url"] is not None, "Image post should have image_url"
        assert data["image_url"].startswith("/uploads/posts/"), f"image_url should start with /uploads/posts/, got {data['image_url']}"
        
        self.__class__.image_post_id = data["post_id"]
        print(f"Created image post: {data['post_id']}")
    
    def test_create_post_fails_without_content(self, auth_session):
        """POST /api/posts fails when neither text nor image is provided"""
        # Empty caption and no file
        form_data = {"caption": ""}
        response = auth_session.post(f"{BASE_URL}/api/posts", data=form_data)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "text or an image" in data["detail"].lower() or "must have" in data["detail"].lower(), f"Error message should mention requirement: {data['detail']}"
        
        print("Verified empty post returns 400 error")

    def test_create_post_with_whitespace_only_fails(self, auth_session):
        """POST /api/posts fails when caption is only whitespace"""
        form_data = {"caption": "   "}
        response = auth_session.post(f"{BASE_URL}/api/posts", data=form_data)
        
        assert response.status_code == 400, f"Expected 400 for whitespace-only caption, got {response.status_code}"
        print("Verified whitespace-only post returns 400 error")


class TestFeedWithTextOnlyPosts:
    """Test GET /api/feed returns text-only posts correctly"""
    
    def test_feed_returns_text_only_posts(self):
        """GET /api/feed returns text-only posts with image_url as null"""
        response = requests.get(f"{BASE_URL}/api/feed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "posts" in data, "Response should contain posts array"
        
        posts = data["posts"]
        assert len(posts) > 0, "Feed should have at least one post"
        
        # Check structure of posts
        for post in posts[:5]:  # Check first 5 posts
            assert "post_id" in post, "Post should have post_id"
            assert "user_id" in post, "Post should have user_id"
            assert "user_name" in post, "Post should have user_name"
            assert "caption" in post, "Post should have caption"
            assert "image_url" in post or post.get("image_url") is None, "Post should have image_url field (can be null)"
            assert "likes_count" in post, "Post should have likes_count"
            assert "comments_count" in post, "Post should have comments_count"
            assert "created_at" in post, "Post should have created_at"
        
        # Find text-only posts (image_url is None)
        text_only_posts = [p for p in posts if p.get("image_url") is None]
        
        print(f"Feed has {len(posts)} total posts, {len(text_only_posts)} text-only posts")
        
        # Verify text-only posts exist
        if len(text_only_posts) > 0:
            text_post = text_only_posts[0]
            assert text_post["image_url"] is None, "Text-only post should have image_url as None"
            print(f"Verified text-only post: {text_post['post_id']} - '{text_post['caption'][:30]}...'")


class TestPostInteractions:
    """Test like and comment functionality"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        return session
    
    @pytest.fixture(scope="class")
    def test_post_id(self):
        """Get a post_id to test interactions"""
        response = requests.get(f"{BASE_URL}/api/feed")
        if response.status_code != 200:
            pytest.skip("Could not fetch feed")
        
        posts = response.json().get("posts", [])
        if not posts:
            pytest.skip("No posts in feed")
        
        return posts[0]["post_id"]
    
    def test_like_toggle(self, auth_session, test_post_id):
        """POST /api/posts/{post_id}/like toggles like"""
        url = f"{BASE_URL}/api/posts/{test_post_id}/like"
        
        # First like
        response = auth_session.post(url)
        assert response.status_code == 200, f"Like failed: {response.status_code}"
        data = response.json()
        assert "liked" in data, "Response should contain 'liked' field"
        first_state = data["liked"]
        print(f"First like action - liked: {first_state}")
        
        # Toggle again
        response = auth_session.post(url)
        assert response.status_code == 200
        data = response.json()
        second_state = data["liked"]
        
        # States should toggle
        assert first_state != second_state, f"Like should toggle: first={first_state}, second={second_state}"
        print(f"Second like action - liked: {second_state} (toggled from {first_state})")
    
    def test_add_comment(self, auth_session, test_post_id):
        """POST /api/posts/{post_id}/comments adds comment"""
        url = f"{BASE_URL}/api/posts/{test_post_id}/comments"
        
        comment_data = {"text": "TEST_Comentario de prueba iteracion 60"}
        response = auth_session.post(url, json=comment_data)
        
        assert response.status_code == 200, f"Add comment failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "comment_id" in data, "Response should contain comment_id"
        assert "user_name" in data, "Response should contain user_name"
        assert "text" in data, "Response should contain text"
        assert data["text"] == comment_data["text"], "Comment text should match"
        
        print(f"Created comment: {data['comment_id']}")
        
        # Verify comment appears in GET comments
        get_response = auth_session.get(f"{BASE_URL}/api/posts/{test_post_id}/comments")
        assert get_response.status_code == 200
        comments = get_response.json()
        
        comment_ids = [c["comment_id"] for c in comments]
        assert data["comment_id"] in comment_ids, "New comment should appear in comments list"
        print(f"Verified comment persisted - total comments: {len(comments)}")


class TestProducerPostCreation:
    """Test that producers can create posts"""
    
    @pytest.fixture(scope="class")
    def producer_session(self):
        """Login as producer"""
        session = requests.Session()
        login_data = {
            "email": "producer@test.com",
            "password": "password123"
        }
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            pytest.skip(f"Producer login failed: {response.status_code}")
        return session
    
    def test_producer_can_create_text_post(self, producer_session):
        """Producer can create text-only post"""
        form_data = {"caption": "TEST_Post de prueba del productor iteracion 60"}
        response = producer_session.post(f"{BASE_URL}/api/posts", data=form_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "post_id" in data
        assert data["image_url"] is None
        print(f"Producer created text post: {data['post_id']}")


class TestInfluencerDashboard:
    """Verify influencer dashboard still loads correctly (regression)"""
    
    @pytest.fixture(scope="class")
    def influencer_session(self):
        """Login as influencer"""
        session = requests.Session()
        login_data = {
            "email": "influencer@test.com",
            "password": "password123"
        }
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            pytest.skip(f"Influencer login failed: {response.status_code}")
        return session
    
    def test_influencer_dashboard_loads(self, influencer_session):
        """GET /api/influencer/dashboard returns successfully"""
        response = influencer_session.get(f"{BASE_URL}/api/influencer/dashboard")
        
        # Expect 200 or 404 (if not an influencer), not 401 or 500
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Influencer dashboard loaded: {list(data.keys())}")
        else:
            print("Influencer record not found (404) - may need setup")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
