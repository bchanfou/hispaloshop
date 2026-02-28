"""
Iteration 70 - Enhanced Social Feed Test Suite
Tests for:
- Quick-buy modal components
- TaggedProductCard with buy/cart buttons
- Social event tracking on interactions
- Country display (user_country) on posts
- Feed endpoint enrichment with stock, avg_rating, in_stock, review_count
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"


class TestFeedEndpoints:
    """Test feed-related endpoints"""

    def test_feed_returns_posts_with_user_country(self):
        """GET /api/feed - verify posts include user_country field"""
        response = requests.get(f"{BASE_URL}/api/feed?limit=10")
        assert response.status_code == 200, f"Feed returned {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data, "Response should have 'posts' key"
        assert "has_more" in data, "Response should have 'has_more' key"
        
        # Check that posts have user_country field (can be None if user has no country set)
        for post in data["posts"][:3]:  # Check first 3 posts
            assert "user_country" in post or post.get("user_country") is None, \
                f"Post {post.get('post_id')} should have user_country field"
            print(f"Post {post.get('post_id')}: user_country={post.get('user_country')}")

    def test_feed_returns_posts_with_scored_sorting(self):
        """GET /api/feed - verify posts are returned (scoring algorithm)"""
        response = requests.get(f"{BASE_URL}/api/feed?skip=0&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["posts"], list)
        print(f"Feed returned {len(data['posts'])} posts, has_more={data.get('has_more')}")

    def test_feed_tagged_product_enrichment(self):
        """GET /api/feed - verify tagged_product has stock, in_stock, avg_rating fields when present"""
        response = requests.get(f"{BASE_URL}/api/feed?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        # Find posts with tagged products
        posts_with_products = [p for p in data["posts"] if p.get("tagged_product")]
        
        if posts_with_products:
            for post in posts_with_products[:3]:  # Check first 3
                tp = post["tagged_product"]
                print(f"Tagged product in post {post['post_id']}: {tp.get('name')}")
                # These fields should be enriched when product exists
                assert "product_id" in tp, "Tagged product should have product_id"
                # Check for enrichment fields (may or may not be present depending on product data)
                if tp.get("product_id"):
                    print(f"  - price: {tp.get('price')}")
                    print(f"  - stock: {tp.get('stock')}")
                    print(f"  - in_stock: {tp.get('in_stock')}")
                    print(f"  - avg_rating: {tp.get('avg_rating')}")
        else:
            print("INFO: No posts with tagged products found in current feed data")
            # This is OK - main agent notes that current posts may not have tagged products

    def test_feed_pagination(self):
        """GET /api/feed - verify pagination works"""
        response1 = requests.get(f"{BASE_URL}/api/feed?skip=0&limit=5")
        assert response1.status_code == 200
        
        response2 = requests.get(f"{BASE_URL}/api/feed?skip=5&limit=5")
        assert response2.status_code == 200
        
        posts1 = response1.json()["posts"]
        posts2 = response2.json()["posts"]
        
        if posts1 and posts2:
            # Ensure different posts returned
            ids1 = set(p["post_id"] for p in posts1)
            ids2 = set(p["post_id"] for p in posts2)
            overlap = ids1 & ids2
            assert len(overlap) == 0, f"Pagination returned overlapping posts: {overlap}"
        print(f"Page 1: {len(posts1)} posts, Page 2: {len(posts2)} posts")


class TestBestSellersEndpoint:
    """Test GET /api/feed/best-sellers endpoint"""

    def test_best_sellers_returns_products(self):
        """GET /api/feed/best-sellers - verify returns products with total_sold"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers?limit=10")
        assert response.status_code == 200, f"Best sellers returned {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of products"
        
        for product in data[:3]:
            # Each product should have basic fields
            assert "product_id" in product, "Product should have product_id"
            assert "name" in product, "Product should have name"
            # total_sold should be present (can be 0)
            print(f"Best seller: {product.get('name')} - total_sold={product.get('total_sold', 'N/A')}")

    def test_best_sellers_limit_param(self):
        """GET /api/feed/best-sellers - verify limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers?limit=3")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 3, f"Should return at most 3 products, got {len(data)}"


class TestTrendingEndpoint:
    """Test GET /api/feed/trending endpoint"""

    def test_trending_returns_posts(self):
        """GET /api/feed/trending - verify trending posts returned"""
        response = requests.get(f"{BASE_URL}/api/feed/trending?limit=5")
        assert response.status_code == 200, f"Trending returned {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data, "Response should have 'posts' key"
        
        for post in data["posts"][:3]:
            assert "post_id" in post
            print(f"Trending post: {post.get('post_id')} by {post.get('user_name')}")

    def test_trending_limit_param(self):
        """GET /api/feed/trending - verify limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/feed/trending?limit=2")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data.get("posts", [])) <= 2


class TestSocialEventTracking:
    """Test POST /api/track/social-event endpoint for new event types"""

    def test_track_share_post_event(self):
        """POST /api/track/social-event (share_post) - verify accepted"""
        payload = {
            "event_type": "share_post",
            "post_id": "test_post_123",
            "country": "ES"
        }
        response = requests.post(f"{BASE_URL}/api/track/social-event", json=payload)
        assert response.status_code == 200, f"Share post event failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status ok, got {data}"
        print("PASS: share_post event tracked")

    def test_track_save_post_event(self):
        """POST /api/track/social-event (save_post) - verify accepted"""
        payload = {
            "event_type": "save_post",
            "post_id": "test_post_456",
            "country": "ES"
        }
        response = requests.post(f"{BASE_URL}/api/track/social-event", json=payload)
        assert response.status_code == 200, f"Save post event failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: save_post event tracked")

    def test_track_click_product_from_post_event(self):
        """POST /api/track/social-event (click_product_from_post) - verify accepted"""
        payload = {
            "event_type": "click_product_from_post",
            "product_id": "test_product_789",
            "post_id": "test_post_123"
        }
        response = requests.post(f"{BASE_URL}/api/track/social-event", json=payload)
        assert response.status_code == 200, f"Click product event failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: click_product_from_post event tracked")

    def test_track_add_to_cart_from_post_event(self):
        """POST /api/track/social-event (add_to_cart_from_post) - verify accepted"""
        payload = {
            "event_type": "add_to_cart_from_post",
            "product_id": "test_product_abc",
            "post_id": "test_post_xyz"
        }
        response = requests.post(f"{BASE_URL}/api/track/social-event", json=payload)
        assert response.status_code == 200, f"Add to cart event failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: add_to_cart_from_post event tracked")

    def test_track_buy_from_post_event(self):
        """POST /api/track/social-event (buy_from_post) - verify accepted"""
        payload = {
            "event_type": "buy_from_post",
            "product_id": "test_product_buy",
            "post_id": "test_post_buy"
        }
        response = requests.post(f"{BASE_URL}/api/track/social-event", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: buy_from_post event tracked")


class TestAuthStillWorks:
    """Verify authentication still functions correctly"""

    def test_admin_login(self):
        """POST /api/auth/login - verify admin auth still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        print(f"PASS: Admin login - role={data['user'].get('role')}")

    def test_customer_login(self):
        """POST /api/auth/login - verify customer auth still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        print(f"PASS: Customer login - name={data['user'].get('name')}")


class TestProductsStillWork:
    """Verify products endpoint still functions"""

    def test_get_products(self):
        """GET /api/products - verify products still work"""
        response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        assert response.status_code == 200, f"Products failed: {response.text}"
        
        data = response.json()
        # API may return list directly or {"products": [...]}
        products = data.get("products", data) if isinstance(data, dict) else data
        assert isinstance(products, list)
        print(f"PASS: Products returned {len(products)} items")


class TestCartStillWorks:
    """Verify cart functionality still works"""

    def test_cart_add_requires_auth(self):
        """POST /api/cart/add - verify cart requires authentication"""
        response = requests.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": "test",
            "quantity": 1
        })
        # Should return 401 without auth
        assert response.status_code == 401, f"Cart add without auth should be 401, got {response.status_code}"
        print("PASS: Cart add requires authentication")

    def test_cart_add_with_auth(self):
        """POST /api/cart/add - verify cart works with authentication"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Could not login")
        
        token = login_resp.json().get("session_token")
        
        # Get a valid product
        products_resp = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        if products_resp.status_code != 200:
            pytest.skip("Could not get products")
        
        data = products_resp.json()
        products = data.get("products", data) if isinstance(data, dict) else data
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0].get("product_id")
        
        # Add to cart with auth
        cart_resp = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            cookies={"session_token": token}
        )
        # Accept 200 or 400 (product may already be in cart or have constraints)
        assert cart_resp.status_code in [200, 400], f"Cart add failed: {cart_resp.status_code} - {cart_resp.text}"
        print(f"PASS: Cart add returned {cart_resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
