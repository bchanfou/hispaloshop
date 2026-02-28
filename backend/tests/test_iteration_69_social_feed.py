"""
Iteration 69 - Social Feed & Conversion Tracking Tests
Tests for:
- GET /api/feed (scored algorithm)
- GET /api/feed?limit=5 (pagination)
- GET /api/feed/trending (trending posts)
- GET /api/feed/best-sellers (best selling products)
- POST /api/track/social-event (conversion tracking)
- GET /api/products (still working)
- POST /api/auth/login (still working)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthEndpoints:
    """Auth endpoints still working"""
    
    def test_login_admin(self):
        """POST /api/auth/login - admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hispaloshop.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        print(f"PASS: Admin login successful - role={data['user'].get('role')}")
    
    def test_login_customer(self):
        """POST /api/auth/login - customer credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "user" in data
        print(f"PASS: Customer login successful - role={data['user'].get('role')}")


class TestProductsEndpoint:
    """Products endpoint still working"""
    
    def test_get_products(self):
        """GET /api/products - verify still works"""
        response = requests.get(f"{BASE_URL}/api/products?approved_only=true")
        assert response.status_code == 200, f"Products failed: {response.text}"
        data = response.json()
        # Should return products array (either {products:[]} or direct [])
        products = data.get("products") if isinstance(data, dict) else data
        assert isinstance(products, list), f"Expected list of products"
        print(f"PASS: GET /api/products returned {len(products)} products")


class TestSocialFeedEndpoint:
    """Feed endpoint with scoring algorithm"""
    
    def test_feed_default(self):
        """GET /api/feed - returns scored posts"""
        response = requests.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Feed failed: {response.text}"
        data = response.json()
        assert "posts" in data, f"Expected 'posts' key, got: {data.keys()}"
        assert isinstance(data["posts"], list), f"posts should be list"
        # has_more indicates pagination support
        print(f"PASS: GET /api/feed returned {len(data['posts'])} posts, has_more={data.get('has_more')}")
    
    def test_feed_with_limit(self):
        """GET /api/feed?limit=5 - pagination works"""
        response = requests.get(f"{BASE_URL}/api/feed?limit=5")
        assert response.status_code == 200, f"Feed with limit failed: {response.text}"
        data = response.json()
        assert "posts" in data
        assert len(data["posts"]) <= 5, f"Expected max 5 posts, got {len(data['posts'])}"
        print(f"PASS: GET /api/feed?limit=5 returned {len(data['posts'])} posts (max 5)")
    
    def test_feed_pagination_skip(self):
        """GET /api/feed?skip=5&limit=5 - skip works"""
        response = requests.get(f"{BASE_URL}/api/feed?skip=5&limit=5")
        assert response.status_code == 200, f"Feed with skip failed: {response.text}"
        data = response.json()
        assert "posts" in data
        print(f"PASS: GET /api/feed?skip=5&limit=5 returned {len(data['posts'])} posts")


class TestTrendingEndpoint:
    """Trending posts endpoint"""
    
    def test_trending_posts(self):
        """GET /api/feed/trending - returns trending posts"""
        response = requests.get(f"{BASE_URL}/api/feed/trending")
        assert response.status_code == 200, f"Trending failed: {response.text}"
        data = response.json()
        assert "posts" in data, f"Expected 'posts' key, got: {data.keys()}"
        assert isinstance(data["posts"], list)
        print(f"PASS: GET /api/feed/trending returned {len(data['posts'])} posts")
    
    def test_trending_with_limit(self):
        """GET /api/feed/trending?limit=3 - limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/feed/trending?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert len(data["posts"]) <= 3
        print(f"PASS: GET /api/feed/trending?limit=3 returned {len(data['posts'])} posts")


class TestBestSellersEndpoint:
    """Best sellers endpoint"""
    
    def test_best_sellers(self):
        """GET /api/feed/best-sellers - returns best selling products"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers")
        assert response.status_code == 200, f"Best sellers failed: {response.text}"
        data = response.json()
        # Returns array of products (not wrapped in {products:})
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        if len(data) > 0:
            # Check product structure
            assert "product_id" in data[0] or "name" in data[0]
            assert "total_sold" in data[0] or "price" in data[0]
        print(f"PASS: GET /api/feed/best-sellers returned {len(data)} products")
    
    def test_best_sellers_with_limit(self):
        """GET /api/feed/best-sellers?limit=4 - limit works"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers?limit=4")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 4
        print(f"PASS: GET /api/feed/best-sellers?limit=4 returned {len(data)} products")


class TestSocialEventTracking:
    """Social event tracking endpoint"""
    
    def test_track_click_info_event(self):
        """POST /api/track/social-event - click_info event"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "click_info",
            "country": "ES"
        })
        assert response.status_code == 200, f"Track event failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: POST /api/track/social-event click_info accepted")
    
    def test_track_become_seller_event(self):
        """POST /api/track/social-event - click_become_seller event"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "click_become_seller",
            "country": "ES"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: POST /api/track/social-event click_become_seller accepted")
    
    def test_track_become_influencer_event(self):
        """POST /api/track/social-event - click_become_influencer event"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "click_become_influencer",
            "country": "ES"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: POST /api/track/social-event click_become_influencer accepted")
    
    def test_track_view_post_event(self):
        """POST /api/track/social-event - view_post event with post_id"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "view_post",
            "post_id": "test_post_123",
            "country": "ES"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: POST /api/track/social-event view_post accepted")
    
    def test_track_invalid_event_type(self):
        """POST /api/track/social-event - invalid event handled gracefully"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "invalid_event_type_xyz",
            "country": "ES"
        })
        # Should return 200 with status ok (graceful handling, no error)
        assert response.status_code == 200, f"Invalid event should be handled gracefully: {response.text}"
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: POST /api/track/social-event invalid event handled gracefully (returns ok)")
    
    def test_track_click_product_from_post(self):
        """POST /api/track/social-event - click_product_from_post event"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "click_product_from_post",
            "post_id": "test_post_123",
            "product_id": "test_prod_456",
            "country": "ES"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: POST /api/track/social-event click_product_from_post accepted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
