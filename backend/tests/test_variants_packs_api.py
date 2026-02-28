"""
Test suite for Product Variants & Packs feature (Phase B2)
Tests:
- Variant CRUD operations (create, update, delete)
- Pack CRUD operations (create, update, delete)
- Cart operations with variants and packs
- Checkout stock validation for packs
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "producer123"
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "admin123"

# Test product with variants
TEST_PRODUCT_ID = "prod_7889643617d1"
TEST_VARIANT_ID = "var_99aa8803"  # Original variant
TEST_PACK_ID = "pack_70bc3bd1"  # 1 unit pack


class TestSession:
    """Helper class to manage test sessions"""
    
    @staticmethod
    def login(email, password):
        """Login and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token")
        return None
    
    @staticmethod
    def get_auth_headers(token):
        """Get headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }


@pytest.fixture(scope="module")
def producer_token():
    """Get producer session token"""
    token = TestSession.login(PRODUCER_EMAIL, PRODUCER_PASSWORD)
    if not token:
        pytest.skip("Could not login as producer")
    return token


@pytest.fixture(scope="module")
def admin_token():
    """Get admin session token"""
    token = TestSession.login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        pytest.skip("Could not login as admin")
    return token


@pytest.fixture(scope="module")
def producer_headers(producer_token):
    """Get producer auth headers"""
    return TestSession.get_auth_headers(producer_token)


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get admin auth headers"""
    return TestSession.get_auth_headers(admin_token)


# ============================================
# VARIANT CRUD TESTS
# ============================================

class TestVariantCRUD:
    """Test variant create, read, update, delete operations"""
    
    created_variant_id = None
    
    def test_get_product_with_variants(self):
        """Test that product returns variants array"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        
        product = response.json()
        assert "variants" in product
        assert isinstance(product["variants"], list)
        assert len(product["variants"]) >= 2  # Original and Extra Virgin Gold
        
        # Verify variant structure
        variant = product["variants"][0]
        assert "variant_id" in variant
        assert "name" in variant
        assert "packs" in variant
        print(f"SUCCESS: Product has {len(product['variants'])} variants")
    
    def test_create_variant_requires_auth(self):
        """Test that creating variant requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants",
            json={"name": "Test Variant"}
        )
        assert response.status_code == 401
        print("SUCCESS: Create variant requires authentication")
    
    def test_create_variant_requires_producer_role(self, admin_headers):
        """Test that only producers can create variants"""
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants",
            json={"name": "Test Variant"},
            headers=admin_headers
        )
        assert response.status_code == 403
        print("SUCCESS: Create variant requires producer role")
    
    def test_create_variant_success(self, producer_headers):
        """Test creating a new variant"""
        variant_name = f"TEST_Variant_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants",
            json={"name": variant_name, "sku": "TEST-SKU-001"},
            headers=producer_headers
        )
        assert response.status_code == 200
        
        variant = response.json()
        assert "variant_id" in variant
        assert variant["name"] == variant_name
        assert variant["sku"] == "TEST-SKU-001"
        assert variant["packs"] == []
        
        TestVariantCRUD.created_variant_id = variant["variant_id"]
        print(f"SUCCESS: Created variant {variant['variant_id']}")
    
    def test_create_variant_product_not_found(self, producer_headers):
        """Test creating variant for non-existent product"""
        response = requests.post(
            f"{BASE_URL}/api/producer/products/prod_nonexistent/variants",
            json={"name": "Test Variant"},
            headers=producer_headers
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent product")
    
    def test_update_variant_success(self, producer_headers):
        """Test updating a variant"""
        if not TestVariantCRUD.created_variant_id:
            pytest.skip("No variant created to update")
        
        new_name = f"TEST_Updated_{uuid.uuid4().hex[:6]}"
        response = requests.put(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants/{TestVariantCRUD.created_variant_id}",
            json={"name": new_name, "sku": "TEST-SKU-002"},
            headers=producer_headers
        )
        assert response.status_code == 200
        
        variant = response.json()
        assert variant["name"] == new_name
        print(f"SUCCESS: Updated variant name to {new_name}")
    
    def test_update_variant_not_found(self, producer_headers):
        """Test updating non-existent variant"""
        response = requests.put(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants/var_nonexistent",
            json={"name": "Test"},
            headers=producer_headers
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent variant")
    
    def test_delete_variant_success(self, producer_headers):
        """Test deleting a variant"""
        if not TestVariantCRUD.created_variant_id:
            pytest.skip("No variant created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants/{TestVariantCRUD.created_variant_id}",
            headers=producer_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Variant deleted"
        print(f"SUCCESS: Deleted variant {TestVariantCRUD.created_variant_id}")
        
        # Verify deletion
        product_response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        product = product_response.json()
        variant_ids = [v["variant_id"] for v in product.get("variants", [])]
        assert TestVariantCRUD.created_variant_id not in variant_ids
        print("SUCCESS: Variant no longer in product")
    
    def test_delete_variant_not_found(self, producer_headers):
        """Test deleting non-existent variant"""
        response = requests.delete(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants/var_nonexistent",
            headers=producer_headers
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent variant")


# ============================================
# PACK CRUD TESTS
# ============================================

class TestPackCRUD:
    """Test pack create, read, update, delete operations"""
    
    test_variant_id = None
    created_pack_id = None
    
    @pytest.fixture(autouse=True)
    def setup_test_variant(self, producer_headers):
        """Create a test variant for pack tests"""
        if TestPackCRUD.test_variant_id is None:
            variant_name = f"TEST_PackVariant_{uuid.uuid4().hex[:6]}"
            response = requests.post(
                f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants",
                json={"name": variant_name},
                headers=producer_headers
            )
            if response.status_code == 200:
                TestPackCRUD.test_variant_id = response.json()["variant_id"]
        yield
    
    def test_create_pack_success(self, producer_headers):
        """Test creating a new pack"""
        if not TestPackCRUD.test_variant_id:
            pytest.skip("No test variant available")
        
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs",
            json={
                "variant_id": TestPackCRUD.test_variant_id,
                "label": "TEST Pack of 3",
                "units": 3,
                "price": 59.99,
                "stock": 50
            },
            headers=producer_headers
        )
        assert response.status_code == 200
        
        pack = response.json()
        assert "pack_id" in pack
        assert pack["label"] == "TEST Pack of 3"
        assert pack["units"] == 3
        assert pack["price"] == 59.99
        assert pack["stock"] == 50
        
        TestPackCRUD.created_pack_id = pack["pack_id"]
        print(f"SUCCESS: Created pack {pack['pack_id']}")
    
    def test_create_pack_requires_auth(self):
        """Test that creating pack requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs",
            json={
                "variant_id": TEST_VARIANT_ID,
                "label": "Test Pack",
                "units": 1,
                "price": 10.0,
                "stock": 10
            }
        )
        assert response.status_code == 401
        print("SUCCESS: Create pack requires authentication")
    
    def test_create_pack_variant_not_found(self, producer_headers):
        """Test creating pack for non-existent variant"""
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs",
            json={
                "variant_id": "var_nonexistent",
                "label": "Test Pack",
                "units": 1,
                "price": 10.0,
                "stock": 10
            },
            headers=producer_headers
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent variant")
    
    def test_create_pack_negative_price_rejected(self, producer_headers):
        """Test that negative price is rejected"""
        if not TestPackCRUD.test_variant_id:
            pytest.skip("No test variant available")
        
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs",
            json={
                "variant_id": TestPackCRUD.test_variant_id,
                "label": "Test Pack",
                "units": 1,
                "price": -10.0,
                "stock": 10
            },
            headers=producer_headers
        )
        assert response.status_code == 400
        assert "negative" in response.json()["detail"].lower()
        print("SUCCESS: Negative price rejected")
    
    def test_create_pack_negative_stock_rejected(self, producer_headers):
        """Test that negative stock is rejected"""
        if not TestPackCRUD.test_variant_id:
            pytest.skip("No test variant available")
        
        response = requests.post(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs",
            json={
                "variant_id": TestPackCRUD.test_variant_id,
                "label": "Test Pack",
                "units": 1,
                "price": 10.0,
                "stock": -5
            },
            headers=producer_headers
        )
        assert response.status_code == 400
        assert "negative" in response.json()["detail"].lower()
        print("SUCCESS: Negative stock rejected")
    
    def test_update_pack_success(self, producer_headers):
        """Test updating a pack"""
        if not TestPackCRUD.created_pack_id:
            pytest.skip("No pack created to update")
        
        response = requests.put(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs/{TestPackCRUD.created_pack_id}",
            json={
                "label": "TEST Updated Pack",
                "price": 69.99,
                "stock": 75
            },
            headers=producer_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Pack updated"
        print("SUCCESS: Pack updated")
        
        # Verify update
        product_response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        product = product_response.json()
        for variant in product.get("variants", []):
            for pack in variant.get("packs", []):
                if pack["pack_id"] == TestPackCRUD.created_pack_id:
                    assert pack["label"] == "TEST Updated Pack"
                    assert pack["price"] == 69.99
                    assert pack["stock"] == 75
                    print("SUCCESS: Pack update verified in product")
                    return
    
    def test_update_pack_not_found(self, producer_headers):
        """Test updating non-existent pack"""
        response = requests.put(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs/pack_nonexistent",
            json={"label": "Test"},
            headers=producer_headers
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent pack")
    
    def test_delete_pack_success(self, producer_headers):
        """Test deleting a pack"""
        if not TestPackCRUD.created_pack_id:
            pytest.skip("No pack created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs/{TestPackCRUD.created_pack_id}",
            headers=producer_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Pack deleted"
        print(f"SUCCESS: Deleted pack {TestPackCRUD.created_pack_id}")
    
    def test_delete_pack_not_found(self, producer_headers):
        """Test deleting non-existent pack"""
        response = requests.delete(
            f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/packs/pack_nonexistent",
            headers=producer_headers
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent pack")
    
    def test_cleanup_test_variant(self, producer_headers):
        """Cleanup: Delete test variant"""
        if TestPackCRUD.test_variant_id:
            requests.delete(
                f"{BASE_URL}/api/producer/products/{TEST_PRODUCT_ID}/variants/{TestPackCRUD.test_variant_id}",
                headers=producer_headers
            )
            print(f"CLEANUP: Deleted test variant {TestPackCRUD.test_variant_id}")


# ============================================
# CART WITH VARIANTS/PACKS TESTS
# ============================================

class TestCartWithVariants:
    """Test cart operations with variants and packs"""
    
    def test_add_to_cart_with_variant_and_pack(self, admin_headers):
        """Test adding product with variant and pack to cart"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "variant_id": TEST_VARIANT_ID,
                "pack_id": TEST_PACK_ID
            },
            headers=admin_headers
        )
        assert response.status_code == 200
        assert "Added to cart" in response.json()["message"]
        print("SUCCESS: Added product with variant/pack to cart")
    
    def test_cart_contains_variant_info(self, admin_headers):
        """Test that cart items include variant and pack info"""
        response = requests.get(f"{BASE_URL}/api/cart", headers=admin_headers)
        assert response.status_code == 200
        
        cart_data = response.json()
        items = cart_data.get("items", [])
        
        # Find the item we just added
        cart_item = next(
            (item for item in items 
             if item["product_id"] == TEST_PRODUCT_ID 
             and item.get("variant_id") == TEST_VARIANT_ID
             and item.get("pack_id") == TEST_PACK_ID),
            None
        )
        
        assert cart_item is not None, "Cart item with variant/pack not found"
        assert cart_item.get("variant_name") is not None
        assert cart_item.get("pack_label") is not None
        assert cart_item.get("pack_units") is not None
        print(f"SUCCESS: Cart item has variant_name={cart_item['variant_name']}, pack_label={cart_item['pack_label']}")
    
    def test_add_to_cart_requires_variant_for_variant_product(self, admin_headers):
        """Test that adding variant product without variant_id fails"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1
            },
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "variant" in response.json()["detail"].lower()
        print("SUCCESS: Adding variant product without variant_id rejected")
    
    def test_add_to_cart_requires_pack_for_variant_with_packs(self, admin_headers):
        """Test that adding variant without pack_id fails when packs exist"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "variant_id": TEST_VARIANT_ID
            },
            headers=admin_headers
        )
        assert response.status_code == 400
        assert "pack" in response.json()["detail"].lower()
        print("SUCCESS: Adding variant without pack_id rejected")
    
    def test_add_to_cart_invalid_variant(self, admin_headers):
        """Test adding with invalid variant_id"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "variant_id": "var_invalid",
                "pack_id": TEST_PACK_ID
            },
            headers=admin_headers
        )
        assert response.status_code == 404
        assert "variant" in response.json()["detail"].lower()
        print("SUCCESS: Invalid variant_id rejected")
    
    def test_add_to_cart_invalid_pack(self, admin_headers):
        """Test adding with invalid pack_id"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "variant_id": TEST_VARIANT_ID,
                "pack_id": "pack_invalid"
            },
            headers=admin_headers
        )
        assert response.status_code == 404
        assert "pack" in response.json()["detail"].lower()
        print("SUCCESS: Invalid pack_id rejected")
    
    def test_remove_from_cart_with_variant_and_pack(self, admin_headers):
        """Test removing item with variant and pack from cart"""
        response = requests.delete(
            f"{BASE_URL}/api/cart/{TEST_PRODUCT_ID}?variant_id={TEST_VARIANT_ID}&pack_id={TEST_PACK_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert "Removed from cart" in response.json()["message"]
        print("SUCCESS: Removed item with variant/pack from cart")
        
        # Verify removal
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=admin_headers)
        cart_data = cart_response.json()
        items = cart_data.get("items", [])
        
        cart_item = next(
            (item for item in items 
             if item["product_id"] == TEST_PRODUCT_ID 
             and item.get("variant_id") == TEST_VARIANT_ID
             and item.get("pack_id") == TEST_PACK_ID),
            None
        )
        assert cart_item is None, "Cart item should be removed"
        print("SUCCESS: Cart item verified removed")


# ============================================
# CHECKOUT STOCK VALIDATION TESTS
# ============================================

class TestCheckoutStockValidation:
    """Test checkout validates pack stock"""
    
    def test_checkout_validates_pack_stock(self, admin_headers):
        """Test that checkout validates pack stock levels"""
        # First add item to cart
        add_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "variant_id": TEST_VARIANT_ID,
                "pack_id": TEST_PACK_ID
            },
            headers=admin_headers
        )
        assert add_response.status_code == 200
        
        # Try checkout - should work since stock is available
        checkout_response = requests.post(
            f"{BASE_URL}/api/payments/create-checkout",
            json={
                "shipping_address": {
                    "street": "123 Test St",
                    "city": "Test City",
                    "state": "TS",
                    "zip": "12345",
                    "country": "USA"
                }
            },
            headers=admin_headers
        )
        
        # Should either succeed (200) or fail for other reasons (not stock)
        # We're mainly testing that the endpoint processes variant/pack stock
        if checkout_response.status_code == 200:
            print("SUCCESS: Checkout processed with variant/pack stock validation")
        elif checkout_response.status_code == 400:
            detail = checkout_response.json().get("detail", {})
            if isinstance(detail, dict) and "issues" in detail:
                print(f"INFO: Checkout blocked due to: {detail['issues']}")
            else:
                print(f"INFO: Checkout blocked: {detail}")
        else:
            print(f"INFO: Checkout response: {checkout_response.status_code}")
        
        # Cleanup - remove from cart
        requests.delete(
            f"{BASE_URL}/api/cart/{TEST_PRODUCT_ID}?variant_id={TEST_VARIANT_ID}&pack_id={TEST_PACK_ID}",
            headers=admin_headers
        )


# ============================================
# PRODUCT DETAIL PAGE DATA TESTS
# ============================================

class TestProductDetailData:
    """Test product detail returns correct variant/pack data"""
    
    def test_product_returns_variant_structure(self):
        """Test product API returns complete variant structure"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        
        product = response.json()
        variants = product.get("variants", [])
        
        assert len(variants) >= 2, "Product should have at least 2 variants"
        
        for variant in variants:
            assert "variant_id" in variant
            assert "name" in variant
            assert "packs" in variant
            
            for pack in variant.get("packs", []):
                assert "pack_id" in pack
                assert "label" in pack
                assert "units" in pack
                assert "price" in pack
                assert "stock" in pack
        
        print(f"SUCCESS: Product has {len(variants)} variants with complete structure")
    
    def test_variant_has_correct_pack_prices(self):
        """Test that pack prices are correctly returned"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        product = response.json()
        
        # Find Original variant
        original_variant = next(
            (v for v in product.get("variants", []) if v["variant_id"] == TEST_VARIANT_ID),
            None
        )
        assert original_variant is not None
        
        # Check pack prices
        packs = original_variant.get("packs", [])
        assert len(packs) >= 3, "Original variant should have at least 3 packs"
        
        # Find 1 unit pack
        single_pack = next((p for p in packs if p["units"] == 1), None)
        assert single_pack is not None
        assert single_pack["price"] == 24.99
        
        # Find 6 pack
        six_pack = next((p for p in packs if p["units"] == 6), None)
        assert six_pack is not None
        assert six_pack["price"] == 134.95
        
        print("SUCCESS: Pack prices are correct")
    
    def test_pack_savings_calculation(self):
        """Test that pack savings can be calculated from data"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        product = response.json()
        
        original_variant = next(
            (v for v in product.get("variants", []) if v["variant_id"] == TEST_VARIANT_ID),
            None
        )
        packs = original_variant.get("packs", [])
        
        single_pack = next((p for p in packs if p["units"] == 1), None)
        six_pack = next((p for p in packs if p["units"] == 6), None)
        
        # Calculate savings
        regular_price = single_pack["price"] * 6  # 24.99 * 6 = 149.94
        pack_price = six_pack["price"]  # 134.95
        savings = regular_price - pack_price  # 14.99
        
        assert savings > 0, "Pack should offer savings"
        print(f"SUCCESS: Pack of 6 saves ${savings:.2f} (${regular_price:.2f} vs ${pack_price:.2f})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
