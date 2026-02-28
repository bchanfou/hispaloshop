"""
Test Store Profile Page and Follow System
Tests for:
- GET /api/store/{slug} - Public store profile
- GET /api/store/{slug}/products - Store products
- GET /api/store/{slug}/reviews - Store reviews
- GET /api/store/{slug}/certificates - Store certificates
- POST /api/store/{slug}/follow - Follow store
- DELETE /api/store/{slug}/follow - Unfollow store
- GET /api/store/{slug}/following - Check follow status
- GET /api/producer/store-profile - Producer's own store profile
- PUT /api/producer/store-profile - Update store profile
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
TEST_STORE_SLUG = "artisan-foods-co"


class TestStorePublicEndpoints:
    """Test public store profile endpoints (no auth required)"""
    
    def test_get_store_by_slug(self):
        """Test GET /api/store/{slug} returns store profile"""
        response = requests.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "store_id" in data, "Missing store_id"
        assert "name" in data, "Missing name"
        assert "slug" in data, "Missing slug"
        assert data["slug"] == TEST_STORE_SLUG, f"Expected slug {TEST_STORE_SLUG}, got {data['slug']}"
        
        # Verify store profile fields
        assert "hero_image" in data or data.get("hero_image") is None, "hero_image field should exist"
        assert "logo" in data or data.get("logo") is None, "logo field should exist"
        assert "location" in data or data.get("location") is None, "location field should exist"
        assert "story" in data or data.get("story") is None, "story field should exist"
        
        print(f"✓ Store profile loaded: {data['name']}")
    
    def test_get_store_not_found(self):
        """Test GET /api/store/{slug} returns 404 for non-existent store"""
        response = requests.get(f"{BASE_URL}/api/store/non-existent-store-xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent store returns 404")
    
    def test_get_store_products(self):
        """Test GET /api/store/{slug}/products returns products list"""
        response = requests.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Missing products array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["products"], list), "products should be a list"
        
        print(f"✓ Store products: {data['total']} products found")
    
    def test_get_store_reviews(self):
        """Test GET /api/store/{slug}/reviews returns reviews"""
        response = requests.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data, "Missing reviews array"
        assert "total" in data, "Missing total count"
        
        print(f"✓ Store reviews: {data['total']} reviews found")
    
    def test_get_store_certificates(self):
        """Test GET /api/store/{slug}/certificates returns certificates"""
        response = requests.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/certificates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "certificates should be a list"
        
        print(f"✓ Store certificates: {len(data)} certificates found")


class TestStoreFollowSystem:
    """Test store follow/unfollow functionality (requires auth)"""
    
    @pytest.fixture
    def customer_session(self):
        """Login as customer and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Customer login failed: {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_follow_store_requires_auth(self):
        """Test POST /api/store/{slug}/follow requires authentication"""
        response = requests.post(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/follow")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Follow endpoint requires authentication")
    
    def test_check_following_requires_auth(self):
        """Test GET /api/store/{slug}/following requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/following")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Following check requires authentication")
    
    def test_follow_and_unfollow_store(self, customer_session):
        """Test complete follow/unfollow flow"""
        # First, check current follow status
        response = customer_session.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/following")
        assert response.status_code == 200, f"Check following failed: {response.text}"
        initial_status = response.json().get("following", False)
        print(f"  Initial follow status: {initial_status}")
        
        # If already following, unfollow first
        if initial_status:
            response = customer_session.delete(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/follow")
            assert response.status_code == 200, f"Unfollow failed: {response.text}"
            print("  Unfollowed store to reset state")
        
        # Follow the store
        response = customer_session.post(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/follow")
        assert response.status_code == 200, f"Follow failed: {response.text}"
        data = response.json()
        assert data.get("following") == True, "Expected following=True after follow"
        print("✓ Successfully followed store")
        
        # Verify follow status
        response = customer_session.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/following")
        assert response.status_code == 200
        assert response.json().get("following") == True, "Follow status should be True"
        print("✓ Follow status verified")
        
        # Unfollow the store
        response = customer_session.delete(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/follow")
        assert response.status_code == 200, f"Unfollow failed: {response.text}"
        data = response.json()
        assert data.get("following") == False, "Expected following=False after unfollow"
        print("✓ Successfully unfollowed store")
        
        # Verify unfollow status
        response = customer_session.get(f"{BASE_URL}/api/store/{TEST_STORE_SLUG}/following")
        assert response.status_code == 200
        assert response.json().get("following") == False, "Follow status should be False"
        print("✓ Unfollow status verified")
    
    def test_follow_nonexistent_store(self, customer_session):
        """Test following a non-existent store returns 404"""
        response = customer_session.post(f"{BASE_URL}/api/store/nonexistent-store-xyz/follow")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Following non-existent store returns 404")


class TestProducerStoreProfile:
    """Test producer store profile management (requires producer auth)"""
    
    @pytest.fixture
    def producer_session(self):
        """Login as producer and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PRODUCER_EMAIL,
            "password": PRODUCER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Producer login failed: {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_get_producer_store_profile_requires_auth(self):
        """Test GET /api/producer/store-profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/producer/store-profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Producer store profile requires authentication")
    
    def test_get_producer_store_profile(self, producer_session):
        """Test GET /api/producer/store-profile returns producer's store"""
        response = producer_session.get(f"{BASE_URL}/api/producer/store-profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "store_id" in data, "Missing store_id"
        assert "slug" in data, "Missing slug"
        assert "name" in data, "Missing name"
        
        # Verify editable fields exist
        editable_fields = ["hero_image", "logo", "tagline", "story", "location", 
                          "contact_email", "contact_phone", "gallery"]
        for field in editable_fields:
            assert field in data or data.get(field) is None, f"Missing field: {field}"
        
        print(f"✓ Producer store profile loaded: {data['name']} (slug: {data['slug']})")
        return data
    
    def test_update_producer_store_profile(self, producer_session):
        """Test PUT /api/producer/store-profile updates store"""
        # First get current profile
        response = producer_session.get(f"{BASE_URL}/api/producer/store-profile")
        assert response.status_code == 200
        original = response.json()
        
        # Update with new tagline
        test_tagline = "Test tagline update - " + str(os.urandom(4).hex())
        update_data = {
            "tagline": test_tagline
        }
        
        response = producer_session.put(
            f"{BASE_URL}/api/producer/store-profile",
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        print("✓ Store profile update request successful")
        
        # Verify update persisted
        response = producer_session.get(f"{BASE_URL}/api/producer/store-profile")
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("tagline") == test_tagline, "Tagline update not persisted"
        print("✓ Store profile update verified")
        
        # Restore original tagline
        response = producer_session.put(
            f"{BASE_URL}/api/producer/store-profile",
            json={"tagline": original.get("tagline", "")}
        )
        assert response.status_code == 200
        print("✓ Original tagline restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
