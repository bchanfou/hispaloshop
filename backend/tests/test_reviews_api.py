"""
Test suite for Reviews & Ratings feature (Phase B1)
Tests:
- GET /api/products/{id}/reviews - Public reviews list with average rating
- POST /api/reviews/create - Verified buyers only
- GET /api/reviews/can-review/{product_id} - Check if user can review
- Review validation - Prevent duplicates, require completed orders
- Admin moderation - GET/hide/show/delete reviews
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "admin123"
TEST_PRODUCT_ID = "prod_7889643617d1"  # Premium Extra Virgin Olive Oil
TEST_ORDER_ID = "order_test_review_001"  # Pre-created test order


class TestReviewsPublicEndpoints:
    """Test public reviews endpoints (no auth required)"""
    
    def test_get_product_reviews_returns_structure(self):
        """GET /api/products/{id}/reviews returns reviews, average_rating, total_reviews"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data, "Response should contain 'reviews' key"
        assert "average_rating" in data, "Response should contain 'average_rating' key"
        assert "total_reviews" in data, "Response should contain 'total_reviews' key"
        
        assert isinstance(data["reviews"], list), "reviews should be a list"
        assert isinstance(data["average_rating"], (int, float)), "average_rating should be numeric"
        assert isinstance(data["total_reviews"], int), "total_reviews should be integer"
        print(f"✓ Product reviews endpoint returns correct structure: {data['total_reviews']} reviews, avg rating: {data['average_rating']}")
    
    def test_get_product_reviews_nonexistent_product(self):
        """GET /api/products/{id}/reviews for non-existent product returns empty list"""
        response = requests.get(f"{BASE_URL}/api/products/nonexistent_product_123/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["reviews"] == [], "Non-existent product should return empty reviews"
        assert data["total_reviews"] == 0, "Non-existent product should have 0 reviews"
        print("✓ Non-existent product returns empty reviews list")


class TestReviewsAuthentication:
    """Test reviews endpoints that require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        })
        print(f"✓ Logged in as admin: {ADMIN_EMAIL}")
    
    def test_can_review_endpoint_returns_structure(self):
        """GET /api/reviews/can-review/{product_id} returns can_review boolean"""
        response = self.session.get(f"{BASE_URL}/api/reviews/can-review/{TEST_PRODUCT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "can_review" in data, "Response should contain 'can_review' key"
        assert isinstance(data["can_review"], bool), "can_review should be boolean"
        
        if data["can_review"]:
            assert "order_id" in data, "If can_review is True, order_id should be present"
        else:
            assert "reason" in data, "If can_review is False, reason should be present"
        
        print(f"✓ Can review endpoint works: can_review={data['can_review']}")
    
    def test_can_review_requires_auth(self):
        """GET /api/reviews/can-review/{product_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/reviews/can-review/{TEST_PRODUCT_ID}")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Can review endpoint requires authentication")


class TestReviewCreation:
    """Test review creation with validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        })
    
    def test_create_review_requires_auth(self):
        """POST /api/reviews/create requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reviews/create",
            json={
                "product_id": TEST_PRODUCT_ID,
                "order_id": TEST_ORDER_ID,
                "rating": 8,
                "comment": "Test review"
            }
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Create review requires authentication")
    
    def test_create_review_prevents_duplicate(self):
        """POST /api/reviews/create prevents duplicate reviews from same user"""
        # Admin already has a review on this product (per test setup)
        response = self.session.post(
            f"{BASE_URL}/api/reviews/create",
            json={
                "product_id": TEST_PRODUCT_ID,
                "order_id": TEST_ORDER_ID,
                "rating": 9,
                "comment": "Trying to create duplicate review"
            }
        )
        # Should fail because admin already reviewed this product
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}: {response.text}"
        assert "already reviewed" in response.text.lower(), "Error should mention already reviewed"
        print("✓ Duplicate review prevention works")
    
    def test_create_review_requires_valid_order(self):
        """POST /api/reviews/create requires valid order_id"""
        response = self.session.post(
            f"{BASE_URL}/api/reviews/create",
            json={
                "product_id": TEST_PRODUCT_ID,
                "order_id": "invalid_order_123",
                "rating": 8,
                "comment": "Test review with invalid order"
            }
        )
        assert response.status_code == 404, f"Expected 404 for invalid order, got {response.status_code}: {response.text}"
        print("✓ Invalid order_id returns 404")
    
    def test_create_review_requires_product_in_order(self):
        """POST /api/reviews/create requires product to be in the order"""
        # Try to review a product that's not in the test order
        response = self.session.post(
            f"{BASE_URL}/api/reviews/create",
            json={
                "product_id": "prod_nonexistent_123",
                "order_id": TEST_ORDER_ID,
                "rating": 8,
                "comment": "Test review for wrong product"
            }
        )
        # Should fail - product not in order
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}: {response.text}"
        print("✓ Product must be in order to review")
    
    def test_create_review_validates_rating_range(self):
        """POST /api/reviews/create validates rating is 0-10"""
        # Test rating > 10
        response = self.session.post(
            f"{BASE_URL}/api/reviews/create",
            json={
                "product_id": TEST_PRODUCT_ID,
                "order_id": TEST_ORDER_ID,
                "rating": 15,  # Invalid - should be 0-10
                "comment": "Test review"
            }
        )
        assert response.status_code == 422, f"Expected 422 for invalid rating, got {response.status_code}"
        print("✓ Rating validation (>10) works")
        
        # Test rating < 0
        response = self.session.post(
            f"{BASE_URL}/api/reviews/create",
            json={
                "product_id": TEST_PRODUCT_ID,
                "order_id": TEST_ORDER_ID,
                "rating": -1,  # Invalid - should be 0-10
                "comment": "Test review"
            }
        )
        assert response.status_code == 422, f"Expected 422 for negative rating, got {response.status_code}"
        print("✓ Rating validation (<0) works")


class TestAdminReviewModeration:
    """Test admin review moderation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        })
    
    def test_admin_get_all_reviews(self):
        """GET /api/admin/reviews returns all reviews with product names"""
        response = self.session.get(f"{BASE_URL}/api/admin/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            review = data[0]
            assert "review_id" in review, "Review should have review_id"
            assert "product_id" in review, "Review should have product_id"
            assert "user_id" in review, "Review should have user_id"
            assert "rating" in review, "Review should have rating"
            assert "comment" in review, "Review should have comment"
            assert "product_name" in review, "Review should have product_name (enriched)"
            assert "visible" in review, "Review should have visible flag"
            print(f"✓ Admin reviews endpoint returns {len(data)} reviews with product names")
        else:
            print("✓ Admin reviews endpoint works (no reviews yet)")
    
    def test_admin_reviews_requires_admin_role(self):
        """GET /api/admin/reviews requires admin role"""
        # Try without auth
        response = requests.get(f"{BASE_URL}/api/admin/reviews")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Admin reviews endpoint requires authentication")
    
    def test_admin_hide_review(self):
        """PUT /api/admin/reviews/{id}/hide hides a review"""
        # First get a review to hide
        reviews_response = self.session.get(f"{BASE_URL}/api/admin/reviews")
        reviews = reviews_response.json()
        
        if len(reviews) == 0:
            pytest.skip("No reviews to test hide functionality")
        
        review_id = reviews[0]["review_id"]
        
        # Hide the review
        response = self.session.put(f"{BASE_URL}/api/admin/reviews/{review_id}/hide")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        print(f"✓ Admin can hide review: {review_id}")
        
        # Verify it's hidden
        reviews_response = self.session.get(f"{BASE_URL}/api/admin/reviews")
        updated_review = next((r for r in reviews_response.json() if r["review_id"] == review_id), None)
        assert updated_review is not None, "Review should still exist"
        assert updated_review["visible"] == False, "Review should be hidden"
        print("✓ Review visibility updated to hidden")
    
    def test_admin_show_review(self):
        """PUT /api/admin/reviews/{id}/show shows a hidden review"""
        # First get a review
        reviews_response = self.session.get(f"{BASE_URL}/api/admin/reviews")
        reviews = reviews_response.json()
        
        if len(reviews) == 0:
            pytest.skip("No reviews to test show functionality")
        
        review_id = reviews[0]["review_id"]
        
        # Show the review
        response = self.session.put(f"{BASE_URL}/api/admin/reviews/{review_id}/show")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        print(f"✓ Admin can show review: {review_id}")
        
        # Verify it's visible
        reviews_response = self.session.get(f"{BASE_URL}/api/admin/reviews")
        updated_review = next((r for r in reviews_response.json() if r["review_id"] == review_id), None)
        assert updated_review is not None, "Review should still exist"
        assert updated_review["visible"] == True, "Review should be visible"
        print("✓ Review visibility updated to visible")
    
    def test_admin_hide_nonexistent_review(self):
        """PUT /api/admin/reviews/{id}/hide returns 404 for non-existent review"""
        response = self.session.put(f"{BASE_URL}/api/admin/reviews/nonexistent_review_123/hide")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Hide non-existent review returns 404")
    
    def test_admin_show_nonexistent_review(self):
        """PUT /api/admin/reviews/{id}/show returns 404 for non-existent review"""
        response = self.session.put(f"{BASE_URL}/api/admin/reviews/nonexistent_review_123/show")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Show non-existent review returns 404")


class TestReviewDeletion:
    """Test review deletion (separate class to run last)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        })
    
    def test_admin_delete_nonexistent_review(self):
        """DELETE /api/admin/reviews/{id} returns 404 for non-existent review"""
        response = self.session.delete(f"{BASE_URL}/api/admin/reviews/nonexistent_review_123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent review returns 404")


class TestReviewIntegration:
    """Integration tests for reviews flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.session.headers.update({
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        })
    
    def test_hidden_reviews_not_in_public_list(self):
        """Hidden reviews should not appear in public product reviews"""
        # Get admin reviews to find a visible one
        admin_response = self.session.get(f"{BASE_URL}/api/admin/reviews")
        admin_reviews = admin_response.json()
        
        if len(admin_reviews) == 0:
            pytest.skip("No reviews to test")
        
        # Find a visible review
        visible_review = next((r for r in admin_reviews if r.get("visible", True)), None)
        if not visible_review:
            pytest.skip("No visible reviews to test")
        
        product_id = visible_review["product_id"]
        review_id = visible_review["review_id"]
        
        # Get public reviews for this product
        public_response = requests.get(f"{BASE_URL}/api/products/{product_id}/reviews")
        public_reviews = public_response.json()["reviews"]
        
        # Verify the visible review is in public list
        public_review_ids = [r["review_id"] for r in public_reviews]
        assert review_id in public_review_ids, "Visible review should be in public list"
        print(f"✓ Visible review {review_id} appears in public list")
        
        # Hide the review
        self.session.put(f"{BASE_URL}/api/admin/reviews/{review_id}/hide")
        
        # Get public reviews again
        public_response = requests.get(f"{BASE_URL}/api/products/{product_id}/reviews")
        public_reviews = public_response.json()["reviews"]
        
        # Verify the hidden review is NOT in public list
        public_review_ids = [r["review_id"] for r in public_reviews]
        assert review_id not in public_review_ids, "Hidden review should NOT be in public list"
        print(f"✓ Hidden review {review_id} does NOT appear in public list")
        
        # Restore visibility
        self.session.put(f"{BASE_URL}/api/admin/reviews/{review_id}/show")
        print("✓ Review visibility restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
