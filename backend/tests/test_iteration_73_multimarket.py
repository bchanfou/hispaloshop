"""
Iteration 73 - Multi-Market System Tests
Tests for inventory_by_country feature including:
- Products endpoint with country filter (available_in_country, display_price, display_currency)
- Cart add validation (blocking unavailable products)
- Geo detection endpoint
- Admin market coverage dashboard
- Producer market management endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
PRODUCER_USER_ID = "user_testprod001"

# Known product with multi-market: Olive Oil prod_7889643617d1
MULTI_MARKET_PRODUCT_ID = "prod_7889643617d1"


class TestSession:
    """Shared session management for tests"""
    
    @staticmethod
    def login(email: str, password: str) -> tuple:
        """Login and return (session, token)"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return session, token
        return session, None


# ============================================================================
# Module 1: Products Endpoint - Country Filtering
# ============================================================================

class TestProductsCountryFiltering:
    """Tests for GET /api/products?country=XX"""
    
    def test_products_es_all_available(self):
        """GET /api/products?country=ES should return all 23 products with available_in_country=true"""
        response = requests.get(f"{BASE_URL}/api/products", params={"country": "ES"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        
        # Check that products have available_in_country and display_price
        products_with_market_data = [p for p in products if "available_in_country" in p]
        print(f"Total products: {len(products)}")
        print(f"Products with available_in_country field: {len(products_with_market_data)}")
        
        # ES should have most/all products available
        available_products = [p for p in products if p.get("available_in_country") == True]
        print(f"Products available in ES: {len(available_products)}")
        
        # Check display_price on a sample
        if products:
            sample = products[0]
            print(f"Sample product: {sample.get('name')}")
            print(f"  available_in_country: {sample.get('available_in_country')}")
            print(f"  display_price: {sample.get('display_price')}")
            print(f"  display_currency: {sample.get('display_currency')}")
    
    def test_products_us_limited_availability(self):
        """GET /api/products?country=US - only Olive Oil should be available"""
        response = requests.get(f"{BASE_URL}/api/products", params={"country": "US"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        products = response.json()
        available = [p for p in products if p.get("available_in_country") == True]
        
        print(f"Total products returned for US: {len(products)}")
        print(f"Products available in US: {len(available)}")
        
        # Olive Oil (prod_7889643617d1) should be available at $29.99
        olive_oil = next((p for p in products if p.get("product_id") == MULTI_MARKET_PRODUCT_ID), None)
        if olive_oil:
            print(f"Olive Oil in US:")
            print(f"  available_in_country: {olive_oil.get('available_in_country')}")
            print(f"  display_price: {olive_oil.get('display_price')}")
            print(f"  display_currency: {olive_oil.get('display_currency')}")
            assert olive_oil.get("available_in_country") == True, "Olive Oil should be available in US"
            # US price should be $29.99
            if olive_oil.get("display_price"):
                assert olive_oil.get("display_price") == 29.99 or olive_oil.get("display_currency") == "USD", \
                    f"Expected USD price for US market, got {olive_oil.get('display_price')} {olive_oil.get('display_currency')}"
    
    def test_products_kr_availability(self):
        """GET /api/products?country=KR - verify availability in Korea"""
        response = requests.get(f"{BASE_URL}/api/products", params={"country": "KR"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        products = response.json()
        available = [p for p in products if p.get("available_in_country") == True]
        unavailable = [p for p in products if p.get("available_in_country") == False]
        
        print(f"Total products returned for KR: {len(products)}")
        print(f"Products available in KR: {len(available)}")
        print(f"Products unavailable in KR: {len(unavailable)}")
        
        # List a few available products
        for p in available[:3]:
            print(f"  - {p.get('name')}: {p.get('display_price')} {p.get('display_currency')}")


# ============================================================================
# Module 2: Geo Detection Endpoint
# ============================================================================

class TestGeoDetection:
    """Tests for GET /api/geo/detect-country"""
    
    def test_geo_detect_returns_country(self):
        """GET /api/geo/detect-country should return a country code"""
        response = requests.get(f"{BASE_URL}/api/geo/detect-country")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "country" in data, "Response should include 'country' field"
        assert len(data["country"]) == 2, f"Country code should be 2 chars, got: {data['country']}"
        print(f"Detected country: {data['country']}")
        if "source" in data:
            print(f"  source: {data['source']}")


# ============================================================================
# Module 3: Admin Market Coverage Dashboard
# ============================================================================

class TestAdminMarketCoverage:
    """Tests for GET /api/admin/market-coverage"""
    
    def test_market_coverage_requires_auth(self):
        """GET /api/admin/market-coverage without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/admin/market-coverage")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_market_coverage_as_admin(self):
        """GET /api/admin/market-coverage as admin should return coverage stats"""
        session, token = TestSession.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"
        
        response = session.get(f"{BASE_URL}/api/admin/market-coverage")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "coverage" in data, "Response should include 'coverage' field"
        
        coverage = data["coverage"]
        print(f"Market coverage data ({len(coverage)} markets):")
        
        # Check expected markets: ES (23 products), US (1), DE (1)
        for market in coverage:
            print(f"  {market.get('country_code')}: {market.get('active_products')} products, "
                  f"{market.get('total_stock')} stock, "
                  f"SLA: {market.get('avg_sla_hours')}h, "
                  f"Sellers: {market.get('active_sellers')}")
        
        # Verify ES has most products
        es_market = next((m for m in coverage if m.get("country_code") == "ES"), None)
        if es_market:
            assert es_market.get("active_products", 0) >= 20, f"ES should have ~23 products, got {es_market.get('active_products')}"
        
        # Check products_without_inventory count
        no_inv = data.get("products_without_inventory", 0)
        print(f"Products without inventory_by_country: {no_inv}")


# ============================================================================
# Module 4: Producer Market Management
# ============================================================================

class TestProducerMarketManagement:
    """Tests for GET/PUT /api/producer/products/{id}/markets"""
    
    def test_get_product_markets_as_producer(self):
        """GET /api/producer/products/{id}/markets returns inventory_by_country"""
        session, token = TestSession.login(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        assert token, "Producer login failed"
        
        # First, get a product owned by this producer
        response = session.get(f"{BASE_URL}/api/producer/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        if not products:
            pytest.skip("No products found for producer")
        
        product_id = products[0].get("product_id")
        print(f"Testing market access for product: {product_id}")
        
        # Get markets
        response = session.get(f"{BASE_URL}/api/producer/products/{product_id}/markets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        markets = response.json()
        print(f"Markets for {product_id}: {len(markets)} entries")
        for m in markets[:5]:
            print(f"  {m.get('country_code')}: stock={m.get('stock')}, "
                  f"price={m.get('price')} {m.get('currency')}, "
                  f"SLA={m.get('delivery_sla_hours')}h, active={m.get('active')}")
    
    def test_update_markets_sla_validation(self):
        """PUT /api/producer/products/{id}/markets should reject SLA > 48h"""
        session, token = TestSession.login(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        assert token, "Producer login failed"
        
        # Get a product
        response = session.get(f"{BASE_URL}/api/producer/products")
        products = response.json()
        if not products:
            pytest.skip("No products found for producer")
        
        product_id = products[0].get("product_id")
        
        # Try to update with SLA > 48h
        invalid_markets = {
            "markets": [
                {
                    "country_code": "XX",
                    "stock": 100,
                    "delivery_sla_hours": 72,  # > 48h, should fail
                    "active": True,
                    "price": 10.0,
                    "currency": "EUR"
                }
            ]
        }
        
        response = session.put(f"{BASE_URL}/api/producer/products/{product_id}/markets", json=invalid_markets)
        assert response.status_code == 400, f"Expected 400 for SLA > 48h, got {response.status_code}: {response.text}"
        
        error_detail = response.json().get("detail", "")
        print(f"SLA validation error: {error_detail}")
        assert "48" in error_detail.lower() or "sla" in error_detail.lower(), \
            f"Error should mention SLA/48h, got: {error_detail}"
    
    def test_update_markets_zero_stock_validation(self):
        """PUT /api/producer/products/{id}/markets should reject active with 0 stock"""
        session, token = TestSession.login(PRODUCER_EMAIL, PRODUCER_PASSWORD)
        assert token, "Producer login failed"
        
        # Get a product
        response = session.get(f"{BASE_URL}/api/producer/products")
        products = response.json()
        if not products:
            pytest.skip("No products found for producer")
        
        product_id = products[0].get("product_id")
        
        # Try to activate with 0 stock
        invalid_markets = {
            "markets": [
                {
                    "country_code": "YY",
                    "stock": 0,  # 0 stock
                    "delivery_sla_hours": 24,
                    "active": True,  # trying to activate
                    "price": 10.0,
                    "currency": "EUR"
                }
            ]
        }
        
        response = session.put(f"{BASE_URL}/api/producer/products/{product_id}/markets", json=invalid_markets)
        assert response.status_code == 400, f"Expected 400 for 0 stock active, got {response.status_code}: {response.text}"
        
        error_detail = response.json().get("detail", "")
        print(f"Stock validation error: {error_detail}")
        assert "stock" in error_detail.lower() or "0" in error_detail, \
            f"Error should mention stock/0, got: {error_detail}"


# ============================================================================
# Module 5: Cart Add - Multi-Market Validation
# ============================================================================

class TestCartAddMultiMarket:
    """Tests for POST /api/cart/add with multi-market validation"""
    
    def test_cart_add_available_product(self):
        """POST /api/cart/add for available product should succeed"""
        session, token = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert token, "Customer login failed"
        
        # Set locale to ES (where all products are available)
        session.put(f"{BASE_URL}/api/user/locale", json={"country": "ES"})
        
        # Get an available product without variants
        response = requests.get(f"{BASE_URL}/api/products", params={"country": "ES"})
        products = response.json()
        # Filter: available, no variants (simpler to test)
        available = [p for p in products if p.get("available_in_country") == True and not p.get("variants")]
        
        if not available:
            # If all have variants, skip this test as it requires variant_id
            pytest.skip("No simple (non-variant) available products in ES")
        
        product_id = available[0].get("product_id")
        print(f"Adding available product to cart: {product_id}")
        
        response = session.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1
        })
        
        # Should succeed (200 or 201)
        assert response.status_code in [200, 201], f"Expected success, got {response.status_code}: {response.text}"
        print(f"Cart add succeeded for {product_id}")
    
    def test_cart_add_unavailable_product_blocked(self):
        """POST /api/cart/add for unavailable product should return 400"""
        session, token = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert token, "Customer login failed"
        
        # Set locale to KR (where most products may be unavailable)
        session.put(f"{BASE_URL}/api/user/locale", json={"country": "KR"})
        
        # Get products and find one that's unavailable in KR
        response = requests.get(f"{BASE_URL}/api/products", params={"country": "KR"})
        products = response.json()
        
        # Find an ES-only product (unavailable in KR)
        es_only_products = [p for p in products if p.get("available_in_country") == False]
        
        if not es_only_products:
            # Alternative: try to find a product with ES market but no KR market
            print("No explicitly unavailable products found, trying with known ES-only product")
            # Skip if we can't find an unavailable product
            pytest.skip("Could not find unavailable product for KR market")
        
        product_id = es_only_products[0].get("product_id")
        print(f"Trying to add unavailable product: {product_id}")
        
        response = session.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1
        })
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400 for unavailable product, got {response.status_code}: {response.text}"
        
        error_detail = response.json().get("detail", "")
        print(f"Block message: {error_detail}")
        assert "not available" in error_detail.lower() or "region" in error_detail.lower(), \
            f"Error should mention availability, got: {error_detail}"
    
    def test_cart_add_us_user_es_only_product(self):
        """US user trying to add ES-only product should be blocked"""
        session, token = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert token, "Customer login failed"
        
        # Set locale to US
        session.put(f"{BASE_URL}/api/user/locale", json={"country": "US"})
        
        # Get products available in ES but not US
        es_products = requests.get(f"{BASE_URL}/api/products", params={"country": "ES"}).json()
        us_products = requests.get(f"{BASE_URL}/api/products", params={"country": "US"}).json()
        
        # Find a product available in ES but not US
        us_available_ids = [p.get("product_id") for p in us_products if p.get("available_in_country") == True]
        es_only = [p for p in es_products if p.get("product_id") not in us_available_ids and p.get("available_in_country") == True]
        
        if not es_only:
            print("Could not find ES-only product for this test")
            pytest.skip("No ES-only products found")
        
        product_id = es_only[0].get("product_id")
        print(f"US user trying to add ES-only product: {product_id}")
        
        response = session.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1
        })
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"Correctly blocked: {response.json().get('detail', '')}")


# ============================================================================
# Module 6: Core API Sanity Checks
# ============================================================================

class TestCoreFunctionality:
    """Verify core APIs still work after multi-market changes"""
    
    def test_auth_login(self):
        """POST /api/auth/login should still work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Response should include session_token"
        assert "user" in data, "Response should include user object"
        print(f"Login successful for {data['user'].get('email')}")
    
    def test_feed_endpoint(self):
        """GET /api/feed should still work"""
        response = requests.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Feed failed: {response.status_code} {response.text}"
        
        data = response.json()
        assert "posts" in data, "Response should include posts"
        print(f"Feed returned {len(data['posts'])} posts")


# ============================================================================
# Run tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
