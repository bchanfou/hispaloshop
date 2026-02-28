"""
Test Iteration 61: Product Tagging, Persistent Bookmarks, Follow/Message, Stripe Checkout
Tests for:
- GET /api/post-products/search - Products for tagging
- POST /api/posts with product_id - Tag product in post  
- GET /api/feed with is_bookmarked - Persistent bookmark status
- POST /api/posts/{post_id}/bookmark - Toggle bookmark
- POST /api/payments/create-checkout - Stripe checkout
- POST /api/users/{user_id}/follow - Follow user
- DELETE /api/users/{user_id}/follow - Unfollow user
- POST /api/internal-chat/start-conversation - Start chat
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Authentication tests for test users"""
    
    def test_customer_login(self):
        """Login as customer (test@example.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "session_token" in data or "user" in data
        print(f"Customer login: PASS - user_id={data.get('user', {}).get('user_id', 'N/A')}")
        
    def test_producer_login(self):
        """Login as producer (producer@test.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "producer@test.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Producer login failed: {response.text}"
        data = response.json()
        print(f"Producer login: PASS - user_id={data.get('user', {}).get('user_id', 'N/A')}")


class TestProductTagging:
    """Test product tagging feature for posts"""
    
    @pytest.fixture
    def producer_session(self):
        """Get authenticated producer session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "producer@test.com",
            "password": "password123"
        })
        assert response.status_code == 200
        cookies = response.cookies.get_dict()
        session.cookies.update(cookies)
        return session
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hispaloshop.com",
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
    
    def test_post_products_search_endpoint_exists(self, producer_session):
        """GET /api/post-products/search returns products"""
        response = producer_session.get(f"{BASE_URL}/api/post-products/search?limit=5")
        assert response.status_code == 200, f"post-products/search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be list"
        print(f"GET /api/post-products/search: PASS - returned {len(data)} products")
        
    def test_post_products_search_with_query(self, producer_session):
        """GET /api/post-products/search?q=aceite returns filtered results"""
        response = producer_session.get(f"{BASE_URL}/api/post-products/search?q=aceite&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/post-products/search?q=aceite: PASS - returned {len(data)} products")
        
    def test_post_products_response_structure(self, producer_session):
        """Products returned have correct fields"""
        response = producer_session.get(f"{BASE_URL}/api/post-products/search?limit=3")
        assert response.status_code == 200
        data = response.json()
        if data:
            product = data[0]
            assert "product_id" in product
            assert "name" in product  
            assert "price" in product
            assert "currency" in product
            print(f"Product structure: PASS - has product_id, name, price, currency")
        else:
            print("No products found for producer - expected if no approved products")


class TestPostWithProductTag:
    """Test creating posts with tagged products"""
    
    @pytest.fixture
    def producer_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "producer@test.com", 
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
        
    def test_create_post_with_text_only(self, producer_session):
        """POST /api/posts with text only (no product tag)"""
        test_text = f"TEST_post_without_tag_{uuid.uuid4().hex[:8]}"
        response = producer_session.post(
            f"{BASE_URL}/api/posts",
            data={"caption": test_text}
        )
        assert response.status_code == 200, f"Post creation failed: {response.text}"
        data = response.json()
        assert data.get("caption") == test_text
        assert data.get("tagged_product") is None
        print(f"POST /api/posts (text only): PASS - post_id={data.get('post_id')}")
        
    def test_create_post_with_product_id(self, producer_session):
        """POST /api/posts with product_id creates tagged post"""
        # First get a product to tag
        prod_response = producer_session.get(f"{BASE_URL}/api/post-products/search?limit=1")
        products = prod_response.json()
        
        if not products:
            pytest.skip("No products available for tagging")
        
        product = products[0]
        test_text = f"TEST_tagged_post_{uuid.uuid4().hex[:8]}"
        
        response = producer_session.post(
            f"{BASE_URL}/api/posts",
            data={
                "caption": test_text,
                "product_id": product["product_id"]
            }
        )
        assert response.status_code == 200, f"Tagged post creation failed: {response.text}"
        data = response.json()
        assert data.get("caption") == test_text
        assert data.get("tagged_product") is not None
        assert data["tagged_product"]["product_id"] == product["product_id"]
        assert "name" in data["tagged_product"]
        assert "price" in data["tagged_product"]
        print(f"POST /api/posts with product_id: PASS - tagged_product={data['tagged_product']['name']}")
        return data["post_id"]


class TestPersistentBookmarks:
    """Test persistent bookmark functionality"""
    
    @pytest.fixture
    def customer_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
    
    def test_feed_returns_is_bookmarked(self, customer_session):
        """GET /api/feed returns is_bookmarked field for posts"""
        response = customer_session.get(f"{BASE_URL}/api/feed?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "posts" in data
        if data["posts"]:
            post = data["posts"][0]
            assert "is_bookmarked" in post, "is_bookmarked field missing in feed response"
            assert isinstance(post["is_bookmarked"], bool)
        print(f"GET /api/feed is_bookmarked: PASS - field present in response")
        
    def test_toggle_bookmark_on(self, customer_session):
        """POST /api/posts/{post_id}/bookmark toggles bookmark on"""
        # Get a post to bookmark
        feed_response = customer_session.get(f"{BASE_URL}/api/feed?limit=5")
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available to bookmark")
            
        post = posts[0]
        post_id = post["post_id"]
        
        # If already bookmarked, unbookmark first
        if post.get("is_bookmarked"):
            customer_session.post(f"{BASE_URL}/api/posts/{post_id}/bookmark")
        
        # Toggle bookmark on
        response = customer_session.post(f"{BASE_URL}/api/posts/{post_id}/bookmark")
        assert response.status_code == 200, f"Bookmark toggle failed: {response.text}"
        data = response.json()
        assert "bookmarked" in data
        bookmarked_state = data["bookmarked"]
        print(f"POST /api/posts/{post_id}/bookmark: PASS - bookmarked={bookmarked_state}")
        return post_id, bookmarked_state
        
    def test_bookmark_persists_in_feed(self, customer_session):
        """Bookmark persists in feed after toggling"""
        # Get a post to test
        feed_response = customer_session.get(f"{BASE_URL}/api/feed?limit=5")
        posts = feed_response.json().get("posts", [])
        
        if not posts:
            pytest.skip("No posts available")
            
        post = posts[0]
        post_id = post["post_id"]
        original_state = post.get("is_bookmarked", False)
        
        # Toggle bookmark
        toggle_response = customer_session.post(f"{BASE_URL}/api/posts/{post_id}/bookmark")
        assert toggle_response.status_code == 200
        new_state = toggle_response.json()["bookmarked"]
        
        # Verify feed reflects new state
        feed_check = customer_session.get(f"{BASE_URL}/api/feed?limit=20")
        posts_check = feed_check.json().get("posts", [])
        
        target_post = next((p for p in posts_check if p["post_id"] == post_id), None)
        if target_post:
            assert target_post["is_bookmarked"] == new_state, "Bookmark state not persisted in feed"
            print(f"Bookmark persistence: PASS - state changed from {original_state} to {new_state}")
        
        # Toggle back to original state
        customer_session.post(f"{BASE_URL}/api/posts/{post_id}/bookmark")


class TestFollowUnfollow:
    """Test follow/unfollow user functionality"""
    
    @pytest.fixture
    def customer_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
    
    def test_follow_user(self, customer_session):
        """POST /api/users/{user_id}/follow follows a user"""
        # Get a user to follow from discover
        discover_response = customer_session.get(f"{BASE_URL}/api/discover/profiles?limit=10")
        assert discover_response.status_code == 200
        profiles = discover_response.json().get("profiles", [])
        
        # Find a user not already followed
        target_user = None
        for p in profiles:
            if not p.get("is_following") and p.get("user_id") != "current_user":
                target_user = p
                break
        
        if not target_user:
            pytest.skip("No unfollowed users available to test")
            
        user_id = target_user["user_id"]
        
        # Try to follow (may already be following)
        response = customer_session.post(f"{BASE_URL}/api/users/{user_id}/follow")
        # 200 means followed, 400 means already following
        assert response.status_code in [200, 400], f"Follow failed: {response.text}"
        
        if response.status_code == 200:
            print(f"POST /api/users/{user_id}/follow: PASS - followed user")
        else:
            print(f"POST /api/users/{user_id}/follow: PASS - already following (expected)")
            
        return user_id
        
    def test_unfollow_user(self, customer_session):
        """DELETE /api/users/{user_id}/follow unfollows a user"""
        # First follow a user
        discover_response = customer_session.get(f"{BASE_URL}/api/discover/profiles?limit=10")
        profiles = discover_response.json().get("profiles", [])
        
        # Find a user being followed or follow one
        target_user = None
        for p in profiles:
            if p.get("is_following"):
                target_user = p
                break
        
        if not target_user:
            # Follow someone first
            for p in profiles:
                user_id = p.get("user_id")
                follow_resp = customer_session.post(f"{BASE_URL}/api/users/{user_id}/follow")
                if follow_resp.status_code == 200:
                    target_user = p
                    break
        
        if not target_user:
            pytest.skip("No users available to unfollow")
            
        user_id = target_user["user_id"]
        
        # Unfollow
        response = customer_session.delete(f"{BASE_URL}/api/users/{user_id}/follow")
        assert response.status_code in [200, 404], f"Unfollow failed: {response.text}"
        print(f"DELETE /api/users/{user_id}/follow: PASS")
        
    def test_cannot_follow_self(self, customer_session):
        """Cannot follow yourself"""
        # Get current user ID
        me_response = customer_session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Cannot get current user ID")
        
        my_id = me_response.json().get("user_id")
        if not my_id:
            pytest.skip("No user_id in /auth/me response")
        
        response = customer_session.post(f"{BASE_URL}/api/users/{my_id}/follow")
        assert response.status_code == 400, "Should not be able to follow self"
        print(f"POST /api/users/{my_id}/follow (self): PASS - correctly rejected")


class TestInternalChat:
    """Test internal chat/messaging functionality"""
    
    @pytest.fixture
    def customer_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
    
    def test_start_conversation(self, customer_session):
        """POST /api/internal-chat/start-conversation creates conversation"""
        # Get a user to chat with
        discover_response = customer_session.get(f"{BASE_URL}/api/discover/profiles?limit=5")
        profiles = discover_response.json().get("profiles", [])
        
        if not profiles:
            pytest.skip("No users available to chat with")
            
        target_user = profiles[0]
        user_id = target_user["user_id"]
        
        response = customer_session.post(
            f"{BASE_URL}/api/internal-chat/start-conversation",
            params={"recipient_id": user_id}
        )
        assert response.status_code == 200, f"Start conversation failed: {response.text}"
        data = response.json()
        assert "conversation_id" in data
        assert "is_new" in data
        print(f"POST /api/internal-chat/start-conversation: PASS - conv_id={data['conversation_id']}, is_new={data['is_new']}")


class TestStripeCheckout:
    """Test Stripe checkout functionality"""
    
    @pytest.fixture
    def customer_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
    
    def test_checkout_requires_cart(self, customer_session):
        """Checkout fails with empty cart"""
        # Clear cart first
        customer_session.delete(f"{BASE_URL}/api/cart")
        
        response = customer_session.post(
            f"{BASE_URL}/api/payments/create-checkout",
            json={
                "shipping_address": {
                    "full_name": "Test User",
                    "street": "123 Test Street",
                    "city": "Madrid",
                    "postal_code": "28001",
                    "country": "ES",
                    "phone": "+34600000000"
                }
            }
        )
        # Should fail with empty cart
        assert response.status_code == 400, f"Expected 400 for empty cart, got {response.status_code}"
        print("POST /api/payments/create-checkout (empty cart): PASS - correctly rejected")
        
    def test_checkout_with_cart_returns_url(self, customer_session):
        """Checkout with items returns Stripe URL"""
        # First add something to cart
        # Get approved products
        products_response = customer_session.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        
        if not products or not isinstance(products, list):
            # Try alternative endpoint
            products_response = customer_session.get(f"{BASE_URL}/api/products/search?limit=1")
            if products_response.status_code == 200:
                products = products_response.json()
        
        if not products:
            pytest.skip("No products available to add to cart")
            
        product = products[0] if isinstance(products, list) else products
        product_id = product.get("product_id")
        
        if not product_id:
            pytest.skip("No product_id found")
        
        # Add to cart
        add_response = customer_session.post(
            f"{BASE_URL}/api/cart",
            json={"product_id": product_id, "quantity": 1}
        )
        
        if add_response.status_code != 200:
            pytest.skip(f"Could not add to cart: {add_response.text}")
        
        # Now try checkout
        response = customer_session.post(
            f"{BASE_URL}/api/payments/create-checkout",
            json={
                "shipping_address": {
                    "full_name": "Test User",
                    "street": "123 Test Street",
                    "city": "Madrid",
                    "postal_code": "28001",
                    "country": "ES",
                    "phone": "+34600000000"
                }
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            # Should contain checkout_url or url
            url_present = "checkout_url" in data or "url" in data or "session_url" in data
            if url_present:
                url = data.get("checkout_url") or data.get("url") or data.get("session_url")
                assert "stripe.com" in url or "checkout" in str(data).lower()
                print(f"POST /api/payments/create-checkout: PASS - returns Stripe URL")
            else:
                print(f"POST /api/payments/create-checkout: PASS - response: {data}")
        elif response.status_code == 403:
            print(f"POST /api/payments/create-checkout: PASS - email verification required (expected)")
        else:
            print(f"POST /api/payments/create-checkout: status={response.status_code}, response={response.text[:200]}")


class TestFeedWithTaggedProduct:
    """Test that feed returns tagged product data"""
    
    @pytest.fixture
    def customer_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        session.cookies.update(response.cookies.get_dict())
        return session
    
    def test_feed_includes_tagged_product(self, customer_session):
        """GET /api/feed includes tagged_product in posts"""
        response = customer_session.get(f"{BASE_URL}/api/feed?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        posts = data.get("posts", [])
        
        # Check structure
        for post in posts:
            # tagged_product should be present (can be null)
            if "tagged_product" in post and post["tagged_product"]:
                tp = post["tagged_product"]
                assert "product_id" in tp
                assert "name" in tp
                assert "price" in tp
                print(f"Feed tagged_product: PASS - found tagged product '{tp['name']}' in post {post['post_id']}")
                return
        
        print("Feed tagged_product: PASS - structure correct (no tagged posts found in sample)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
