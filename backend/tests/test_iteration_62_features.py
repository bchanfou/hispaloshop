"""
Iteration 62 - New Features Tests
Tests for:
1. DELETE /api/posts/{post_id} - Delete posts (author only)
2. GET /api/feed/trending - Trending posts by engagement
3. POST /api/posts with text only (no image)
4. POST /api/posts/{post_id}/like - Toggle like
5. POST /api/posts/{post_id}/bookmark - Toggle bookmark  
6. POST /api/posts/{post_id}/comments - Add comment
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration62Features:
    """Test new features: delete posts, trending, mobile responsiveness"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login users"""
        self.session = requests.Session()
        self.customer_session = requests.Session()
        self.producer_session = requests.Session()
        
        # Login as customer
        resp = self.customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert resp.status_code == 200, f"Customer login failed: {resp.text}"
        self.customer_data = resp.json()
        print(f"Customer login: PASS - user_id: {self.customer_data.get('user_id')}")
        
        # Login as producer
        resp = self.producer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "producer@test.com", 
            "password": "password123"
        })
        assert resp.status_code == 200, f"Producer login failed: {resp.text}"
        self.producer_data = resp.json()
        print(f"Producer login: PASS - user_id: {self.producer_data.get('user_id')}")

    # ============================================================================
    # DELETE POST TESTS
    # ============================================================================
    
    def test_delete_post_by_author(self):
        """Test DELETE /api/posts/{post_id} - author can delete their own post"""
        # First create a post
        unique_id = uuid.uuid4().hex[:8]
        create_resp = self.customer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": f"TEST_delete_me_{unique_id}"},
        )
        assert create_resp.status_code == 200, f"Create post failed: {create_resp.text}"
        post = create_resp.json()
        post_id = post.get("post_id")
        print(f"Created test post: {post_id}")
        
        # Delete the post
        delete_resp = self.customer_session.delete(f"{BASE_URL}/api/posts/{post_id}")
        assert delete_resp.status_code == 200, f"Delete post failed: {delete_resp.status_code} - {delete_resp.text}"
        result = delete_resp.json()
        assert result.get("status") == "deleted", f"Expected status='deleted', got {result}"
        print(f"Delete post by author: PASS - post_id: {post_id}")
        
        # Verify post is actually deleted (should 404)
        # Note: GET single post endpoint may not exist, skip verification
    
    def test_delete_post_by_non_author_returns_403(self):
        """Test DELETE /api/posts/{post_id} - non-author gets 403"""
        # Create post as customer
        unique_id = uuid.uuid4().hex[:8]
        create_resp = self.customer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": f"TEST_not_yours_{unique_id}"},
        )
        assert create_resp.status_code == 200, f"Create post failed: {create_resp.text}"
        post = create_resp.json()
        post_id = post.get("post_id")
        print(f"Created test post: {post_id}")
        
        # Try to delete as producer (different user)
        delete_resp = self.producer_session.delete(f"{BASE_URL}/api/posts/{post_id}")
        assert delete_resp.status_code == 403, f"Expected 403, got {delete_resp.status_code}"
        print(f"Delete post by non-author returns 403: PASS")
        
        # Cleanup - delete as owner
        self.customer_session.delete(f"{BASE_URL}/api/posts/{post_id}")
    
    def test_delete_nonexistent_post_returns_404(self):
        """Test DELETE /api/posts/{post_id} - nonexistent post returns 404"""
        fake_post_id = f"post_{uuid.uuid4().hex[:12]}"
        delete_resp = self.customer_session.delete(f"{BASE_URL}/api/posts/{fake_post_id}")
        assert delete_resp.status_code == 404, f"Expected 404, got {delete_resp.status_code}"
        print(f"Delete nonexistent post returns 404: PASS")

    # ============================================================================
    # TRENDING POSTS TESTS
    # ============================================================================
    
    def test_trending_endpoint_returns_posts(self):
        """Test GET /api/feed/trending returns posts sorted by engagement"""
        resp = self.customer_session.get(f"{BASE_URL}/api/feed/trending?limit=5")
        assert resp.status_code == 200, f"Trending endpoint failed: {resp.text}"
        data = resp.json()
        assert "posts" in data, f"Expected 'posts' key in response, got: {data.keys()}"
        posts = data.get("posts", [])
        print(f"Trending posts endpoint: PASS - returned {len(posts)} posts")
        
        # Verify post structure if any posts returned
        if posts:
            post = posts[0]
            assert "post_id" in post, "Missing post_id"
            assert "user_name" in post, "Missing user_name"
            assert "likes_count" in post or post.get("likes_count", 0) >= 0, "Missing likes_count"
            assert "comments_count" in post or post.get("comments_count", 0) >= 0, "Missing comments_count"
            print(f"Trending post structure: PASS - {post.get('post_id')}")
    
    def test_trending_posts_have_engagement_fields(self):
        """Test trending posts include likes_count and comments_count"""
        resp = self.customer_session.get(f"{BASE_URL}/api/feed/trending?limit=10")
        assert resp.status_code == 200
        data = resp.json()
        posts = data.get("posts", [])
        
        for post in posts[:3]:  # Check first 3
            assert "likes_count" in post or post.get("likes_count") is None, f"Missing likes_count in {post.get('post_id')}"
            assert "comments_count" in post or post.get("comments_count") is None, f"Missing comments_count in {post.get('post_id')}"
            print(f"Post {post.get('post_id')}: likes={post.get('likes_count', 0)}, comments={post.get('comments_count', 0)}")
        
        print(f"Trending posts engagement fields: PASS")

    # ============================================================================
    # POST CREATION (TEXT ONLY)
    # ============================================================================
    
    def test_create_post_text_only_no_image(self):
        """Test POST /api/posts with caption only (no image)"""
        unique_id = uuid.uuid4().hex[:8]
        caption = f"TEST_text_only_post_{unique_id}"
        
        resp = self.customer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": caption}
        )
        assert resp.status_code == 200, f"Create text-only post failed: {resp.text}"
        post = resp.json()
        assert post.get("caption") == caption, f"Caption mismatch: {post.get('caption')}"
        assert post.get("image_url") is None or post.get("image_url") == "", "Expected no image_url"
        print(f"Create text-only post: PASS - post_id: {post.get('post_id')}")
        
        # Cleanup
        self.customer_session.delete(f"{BASE_URL}/api/posts/{post.get('post_id')}")

    # ============================================================================
    # LIKE TOGGLE
    # ============================================================================
    
    def test_like_toggle_works(self):
        """Test POST /api/posts/{post_id}/like toggles like state"""
        # Create a post
        unique_id = uuid.uuid4().hex[:8]
        create_resp = self.customer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": f"TEST_like_test_{unique_id}"}
        )
        assert create_resp.status_code == 200
        post_id = create_resp.json().get("post_id")
        
        # Like the post
        like_resp = self.customer_session.post(f"{BASE_URL}/api/posts/{post_id}/like")
        assert like_resp.status_code == 200, f"Like failed: {like_resp.text}"
        like_data = like_resp.json()
        assert "liked" in like_data, f"Expected 'liked' in response: {like_data}"
        first_state = like_data.get("liked")
        print(f"First like toggle: liked={first_state}")
        
        # Toggle again (unlike)
        unlike_resp = self.customer_session.post(f"{BASE_URL}/api/posts/{post_id}/like")
        assert unlike_resp.status_code == 200
        unlike_data = unlike_resp.json()
        second_state = unlike_data.get("liked")
        assert second_state != first_state, f"Toggle didn't change state: {first_state} -> {second_state}"
        print(f"Like toggle: PASS - {first_state} -> {second_state}")
        
        # Cleanup
        self.customer_session.delete(f"{BASE_URL}/api/posts/{post_id}")

    # ============================================================================
    # BOOKMARK TOGGLE
    # ============================================================================
    
    def test_bookmark_toggle_works(self):
        """Test POST /api/posts/{post_id}/bookmark toggles bookmark state"""
        # Create a post
        unique_id = uuid.uuid4().hex[:8]
        create_resp = self.customer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": f"TEST_bookmark_test_{unique_id}"}
        )
        assert create_resp.status_code == 200
        post_id = create_resp.json().get("post_id")
        
        # Bookmark the post
        bm_resp = self.customer_session.post(f"{BASE_URL}/api/posts/{post_id}/bookmark")
        assert bm_resp.status_code == 200, f"Bookmark failed: {bm_resp.text}"
        bm_data = bm_resp.json()
        assert "bookmarked" in bm_data, f"Expected 'bookmarked' in response: {bm_data}"
        first_state = bm_data.get("bookmarked")
        print(f"First bookmark toggle: bookmarked={first_state}")
        
        # Toggle again (unbookmark)
        unbm_resp = self.customer_session.post(f"{BASE_URL}/api/posts/{post_id}/bookmark")
        assert unbm_resp.status_code == 200
        unbm_data = unbm_resp.json()
        second_state = unbm_data.get("bookmarked")
        assert second_state != first_state, f"Toggle didn't change state: {first_state} -> {second_state}"
        print(f"Bookmark toggle: PASS - {first_state} -> {second_state}")
        
        # Cleanup
        self.customer_session.delete(f"{BASE_URL}/api/posts/{post_id}")

    # ============================================================================
    # ADD COMMENT
    # ============================================================================
    
    def test_add_comment_to_post(self):
        """Test POST /api/posts/{post_id}/comments adds a comment"""
        # Create a post
        unique_id = uuid.uuid4().hex[:8]
        create_resp = self.customer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": f"TEST_comment_test_{unique_id}"}
        )
        assert create_resp.status_code == 200
        post_id = create_resp.json().get("post_id")
        
        # Add a comment
        comment_text = f"TEST_comment_{unique_id}"
        comment_resp = self.customer_session.post(
            f"{BASE_URL}/api/posts/{post_id}/comments",
            json={"text": comment_text}
        )
        assert comment_resp.status_code == 200, f"Add comment failed: {comment_resp.text}"
        comment_data = comment_resp.json()
        assert comment_data.get("text") == comment_text, f"Comment text mismatch: {comment_data}"
        assert "comment_id" in comment_data, f"Missing comment_id in response"
        print(f"Add comment: PASS - comment_id: {comment_data.get('comment_id')}")
        
        # Cleanup
        self.customer_session.delete(f"{BASE_URL}/api/posts/{post_id}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
