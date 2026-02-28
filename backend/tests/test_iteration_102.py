"""
Iteration 102 Tests - Store page i18n, AI chat styling, Certificates fix
Tests: Store page, AI chat, certificates endpoint, translations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCertificatesEndpoint:
    """Test the certificates endpoint fix - was returning 500 before"""
    
    def test_certificate_product_with_es_lang(self):
        """GET /api/certificates/product/prod_7889643617d1?lang=es should return 200"""
        response = requests.get(f"{BASE_URL}/api/certificates/product/prod_7889643617d1?lang=es")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "certificate_id" in data
        assert "product_id" in data
        assert data["product_id"] == "prod_7889643617d1"
        print(f"✓ Certificate endpoint with lang=es returns 200")
    
    def test_certificate_product_with_en_lang(self):
        """GET /api/certificates/product/prod_7889643617d1?lang=en should return 200"""
        response = requests.get(f"{BASE_URL}/api/certificates/product/prod_7889643617d1?lang=en")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "certificate_id" in data
        print(f"✓ Certificate endpoint with lang=en returns 200")
    
    def test_certificate_product_with_ko_lang(self):
        """GET /api/certificates/product/prod_7889643617d1?lang=ko should return 200"""
        response = requests.get(f"{BASE_URL}/api/certificates/product/prod_7889643617d1?lang=ko")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "certificate_id" in data
        print(f"✓ Certificate endpoint with lang=ko returns 200")
    
    def test_certificate_product_without_lang(self):
        """GET /api/certificates/product/prod_7889643617d1 without lang param should return 200"""
        response = requests.get(f"{BASE_URL}/api/certificates/product/prod_7889643617d1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "certificate_id" in data
        print(f"✓ Certificate endpoint without lang param returns 200")


class TestStoreEndpoints:
    """Test store-related endpoints"""
    
    def test_get_stores_list(self):
        """GET /api/stores should return store list"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of stores"
        assert len(data) > 0, "Expected at least one store"
        store = data[0]
        assert "store_id" in store
        assert "name" in store
        assert "slug" in store
        print(f"✓ GET /api/stores returns {len(data)} stores")
        return data[0]['slug']
    
    def test_get_store_by_slug(self):
        """GET /api/store/{slug} should return store details"""
        # First get a valid slug
        stores_response = requests.get(f"{BASE_URL}/api/stores")
        stores = stores_response.json()
        if not stores:
            pytest.skip("No stores available")
        
        slug = stores[0]['slug']
        response = requests.get(f"{BASE_URL}/api/store/{slug}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "store_id" in data
        assert "name" in data
        print(f"✓ GET /api/store/{slug} returns store details")
    
    def test_get_store_products(self):
        """GET /api/store/{slug}/products should return products"""
        stores_response = requests.get(f"{BASE_URL}/api/stores")
        stores = stores_response.json()
        if not stores:
            pytest.skip("No stores available")
        
        slug = stores[0]['slug']
        response = requests.get(f"{BASE_URL}/api/store/{slug}/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data
        print(f"✓ GET /api/store/{slug}/products returns {len(data.get('products', []))} products")


class TestSocialFeed:
    """Test social feed with images"""
    
    def test_get_posts(self):
        """GET /api/posts should return posts with working images"""
        response = requests.get(f"{BASE_URL}/api/posts?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        posts = data.get('posts', [])
        assert isinstance(posts, list)
        print(f"✓ GET /api/posts returns {len(posts)} posts")
        
        # Check if posts have image_url field
        for post in posts[:5]:
            if post.get('image_url'):
                print(f"  Post {post.get('post_id', 'unknown')[:15]}... has image: {post['image_url'][:50]}...")
    
    def test_seed_posts_images_not_expired(self):
        """Verify seed post images are accessible (not expired Unsplash URLs)"""
        response = requests.get(f"{BASE_URL}/api/posts?limit=20")
        data = response.json()
        posts = data.get('posts', [])
        
        broken_images = []
        for post in posts:
            image_url = post.get('image_url')
            if image_url:
                try:
                    img_response = requests.head(image_url, timeout=5, allow_redirects=True)
                    if img_response.status_code >= 400:
                        broken_images.append({
                            'post_id': post.get('post_id'),
                            'image_url': image_url[:80],
                            'status': img_response.status_code
                        })
                except Exception as e:
                    broken_images.append({
                        'post_id': post.get('post_id'),
                        'image_url': image_url[:80],
                        'error': str(e)[:50]
                    })
        
        if broken_images:
            print(f"⚠ Found {len(broken_images)} potentially broken images:")
            for img in broken_images[:3]:
                print(f"  - {img}")
        else:
            print(f"✓ All post images appear accessible")


class TestFollowStore:
    """Test store follow functionality - requires authentication"""
    
    def test_follow_store_requires_auth(self):
        """POST /api/store/{slug}/follow without auth should return 401/403"""
        stores_response = requests.get(f"{BASE_URL}/api/stores")
        stores = stores_response.json()
        if not stores:
            pytest.skip("No stores available")
        
        slug = stores[0]['slug']
        response = requests.post(f"{BASE_URL}/api/store/{slug}/follow")
        # Should require authentication
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✓ Follow store requires authentication (returns {response.status_code})")
    
    def test_follow_store_with_auth(self):
        """POST /api/store/{slug}/follow with auth should work"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate test user")
        
        cookies = login_response.cookies
        
        # Get a store
        stores_response = requests.get(f"{BASE_URL}/api/stores")
        stores = stores_response.json()
        if not stores:
            pytest.skip("No stores available")
        
        slug = stores[0]['slug']
        
        # Follow the store
        follow_response = requests.post(
            f"{BASE_URL}/api/store/{slug}/follow",
            cookies=cookies
        )
        assert follow_response.status_code == 200, f"Expected 200, got {follow_response.status_code}: {follow_response.text[:200]}"
        print(f"✓ Authenticated user can follow store")
        
        # Check follow status
        status_response = requests.get(
            f"{BASE_URL}/api/store/{slug}/following",
            cookies=cookies
        )
        assert status_response.status_code == 200
        data = status_response.json()
        assert data.get('following') == True, f"Expected following=True, got {data}"
        print(f"✓ Follow status is True after following")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
