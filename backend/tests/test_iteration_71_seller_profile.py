"""
Test Iteration 71 - Enhanced Seller Profile & Mandatory Product Tagging

Features tested:
1. GET /api/users/{producer_user_id}/profile - seller_stats for producer role
2. GET /api/users/{customer_user_id}/profile - NO seller_stats for customer role
3. POST /api/posts - producer WITHOUT product_id should get 400 error
4. POST /api/posts - customer WITHOUT product_id should still work
5. GET /api/feed - feed still works
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSellerProfileStats:
    """Test enhanced seller profile with seller_stats for producers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Producer credentials from test request
        self.producer_email = "producer@test.com"
        self.producer_password = "password123"
        self.producer_user_id = "user_testprod001"
        # Customer credentials
        self.customer_email = "test@example.com"
        self.customer_password = "password123"
    
    def get_auth_token(self, email, password):
        """Login and return session with auth cookie"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token"), data.get("user", {}).get("user_id")
        return None, None
    
    def test_producer_profile_has_seller_stats(self):
        """GET /api/users/{producer_user_id}/profile - verify seller_stats present for producer role"""
        response = self.session.get(f"{BASE_URL}/api/users/{self.producer_user_id}/profile")
        
        # Should return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify basic profile fields
        assert "user_id" in data, "user_id missing from profile"
        assert data.get("role") == "producer", f"Expected role 'producer', got {data.get('role')}"
        
        # Verify seller_stats present for producer
        assert "seller_stats" in data, "seller_stats missing from producer profile"
        
        seller_stats = data["seller_stats"]
        
        # Verify all required fields in seller_stats
        required_fields = [
            "total_sales", "total_orders", "avg_rating", "review_count",
            "total_products", "featured_products", "store_slug", "verified"
        ]
        for field in required_fields:
            assert field in seller_stats, f"Field '{field}' missing from seller_stats"
        
        # Verify types
        assert isinstance(seller_stats["total_sales"], (int, float)), "total_sales should be numeric"
        assert isinstance(seller_stats["total_orders"], int), "total_orders should be int"
        assert isinstance(seller_stats["avg_rating"], (int, float, type(None))), "avg_rating should be numeric or None"
        assert isinstance(seller_stats["review_count"], int), "review_count should be int"
        assert isinstance(seller_stats["total_products"], int), "total_products should be int"
        assert isinstance(seller_stats["featured_products"], list), "featured_products should be list"
        assert isinstance(seller_stats["verified"], bool), "verified should be bool"
        
        # Featured products should have max 4 items
        assert len(seller_stats["featured_products"]) <= 4, "featured_products should have max 4 items"
        
        # Each featured product should have basic fields
        for prod in seller_stats["featured_products"]:
            assert "product_id" in prod, "featured product missing product_id"
            assert "name" in prod, "featured product missing name"
        
        print(f"✓ Producer profile has seller_stats:")
        print(f"  - total_sales: {seller_stats['total_sales']}")
        print(f"  - total_orders: {seller_stats['total_orders']}")
        print(f"  - avg_rating: {seller_stats['avg_rating']}")
        print(f"  - review_count: {seller_stats['review_count']}")
        print(f"  - total_products: {seller_stats['total_products']}")
        print(f"  - featured_products count: {len(seller_stats['featured_products'])}")
        print(f"  - store_slug: {seller_stats['store_slug']}")
        print(f"  - verified: {seller_stats['verified']}")
    
    def test_customer_profile_no_seller_stats(self):
        """GET /api/users/{customer_user_id}/profile - verify seller_stats NOT present for customer role"""
        # First login as customer to get their user_id
        token, customer_user_id = self.get_auth_token(self.customer_email, self.customer_password)
        
        if not customer_user_id:
            pytest.skip("Could not login as customer")
        
        response = self.session.get(f"{BASE_URL}/api/users/{customer_user_id}/profile")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify role is customer
        assert data.get("role") == "customer", f"Expected role 'customer', got {data.get('role')}"
        
        # Verify seller_stats NOT present for customer
        assert "seller_stats" not in data, "seller_stats should NOT be present for customer profile"
        
        print(f"✓ Customer profile does NOT have seller_stats (as expected)")
        print(f"  - user_id: {customer_user_id}")
        print(f"  - role: {data.get('role')}")
    
    def test_admin_can_see_producer_profile(self):
        """Admin can view producer profile with seller_stats"""
        # Login as admin first
        admin_email = "admin@hispaloshop.com"
        admin_password = "password123"
        
        token, _ = self.get_auth_token(admin_email, admin_password)
        
        # View producer profile
        response = self.session.get(f"{BASE_URL}/api/users/{self.producer_user_id}/profile")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "seller_stats" in data, "seller_stats should be present for producer"
        
        print(f"✓ Admin can view producer profile with seller_stats")


class TestMandatoryProductTagging:
    """Test mandatory product tagging for producer/influencer posts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.producer_email = "producer@test.com"
        self.producer_password = "password123"
        self.customer_email = "test@example.com"
        self.customer_password = "password123"
    
    def login(self, email, password):
        """Login and set session cookies"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            if token:
                self.session.cookies.set("session_token", token)
            return data.get("user")
        return None
    
    def create_test_image(self):
        """Create a small test image"""
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_producer_post_without_product_fails(self):
        """POST /api/posts - producer WITHOUT product_id should get 400 error"""
        user = self.login(self.producer_email, self.producer_password)
        
        if not user or user.get("role") != "producer":
            pytest.skip("Could not login as producer or role mismatch")
        
        # Create post WITHOUT product_id
        img = self.create_test_image()
        files = {"file": ("test.jpg", img, "image/jpeg")}
        data = {"caption": "Test post without product"}
        
        response = self.session.post(
            f"{BASE_URL}/api/posts",
            files=files,
            data=data
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 for producer without product_id, got {response.status_code}: {response.text}"
        
        # Verify error message
        error_detail = response.json().get("detail", "")
        assert "producto" in error_detail.lower() or "product" in error_detail.lower(), f"Error should mention product requirement: {error_detail}"
        
        print(f"✓ Producer post without product_id correctly rejected (400)")
        print(f"  - Error: {error_detail}")
    
    def test_producer_post_with_empty_product_id_fails(self):
        """POST /api/posts - producer with empty product_id should get 400 error"""
        user = self.login(self.producer_email, self.producer_password)
        
        if not user or user.get("role") != "producer":
            pytest.skip("Could not login as producer")
        
        # Create post with empty product_id
        img = self.create_test_image()
        files = {"file": ("test.jpg", img, "image/jpeg")}
        data = {"caption": "Test post with empty product_id", "product_id": ""}
        
        response = self.session.post(
            f"{BASE_URL}/api/posts",
            files=files,
            data=data
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 for producer with empty product_id, got {response.status_code}"
        
        print(f"✓ Producer post with empty product_id correctly rejected (400)")
    
    def test_customer_post_without_product_succeeds(self):
        """POST /api/posts - customer WITHOUT product_id should still work"""
        user = self.login(self.customer_email, self.customer_password)
        
        if not user:
            pytest.skip("Could not login as customer")
        
        if user.get("role") == "producer" or user.get("role") == "influencer":
            pytest.skip("User is not a customer")
        
        # Create post WITHOUT product_id
        img = self.create_test_image()
        files = {"file": ("test.jpg", img, "image/jpeg")}
        data = {"caption": "Customer test post"}
        
        response = self.session.post(
            f"{BASE_URL}/api/posts",
            files=files,
            data=data
        )
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200 for customer without product_id, got {response.status_code}: {response.text}"
        
        post_data = response.json()
        assert "post_id" in post_data, "Response should contain post_id"
        
        print(f"✓ Customer post without product_id succeeded")
        print(f"  - post_id: {post_data.get('post_id')}")


class TestFeedEndpoint:
    """Test feed endpoint still works"""
    
    def test_feed_returns_posts(self):
        """GET /api/feed - verify feed still works"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/feed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Feed returns {posts: [], total:, has_more:}
        assert "posts" in data, "Feed should return object with 'posts' key"
        assert isinstance(data["posts"], list), "posts should be a list"
        
        print(f"✓ Feed endpoint works, returned {len(data['posts'])} posts")
    
    def test_feed_with_pagination(self):
        """GET /api/feed with skip/limit params"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/feed?skip=0&limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        posts = data.get("posts", data) if isinstance(data, dict) else data
        assert len(posts) <= 5, "Should respect limit parameter"
        
        print(f"✓ Feed pagination works (limit=5 returned {len(posts)} posts)")


class TestHomePageBackend:
    """Test backend endpoints that HomePage uses"""
    
    def test_products_endpoint(self):
        """GET /api/products - verify products endpoint works"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Products should return a list"
        
        print(f"✓ Products endpoint works, returned {len(data)} products")
    
    def test_feed_trending(self):
        """GET /api/feed/trending - verify trending endpoint works"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/feed/trending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Trending returns {posts: []} object
        if isinstance(data, dict) and "posts" in data:
            posts = data["posts"]
        else:
            posts = data
        assert isinstance(posts, list), "Trending posts should be a list"
        
        print(f"✓ Trending endpoint works, returned {len(posts)} posts")
    
    def test_feed_best_sellers(self):
        """GET /api/feed/best-sellers - verify best sellers endpoint works"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/feed/best-sellers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Best sellers should return a list"
        
        print(f"✓ Best sellers endpoint works, returned {len(data)} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
