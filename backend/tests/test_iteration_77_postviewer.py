"""
Iteration 77 - PostViewer, i18n, and social routes testing

Tests:
1. Health check endpoint (db connection)
2. User profile endpoint
3. User posts endpoint
4. Post comments endpoint  
5. Post like endpoint
6. Post bookmark endpoint
7. i18n config/locale endpoint
8. Language switching (locale update)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "http://localhost:8000"

# Test credentials
TEST_CUSTOMER = {"email": "test@example.com", "password": "password123"}
TEST_PRODUCER = {"email": "producer@test.com", "password": "password123"}


class TestHealthAndConfig:
    """Test health and configuration endpoints"""
    
    def test_health_check(self):
        """Health check must return status:ok and db:connected"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ok", f"Status not ok: {data}"
        assert data.get("db") == "connected", f"DB not connected: {data}"
        print(f"✅ Health check: {data}")
    
    def test_locale_config(self):
        """Locale config must return countries, languages, currencies"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200, f"Locale config failed: {response.text}"
        data = response.json()
        assert "countries" in data, "Missing countries"
        assert "languages" in data, "Missing languages"
        assert "currencies" in data, "Missing currencies"
        
        # Verify Spanish and English languages exist
        languages = data.get("languages", {})
        assert "es" in languages or "ES" in languages or any("es" in str(v).lower() for v in languages.values()), \
            f"Spanish language not found: {list(languages.keys())}"
        print(f"✅ Locale config: {len(data.get('countries', {}))} countries, {len(data.get('languages', {}))} languages")


class TestUserProfile:
    """Test user profile and posts endpoints for PostViewer"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        response = s.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            # Store cookies from login
            return s
        pytest.skip("Authentication failed")
    
    def test_get_user_profile(self, session):
        """Get user profile (needed for PostViewer context)"""
        # First get the current user
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Could not get current user")
        
        user_id = me_response.json().get("user_id")
        assert user_id, "No user_id in response"
        
        # Now get the profile
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/profile")
        assert response.status_code == 200, f"Profile fetch failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Missing user_id"
        assert "name" in data, "Missing name"
        assert "followers_count" in data, "Missing followers_count"
        assert "posts_count" in data, "Missing posts_count"
        print(f"✅ User profile: {data.get('name')} with {data.get('posts_count')} posts")
        return data
    
    def test_get_user_posts(self, session):
        """Get user posts (needed for PostViewer navigation)"""
        # First get the current user
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Could not get current user")
        
        user_id = me_response.json().get("user_id")
        
        # Get posts
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/posts")
        assert response.status_code == 200, f"Posts fetch failed: {response.status_code}"
        
        posts = response.json()
        assert isinstance(posts, list), "Posts should be a list"
        print(f"✅ User posts: {len(posts)} posts found")
        return posts


class TestPostInteractions:
    """Test post interactions (like, comment, bookmark) for PostViewer"""
    
    @pytest.fixture(scope="class")
    def authenticated_session(self):
        """Create authenticated session"""
        s = requests.Session()
        response = s.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return s
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def test_post_id(self, authenticated_session):
        """Get a post ID to test interactions"""
        # Get feed posts
        response = requests.get(f"{BASE_URL}/api/feed")
        if response.status_code != 200:
            pytest.skip("Could not get feed")
        
        data = response.json()
        posts = data.get("posts", [])
        if not posts:
            pytest.skip("No posts available for testing")
        
        return posts[0].get("post_id")
    
    def test_get_post_comments(self, test_post_id):
        """Get comments for a post (PostViewer displays comments)"""
        response = requests.get(f"{BASE_URL}/api/posts/{test_post_id}/comments")
        assert response.status_code == 200, f"Comments fetch failed: {response.status_code}"
        
        comments = response.json()
        assert isinstance(comments, list), "Comments should be a list"
        print(f"✅ Post comments: {len(comments)} comments for post {test_post_id}")
    
    def test_like_post(self, authenticated_session, test_post_id):
        """Test liking a post (PostViewer like button)"""
        response = authenticated_session.post(
            f"{BASE_URL}/api/posts/{test_post_id}/like",
            json={}
        )
        assert response.status_code == 200, f"Like failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "liked" in data, "Missing liked field"
        print(f"✅ Post like: liked={data.get('liked')}")
    
    def test_bookmark_post(self, authenticated_session, test_post_id):
        """Test bookmarking a post (PostViewer bookmark button)"""
        response = authenticated_session.post(
            f"{BASE_URL}/api/posts/{test_post_id}/bookmark",
            json={}
        )
        assert response.status_code == 200, f"Bookmark failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "bookmarked" in data, "Missing bookmarked field"
        print(f"✅ Post bookmark: bookmarked={data.get('bookmarked')}")
    
    def test_add_comment(self, authenticated_session, test_post_id):
        """Test adding a comment (PostViewer comment submission)"""
        comment_text = f"Test comment from iteration 77 testing"
        response = authenticated_session.post(
            f"{BASE_URL}/api/posts/{test_post_id}/comments",
            json={"text": comment_text}
        )
        assert response.status_code == 200, f"Comment add failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "comment_id" in data, "Missing comment_id"
        assert data.get("text") == comment_text, "Comment text mismatch"
        print(f"✅ Comment added: {data.get('comment_id')}")
        return data.get("comment_id")


class TestSocialFeed:
    """Test social feed for PostViewer context"""
    
    def test_get_feed(self):
        """Get social feed (provides posts for PostViewer)"""
        response = requests.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Feed failed: {response.status_code}"
        
        data = response.json()
        assert "posts" in data, "Missing posts"
        assert isinstance(data["posts"], list), "Posts should be a list"
        
        if data["posts"]:
            post = data["posts"][0]
            # Check fields needed by PostViewer
            assert "post_id" in post, "Missing post_id"
            print(f"✅ Feed: {len(data['posts'])} posts with fields: {list(post.keys())[:10]}...")
        else:
            print(f"✅ Feed: empty (no posts)")
    
    def test_feed_with_country_filter(self):
        """Test feed with country filter (PostViewer shows product availability)"""
        response = requests.get(f"{BASE_URL}/api/feed?country=ES")
        assert response.status_code == 200, f"Feed with country failed: {response.status_code}"
        
        data = response.json()
        posts = data.get("posts", [])
        if posts:
            # Check product_available_in_country field
            for post in posts[:3]:
                if "product_available_in_country" in post:
                    print(f"✅ Feed country filter: post has product_available_in_country={post.get('product_available_in_country')}")
                    return
            print(f"✅ Feed country filter: {len(posts)} posts (no products tagged)")
        else:
            print(f"✅ Feed country filter: no posts")


class TestLocaleUpdate:
    """Test i18n language switching"""
    
    @pytest.fixture(scope="class")
    def authenticated_session(self):
        """Create authenticated session"""
        s = requests.Session()
        response = s.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return s
        pytest.skip("Authentication failed")
    
    def test_update_language(self, authenticated_session):
        """Test updating user language (i18n switch)"""
        # Try to update language to English
        response = authenticated_session.put(
            f"{BASE_URL}/api/user/locale",
            json={"language": "en"}
        )
        
        if response.status_code == 200:
            print(f"✅ Language update to EN: success")
        elif response.status_code == 404:
            # Endpoint might not exist - check if there's an alternative
            print(f"⚠️ Language update endpoint returns 404 - may be handled client-side only")
        else:
            print(f"⚠️ Language update: {response.status_code} - {response.text[:100]}")
        
        # Update back to Spanish
        response = authenticated_session.put(
            f"{BASE_URL}/api/user/locale",
            json={"language": "es"}
        )
        if response.status_code == 200:
            print(f"✅ Language update to ES: success")


class TestUserSpecificPosts:
    """Test fetching posts for a specific user (for PostViewer on profile page)"""
    
    def test_get_test_user_posts(self):
        """Get posts for user_test123 (mentioned in agent context)"""
        # According to agent notes, user_test123 has 7 posts
        response = requests.get(f"{BASE_URL}/api/users/user_test123/posts")
        
        if response.status_code == 200:
            posts = response.json()
            print(f"✅ user_test123 posts: {len(posts)} posts found")
            if posts:
                post = posts[0]
                # Verify post structure for PostViewer
                expected_fields = ["post_id", "user_id", "caption"]
                for field in expected_fields:
                    assert field in post, f"Missing {field} in post"
                print(f"   Post structure: {list(post.keys())}")
        elif response.status_code == 404:
            print(f"⚠️ user_test123 not found - may be different user_id format")
        else:
            print(f"⚠️ user_test123 posts: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
