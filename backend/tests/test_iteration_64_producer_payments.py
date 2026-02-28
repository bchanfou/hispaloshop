"""
Iteration 64 - Producer Payments Dashboard Tests
Tests for:
- GET /api/producer/payments - Comprehensive earnings data
- GET /api/producer/stats - Producer statistics
- POST /api/checkout/buy-now - Variant+pack buy-now (bug fix verification)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"


def get_fresh_client():
    """Create a fresh requests session (no cookies)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def login_user(email, password):
    """Login and return session token"""
    client = get_fresh_client()
    response = client.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    return None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    return get_fresh_client()


@pytest.fixture(scope="module")
def producer_token():
    """Get producer authentication token"""
    token = login_user(PRODUCER_EMAIL, PRODUCER_PASSWORD)
    if token:
        return token
    pytest.skip("Producer authentication failed")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    token = login_user(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
    if token:
        return token
    pytest.skip("Customer authentication failed")


class TestProducerPaymentsEndpoint:
    """Tests for GET /api/producer/payments endpoint"""
    
    def test_producer_payments_returns_200(self, producer_token):
        """Verify endpoint returns 200 for authenticated producer"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /producer/payments returns 200")
    
    def test_producer_payments_has_required_fields(self, producer_token):
        """Verify response contains all required earnings fields"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required top-level fields
        required_fields = [
            "total_gross", "total_net", "total_platform_fee", "pending_payout",
            "commission_rate", "paid_orders", "pending_orders", "stripe_connected",
            "recent_orders", "monthly_summary"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(data["total_gross"], (int, float)), "total_gross should be numeric"
        assert isinstance(data["total_net"], (int, float)), "total_net should be numeric"
        assert isinstance(data["total_platform_fee"], (int, float)), "total_platform_fee should be numeric"
        assert isinstance(data["pending_payout"], (int, float)), "pending_payout should be numeric"
        assert isinstance(data["commission_rate"], float), "commission_rate should be float"
        assert isinstance(data["paid_orders"], int), "paid_orders should be int"
        assert isinstance(data["stripe_connected"], bool), "stripe_connected should be bool"
        assert isinstance(data["recent_orders"], list), "recent_orders should be list"
        assert isinstance(data["monthly_summary"], list), "monthly_summary should be list"
        
        print(f"PASS: All required fields present - gross={data['total_gross']}€, net={data['total_net']}€")
    
    def test_producer_payments_earnings_calculation(self, producer_token):
        """Verify earnings calculation: net = gross - platform_fee"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify math: net should equal gross - platform_fee (within rounding tolerance)
        expected_net = round(data["total_gross"] - data["total_platform_fee"], 2)
        assert abs(data["total_net"] - expected_net) < 0.02, \
            f"Earnings calculation error: {data['total_net']} != {expected_net}"
        
        # Verify commission rate is applied correctly
        if data["total_gross"] > 0:
            actual_rate = data["total_platform_fee"] / data["total_gross"]
            assert abs(actual_rate - data["commission_rate"]) < 0.01, \
                f"Commission rate mismatch: {actual_rate} vs {data['commission_rate']}"
        
        print(f"PASS: Earnings math verified - {data['total_net']}€ = {data['total_gross']}€ - {data['total_platform_fee']}€")
    
    def test_producer_payments_recent_orders_structure(self, producer_token):
        """Verify recent_orders has correct structure"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["recent_orders"]:
            order = data["recent_orders"][0]
            order_fields = ["order_id", "date", "status", "customer_name", 
                          "gross_amount", "platform_fee", "net_earnings", "items"]
            for field in order_fields:
                assert field in order, f"Order missing field: {field}"
            
            # Verify items structure
            if order.get("items"):
                item = order["items"][0]
                item_fields = ["product_name", "quantity", "price", "subtotal"]
                for field in item_fields:
                    assert field in item, f"Order item missing field: {field}"
            
            print(f"PASS: Recent orders structure valid - {len(data['recent_orders'])} orders")
        else:
            print("INFO: No recent orders to validate structure")
    
    def test_producer_payments_monthly_summary_structure(self, producer_token):
        """Verify monthly_summary has correct structure"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["monthly_summary"]:
            month = data["monthly_summary"][0]
            month_fields = ["month", "gross", "net", "orders"]
            for field in month_fields:
                assert field in month, f"Monthly summary missing field: {field}"
            
            # Verify month format (YYYY-MM)
            assert len(month["month"]) == 7, f"Invalid month format: {month['month']}"
            
            print(f"PASS: Monthly summary structure valid - {len(data['monthly_summary'])} months")
        else:
            print("INFO: No monthly summary data to validate")
    
    def test_producer_payments_unauthenticated_fails(self):
        """Verify endpoint requires authentication"""
        fresh_client = get_fresh_client()
        response = fresh_client.get(f"{BASE_URL}/api/producer/payments")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Unauthenticated request rejected with 401")
    
    def test_producer_payments_customer_role_fails(self, customer_token):
        """Verify endpoint requires producer role"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/payments",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print("PASS: Customer role rejected with 403")


class TestProducerStatsEndpoint:
    """Tests for GET /api/producer/stats endpoint"""
    
    def test_producer_stats_returns_200(self, producer_token):
        """Verify endpoint returns 200 for authenticated producer"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/stats",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /producer/stats returns 200")
    
    def test_producer_stats_has_required_fields(self, producer_token):
        """Verify response contains all required stats fields"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/stats",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["total_products", "approved_products", "total_orders", "follower_count"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(data["total_products"], int), "total_products should be int"
        assert isinstance(data["approved_products"], int), "approved_products should be int"
        assert isinstance(data["total_orders"], int), "total_orders should be int"
        assert isinstance(data["follower_count"], int), "follower_count should be int"
        
        print(f"PASS: Producer stats valid - {data['total_products']} products, {data['total_orders']} orders")


class TestBuyNowVariantPackFix:
    """Tests for POST /api/checkout/buy-now - Verify variant+pack bug fix"""
    
    def test_buy_now_simple_product(self, customer_token):
        """Test buy-now works for simple product without variants"""
        client = get_fresh_client()
        # First, find a simple product (without variants)
        products_resp = client.get(f"{BASE_URL}/api/products?limit=50")
        assert products_resp.status_code == 200
        products = products_resp.json()  # Returns list directly
        
        simple_product = None
        for p in products:
            if not p.get("variants") and p.get("price", 0) > 0:
                simple_product = p
                break
        
        if not simple_product:
            pytest.skip("No simple product found for testing")
        
        response = client.post(
            f"{BASE_URL}/api/checkout/buy-now",
            json={
                "product_id": simple_product["product_id"],
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Should succeed with Stripe checkout URL
        assert response.status_code == 200, f"Buy-now failed: {response.text}"
        data = response.json()
        assert "checkout_url" in data or "url" in data, "Missing checkout URL in response"
        
        checkout_url = data.get("checkout_url") or data.get("url", "")
        assert "stripe.com" in checkout_url or "checkout" in checkout_url, \
            f"Invalid checkout URL: {checkout_url}"
        
        print(f"PASS: Buy-now simple product works - {simple_product['name']}")
    
    def test_buy_now_with_variant_and_pack(self, customer_token):
        """Test buy-now works with variant_id + pack_id (bug fix verification)"""
        client = get_fresh_client()
        # Find a product with variants that have packs
        products_resp = client.get(f"{BASE_URL}/api/products?limit=100")
        assert products_resp.status_code == 200
        products = products_resp.json()  # Returns list directly
        
        variant_product = None
        target_variant = None
        target_pack = None
        
        for p in products:
            variants = p.get("variants", [])
            for v in variants:
                packs = v.get("packs", [])
                if packs:
                    variant_product = p
                    target_variant = v
                    target_pack = packs[0]
                    break
            if variant_product:
                break
        
        if not variant_product:
            pytest.skip("No product with variants+packs found for testing")
        
        response = client.post(
            f"{BASE_URL}/api/checkout/buy-now",
            json={
                "product_id": variant_product["product_id"],
                "variant_id": target_variant["variant_id"],
                "pack_id": target_pack["pack_id"],
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # This is the bug fix test - should NOT return "Pack not found"
        if response.status_code != 200:
            error_detail = response.json().get("detail", "")
            assert "pack not found" not in error_detail.lower(), \
                f"BUG: Variant+pack buy-now still failing - {error_detail}"
        
        assert response.status_code == 200, f"Buy-now variant+pack failed: {response.text}"
        data = response.json()
        assert "checkout_url" in data or "url" in data, "Missing checkout URL"
        
        print(f"PASS: Buy-now variant+pack works - {variant_product['name']} ({target_variant['name']}, {target_pack['label']})")
    
    def test_buy_now_with_only_variant(self, customer_token):
        """Test buy-now works with only variant_id (no pack)"""
        client = get_fresh_client()
        products_resp = client.get(f"{BASE_URL}/api/products?limit=100")
        assert products_resp.status_code == 200
        products = products_resp.json()  # Returns list directly
        
        variant_product = None
        target_variant = None
        
        for p in products:
            variants = p.get("variants", [])
            for v in variants:
                variant_product = p
                target_variant = v
                break
            if variant_product:
                break
        
        if not variant_product:
            pytest.skip("No product with variants found for testing")
        
        response = client.post(
            f"{BASE_URL}/api/checkout/buy-now",
            json={
                "product_id": variant_product["product_id"],
                "variant_id": target_variant["variant_id"],
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Buy-now with only variant failed: {response.text}"
        print(f"PASS: Buy-now with only variant works - {variant_product['name']}")
    
    def test_buy_now_invalid_variant_fails(self, customer_token):
        """Test buy-now fails gracefully for invalid variant"""
        client = get_fresh_client()
        products_resp = client.get(f"{BASE_URL}/api/products?limit=10")
        products = products_resp.json()  # Returns list directly
        if not products:
            pytest.skip("No products found")
        
        response = client.post(
            f"{BASE_URL}/api/checkout/buy-now",
            json={
                "product_id": products[0]["product_id"],
                "variant_id": "invalid_variant_xyz",
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid variant, got {response.status_code}"
        print("PASS: Invalid variant rejected with 400")
    
    def test_buy_now_invalid_pack_fails(self, customer_token):
        """Test buy-now fails gracefully for invalid pack"""
        client = get_fresh_client()
        products_resp = client.get(f"{BASE_URL}/api/products?limit=100")
        products = products_resp.json()  # Returns list directly
        
        # Find product with variant
        variant_product = None
        target_variant = None
        for p in products:
            if p.get("variants"):
                variant_product = p
                target_variant = p["variants"][0]
                break
        
        if not variant_product:
            pytest.skip("No product with variants found")
        
        response = client.post(
            f"{BASE_URL}/api/checkout/buy-now",
            json={
                "product_id": variant_product["product_id"],
                "variant_id": target_variant["variant_id"],
                "pack_id": "invalid_pack_xyz",
                "quantity": 1
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid pack, got {response.status_code}"
        print("PASS: Invalid pack rejected with 400")


class TestProducerStripeStatus:
    """Tests for producer Stripe Connect status"""
    
    def test_stripe_status_endpoint(self, producer_token):
        """Test GET /api/producer/stripe/status"""
        client = get_fresh_client()
        response = client.get(
            f"{BASE_URL}/api/producer/stripe/status",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "connected" in data, "Missing 'connected' field"
        print(f"PASS: Stripe status endpoint works - connected={data['connected']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
