"""
Iteration 98 Tests - Editable/Deletable Comments and Enhanced Stories Editor
Tests: 
1. PUT /api/comments/{comment_id} - Edit comment
2. DELETE /api/comments/{comment_id} - Delete comment  
3. Quick Reactions (regression): POST /api/posts/{post_id}/react
4. Comment CRUD flow validation
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommentsAndReactions:
    """Test editable/deletable comments and quick reactions"""
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Login as customer and get session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip(f"Login failed: {login_resp.status_code} - {login_resp.text}")
        
        return session
    
    @pytest.fixture(scope="class")
    def test_post(self, customer_session):
        """Get a post to use for testing comments and reactions"""
        # Get feed to find a post
        feed_resp = customer_session.get(f"{BASE_URL}/api/feed?limit=1")
        assert feed_resp.status_code == 200, f"Feed request failed: {feed_resp.text}"
        
        data = feed_resp.json()
        posts = data.get("posts", [])
        
        if not posts:
            pytest.skip("No posts found in feed")
        
        return posts[0]
    
    @pytest.fixture(scope="class")
    def test_comment(self, customer_session, test_post):
        """Create a test comment on a post"""
        post_id = test_post["post_id"]
        comment_text = f"TEST_comment_{uuid.uuid4().hex[:8]}"
        
        # Create a comment
        resp = customer_session.post(
            f"{BASE_URL}/api/posts/{post_id}/comments",
            json={"text": comment_text}
        )
        assert resp.status_code == 200, f"Failed to create comment: {resp.text}"
        
        comment = resp.json()
        assert "comment_id" in comment
        assert comment["text"] == comment_text
        
        return comment
    
    # ========== EDIT COMMENT TESTS ==========
    
    def test_edit_comment_success(self, customer_session, test_comment):
        """PUT /api/comments/{comment_id} should update comment text"""
        comment_id = test_comment["comment_id"]
        new_text = f"EDITED_comment_{uuid.uuid4().hex[:8]}"
        
        resp = customer_session.put(
            f"{BASE_URL}/api/comments/{comment_id}",
            json={"text": new_text}
        )
        
        assert resp.status_code == 200, f"Edit comment failed: {resp.text}"
        
        data = resp.json()
        assert data.get("status") == "updated", f"Expected status 'updated', got: {data}"
    
    def test_edit_comment_empty_text_fails(self, customer_session, test_comment):
        """PUT /api/comments/{comment_id} with empty text should fail"""
        comment_id = test_comment["comment_id"]
        
        resp = customer_session.put(
            f"{BASE_URL}/api/comments/{comment_id}",
            json={"text": ""}
        )
        
        # Should return 400 for empty text
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    
    def test_edit_nonexistent_comment(self, customer_session):
        """PUT /api/comments/{comment_id} for non-existent comment returns 404"""
        fake_comment_id = "cmt_nonexistent123"
        
        resp = customer_session.put(
            f"{BASE_URL}/api/comments/{fake_comment_id}",
            json={"text": "Updated text"}
        )
        
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
    
    # ========== DELETE COMMENT TESTS ==========
    
    def test_delete_comment_requires_auth(self):
        """DELETE /api/comments/{comment_id} without auth returns 401"""
        session = requests.Session()
        
        resp = session.delete(f"{BASE_URL}/api/comments/cmt_test123")
        
        # Should return 401 or 403 without auth
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
    
    def test_delete_nonexistent_comment(self, customer_session):
        """DELETE /api/comments/{comment_id} for non-existent comment returns 404"""
        fake_comment_id = "cmt_nonexistent456"
        
        resp = customer_session.delete(f"{BASE_URL}/api/comments/{fake_comment_id}")
        
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
    
    def test_delete_comment_success(self, customer_session, test_post):
        """DELETE /api/comments/{comment_id} should remove the comment"""
        post_id = test_post["post_id"]
        
        # Create a comment to delete
        create_resp = customer_session.post(
            f"{BASE_URL}/api/posts/{post_id}/comments",
            json={"text": f"TO_DELETE_{uuid.uuid4().hex[:8]}"}
        )
        assert create_resp.status_code == 200, f"Create comment failed: {create_resp.text}"
        
        comment_id = create_resp.json()["comment_id"]
        
        # Delete the comment
        delete_resp = customer_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
        assert delete_resp.status_code == 200, f"Delete comment failed: {delete_resp.text}"
        
        data = delete_resp.json()
        assert data.get("status") == "deleted", f"Expected status 'deleted', got: {data}"
        
        # Verify comment is gone by trying to edit it
        verify_resp = customer_session.put(
            f"{BASE_URL}/api/comments/{comment_id}",
            json={"text": "Should fail"}
        )
        assert verify_resp.status_code == 404, "Deleted comment should not be editable"
    
    # ========== QUICK REACTIONS REGRESSION ==========
    
    def test_quick_reaction_clap(self, customer_session, test_post):
        """POST /api/posts/{post_id}/react with {emoji:'clap'} should work"""
        post_id = test_post["post_id"]
        
        resp = customer_session.post(
            f"{BASE_URL}/api/posts/{post_id}/react",
            json={"emoji": "clap"}
        )
        
        assert resp.status_code == 200, f"React failed: {resp.text}"
        
        data = resp.json()
        assert "reacted" in data, f"Response missing 'reacted': {data}"
        assert "emoji" in data, f"Response missing 'emoji': {data}"
        assert data["emoji"] == "clap", f"Expected emoji 'clap', got: {data['emoji']}"
    
    def test_quick_reaction_fire(self, customer_session, test_post):
        """POST /api/posts/{post_id}/react with {emoji:'fire'} should work"""
        post_id = test_post["post_id"]
        
        resp = customer_session.post(
            f"{BASE_URL}/api/posts/{post_id}/react",
            json={"emoji": "fire"}
        )
        
        assert resp.status_code == 200, f"React failed: {resp.text}"
        
        data = resp.json()
        assert data["emoji"] == "fire"
    
    def test_quick_reaction_invalid_emoji(self, customer_session, test_post):
        """POST /api/posts/{post_id}/react with invalid emoji should fail"""
        post_id = test_post["post_id"]
        
        resp = customer_session.post(
            f"{BASE_URL}/api/posts/{post_id}/react",
            json={"emoji": "invalid_emoji"}
        )
        
        # Should return 400 for invalid emoji
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    
    def test_get_post_reactions(self, customer_session, test_post):
        """GET /api/posts/{post_id}/reactions should return reaction counts"""
        post_id = test_post["post_id"]
        
        resp = customer_session.get(f"{BASE_URL}/api/posts/{post_id}/reactions")
        
        assert resp.status_code == 200, f"Get reactions failed: {resp.text}"
        
        data = resp.json()
        # Response should be a dict with emoji keys
        assert isinstance(data, dict), f"Expected dict, got: {type(data)}"


class TestCommentFullFlow:
    """Test full comment CRUD flow - Create → Edit → Verify → Delete"""
    
    def test_comment_crud_flow(self):
        """Full flow: create comment, edit it, verify edit, delete it"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # 1. Login
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip(f"Login failed: {login_resp.status_code}")
        
        # 2. Get a post from feed
        feed_resp = session.get(f"{BASE_URL}/api/feed?limit=1")
        assert feed_resp.status_code == 200
        
        posts = feed_resp.json().get("posts", [])
        if not posts:
            pytest.skip("No posts available")
        
        post_id = posts[0]["post_id"]
        
        # 3. CREATE comment
        original_text = f"CRUD_TEST_ORIGINAL_{uuid.uuid4().hex[:6]}"
        create_resp = session.post(
            f"{BASE_URL}/api/posts/{post_id}/comments",
            json={"text": original_text}
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        
        comment = create_resp.json()
        comment_id = comment["comment_id"]
        assert comment["text"] == original_text
        print(f"✓ Created comment: {comment_id}")
        
        # 4. EDIT comment
        edited_text = f"CRUD_TEST_EDITED_{uuid.uuid4().hex[:6]}"
        edit_resp = session.put(
            f"{BASE_URL}/api/comments/{comment_id}",
            json={"text": edited_text}
        )
        assert edit_resp.status_code == 200, f"Edit failed: {edit_resp.text}"
        print(f"✓ Edited comment to: {edited_text}")
        
        # 5. VERIFY edit by fetching comments
        time.sleep(0.5)  # Small delay for DB consistency
        comments_resp = session.get(f"{BASE_URL}/api/posts/{post_id}/comments")
        assert comments_resp.status_code == 200
        
        comments_list = comments_resp.json()
        edited_comment = next((c for c in comments_list if c["comment_id"] == comment_id), None)
        
        assert edited_comment is not None, "Edited comment not found in list"
        assert edited_comment["text"] == edited_text, f"Text mismatch: expected '{edited_text}', got '{edited_comment['text']}'"
        assert "edited_at" in edited_comment, "edited_at timestamp should be present"
        print(f"✓ Verified edit - text matches and edited_at present")
        
        # 6. DELETE comment
        delete_resp = session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print(f"✓ Deleted comment: {comment_id}")
        
        # 7. VERIFY deletion
        comments_resp2 = session.get(f"{BASE_URL}/api/posts/{post_id}/comments")
        assert comments_resp2.status_code == 200
        
        comments_list2 = comments_resp2.json()
        deleted_comment = next((c for c in comments_list2 if c["comment_id"] == comment_id), None)
        
        assert deleted_comment is None, "Deleted comment should not exist in list"
        print(f"✓ Verified deletion - comment no longer in list")


class TestCustomerDashboardQuickActions:
    """Regression: Customer Dashboard should have horizontal scrollable quick actions"""
    
    def test_customer_dashboard_loads(self):
        """GET /api/dashboard/overview should work for logged in customer"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip(f"Login failed: {login_resp.status_code}")
        
        # Get dashboard overview
        dash_resp = session.get(f"{BASE_URL}/api/dashboard/overview")
        
        # Should return 200 with some data
        assert dash_resp.status_code == 200, f"Dashboard failed: {dash_resp.status_code} - {dash_resp.text}"
        
        data = dash_resp.json()
        # Just verify it returns some structure
        assert isinstance(data, dict), "Dashboard should return a dict"
        print(f"✓ Dashboard returns: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
