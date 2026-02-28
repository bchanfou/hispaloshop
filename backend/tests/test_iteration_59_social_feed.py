"""
Iteration 59 - Social Feed Feature Tests
Tests for: GET /api/feed, POST /api/posts/{post_id}/like, GET /api/posts/{post_id}/comments, POST /api/posts/{post_id}/comments
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
INFLUENCER_EMAIL = "influencer@test.com"
INFLUENCER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def session():
    """Create a shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def customer_auth(session):
    """Authenticate as customer (test@example.com)"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Customer login failed: {response.text}")
    data = response.json()
    token = data.get("session_token") or data.get("token")
    return {"Authorization": f"Bearer {token}", "Cookie": f"session_token={token}"}


@pytest.fixture(scope="module")
def producer_auth(session):
    """Authenticate as producer"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": PRODUCER_EMAIL,
        "password": PRODUCER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Producer login failed: {response.text}")
    data = response.json()
    token = data.get("session_token") or data.get("token")
    return {"Authorization": f"Bearer {token}", "Cookie": f"session_token={token}"}


class TestSocialFeedEndpoints:
    """Test the new social feed API endpoints"""
    
    def test_feed_unauthenticated(self, session):
        """GET /api/feed returns all recent posts when not logged in"""
        response = session.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Feed endpoint failed: {response.text}"
        data = response.json()
        
        # Should return posts array with has_more and total
        assert "posts" in data, "Response should contain 'posts' array"
        assert "has_more" in data, "Response should contain 'has_more'"
        assert isinstance(data["posts"], list), "posts should be a list"
        
        print(f"PASS: GET /api/feed unauthenticated - returned {len(data['posts'])} posts")
        
    def test_feed_authenticated(self, session, customer_auth):
        """GET /api/feed returns posts from followed users when logged in"""
        response = session.get(f"{BASE_URL}/api/feed", headers=customer_auth)
        assert response.status_code == 200, f"Feed endpoint failed: {response.text}"
        data = response.json()
        
        # Should return posts array
        assert "posts" in data, "Response should contain 'posts' array"
        assert isinstance(data["posts"], list), "posts should be a list"
        
        print(f"PASS: GET /api/feed authenticated - returned {len(data['posts'])} posts")
        return data
        
    def test_feed_post_structure(self, session, customer_auth):
        """Verify post structure contains required fields"""
        response = session.get(f"{BASE_URL}/api/feed", headers=customer_auth)
        assert response.status_code == 200
        data = response.json()
        
        if data["posts"]:
            post = data["posts"][0]
            required_fields = ["post_id", "user_id", "user_name", "user_role", "is_liked"]
            
            for field in required_fields:
                assert field in post, f"Post missing required field: {field}"
            
            print(f"PASS: Post structure verification - contains required fields")
            print(f"  Sample post: post_id={post.get('post_id')}, user_role={post.get('user_role')}, likes_count={post.get('likes_count', 0)}")
        else:
            print("WARN: No posts in feed to verify structure")


class TestLikeEndpoint:
    """Test POST /api/posts/{post_id}/like"""
    
    def test_like_toggle(self, session, customer_auth):
        """Like endpoint toggles like status"""
        # First, get a post to like
        feed_response = session.get(f"{BASE_URL}/api/feed", headers=customer_auth)
        assert feed_response.status_code == 200
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available to test like functionality")
        
        post_id = posts[0]["post_id"]
        initial_liked = posts[0].get("is_liked", False)
        
        # Toggle like
        like_response = session.post(f"{BASE_URL}/api/posts/{post_id}/like", headers=customer_auth)
        assert like_response.status_code == 200, f"Like failed: {like_response.text}"
        like_data = like_response.json()
        
        assert "liked" in like_data, "Like response should contain 'liked' field"
        # After toggle, liked should be opposite of initial
        expected_liked = not initial_liked
        assert like_data["liked"] == expected_liked, f"Expected liked={expected_liked} but got {like_data['liked']}"
        
        print(f"PASS: POST /api/posts/{post_id}/like - toggled to liked={like_data['liked']}")
        
        # Toggle back to original state
        session.post(f"{BASE_URL}/api/posts/{post_id}/like", headers=customer_auth)
        
    def test_like_requires_auth(self, session):
        """Like endpoint requires authentication"""
        # Get any post_id from feed
        feed_response = session.get(f"{BASE_URL}/api/feed")
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available")
            
        post_id = posts[0]["post_id"]
        
        # Try to like without auth
        response = session.post(f"{BASE_URL}/api/posts/{post_id}/like")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Like endpoint requires authentication (401 for unauthenticated)")


class TestCommentsEndpoint:
    """Test comments endpoints"""
    
    def test_get_comments(self, session):
        """GET /api/posts/{post_id}/comments returns comments array"""
        # Get any post
        feed_response = session.get(f"{BASE_URL}/api/feed")
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available to test comments")
            
        post_id = posts[0]["post_id"]
        
        response = session.get(f"{BASE_URL}/api/posts/{post_id}/comments")
        assert response.status_code == 200, f"Get comments failed: {response.text}"
        comments = response.json()
        
        assert isinstance(comments, list), "Comments should be a list"
        print(f"PASS: GET /api/posts/{post_id}/comments - returned {len(comments)} comments")
        
    def test_add_comment(self, session, customer_auth):
        """POST /api/posts/{post_id}/comments adds a comment"""
        # Get any post
        feed_response = session.get(f"{BASE_URL}/api/feed", headers=customer_auth)
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available to test comments")
            
        post_id = posts[0]["post_id"]
        
        # Add a comment
        comment_text = "TEST_comment_iter59_verification"
        response = session.post(
            f"{BASE_URL}/api/posts/{post_id}/comments",
            json={"text": comment_text},
            headers=customer_auth
        )
        assert response.status_code == 200, f"Add comment failed: {response.text}"
        comment = response.json()
        
        assert "comment_id" in comment, "Comment should have comment_id"
        assert comment.get("text") == comment_text, "Comment text should match"
        assert "user_name" in comment, "Comment should have user_name"
        assert "created_at" in comment, "Comment should have created_at"
        
        print(f"PASS: POST /api/posts/{post_id}/comments - created comment {comment['comment_id']}")
        
        # Verify comment appears in list
        get_response = session.get(f"{BASE_URL}/api/posts/{post_id}/comments")
        comments = get_response.json()
        comment_ids = [c.get("comment_id") for c in comments]
        assert comment["comment_id"] in comment_ids, "New comment should appear in comments list"
        print("PASS: Comment persisted and appears in GET comments")
        
    def test_add_comment_requires_auth(self, session):
        """POST comments requires authentication"""
        feed_response = session.get(f"{BASE_URL}/api/feed")
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available")
            
        post_id = posts[0]["post_id"]
        
        response = session.post(
            f"{BASE_URL}/api/posts/{post_id}/comments",
            json={"text": "test comment"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Add comment requires authentication (401 for unauthenticated)")


class TestFeedRoleBadges:
    """Verify feed contains posts with role badges"""
    
    def test_posts_have_user_roles(self, session):
        """Posts should include user_role for badge display"""
        response = session.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200
        posts = response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts in feed")
        
        roles_found = set()
        for post in posts:
            role = post.get("user_role")
            assert role is not None, f"Post {post.get('post_id')} missing user_role"
            roles_found.add(role)
        
        print(f"PASS: All posts have user_role field. Roles found: {roles_found}")


class TestDiscoverPageStillWorks:
    """Regression: Ensure Discover page still works"""
    
    def test_discover_profiles_endpoint(self, session):
        """GET /api/discover/profiles still returns profiles"""
        response = session.get(f"{BASE_URL}/api/discover/profiles")
        assert response.status_code == 200, f"Discover profiles failed: {response.text}"
        data = response.json()
        
        assert "profiles" in data or isinstance(data, list), "Should return profiles"
        print("PASS: GET /api/discover/profiles - endpoint works")
        
    def test_discover_with_filters(self, session):
        """Discover with role filter still works"""
        for role in ["influencer", "producer", "customer"]:
            response = session.get(f"{BASE_URL}/api/discover/profiles?role={role}")
            assert response.status_code == 200, f"Filter {role} failed: {response.text}"
        print("PASS: Discover filters (influencer, producer, customer) work")


class TestInfluencerDashboardRegression:
    """Regression: Influencer dashboard should still work"""
    
    def test_influencer_dashboard(self, session):
        """Influencer dashboard endpoint works"""
        # Login as influencer
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Influencer login failed")
            
        data = login_response.json()
        token = data.get("session_token") or data.get("token")
        headers = {"Authorization": f"Bearer {token}", "Cookie": f"session_token={token}"}
        
        # Access dashboard
        response = session.get(f"{BASE_URL}/api/influencer/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        dashboard = response.json()
        assert "influencer_id" in dashboard or "total_commissions" in dashboard or "error" not in str(dashboard).lower(), \
            f"Dashboard response unexpected: {dashboard}"
        
        print("PASS: GET /api/influencer/dashboard works for influencer")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
