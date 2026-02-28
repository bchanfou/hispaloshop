"""
Stock Management & Discount Codes API Tests
Tests the new commerce features: stock validation, discount codes CRUD, and discount application
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============================================
# FIXTURES
# ============================================

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@hispaloshop.com", "password": "admin123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["session_token"]

@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200, f"Customer login failed: {response.text}"
    return response.json()["session_token"]

@pytest.fixture(scope="module")
def producer_token():
    """Get producer authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "producer@test.com", "password": "producer123"}
    )
    assert response.status_code == 200, f"Producer login failed: {response.text}"
    return response.json()["session_token"]


# ============================================
# STOCK MANAGEMENT TESTS
# ============================================

class TestStockManagement:
    """Test stock management features on products"""
    
    def test_products_have_stock_fields(self):
        """Verify products include stock management fields"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0
        
        # Check first product has stock fields
        product = products[0]
        assert "stock" in product, "Product missing 'stock' field"
        assert "track_stock" in product, "Product missing 'track_stock' field"
        assert "low_stock_threshold" in product, "Product missing 'low_stock_threshold' field"
        
    def test_product_detail_includes_stock(self):
        """Verify single product endpoint includes stock info"""
        response = requests.get(f"{BASE_URL}/api/products/prod_7889643617d1")
        assert response.status_code == 200
        product = response.json()
        
        assert "stock" in product
        assert isinstance(product["stock"], int)
        assert "track_stock" in product
        assert isinstance(product["track_stock"], bool)
        
    def test_out_of_stock_product_exists(self):
        """Verify there's a product with 0 stock for testing"""
        # prod_a761669eb3ed (Traditional Fig Jam) should have stock=0
        response = requests.get(f"{BASE_URL}/api/products/prod_a761669eb3ed")
        assert response.status_code == 200
        product = response.json()
        assert product["stock"] == 0, f"Expected stock=0, got {product['stock']}"
        
    def test_low_stock_product_exists(self):
        """Verify there's a product with low stock for testing"""
        # prod_8eb6256e409d (Organic Almond & Honey Energy Bars) should have stock=3
        response = requests.get(f"{BASE_URL}/api/products/prod_8eb6256e409d")
        assert response.status_code == 200
        product = response.json()
        assert product["stock"] <= 5, f"Expected low stock, got {product['stock']}"


class TestStockValidationOnCart:
    """Test stock validation when adding to cart"""
    
    def test_add_out_of_stock_product_fails(self, customer_token):
        """Cannot add out-of-stock product to cart"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_a761669eb3ed", "quantity": 1},  # Fig Jam - stock=0
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        assert "out of stock" in response.json()["detail"].lower()
        
    def test_add_more_than_available_stock_fails(self, customer_token):
        """Cannot add more quantity than available stock"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_8eb6256e409d", "quantity": 100},  # Energy Bars - stock=3
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 400
        assert "available" in response.json()["detail"].lower()
        
    def test_add_within_stock_succeeds(self, customer_token):
        """Can add product within available stock"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_7889643617d1", "quantity": 1},  # Olive Oil - stock=50
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Added to cart"
        assert "stock" in data  # Response includes current stock


class TestCartStockInfo:
    """Test cart returns stock information"""
    
    def test_cart_items_include_stock_info(self, customer_token):
        """Cart items should include stock availability info"""
        # First add an item
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_7889643617d1", "quantity": 1},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Get cart
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Cart should have items and discount keys
        assert "items" in data
        assert "discount" in data
        
        # Items should have stock info
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "stock" in item, "Cart item missing 'stock' field"
            assert "stock_available" in item, "Cart item missing 'stock_available' field"


class TestProducerStockUpdate:
    """Test producer can update stock"""
    
    def test_producer_update_stock(self, producer_token):
        """Producer can update stock for their products"""
        # Note: This test assumes producer has products. May need adjustment.
        # First get producer's products
        response = requests.get(
            f"{BASE_URL}/api/producer/products",
            headers={"Authorization": f"Bearer {producer_token}"}
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            product_id = response.json()[0]["product_id"]
            
            # Update stock
            update_response = requests.put(
                f"{BASE_URL}/api/producer/products/{product_id}/stock",
                json={"stock": 25},
                headers={"Authorization": f"Bearer {producer_token}"}
            )
            assert update_response.status_code == 200
        else:
            pytest.skip("Producer has no products to test stock update")


class TestAdminStockUpdate:
    """Test admin can update stock for any product"""
    
    def test_admin_update_stock(self, admin_token):
        """Admin can update stock for any product"""
        response = requests.put(
            f"{BASE_URL}/api/admin/products/prod_7889643617d1/stock",
            json={"stock": 50},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("stock") == 50 or "updated" in str(data).lower()


# ============================================
# DISCOUNT CODES CRUD TESTS
# ============================================

class TestDiscountCodesCRUD:
    """Test admin discount codes CRUD operations"""
    
    def test_get_discount_codes(self, admin_token):
        """Admin can list all discount codes"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-codes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        codes = response.json()
        assert isinstance(codes, list)
        
        # Verify existing codes
        code_names = [c["code"] for c in codes]
        assert "SAVE10" in code_names, "Expected SAVE10 discount code"
        assert "FLAT5" in code_names, "Expected FLAT5 discount code"
        assert "FREESHIP" in code_names, "Expected FREESHIP discount code"
        
    def test_discount_code_structure(self, admin_token):
        """Verify discount code has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-codes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        codes = response.json()
        
        if len(codes) > 0:
            code = codes[0]
            required_fields = ["code_id", "code", "type", "value", "active"]
            for field in required_fields:
                assert field in code, f"Discount code missing '{field}' field"
                
    def test_create_discount_code(self, admin_token):
        """Admin can create new discount code"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(
            f"{BASE_URL}/api/admin/discount-codes",
            json={
                "code": unique_code,
                "type": "percentage",
                "value": 15,
                "active": True,
                "min_cart_amount": 20
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["code"] == unique_code
        assert data["type"] == "percentage"
        assert data["value"] == 15
        
        # Store for cleanup
        TestDiscountCodesCRUD.created_code_id = data["code_id"]
        
    def test_update_discount_code(self, admin_token):
        """Admin can update discount code"""
        # Get existing codes
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-codes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        codes = response.json()
        
        # Find the test code we created
        test_code = next((c for c in codes if hasattr(TestDiscountCodesCRUD, 'created_code_id') and c["code_id"] == TestDiscountCodesCRUD.created_code_id), None)
        
        if test_code:
            update_response = requests.put(
                f"{BASE_URL}/api/admin/discount-codes/{test_code['code_id']}",
                json={
                    "code": test_code["code"],
                    "type": "percentage",
                    "value": 20,  # Changed from 15 to 20
                    "active": True
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert update_response.status_code == 200
        else:
            pytest.skip("No test discount code to update")
            
    def test_toggle_discount_code_status(self, admin_token):
        """Admin can toggle discount code active status"""
        # Get existing codes
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-codes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        codes = response.json()
        
        if hasattr(TestDiscountCodesCRUD, 'created_code_id'):
            toggle_response = requests.put(
                f"{BASE_URL}/api/admin/discount-codes/{TestDiscountCodesCRUD.created_code_id}/toggle",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert toggle_response.status_code == 200
        else:
            pytest.skip("No test discount code to toggle")
            
    def test_delete_discount_code(self, admin_token):
        """Admin can delete discount code"""
        if hasattr(TestDiscountCodesCRUD, 'created_code_id'):
            response = requests.delete(
                f"{BASE_URL}/api/admin/discount-codes/{TestDiscountCodesCRUD.created_code_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
        else:
            pytest.skip("No test discount code to delete")
            
    def test_create_duplicate_code_fails(self, admin_token):
        """Cannot create discount code with duplicate code"""
        response = requests.post(
            f"{BASE_URL}/api/admin/discount-codes",
            json={
                "code": "SAVE10",  # Already exists
                "type": "percentage",
                "value": 10,
                "active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        
    def test_customer_cannot_access_discount_codes_admin(self, customer_token):
        """Customer cannot access admin discount codes endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discount-codes",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403


# ============================================
# DISCOUNT APPLICATION TESTS
# ============================================

class TestDiscountApplication:
    """Test applying discount codes to cart"""
    
    def test_apply_valid_percentage_discount(self, customer_token):
        """Customer can apply valid percentage discount code"""
        # First ensure cart has items
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_7889643617d1", "quantity": 1},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Apply discount - code is a query parameter
        response = requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=SAVE10",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "discount" in data or "message" in data
        
    def test_apply_valid_fixed_discount(self, customer_token):
        """Customer can apply valid fixed amount discount code"""
        response = requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=FLAT5",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
    def test_apply_free_shipping_discount(self, customer_token):
        """Customer can apply free shipping discount code (requires min cart $30)"""
        # FREESHIP has min_cart_amount of $30, so we need enough items
        # Add multiple items to meet minimum
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_7889643617d1", "quantity": 2},  # $24.99 x 2 = $49.98
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=FREESHIP",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Should succeed now with cart > $30
        assert response.status_code == 200
        
    def test_apply_invalid_discount_code(self, customer_token):
        """Invalid discount code returns error"""
        response = requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=INVALIDCODE123",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code in [400, 404]
        
    def test_cart_shows_applied_discount(self, customer_token):
        """Cart endpoint shows applied discount"""
        # Apply a discount first
        requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=SAVE10",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Get cart
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "discount" in data
        # Discount should be present if applied
        if data["discount"]:
            assert "code" in data["discount"]
            
    def test_remove_discount(self, customer_token):
        """Customer can remove applied discount"""
        import time
        
        # First apply a discount
        requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=SAVE10",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Remove discount
        response = requests.delete(
            f"{BASE_URL}/api/cart/remove-discount",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        # Small delay to ensure DB operation completes
        time.sleep(0.5)
        
        # Verify discount is removed
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        cart_data = cart_response.json()
        assert cart_data.get("discount") is None, f"Discount should be None but got: {cart_data.get('discount')}"
        
    def test_apply_discount_without_auth(self):
        """Cannot apply discount without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/cart/apply-discount?code=SAVE10"
        )
        assert response.status_code == 401


# ============================================
# CLEANUP
# ============================================

class TestCleanup:
    """Cleanup test data"""
    
    def test_clear_cart(self, customer_token):
        """Clear cart items after tests"""
        # Get cart items
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            for item in data.get("items", []):
                requests.delete(
                    f"{BASE_URL}/api/cart/{item['product_id']}",
                    headers={"Authorization": f"Bearer {customer_token}"}
                )
        
        # Remove any applied discount
        requests.delete(
            f"{BASE_URL}/api/cart/remove-discount",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert True  # Cleanup always passes
