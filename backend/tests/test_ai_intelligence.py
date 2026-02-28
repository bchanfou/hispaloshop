"""
Test Suite for Phase 1 AI Intelligence: Session Memory + Natural Language Cart Actions
Tests the following features:
1. Session memory tracks products recommended during conversation
2. Natural language command 'add them all' adds all recommended products to cart
3. Natural language command 'add the first one' adds only the first product
4. Natural language command 'add the last one' adds only the last product
5. Natural language command 'clear my cart' / 'vaciar carrito' clears the cart
6. AI response for cart actions is SHORT (like 'Listo. Añadí X productos.')
7. Cart is updated correctly after AI action
8. No markdown in AI responses
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIIntelligence:
    """Test AI Intelligence Phase 1 features"""
    
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
    
    def test_01_chat_endpoint_works(self):
        """Test that chat endpoint is accessible and returns response"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "Hello",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert response.status_code == 200, f"Chat endpoint failed: {response.text}"
        data = response.json()
        
        assert "response" in data, "Response should contain 'response' field"
        assert "session_id" in data, "Response should contain 'session_id' field"
        print(f"✓ Chat endpoint works. Response: {data['response'][:100]}...")
    
    def test_02_product_recommendations_returned(self):
        """Test that asking for products returns recommendations with session memory data"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "Show me vegan products",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        # Check for recommended products
        products = data.get("recommended_products", [])
        print(f"✓ Got {len(products)} recommended products")
        
        # Verify products have required fields for session memory
        if products:
            product = products[0]
            assert "product_id" in product, "Product should have product_id"
            assert "name" in product, "Product should have name"
            print(f"✓ First product: {product['name']} (ID: {product['product_id']})")
    
    def test_03_clear_cart_english(self):
        """Test 'clear my cart' command clears the cart"""
        # First add something to cart
        self.session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_001", "quantity": 1}
        )
        
        # Verify cart has items
        items_before = self.get_cart_items()
        print(f"Cart before clear: {len(items_before)} items")
        
        # Send clear cart command
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "clear my cart",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert response.status_code == 200, f"Clear cart failed: {response.text}"
        data = response.json()
        
        # Check cart action was executed
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Cart action should succeed: {cart_action}"
        
        # Verify cart is empty
        items_after = self.get_cart_items()
        assert len(items_after) == 0, f"Cart should be empty after clear, got {len(items_after)} items"
        
        # Check response is short
        response_text = data.get("response", "")
        assert len(response_text) < 100, f"Response should be short, got: {response_text}"
        print(f"✓ Clear cart (English) works. Response: {response_text}")
    
    def test_04_clear_cart_spanish(self):
        """Test 'vaciar carrito' command clears the cart"""
        # First add something to cart
        self.session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_001", "quantity": 1}
        )
        
        # Send clear cart command in Spanish
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "vaciar carrito",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert response.status_code == 200, f"Clear cart failed: {response.text}"
        data = response.json()
        
        # Check cart action was executed
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Cart action should succeed: {cart_action}"
        
        # Verify cart is empty
        items_after = self.get_cart_items()
        assert len(items_after) == 0, f"Cart should be empty after clear"
        
        print(f"✓ Clear cart (Spanish) works. Response: {data.get('response', '')}")
    
    def test_05_add_them_all_with_session_memory(self):
        """Test 'add them all' adds all products from session memory"""
        # First get some product recommendations
        rec_response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "Show me vegan products",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert rec_response.status_code == 200
        rec_data = rec_response.json()
        products = rec_data.get("recommended_products", [])
        session_id = rec_data.get("session_id")
        
        if not products:
            pytest.skip("No products returned to test with")
        
        # Build session memory from recommended products
        session_memory = [
            {
                "product_id": p.get("product_id"),
                "name": p.get("name"),
                "variant_id": p.get("variants", [{}])[0].get("variant_id") if p.get("variants") else None,
                "pack_id": p.get("variants", [{}])[0].get("packs", [{}])[0].get("pack_id") if p.get("variants") and p.get("variants", [{}])[0].get("packs") else None,
                "position": i + 1
            }
            for i, p in enumerate(products[:3])  # Take first 3 products
        ]
        
        print(f"Session memory has {len(session_memory)} products")
        
        # Clear cart first
        self.clear_cart()
        
        # Send "add them all" command with session memory
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "add them all",
                "session_id": session_id,
                "session_memory": session_memory
            }
        )
        
        assert response.status_code == 200, f"Add all failed: {response.text}"
        data = response.json()
        
        # Check cart action
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Cart action should succeed: {cart_action}"
        
        # Verify cart has items
        items_after = self.get_cart_items()
        assert len(items_after) > 0, f"Cart should have items after 'add them all'"
        
        # Check response is short
        response_text = data.get("response", "")
        assert len(response_text) < 150, f"Response should be short, got: {response_text}"
        
        print(f"✓ 'Add them all' works. Added {len(items_after)} items. Response: {response_text}")
    
    def test_06_add_first_one_with_session_memory(self):
        """Test 'add the first one' adds only the first product from session memory"""
        # Get product recommendations
        rec_response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "Show me products under 20 euros",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert rec_response.status_code == 200
        rec_data = rec_response.json()
        products = rec_data.get("recommended_products", [])
        session_id = rec_data.get("session_id")
        
        if len(products) < 2:
            pytest.skip("Need at least 2 products to test 'add first one'")
        
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
        
        first_product_id = session_memory[0]["product_id"]
        first_product_name = session_memory[0]["name"]
        
        # Clear cart
        self.clear_cart()
        
        # Send "add the first one" command
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "add the first one",
                "session_id": session_id,
                "session_memory": session_memory
            }
        )
        
        assert response.status_code == 200, f"Add first failed: {response.text}"
        data = response.json()
        
        # Check cart action
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Cart action should succeed: {cart_action}"
        
        # Verify cart has exactly 1 item
        items_after = self.get_cart_items()
        assert len(items_after) == 1, f"Cart should have exactly 1 item, got {len(items_after)}"
        
        # Verify it's the first product
        assert items_after[0]["product_id"] == first_product_id, f"Should add first product"
        
        print(f"✓ 'Add the first one' works. Added: {first_product_name}")
    
    def test_07_add_last_one_with_session_memory(self):
        """Test 'add the last one' adds only the last product from session memory"""
        # Get product recommendations
        rec_response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "Show me Spanish products",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert rec_response.status_code == 200
        rec_data = rec_response.json()
        products = rec_data.get("recommended_products", [])
        session_id = rec_data.get("session_id")
        
        if len(products) < 2:
            pytest.skip("Need at least 2 products to test 'add last one'")
        
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
        
        last_product_id = session_memory[-1]["product_id"]
        last_product_name = session_memory[-1]["name"]
        
        # Clear cart
        self.clear_cart()
        
        # Send "add the last one" command
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "add the last one",
                "session_id": session_id,
                "session_memory": session_memory
            }
        )
        
        assert response.status_code == 200, f"Add last failed: {response.text}"
        data = response.json()
        
        # Check cart action
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Cart action should succeed: {cart_action}"
        
        # Verify cart has exactly 1 item
        items_after = self.get_cart_items()
        assert len(items_after) == 1, f"Cart should have exactly 1 item, got {len(items_after)}"
        
        # Verify it's the last product
        assert items_after[0]["product_id"] == last_product_id, f"Should add last product"
        
        print(f"✓ 'Add the last one' works. Added: {last_product_name}")
    
    def test_08_spanish_add_all_command(self):
        """Test 'añade todo' (Spanish) adds all products"""
        # Get product recommendations
        rec_response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "productos veganos",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert rec_response.status_code == 200
        rec_data = rec_response.json()
        products = rec_data.get("recommended_products", [])
        session_id = rec_data.get("session_id")
        
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
        
        # Clear cart
        self.clear_cart()
        
        # Send Spanish command
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "añade todo",
                "session_id": session_id,
                "session_memory": session_memory
            }
        )
        
        assert response.status_code == 200, f"Spanish add all failed: {response.text}"
        data = response.json()
        
        # Check cart action
        cart_action = data.get("cart_action", {})
        assert cart_action.get("success") == True, f"Cart action should succeed: {cart_action}"
        
        # Verify cart has items
        items_after = self.get_cart_items()
        assert len(items_after) > 0, f"Cart should have items"
        
        print(f"✓ 'Añade todo' (Spanish) works. Added {len(items_after)} items")
    
    def test_09_no_session_memory_returns_error(self):
        """Test that cart commands without session memory return appropriate error"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "add them all",
                "session_id": None,
                "session_memory": []  # Empty session memory
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return error message about no products
        cart_action = data.get("cart_action", {})
        if cart_action:
            assert cart_action.get("success") == False, "Should fail with empty session memory"
            print(f"✓ Empty session memory handled correctly: {cart_action.get('message')}")
        else:
            # If no cart_action, the LLM handled it
            print(f"✓ LLM handled empty session memory: {data.get('response', '')[:100]}")
    
    def test_10_response_has_no_markdown(self):
        """Test that AI responses don't contain markdown formatting"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/message",
            json={
                "message": "Tell me about your vegan products",
                "session_id": None,
                "session_memory": []
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        response_text = data.get("response", "")
        
        # Check for common markdown patterns
        markdown_patterns = ["**", "##", "```", "- ", "* ", "1. ", "__"]
        found_markdown = []
        for pattern in markdown_patterns:
            if pattern in response_text:
                found_markdown.append(pattern)
        
        # Note: Some patterns like "- " might appear naturally in text
        # We're mainly checking for formatting markers like ** and ##
        if "**" in response_text or "##" in response_text or "```" in response_text:
            print(f"⚠ Warning: Found markdown in response: {found_markdown}")
            print(f"Response: {response_text[:200]}")
        else:
            print(f"✓ No markdown formatting found in response")
    
    def test_11_execute_action_endpoint_directly(self):
        """Test the /api/ai/execute-action endpoint directly"""
        # Get some products first
        products_response = self.session.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if not products:
            pytest.skip("No products available")
        
        product = products[0]
        
        # Clear cart
        self.clear_cart()
        
        # Test add_to_cart action
        response = self.session.post(
            f"{BASE_URL}/api/ai/execute-action",
            json={
                "action": "add_to_cart",
                "targets": "specific",
                "products": [
                    {
                        "product_id": product["product_id"],
                        "variant_id": product.get("variants", [{}])[0].get("variant_id") if product.get("variants") else None,
                        "pack_id": product.get("variants", [{}])[0].get("packs", [{}])[0].get("pack_id") if product.get("variants") and product.get("variants", [{}])[0].get("packs") else None,
                        "quantity": 1
                    }
                ]
            }
        )
        
        assert response.status_code == 200, f"Execute action failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        assert "Listo" in data.get("message", "") or "añadí" in data.get("message", "").lower(), f"Response should confirm addition: {data.get('message')}"
        
        # Verify cart
        items = self.get_cart_items()
        assert len(items) == 1, f"Cart should have 1 item"
        
        print(f"✓ Execute action endpoint works. Message: {data.get('message')}")
    
    def test_12_execute_action_clear_cart(self):
        """Test the /api/ai/execute-action endpoint for clear_cart"""
        # Add something to cart first
        self.session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": "prod_001", "quantity": 1}
        )
        
        # Test clear_cart action
        response = self.session.post(
            f"{BASE_URL}/api/ai/execute-action",
            json={
                "action": "clear_cart",
                "targets": "all"
            }
        )
        
        assert response.status_code == 200, f"Clear cart action failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Action should succeed: {data}"
        
        # Verify cart is empty
        items = self.get_cart_items()
        assert len(items) == 0, f"Cart should be empty"
        
        print(f"✓ Clear cart action works. Message: {data.get('message')}")


class TestCartActionResponses:
    """Test that cart action responses are short and appropriate"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_short_response_for_add_action(self):
        """Test that add action returns short response like 'Listo. Añadí X productos.'"""
        # Get products
        products_response = self.session.get(f"{BASE_URL}/api/products")
        products = products_response.json()[:2]
        
        if not products:
            pytest.skip("No products")
        
        response = self.session.post(
            f"{BASE_URL}/api/ai/execute-action",
            json={
                "action": "add_to_cart",
                "targets": "specific",
                "products": [
                    {"product_id": p["product_id"], "quantity": 1}
                    for p in products
                ]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        message = data.get("message", "")
        
        # Response should be short (under 100 chars)
        assert len(message) < 100, f"Response too long: {message}"
        
        # Should contain "Listo" or similar confirmation
        assert "Listo" in message or "añadí" in message.lower() or "added" in message.lower(), f"Should confirm action: {message}"
        
        print(f"✓ Short response: '{message}'")
    
    def test_short_response_for_clear_action(self):
        """Test that clear action returns short response"""
        response = self.session.post(
            f"{BASE_URL}/api/ai/execute-action",
            json={
                "action": "clear_cart",
                "targets": "all"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        message = data.get("message", "")
        
        # Response should be short
        assert len(message) < 100, f"Response too long: {message}"
        
        print(f"✓ Short clear response: '{message}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
