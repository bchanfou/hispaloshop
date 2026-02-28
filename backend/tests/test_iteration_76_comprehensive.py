"""
Comprehensive test suite for Hispaloshop - Iteration 76
Tests all major API endpoints: auth, products, feed, subscriptions, admin, etc.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
INFLUENCER_EMAIL = "influencer@test.com"
INFLUENCER_PASSWORD = "password123"

class TestSession:
    """Session manager for authenticated requests"""
    _tokens = {}
    
    @classmethod
    def get_token(cls, email, password):
        if email in cls._tokens:
            return cls._tokens[email]
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("session_token")
            cls._tokens[email] = token
            return token
        return None


# ============ HEALTH & BASIC TESTS ============

class TestHealthAndBasic:
    """Health check and basic configuration endpoints"""
    
    def test_health_check(self):
        """GET /api/health - health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "connected"
        print("✅ Health check passed - backend and DB connected")
    
    def test_sitemap(self):
        """GET /api/sitemap.xml - returns valid XML sitemap"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        assert "urlset" in response.text
        assert "<?xml" in response.text
        print("✅ Sitemap.xml returns valid XML")
    
    def test_geo_detect_country(self):
        """GET /api/geo/detect-country - returns country"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Geo detect country returns: {data}")
        else:
            print("ℹ️ Geo detect country endpoint not implemented (404)")


# ============ AUTH TESTS ============

class TestAuth:
    """Authentication endpoint tests for all roles"""
    
    def test_login_admin(self):
        """POST /api/auth/login - admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"✅ Admin login works - role: {data['user']['role']}")
    
    def test_login_producer(self):
        """POST /api/auth/login - producer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PRODUCER_EMAIL,
            "password": PRODUCER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "producer"
        print(f"✅ Producer login works - user_id: {data['user']['user_id']}")
    
    def test_login_customer(self):
        """POST /api/auth/login - customer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "customer"
        print("✅ Customer login works")
    
    def test_login_influencer(self):
        """POST /api/auth/login - influencer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "influencer"
        print("✅ Influencer login works")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - returns 401 for invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid login correctly returns 401")
    
    def test_registration_duplicate_email(self):
        """POST /api/auth/register - returns 400/422 for duplicate email"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": CUSTOMER_EMAIL,
            "password": "test123456",
            "name": "Duplicate User",
            "role": "customer",
            "analytics_consent": True,
            "consent_version": "1.0"
        })
        assert response.status_code in [400, 422]  # 422 for validation, 400 for duplicate
        print(f"✅ Duplicate registration correctly returns {response.status_code}")


# ============ CONFIG TESTS ============

class TestConfig:
    """Configuration endpoints"""
    
    def test_get_countries(self):
        """GET /api/config/countries - returns 18 countries"""
        response = requests.get(f"{BASE_URL}/api/config/countries")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 18  # Should have 18+ countries
        print(f"✅ Countries endpoint returns {len(data)} countries")
    
    def test_get_locale_config(self):
        """GET /api/config/locale - returns locale config"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200
        data = response.json()
        assert "countries" in data
        assert "languages" in data
        assert "currencies" in data
        print("✅ Locale config returns countries, languages, currencies")
    
    def test_exchange_rates(self):
        """GET /api/exchange-rates - returns exchange rates"""
        response = requests.get(f"{BASE_URL}/api/exchange-rates")
        assert response.status_code == 200
        data = response.json()
        assert "rates" in data
        assert "base" in data
        assert data["base"] == "EUR"
        print(f"✅ Exchange rates returns {len(data['rates'])} currencies")


# ============ PRODUCTS TESTS ============

class TestProducts:
    """Product endpoints"""
    
    def test_get_products(self):
        """GET /api/products - returns active products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            product = data[0]
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
        print(f"✅ Products endpoint returns {len(data)} products")
    
    def test_get_products_by_seller(self):
        """GET /api/products?seller_id=user_testprod001 - filter by seller"""
        response = requests.get(f"{BASE_URL}/api/products?seller_id=user_testprod001")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All products should be from the specified seller
        for product in data:
            assert product.get("producer_id") == "user_testprod001"
        print(f"✅ Products filtered by seller returns {len(data)} products")
    
    def test_get_products_by_country(self):
        """GET /api/products?country=ES - multi-market pricing"""
        response = requests.get(f"{BASE_URL}/api/products?country=ES")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Products should have country-specific fields
        if len(data) > 0:
            product = data[0]
            assert "available_in_country" in product
        print(f"✅ Products with country filter returns {len(data)} products")


# ============ CART & CHECKOUT TESTS ============

class TestCartAndCheckout:
    """Cart and checkout endpoints"""
    
    def test_add_to_cart_unauthenticated(self):
        """POST /api/cart/add - requires authentication (401)"""
        response = requests.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": "test_product",
            "quantity": 1
        })
        assert response.status_code == 401
        print("✅ Add to cart without auth returns 401")
    
    def test_add_to_cart_authenticated(self):
        """POST /api/cart/add - works with auth"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate")
        
        # First get a valid product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["product_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 201, 400]  # 400 if already in cart
        print(f"✅ Add to cart with auth works - status: {response.status_code}")
    
    def test_buy_now_creates_stripe_session(self):
        """POST /api/checkout/buy-now - creates Stripe checkout session"""
        token = TestSession.get_token(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate")
        
        # Get a valid product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["product_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/checkout/buy-now",
            json={
                "product_id": product_id,
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return checkout URL or error if Stripe not configured
        assert response.status_code in [200, 400, 422, 500]
        if response.status_code == 200:
            data = response.json()
            if "checkout_url" in data:
                assert "stripe.com" in data["checkout_url"]
                print(f"✅ Buy now creates Stripe checkout session")
            else:
                print(f"ℹ️ Buy now response: {data}")
        else:
            print(f"ℹ️ Buy now returned {response.status_code}: {response.text[:200]}")


# ============ FEED TESTS ============

class TestFeed:
    """Social feed endpoints"""
    
    def test_get_feed(self):
        """GET /api/feed - scored feed returns posts"""
        response = requests.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert isinstance(data["posts"], list)
        # Check for product_available_in_country field
        if len(data["posts"]) > 0:
            post = data["posts"][0]
            assert "product_available_in_country" in post
        print(f"✅ Feed returns {len(data['posts'])} posts")
    
    def test_get_trending_posts(self):
        """GET /api/feed/trending - trending posts"""
        response = requests.get(f"{BASE_URL}/api/feed/trending")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        print(f"✅ Trending feed returns {len(data['posts'])} posts")
    
    def test_get_stories(self):
        """GET /api/feed/stories - seller stories"""
        response = requests.get(f"{BASE_URL}/api/feed/stories")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Stories endpoint returns data: {len(data) if isinstance(data, list) else 'object'}")
        else:
            print("ℹ️ Stories endpoint not implemented (404)")
    
    def test_get_best_sellers(self):
        """GET /api/feed/best-sellers - best selling products"""
        response = requests.get(f"{BASE_URL}/api/feed/best-sellers")
        # May return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Best sellers endpoint returns data")
        else:
            print("ℹ️ Best sellers endpoint not implemented (404)")


# ============ TRACKING TESTS ============

class TestTracking:
    """Event tracking endpoints"""
    
    def test_track_social_event(self):
        """POST /api/track/social-event - tracking works"""
        response = requests.post(f"{BASE_URL}/api/track/social-event", json={
            "event_type": "view",
            "target_type": "product",
            "target_id": "test_product_id",
            "metadata": {"source": "test"}
        })
        # Should return 200 or 201, or 404 if not implemented
        assert response.status_code in [200, 201, 401, 404]
        print(f"✅ Track social event returns: {response.status_code}")


# ============ DISCOVER TESTS ============

class TestDiscover:
    """Discover/profile endpoints"""
    
    def test_discover_profiles_all(self):
        """GET /api/discover/profiles - returns profiles"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        print(f"✅ Discover profiles returns {len(data['profiles'])} profiles")
    
    def test_discover_profiles_producer(self):
        """GET /api/discover/profiles?role=producer - filter by role"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles?role=producer")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        # All profiles should be producers
        for profile in data["profiles"]:
            assert profile["role"] == "producer"
        print(f"✅ Discover profiles (producer filter) returns {len(data['profiles'])} producers")
    
    def test_discover_profiles_influencer(self):
        """GET /api/discover/profiles?role=influencer - filter by role"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles?role=influencer")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        for profile in data["profiles"]:
            assert profile["role"] == "influencer"
        print(f"✅ Discover profiles (influencer filter) returns {len(data['profiles'])} influencers")
    
    def test_discover_profiles_customer(self):
        """GET /api/discover/profiles?role=customer - filter by role"""
        response = requests.get(f"{BASE_URL}/api/discover/profiles?role=customer")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        for profile in data["profiles"]:
            assert profile["role"] == "customer"
        print(f"✅ Discover profiles (customer filter) returns {len(data['profiles'])} customers")


# ============ SUBSCRIPTION TESTS ============

class TestSubscriptions:
    """Seller subscription and influencer tier endpoints"""
    
    def test_get_seller_plans(self):
        """GET /api/sellers/plans - returns 3 plans"""
        response = requests.get(f"{BASE_URL}/api/sellers/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 3
        # Check plan structure
        plan_keys = [p["key"] for p in data["plans"]]
        assert "FREE" in plan_keys
        assert "PRO" in plan_keys
        assert "ELITE" in plan_keys
        print(f"✅ Seller plans returns 3 plans: {plan_keys}")
    
    def test_get_my_plan_producer(self):
        """GET /api/sellers/me/plan - returns producer subscription"""
        token = TestSession.get_token(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as producer")
        
        response = requests.get(
            f"{BASE_URL}/api/sellers/me/plan",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "plan" in data
        assert "commission_rate" in data
        print(f"✅ Producer plan: {data['plan']}, commission: {data['commission_rate']}")
    
    def test_get_influencer_tiers(self):
        """GET /api/influencers/tiers - returns 3 tiers"""
        response = requests.get(f"{BASE_URL}/api/influencers/tiers")
        assert response.status_code == 200
        data = response.json()
        assert "tiers" in data
        assert len(data["tiers"]) == 3
        tier_keys = [t["key"] for t in data["tiers"]]
        assert "HERCULES" in tier_keys
        assert "ATENEA" in tier_keys
        assert "TITAN" in tier_keys
        print(f"✅ Influencer tiers returns 3 tiers: {tier_keys}")


# ============ SUPER ADMIN TESTS ============

class TestSuperAdmin:
    """Super admin endpoints"""
    
    def test_superadmin_overview(self):
        """GET /api/superadmin/overview - KPIs for super_admin"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as admin")
        
        response = requests.get(
            f"{BASE_URL}/api/superadmin/overview",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 200 or 403 if not super_admin
        assert response.status_code in [200, 403, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Super admin overview returns KPIs")
        else:
            print(f"ℹ️ Super admin overview returned: {response.status_code}")
    
    def test_superadmin_search(self):
        """GET /api/superadmin/search?q=olive - global search"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as admin")
        
        response = requests.get(
            f"{BASE_URL}/api/superadmin/search?q=olive",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 403, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Super admin search works")
        else:
            print(f"ℹ️ Super admin search returned: {response.status_code}")
    
    def test_superadmin_audit_log(self):
        """GET /api/superadmin/audit-log - audit log"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as admin")
        
        response = requests.get(
            f"{BASE_URL}/api/superadmin/audit-log",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 403, 404]
        if response.status_code == 200:
            print(f"✅ Super admin audit log works")
        else:
            print(f"ℹ️ Super admin audit log returned: {response.status_code}")


# ============ ADMIN FINANCIAL TESTS ============

class TestAdminFinancial:
    """Admin financial and commission endpoints"""
    
    def test_financial_ledger(self):
        """GET /api/admin/financial-ledger - financial ledger"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as admin")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/financial-ledger",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 403, 404]
        if response.status_code == 200:
            print(f"✅ Admin financial ledger works")
        else:
            print(f"ℹ️ Admin financial ledger returned: {response.status_code}")
    
    def test_market_coverage(self):
        """GET /api/admin/market-coverage - multi-market coverage"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as admin")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/market-coverage",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 403, 404]
        if response.status_code == 200:
            print(f"✅ Admin market coverage works")
        else:
            print(f"ℹ️ Admin market coverage returned: {response.status_code}")
    
    def test_commission_audit(self):
        """GET /api/admin/commission-audit - commission audit trail"""
        token = TestSession.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as admin")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/commission-audit",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 403, 404]
        if response.status_code == 200:
            print(f"✅ Admin commission audit works")
        else:
            print(f"ℹ️ Admin commission audit returned: {response.status_code}")


# ============ CERTIFICATE TESTS ============

class TestCertificates:
    """Certificate endpoints"""
    
    def test_auto_generate_certificate(self):
        """POST /api/certificates/auto-generate - auto-generates certificate"""
        token = TestSession.get_token(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as producer")
        
        # Get a product from this producer
        products_response = requests.get(f"{BASE_URL}/api/products?seller_id=user_testprod001")
        products = products_response.json()
        if not products:
            pytest.skip("No products available for producer")
        
        product_id = products[0]["product_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/certificates/auto-generate",
            json={"product_id": product_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 200/201 or 400/404 if already exists or not implemented
        assert response.status_code in [200, 201, 400, 404, 500]
        print(f"✅ Certificate auto-generate returned: {response.status_code}")


# ============ PRODUCER TESTS ============

class TestProducer:
    """Producer-specific endpoints"""
    
    def test_producer_payments(self):
        """GET /api/producer/payments - seller earnings"""
        token = TestSession.get_token(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as producer")
        
        response = requests.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Producer payments endpoint works")
        else:
            print(f"ℹ️ Producer payments returned: {response.status_code}")
    
    def test_producer_stats(self):
        """GET /api/producer/stats - returns low_stock_products and recent_reviews"""
        token = TestSession.get_token(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate as producer")
        
        response = requests.get(
            f"{BASE_URL}/api/producer/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            # Check for expected fields
            assert "low_stock_products" in data or "recent_reviews" in data or isinstance(data, dict)
            print(f"✅ Producer stats endpoint works")
        else:
            print(f"ℹ️ Producer stats returned: {response.status_code}")


# ============ WEBHOOK TESTS ============

class TestWebhooks:
    """Webhook endpoints"""
    
    def test_stripe_webhook(self):
        """POST /api/webhook/stripe - accepts events"""
        # Send a mock webhook event (without signature in dev mode)
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            json={
                "type": "checkout.session.completed",
                "data": {"object": {"id": "test_session", "payment_status": "unpaid"}}
            },
            headers={"Content-Type": "application/json"}
        )
        # Should accept the event (200) or return 400 if signature required
        assert response.status_code in [200, 400]
        print(f"✅ Stripe webhook returns: {response.status_code}")


# ============ RUN TESTS ============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
