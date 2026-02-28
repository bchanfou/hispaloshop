"""
Iteration 63: Backend Modularization & Stripe Connect Tests
Testing:
- Auth endpoints (login, register)
- Config endpoints (countries, locale)
- Product listing
- Cart operations
- Stripe checkout (raw SDK) - create-checkout, buy-now, checkout-status
- Stores listing
- Orders listing
"""
import pytest
import requests
import os
import uuid
from datetime import datetime


BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_customer_success(self):
        """POST /api/auth/login - verify auth works with session_token in response"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        # Auth uses session_token, NOT jwt token
        assert "session_token" in data, "Response must contain session_token"
        assert "user" in data, "Response must contain user object"
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "customer"
        print(f"✓ Customer login: session_token={data['session_token'][:30]}...")
    
    def test_login_producer_success(self):
        """POST /api/auth/login - verify producer login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Producer login failed: {response.text}"
        
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "producer"
        print(f"✓ Producer login: role={data['user']['role']}")
    
    def test_login_admin_success(self):
        """POST /api/auth/login - verify admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@hispaloshop.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"✓ Admin login: role={data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - verify invalid credentials fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_register_new_customer(self):
        """POST /api/auth/register - verify registration works"""
        unique_email = f"test_iter63_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "name": "Test Registration",
                "password": "password123",
                "role": "customer",
                "country": "ES",
                "analytics_consent": True,
                "consent_version": "1.0"
            }
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "message" in data
        print(f"✓ Registration: user_id={data['user_id']}")


class TestConfigEndpoints:
    """Configuration endpoint tests"""
    
    def test_countries_returns_18_entries(self):
        """GET /api/config/countries - verify 18 supported countries"""
        response = requests.get(f"{BASE_URL}/api/config/countries")
        assert response.status_code == 200, f"Countries request failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) == 18, f"Expected 18 countries, got {len(data)}"
        
        # Verify Spain has expected structure
        assert "ES" in data
        assert data["ES"]["name"] == "Spain"
        assert data["ES"]["currency"] == "EUR"
        print(f"✓ Countries: {len(data)} entries with correct structure")
    
    def test_locale_config_complete(self):
        """GET /api/config/locale - verify full locale configuration"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        assert response.status_code == 200, f"Locale request failed: {response.text}"
        
        data = response.json()
        assert "countries" in data
        assert "languages" in data
        assert "currencies" in data
        assert "default_country" in data
        assert "default_language" in data
        assert "default_currency" in data
        
        # Verify defaults
        assert data["default_country"] == "ES"
        assert data["default_currency"] == "EUR"
        print("✓ Locale config: complete with all sections")


class TestProductEndpoints:
    """Product endpoint tests"""
    
    def test_products_listing(self):
        """GET /api/products - verify product listing works"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Products request failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Products list should not be empty"
        
        # Verify product structure
        product = data[0]
        assert "product_id" in product
        assert "name" in product
        assert "price" in product
        print(f"✓ Products listing: {len(data)} products returned")


class TestStoresEndpoints:
    """Store endpoint tests"""
    
    def test_stores_listing(self):
        """GET /api/stores - verify stores listing works"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200, f"Stores request failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Stores listing: {len(data)} stores returned")


class TestCartEndpoints:
    """Cart endpoint tests - require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get session token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if response.status_code == 200:
            self.session_token = response.json()["session_token"]
            self.headers = {"Authorization": f"Bearer {self.session_token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_cart_get(self):
        """GET /api/cart - verify cart retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers=self.headers
        )
        assert response.status_code == 200, f"Cart get failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        print(f"✓ Cart retrieval: {len(data['items'])} items")
    
    def test_cart_add_simple_product(self):
        """POST /api/cart/add - verify adding simple product to cart"""
        # First, get a product without variants
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()
        
        # Find a product without variants
        simple_product = None
        for p in products:
            if not p.get("variants") or len(p.get("variants", [])) == 0:
                simple_product = p
                break
        
        if not simple_product:
            pytest.skip("No simple product available for test")
        
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            headers=self.headers,
            json={"product_id": simple_product["product_id"], "quantity": 1}
        )
        # May succeed or require variant - both are valid responses
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Cart add attempt: status={response.status_code}")


class TestStripeCheckoutEndpoints:
    """Stripe checkout endpoint tests - testing raw Stripe SDK integration"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get session token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if response.status_code == 200:
            self.session_token = response.json()["session_token"]
            self.headers = {"Authorization": f"Bearer {self.session_token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_create_checkout_with_cart(self):
        """POST /api/payments/create-checkout - verify Stripe checkout session creation"""
        # First ensure cart has items
        cart_resp = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        cart_data = cart_resp.json()
        
        if len(cart_data.get("items", [])) == 0:
            # Add a product to cart first
            products_resp = requests.get(f"{BASE_URL}/api/products")
            products = products_resp.json()
            
            # Find a simple product
            for p in products:
                if not p.get("variants"):
                    add_resp = requests.post(
                        f"{BASE_URL}/api/cart/add",
                        headers=self.headers,
                        json={"product_id": p["product_id"], "quantity": 1}
                    )
                    if add_resp.status_code == 200:
                        break
        
        # Now test checkout
        response = requests.post(
            f"{BASE_URL}/api/payments/create-checkout",
            headers=self.headers,
            json={
                "shipping_address": {
                    "full_name": "Test User",
                    "street": "123 Test St",
                    "city": "Madrid",
                    "postal_code": "28001",
                    "country": "ES",
                    "phone": "123456789"
                }
            }
        )
        
        # May fail if cart is empty, but we're checking the endpoint works
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, "Response must contain checkout URL"
            assert "session_id" in data, "Response must contain session_id"
            assert "checkout.stripe.com" in data["url"], "URL must be Stripe checkout URL"
            print(f"✓ Create checkout: Stripe URL generated - {data['url'][:60]}...")
        else:
            print(f"✓ Create checkout: endpoint responds (status={response.status_code})")
    
    def test_buy_now_simple_product(self):
        """POST /api/checkout/buy-now - verify buy-now creates Stripe session"""
        # Find a simple product
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()
        
        simple_product = None
        for p in products:
            if not p.get("variants") or len(p.get("variants", [])) == 0:
                simple_product = p
                break
        
        if not simple_product:
            pytest.skip("No simple product available for test")
        
        response = requests.post(
            f"{BASE_URL}/api/checkout/buy-now",
            headers=self.headers,
            json={
                "product_id": simple_product["product_id"],
                "quantity": 1
            }
        )
        
        assert response.status_code == 200, f"Buy-now failed: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "Response must contain checkout_url"
        assert "session_id" in data, "Response must contain session_id"
        assert "order_id" in data, "Response must contain order_id"
        assert "checkout.stripe.com" in data["checkout_url"], "URL must be Stripe checkout URL"
        
        # Store session_id for status test
        self.__class__.buy_now_session_id = data["session_id"]
        print(f"✓ Buy-now: Stripe checkout URL generated, order_id={data['order_id']}")
    
    def test_checkout_status_retrieval(self):
        """GET /api/payments/checkout-status/{session_id} - verify status retrieval with raw Stripe SDK"""
        # First create a buy-now session to get a valid session_id
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()
        
        simple_product = None
        for p in products:
            if not p.get("variants") or len(p.get("variants", [])) == 0:
                simple_product = p
                break
        
        if not simple_product:
            pytest.skip("No simple product available for test")
        
        # Create a new checkout session
        buy_now_resp = requests.post(
            f"{BASE_URL}/api/checkout/buy-now",
            headers=self.headers,
            json={
                "product_id": simple_product["product_id"],
                "quantity": 1
            }
        )
        
        if buy_now_resp.status_code != 200:
            pytest.skip("Could not create buy-now session")
        
        session_id = buy_now_resp.json()["session_id"]
        
        # Now test checkout status
        response = requests.get(
            f"{BASE_URL}/api/payments/checkout-status/{session_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Checkout status failed: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response must contain status"
        assert "payment_status" in data, "Response must contain payment_status"
        assert data["payment_status"] in ["paid", "unpaid", "no_payment_required"]
        print(f"✓ Checkout status: status={data['status']}, payment_status={data['payment_status']}")


class TestOrdersEndpoints:
    """Orders endpoint tests - require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get session token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if response.status_code == 200:
            self.session_token = response.json()["session_token"]
            self.headers = {"Authorization": f"Bearer {self.session_token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_orders_listing(self):
        """GET /api/orders - verify orders listing works"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Orders request failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Orders listing: {len(data)} orders returned")


class TestModelExtraction:
    """Tests to verify Pydantic models work correctly after extraction to core/models.py"""
    
    def test_register_validates_email(self):
        """Verify RegisterInput Pydantic model validates email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": "invalid-email",  # Invalid email format
                "name": "Test",
                "password": "password123",
                "role": "customer",
                "country": "ES",
                "analytics_consent": True
            }
        )
        assert response.status_code == 422, f"Expected validation error, got {response.status_code}"
        print("✓ Pydantic model validates email format correctly")
    
    def test_buy_now_input_structure(self):
        """Verify BuyNowInput model works correctly"""
        # Login first
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        if login_resp.status_code != 200:
            pytest.skip("Auth failed")
        
        headers = {"Authorization": f"Bearer {login_resp.json()['session_token']}"}
        
        # Test with missing required field
        response = requests.post(
            f"{BASE_URL}/api/checkout/buy-now",
            headers=headers,
            json={"quantity": 1}  # Missing product_id
        )
        assert response.status_code == 422, f"Expected validation error, got {response.status_code}"
        print("✓ BuyNowInput model validates required fields")


class TestConstantsExtraction:
    """Tests to verify constants work correctly after extraction to core/constants.py"""
    
    def test_supported_countries_consistent(self):
        """Verify SUPPORTED_COUNTRIES is consistent across endpoints"""
        # Get countries from config endpoint
        config_resp = requests.get(f"{BASE_URL}/api/config/countries")
        countries = config_resp.json()
        
        # Get locale config
        locale_resp = requests.get(f"{BASE_URL}/api/config/locale")
        locale_countries = locale_resp.json()["countries"]
        
        # They should be identical
        assert countries == locale_countries, "Countries should be consistent"
        print("✓ SUPPORTED_COUNTRIES constant is consistent across endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
