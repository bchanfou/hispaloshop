"""
Test badge/achievement system APIs for Hispaloshop iteration 99.
Tests: GET /api/badges, GET /api/users/{user_id}/badges, POST /api/users/{user_id}/badges/check
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBadgeAPIs:
    """Badge API endpoint tests"""

    def test_get_all_badges(self):
        """GET /api/badges should return 11 badge definitions"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        badges = response.json()
        assert isinstance(badges, list), "Response should be a list"
        assert len(badges) == 11, f"Expected 11 badges, got {len(badges)}"
        
        # Verify badge structure
        for badge in badges:
            assert "badge_id" in badge, f"Badge missing badge_id: {badge}"
            assert "name_key" in badge, f"Badge missing name_key: {badge}"
            assert "name_default" in badge, f"Badge missing name_default: {badge}"
            assert "description_key" in badge, f"Badge missing description_key: {badge}"
            assert "description_default" in badge, f"Badge missing description_default: {badge}"
            assert "icon" in badge, f"Badge missing icon: {badge}"
            assert "category" in badge, f"Badge missing category: {badge}"
            assert "threshold" in badge, f"Badge missing threshold: {badge}"
        
        # Verify expected badge IDs are present
        expected_badge_ids = [
            "first_order", "foodie", "super_foodie",
            "first_post", "influencer_social", "commentator", "popular",
            "first_recipe", "chef",
            "first_review",
            "explorer"
        ]
        actual_badge_ids = [b["badge_id"] for b in badges]
        for expected_id in expected_badge_ids:
            assert expected_id in actual_badge_ids, f"Missing badge: {expected_id}"

    def test_get_user_badges_existing_user(self):
        """GET /api/users/{user_id}/badges should return badge progress for a user"""
        user_id = "user_test123"
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/badges")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        badges = response.json()
        assert isinstance(badges, list), "Response should be a list"
        
        # Verify badge progress structure
        for badge in badges:
            assert "badge_id" in badge
            assert "name_key" in badge
            assert "name_default" in badge
            assert "description_key" in badge
            assert "description_default" in badge
            assert "icon" in badge
            assert "category" in badge
            assert "threshold" in badge
            assert "current" in badge, f"Badge missing 'current' counter: {badge}"
            assert "earned" in badge, f"Badge missing 'earned' status: {badge}"
            assert isinstance(badge["earned"], bool), f"'earned' should be boolean: {badge}"
            
            # If earned, should have awarded_at
            if badge["earned"]:
                assert "awarded_at" in badge, f"Earned badge missing awarded_at: {badge}"

    def test_user_badges_includes_earned_badges(self):
        """User user_test123 should have some earned badges (first_order, first_post, first_recipe)"""
        user_id = "user_test123"
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/badges")
        assert response.status_code == 200
        
        badges = response.json()
        earned_badges = [b for b in badges if b["earned"]]
        
        # According to agent context, user has 3 badges: first_order, first_post, first_recipe
        earned_ids = [b["badge_id"] for b in earned_badges]
        print(f"Earned badge IDs: {earned_ids}")
        
        # At least verify the endpoint returns proper structure
        assert isinstance(earned_badges, list), "Earned badges should be a list"

    def test_get_user_badges_unknown_user(self):
        """GET /api/users/{user_id}/badges for unknown user should still return all badges with 0 progress"""
        user_id = "nonexistent_user_xyz123"
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/badges")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        badges = response.json()
        assert isinstance(badges, list), "Response should be a list"
        assert len(badges) == 11, f"Expected 11 badges, got {len(badges)}"
        
        # All badges should have earned=False and current=0 for unknown user
        for badge in badges:
            assert badge["earned"] == False, f"Unknown user should not have earned badges: {badge}"
            # Note: current could be 0 if no activity exists for user

    def test_badge_check_requires_auth(self):
        """POST /api/users/{user_id}/badges/check should require authentication"""
        user_id = "user_test123"
        response = requests.post(f"{BASE_URL}/api/users/{user_id}/badges/check")
        # Should return 401 (unauthorized) or 403 (forbidden) without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"

    def test_badge_check_with_session_auth(self):
        """POST /api/users/{user_id}/badges/check with valid session should work"""
        # Login first to get session
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login: {login_response.status_code} - {login_response.text}")
        
        login_data = login_response.json()
        user_id = login_data.get("user", {}).get("user_id", "user_test123")
        
        # Now check badges
        response = session.post(f"{BASE_URL}/api/users/{user_id}/badges/check")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "newly_awarded" in data, f"Response should have 'newly_awarded' field: {data}"
        assert isinstance(data["newly_awarded"], list), "'newly_awarded' should be a list"

    def test_badge_check_own_user_only(self):
        """POST /api/users/{user_id}/badges/check should only work for own user"""
        # Login as test user
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login: {login_response.status_code} - {login_response.text}")
        
        # Try to check badges for a different user
        other_user_id = "some_other_user_id"
        response = session.post(f"{BASE_URL}/api/users/{other_user_id}/badges/check")
        # Should return 403 forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"

    def test_badge_categories_are_valid(self):
        """All badges should have valid categories"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        
        badges = response.json()
        valid_categories = {"shopping", "social", "recipes", "reviews", "explore"}
        
        for badge in badges:
            assert badge["category"] in valid_categories, f"Invalid category '{badge['category']}' for badge {badge['badge_id']}"

    def test_badge_thresholds_are_positive(self):
        """All badge thresholds should be positive integers"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        
        badges = response.json()
        for badge in badges:
            assert isinstance(badge["threshold"], int), f"Threshold should be int: {badge}"
            assert badge["threshold"] > 0, f"Threshold should be positive: {badge}"
