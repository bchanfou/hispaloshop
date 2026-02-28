"""
Test Suite for Phase 3 AI Intelligence: Smart Cart Actions
Tests the following features:
1. POST /api/ai/smart-cart with action=optimize_price - switches to cheapest options
2. POST /api/ai/smart-cart with action=optimize_health - finds healthier alternatives
3. POST /api/ai/smart-cart with action=optimize_quality - finds best-rated alternatives
4. POST /api/ai/smart-cart with action=switch_pack - switches to larger packs
5. POST /api/ai/smart-cart with action=upgrade - switches to premium options
6. POST /api/ai/smart-cart with action=remove_expensive - removes most expensive item
7. POST /api/ai/smart-cart with action=remove_allergen - removes items with specific allergen
8. Chat command 'optimiza para precio' executes optimize_price
9. Chat command 'hazlo más saludable' executes optimize_health
10. Chat command 'quita el más caro' executes remove_expensive
11. Chat command 'upgrade to premium' executes upgrade action
12. Chat command 'remove products with nuts' executes remove_allergen
13. Phase 1 cart actions still work (add them all, clear cart)
14. Phase 2 memory commands still work (qué sabes de mi, olvida preferencias)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSmartCartPhase3:
    """Test Phase 3 Smart Cart Actions via /api/ai/smart-cart endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as test user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.user = login_data.get("user")
        
        # Set auth header
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        # Get available products
        self.products = self.get_products()
        
        # Clear cart before each test
        self.clear_cart()
        
        yield
        
        # Cleanup after test
        self.clear_cart()
    
    def clear_cart(self):
        """Helper to clear cart"""
        try:
            cart_response = self.session.get(f"{BASE_URL}/api/cart")
            if cart_response.status_code == 200:
                cart_data = cart_response.json()
                items = cart_data.get("items", [])
                for item in items:
                    self.session.delete(
                        f"{BASE_URL}/api/cart/{item['product_id']}",
                        params={
                            "variant_id": item.get("variant_id"),
                            "pack_id": item.get("pack_id")
                        }
                    )
        except Exception as e:
            print(f"Error clearing cart: {e}")
    
    def get_cart_items(self):
        """Helper to get cart items"""
        response = self.session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        return response.json().get("items", [])
    
    def add_product_to_cart(self, product, variant_id=None, pack_id=None, quantity=1):
        """Helper to add product to cart - handles variants properly"""
        payload = {"product_id": product["product_id"], "quantity": quantity}
        
        # If product has variants, we need to specify variant_id and pack_id
        variants = product.get("variants", [])
        if variants:
            if variant_id and pack_id:
                payload["variant_id"] = variant_id
                payload["pack_id"] = pack_id
            else:
                # Use first variant and first pack
                first_variant = variants[0]
                payload["variant_id"] = first_variant["variant_id"]
                packs = first_variant.get("packs", [])
                if packs:
                    payload["pack_id"] = packs[0]["pack_id"]
        
        response = self.session.post(f"{BASE_URL}/api/cart/add", json=payload)
        return response
    
    def get_products(self):
        """Helper to get available products"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        return response.json()
    
    def get_product_without_variants(self):
        """Get a product without variants"""
        for p in self.products:
            if not p.get("variants"):
                return p
        return None
    
    def get_product_with_variants(self):
        """Get a product with variants"""
        for p in self.products:
            if p.get("variants") and len(p.get("variants", [])) > 0:
                return p
        return None
    
    # ==================== SMART CART ENDPOINT TESTS ====================
    
    def test_01_smart_cart_empty_cart_error(self):
        """Test smart cart action on empty cart returns appropriate error"""
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "optimize_price"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == False, "Should fail on empty cart"
        assert "vacío" in data.get("message", "").lower() or "empty" in data.get("message", "").lower(), \
            f"Should mention empty cart: {data.get('message')}"
        
        print(f"✓ Empty cart handled correctly: {data.get('message')}")
    
    def test_02_optimize_price_action(self):
        """Test optimize_price action switches to cheapest options"""
        product = self.get_product_with_variants()
        if not product:
            pytest.skip("No product with variants available")
        
        # Add with expensive variant/pack
        variants = product.get("variants", [])
        if len(variants) > 1:
            # Use second variant (usually more expensive)
            variant = variants[1]
        else:
            variant = variants[0]
        
        packs = variant.get("packs", [])
        if packs:
            # Sort by price descending and pick most expensive
            sorted_packs = sorted(packs, key=lambda x: x.get("price", 0), reverse=True)
            expensive_pack = sorted_packs[0]
            self.add_product_to_cart(product, variant["variant_id"], expensive_pack["pack_id"])
        else:
            self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        # Execute optimize_price
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "optimize_price"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "message" in data, "Should have message"
        
        print(f"✓ Optimize price action: {data.get('message')}")
        print(f"  Changes: {data.get('changes', [])}")
        print(f"  Savings: {data.get('savings', 0)}€")
    
    def test_03_optimize_health_action(self):
        """Test optimize_health action finds healthier alternatives"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        # Execute optimize_health
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "optimize_health"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "message" in data, "Should have message"
        
        print(f"✓ Optimize health action: {data.get('message')}")
        print(f"  Changes: {data.get('changes', [])}")
    
    def test_04_optimize_quality_action(self):
        """Test optimize_quality action finds best-rated alternatives"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        # Execute optimize_quality
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "optimize_quality"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "message" in data, "Should have message"
        
        print(f"✓ Optimize quality action: {data.get('message')}")
        print(f"  Changes: {data.get('changes', [])}")
    
    def test_05_switch_pack_action(self):
        """Test switch_pack action switches to larger packs"""
        product = self.get_product_with_variants()
        if not product:
            pytest.skip("No product with variants available")
        
        # Add with smallest pack
        variant = product["variants"][0]
        packs = variant.get("packs", [])
        if len(packs) > 1:
            sorted_packs = sorted(packs, key=lambda x: x.get("units", 1))
            smallest_pack = sorted_packs[0]
            self.add_product_to_cart(product, variant["variant_id"], smallest_pack["pack_id"])
        else:
            self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        # Execute switch_pack
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "switch_pack"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "message" in data, "Should have message"
        
        print(f"✓ Switch pack action: {data.get('message')}")
        print(f"  Changes: {data.get('changes', [])}")
    
    def test_06_upgrade_action(self):
        """Test upgrade action switches to premium options"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        # Execute upgrade
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "upgrade"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "message" in data, "Should have message"
        
        print(f"✓ Upgrade action: {data.get('message')}")
        print(f"  Changes: {data.get('changes', [])}")
    
    def test_07_remove_expensive_action(self):
        """Test remove_expensive action removes most expensive item"""
        # Get two products without variants that have stock
        products_without_variants = [p for p in self.products if not p.get("variants") and p.get("stock", 0) > 0]
        
        if len(products_without_variants) < 2:
            # Use any two products with stock
            products_with_stock = [p for p in self.products if p.get("stock", 0) > 0]
            if len(products_with_stock) < 2:
                pytest.skip("Need at least 2 products with stock")
            products_to_add = products_with_stock[:2]
        else:
            products_to_add = products_without_variants[:2]
        
        # Add products to cart
        for p in products_to_add:
            resp = self.add_product_to_cart(p)
            print(f"Adding {p['name']}: {resp.status_code} - {resp.text[:100]}")
        
        items_before = self.get_cart_items()
        assert len(items_before) >= 2, f"Should have at least 2 items, got {len(items_before)}"
        
        # Find most expensive
        most_expensive = max(items_before, key=lambda x: x.get("price", 0))
        
        # Execute remove_expensive
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "remove_expensive"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "message" in data, "Should have message"
        
        # Verify item was removed
        items_after = self.get_cart_items()
        assert len(items_after) == len(items_before) - 1, "Should have one less item"
        
        print(f"✓ Remove expensive action: {data.get('message')}")
        print(f"  Removed: {data.get('changes', [])}")
        print(f"  Savings: {data.get('savings', 0)}€")
    
    def test_08_remove_allergen_action(self):
        """Test remove_allergen action removes items with specific allergen"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        # Execute remove_allergen
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "remove_allergen", "allergen_to_remove": "nuts"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        
        print(f"✓ Remove allergen action: {data.get('message')}")
        print(f"  Removed: {data.get('changes', [])}")
    
    def test_09_unknown_action_error(self):
        """Test unknown action returns appropriate error"""
        product = self.get_product_without_variants()
        if product:
            self.add_product_to_cart(product)
        
        response = self.session.post(
            f"{BASE_URL}/api/ai/smart-cart",
            json={"action": "unknown_action"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == False, "Unknown action should fail"
        
        print(f"✓ Unknown action handled: {data.get('message')}")


class TestSmartCartChatCommands:
    """Test Phase 3 Smart Cart Actions via chat commands"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as test user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        # Get available products
        self.products = self.get_products()
        
        # Clear cart before each test
        self.clear_cart()
        
        yield
        
        # Cleanup
        self.clear_cart()
    
    def clear_cart(self):
        """Helper to clear cart"""
        try:
            cart_response = self.session.get(f"{BASE_URL}/api/cart")
            if cart_response.status_code == 200:
                cart_data = cart_response.json()
                items = cart_data.get("items", [])
                for item in items:
                    self.session.delete(
                        f"{BASE_URL}/api/cart/{item['product_id']}",
                        params={
                            "variant_id": item.get("variant_id"),
                            "pack_id": item.get("pack_id")
                        }
                    )
        except Exception as e:
            print(f"Error clearing cart: {e}")
    
    def get_cart_items(self):
        """Helper to get cart items"""
        response = self.session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        return response.json().get("items", [])
    
    def add_product_to_cart(self, product, variant_id=None, pack_id=None, quantity=1):
        """Helper to add product to cart - handles variants properly"""
        payload = {"product_id": product["product_id"], "quantity": quantity}
        
        variants = product.get("variants", [])
        if variants:
            if variant_id and pack_id:
                payload["variant_id"] = variant_id
                payload["pack_id"] = pack_id
            else:
                first_variant = variants[0]
                payload["variant_id"] = first_variant["variant_id"]
                packs = first_variant.get("packs", [])
                if packs:
                    payload["pack_id"] = packs[0]["pack_id"]
        
        response = self.session.post(f"{BASE_URL}/api/cart/add", json=payload)
        return response
    
    def get_products(self):
        """Helper to get available products"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        return response.json()
    
    def get_product_without_variants(self):
        """Get a product without variants"""
        for p in self.products:
            if not p.get("variants"):
                return p
        return None
    
    def get_product_with_variants(self):
        """Get a product with variants"""
        for p in self.products:
            if p.get("variants") and len(p.get("variants", [])) > 0:
                return p
        return None
    
    def send_chat_message(self, message):
        """Helper to send chat message"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": message,
                "session_id": None,
                "session_memory": []
            }
        )
        return response
    
    # ==================== CHAT COMMAND TESTS ====================
    
    def test_10_chat_optimize_price_spanish(self):
        """Test 'optimiza mi carrito para precio' chat command"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        response = self.send_chat_message("optimiza mi carrito para precio")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        # Check for cart_action in response
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        print(f"✓ 'optimiza para precio' works: {cart_action.get('message')}")
    
    def test_11_chat_optimize_health_spanish(self):
        """Test 'hazlo más saludable' chat command"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        response = self.send_chat_message("hazlo más saludable")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        print(f"✓ 'hazlo más saludable' works: {cart_action.get('message')}")
    
    def test_12_chat_remove_expensive_spanish(self):
        """Test 'quita el más caro' chat command"""
        # Get two products without variants that have stock
        products_without_variants = [p for p in self.products if not p.get("variants") and p.get("stock", 0) > 0]
        
        if len(products_without_variants) < 2:
            products_with_stock = [p for p in self.products if p.get("stock", 0) > 0]
            if len(products_with_stock) < 2:
                pytest.skip("Need at least 2 products with stock")
            products_to_add = products_with_stock[:2]
        else:
            products_to_add = products_without_variants[:2]
        
        for p in products_to_add:
            self.add_product_to_cart(p)
        
        items_before = self.get_cart_items()
        assert len(items_before) >= 2, f"Should have at least 2 items"
        
        response = self.send_chat_message("quita el más caro")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        
        # Verify item was removed
        items_after = self.get_cart_items()
        assert len(items_after) == len(items_before) - 1, "Should have one less item"
        
        print(f"✓ 'quita el más caro' works: {cart_action.get('message')}")
    
    def test_13_chat_upgrade_premium_english(self):
        """Test 'upgrade to premium' chat command"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        response = self.send_chat_message("upgrade to premium")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        print(f"✓ 'upgrade to premium' works: {cart_action.get('message')}")
    
    def test_14_chat_remove_nuts_english(self):
        """Test 'remove products with nuts' chat command"""
        # Get a product with stock
        product = None
        for p in self.products:
            if not p.get("variants") and p.get("stock", 0) > 0:
                product = p
                break
        
        if not product:
            product = next((p for p in self.products if p.get("stock", 0) > 0), None)
        
        if not product:
            pytest.skip("No products with stock available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, f"Cart should have items after adding {product['name']}"
        
        response = self.send_chat_message("remove anything with nuts")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        # The action should succeed (even if no nuts products were found)
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        print(f"✓ 'remove anything with nuts' works: {cart_action.get('message')}")
    
    def test_15_chat_switch_bigger_pack(self):
        """Test 'switch to bigger pack' chat command"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        response = self.send_chat_message("switch to bigger packs")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        print(f"✓ 'switch to bigger packs' works: {cart_action.get('message')}")
    
    def test_16_chat_optimize_quality(self):
        """Test 'optimize for quality' chat command"""
        product = self.get_product_without_variants()
        if not product:
            product = self.products[0] if self.products else None
        
        if not product:
            pytest.skip("No products available")
        
        self.add_product_to_cart(product)
        
        # Verify cart has item
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        response = self.send_chat_message("optimize for quality")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Action should succeed: {cart_action}"
        print(f"✓ 'optimize for quality' works: {cart_action.get('message')}")


class TestPhase1And2Compatibility:
    """Test that Phase 1 and Phase 2 features still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as test user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        # Get available products
        self.products = self.get_products()
        
        # Clear cart before each test
        self.clear_cart()
        
        yield
        
        # Cleanup
        self.clear_cart()
    
    def clear_cart(self):
        """Helper to clear cart"""
        try:
            cart_response = self.session.get(f"{BASE_URL}/api/cart")
            if cart_response.status_code == 200:
                cart_data = cart_response.json()
                items = cart_data.get("items", [])
                for item in items:
                    self.session.delete(
                        f"{BASE_URL}/api/cart/{item['product_id']}",
                        params={
                            "variant_id": item.get("variant_id"),
                            "pack_id": item.get("pack_id")
                        }
                    )
        except Exception as e:
            print(f"Error clearing cart: {e}")
    
    def get_cart_items(self):
        """Helper to get cart items"""
        response = self.session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        return response.json().get("items", [])
    
    def get_products(self):
        """Helper to get available products"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        return response.json()
    
    def add_product_to_cart(self, product, variant_id=None, pack_id=None, quantity=1):
        """Helper to add product to cart - handles variants properly"""
        payload = {"product_id": product["product_id"], "quantity": quantity}
        
        variants = product.get("variants", [])
        if variants:
            if variant_id and pack_id:
                payload["variant_id"] = variant_id
                payload["pack_id"] = pack_id
            else:
                first_variant = variants[0]
                payload["variant_id"] = first_variant["variant_id"]
                packs = first_variant.get("packs", [])
                if packs:
                    payload["pack_id"] = packs[0]["pack_id"]
        
        response = self.session.post(f"{BASE_URL}/api/cart/add", json=payload)
        return response
    
    def send_chat_message(self, message, session_memory=None):
        """Helper to send chat message"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": message,
                "session_id": None,
                "session_memory": session_memory or []
            }
        )
        return response
    
    # ==================== PHASE 1 COMPATIBILITY TESTS ====================
    
    def test_17_phase1_clear_cart_still_works(self):
        """Test Phase 1 'vaciar carrito' still works"""
        # Add something to cart
        product = next((p for p in self.products if not p.get("variants")), self.products[0] if self.products else None)
        if product:
            self.add_product_to_cart(product)
        
        response = self.send_chat_message("vaciar carrito")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Clear cart should succeed: {cart_action}"
        
        # Verify cart is empty
        items = self.get_cart_items()
        assert len(items) == 0, "Cart should be empty"
        
        print(f"✓ Phase 1 'vaciar carrito' still works: {cart_action.get('message')}")
    
    def test_18_phase1_add_all_still_works(self):
        """Test Phase 1 'añade todo' still works with session memory"""
        # Get product recommendations
        rec_response = self.send_chat_message("Show me vegan products")
        assert rec_response.status_code == 200
        rec_data = rec_response.json()
        
        products = rec_data.get("recommended_products", [])
        if not products:
            pytest.skip("No products returned")
        
        # Build session memory
        session_memory = [
            {
                "product_id": p.get("product_id"),
                "name": p.get("name"),
                "variant_id": p.get("variants", [{}])[0].get("variant_id") if p.get("variants") else None,
                "pack_id": p.get("variants", [{}])[0].get("packs", [{}])[0].get("pack_id") if p.get("variants") and p.get("variants", [{}])[0].get("packs") else None,
                "position": i + 1
            }
            for i, p in enumerate(products[:3])
        ]
        
        # Send "añade todo" with session memory
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "añade todo",
                "session_id": rec_data.get("session_id"),
                "session_memory": session_memory
            }
        )
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Add all should succeed: {cart_action}"
        
        # Verify cart has items
        items = self.get_cart_items()
        assert len(items) > 0, "Cart should have items"
        
        print(f"✓ Phase 1 'añade todo' still works: {cart_action.get('message')}")
    
    # ==================== PHASE 2 COMPATIBILITY TESTS ====================
    
    def test_19_phase2_memory_query_spanish(self):
        """Test Phase 2 'qué sabes de mi?' still works"""
        response = self.send_chat_message("qué sabes de mi?")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        # Should return memory info
        response_text = data.get("response", "")
        assert len(response_text) > 0, "Should have response"
        
        print(f"✓ Phase 2 'qué sabes de mi?' works: {response_text[:200]}")
    
    def test_20_phase2_memory_query_english(self):
        """Test Phase 2 'what do you know about me?' still works"""
        response = self.send_chat_message("what do you know about me?")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        response_text = data.get("response", "")
        assert len(response_text) > 0, "Should have response"
        
        print(f"✓ Phase 2 'what do you know about me?' works: {response_text[:200]}")
    
    def test_21_phase2_forget_preferences_spanish(self):
        """Test Phase 2 'olvida mis preferencias' still works"""
        response = self.send_chat_message("olvida mis preferencias")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        response_text = data.get("response", "")
        assert len(response_text) > 0, "Should have response"
        
        print(f"✓ Phase 2 'olvida mis preferencias' works: {response_text[:200]}")
    
    def test_22_phase2_ai_memory_endpoint(self):
        """Test Phase 2 /api/ai/memory endpoint still works"""
        # GET memory
        get_response = self.session.get(f"{BASE_URL}/api/ai/memory")
        assert get_response.status_code == 200, f"GET memory failed: {get_response.text}"
        
        # PUT memory
        put_response = self.session.put(
            f"{BASE_URL}/api/ai/memory",
            json={"diet": ["vegan"], "allergies": ["nuts"]}
        )
        assert put_response.status_code == 200, f"PUT memory failed: {put_response.text}"
        
        # Verify update
        get_response2 = self.session.get(f"{BASE_URL}/api/ai/memory")
        assert get_response2.status_code == 200
        data = get_response2.json()
        
        raw_profile = data.get("raw_profile", {})
        assert "vegan" in raw_profile.get("diet", []), "Diet should be updated"
        assert "nuts" in raw_profile.get("allergies", []), "Allergies should be updated"
        
        # DELETE memory
        delete_response = self.session.delete(f"{BASE_URL}/api/ai/memory")
        assert delete_response.status_code == 200, f"DELETE memory failed: {delete_response.text}"
        
        print(f"✓ Phase 2 /api/ai/memory endpoint works (GET/PUT/DELETE)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
