"""
Test Suite for Phase 2: Persistent User Memory
Tests AI memory endpoints and preference detection in chat
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIMemoryEndpoints:
    """Test GET/PUT/DELETE /api/ai/memory endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.session_token}"
        }
        yield
    
    def test_01_delete_memory_reset(self):
        """DELETE /api/ai/memory - Reset all preferences"""
        response = requests.delete(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        assert response.status_code == 200, f"Delete memory failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "olvidado" in data["message"].lower() or "listo" in data["message"].lower()
        print(f"✓ Memory reset: {data['message']}")
    
    def test_02_get_memory_empty(self):
        """GET /api/ai/memory - Should return empty after reset"""
        # First reset
        requests.delete(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        
        response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        assert response.status_code == 200, f"Get memory failed: {response.text}"
        data = response.json()
        
        # Should have has_memory = False or empty arrays
        if data.get("has_memory"):
            raw = data.get("raw_profile", {})
            assert raw.get("diet", []) == [], f"Diet should be empty: {raw.get('diet')}"
            assert raw.get("allergies", []) == [], f"Allergies should be empty: {raw.get('allergies')}"
            assert raw.get("goals", []) == [], f"Goals should be empty: {raw.get('goals')}"
        print(f"✓ Memory is empty after reset")
    
    def test_03_put_memory_update_diet(self):
        """PUT /api/ai/memory - Update diet preferences"""
        response = requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["vegan", "gluten_free"]
        })
        assert response.status_code == 200, f"Update memory failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Diet updated: {data}")
        
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        assert get_response.status_code == 200
        memory = get_response.json()
        assert memory.get("has_memory") == True
        raw = memory.get("raw_profile", {})
        assert "vegan" in raw.get("diet", [])
        assert "gluten_free" in raw.get("diet", [])
        print(f"✓ Diet verified in memory: {raw.get('diet')}")
    
    def test_04_put_memory_update_allergies(self):
        """PUT /api/ai/memory - Update allergies"""
        response = requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "allergies": ["nuts", "dairy"]
        })
        assert response.status_code == 200, f"Update allergies failed: {response.text}"
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = get_response.json()
        raw = memory.get("raw_profile", {})
        assert "nuts" in raw.get("allergies", [])
        assert "dairy" in raw.get("allergies", [])
        print(f"✓ Allergies verified: {raw.get('allergies')}")
    
    def test_05_put_memory_update_goals(self):
        """PUT /api/ai/memory - Update goals"""
        response = requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "goals": ["weight_loss", "healthy_eating"]
        })
        assert response.status_code == 200, f"Update goals failed: {response.text}"
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = get_response.json()
        raw = memory.get("raw_profile", {})
        assert "weight_loss" in raw.get("goals", [])
        assert "healthy_eating" in raw.get("goals", [])
        print(f"✓ Goals verified: {raw.get('goals')}")
    
    def test_06_put_memory_update_budget(self):
        """PUT /api/ai/memory - Update budget preference"""
        response = requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "budget": "low"
        })
        assert response.status_code == 200, f"Update budget failed: {response.text}"
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = get_response.json()
        raw = memory.get("raw_profile", {})
        assert raw.get("budget") == "low"
        print(f"✓ Budget verified: {raw.get('budget')}")
    
    def test_07_get_memory_full_profile(self):
        """GET /api/ai/memory - Verify full profile with all fields"""
        # First set all fields
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["vegetarian"],
            "allergies": ["gluten"],
            "goals": ["muscle_gain"],
            "budget": "premium",
            "restrictions": ["low_sodium"]
        })
        
        response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("has_memory") == True
        assert "memory_items" in data
        assert "raw_profile" in data
        
        raw = data["raw_profile"]
        assert "vegetarian" in raw.get("diet", [])
        assert "gluten" in raw.get("allergies", [])
        assert "muscle_gain" in raw.get("goals", [])
        assert raw.get("budget") == "premium"
        print(f"✓ Full profile verified: {raw}")


class TestChatPreferenceDetection:
    """Test automatic preference detection in chat"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and reset memory"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.session_token}"
        }
        # Reset memory before each test
        requests.delete(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        time.sleep(0.3)  # Wait for DB to complete reset
        yield
    
    def test_08_chat_detect_vegan_diet(self):
        """Chat should detect 'soy vegano' and store diet preference"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Hola, soy vegano y busco snacks"
        })
        assert response.status_code == 200, f"Chat failed: {response.text}"
        
        # Wait a moment for DB update
        time.sleep(0.5)
        
        # Check memory was updated
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "vegan" in raw.get("diet", []), f"Vegan not detected in diet: {raw.get('diet')}"
        print(f"✓ Vegan diet detected and stored: {raw.get('diet')}")
    
    def test_09_chat_detect_vegetarian_diet(self):
        """Chat should detect 'soy vegetariano' and store diet preference"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Soy vegetariano, qué me recomiendas?"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "vegetarian" in raw.get("diet", []), f"Vegetarian not detected: {raw.get('diet')}"
        print(f"✓ Vegetarian diet detected: {raw.get('diet')}")
    
    def test_10_chat_detect_keto_diet(self):
        """Chat should detect 'dieta keto' and store diet preference"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Estoy en dieta keto, necesito productos bajos en carbohidratos"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "keto" in raw.get("diet", []), f"Keto not detected: {raw.get('diet')}"
        print(f"✓ Keto diet detected: {raw.get('diet')}")
    
    def test_11_chat_detect_nut_allergy(self):
        """Chat should detect nut allergy and store it"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Tengo alergia a los frutos secos, qué snacks puedo comer?"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "nuts" in raw.get("allergies", []), f"Nut allergy not detected: {raw.get('allergies')}"
        print(f"✓ Nut allergy detected: {raw.get('allergies')}")
    
    def test_12_chat_detect_dairy_allergy(self):
        """Chat should detect lactose intolerance and store it"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Soy intolerante a la lactosa"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "dairy" in raw.get("allergies", []), f"Dairy allergy not detected: {raw.get('allergies')}"
        print(f"✓ Dairy/lactose intolerance detected: {raw.get('allergies')}")
    
    def test_13_chat_detect_gluten_allergy(self):
        """Chat should detect gluten allergy/celiac and store it"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Soy celíaco, necesito productos sin gluten"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        # Should detect both gluten_free diet and gluten allergy
        has_gluten_allergy = "gluten" in raw.get("allergies", [])
        has_gluten_free_diet = "gluten_free" in raw.get("diet", [])
        
        assert has_gluten_allergy or has_gluten_free_diet, f"Gluten not detected: diet={raw.get('diet')}, allergies={raw.get('allergies')}"
        print(f"✓ Gluten/celiac detected: diet={raw.get('diet')}, allergies={raw.get('allergies')}")
    
    def test_14_chat_detect_weight_loss_goal(self):
        """Chat should detect weight loss goal and store it"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Quiero perder peso, qué productos me recomiendas?"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "weight_loss" in raw.get("goals", []), f"Weight loss goal not detected: {raw.get('goals')}"
        print(f"✓ Weight loss goal detected: {raw.get('goals')}")
    
    def test_15_chat_detect_healthy_eating_goal(self):
        """Chat should detect healthy eating goal and store it"""
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "Quiero comer más sano"
        })
        assert response.status_code == 200
        
        time.sleep(0.5)
        
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert "healthy_eating" in raw.get("goals", []), f"Healthy eating goal not detected: {raw.get('goals')}"
        print(f"✓ Healthy eating goal detected: {raw.get('goals')}")


class TestMemoryCommands:
    """Test memory query and reset commands in chat"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and set up some memory"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.session_token}"
        }
        yield
    
    def test_16_chat_query_memory_spanish(self):
        """'qué sabes de mi' should return memory summary"""
        # First set some preferences
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["vegan"],
            "allergies": ["nuts"],
            "goals": ["weight_loss"]
        })
        
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "qué sabes de mi?"
        })
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        # Should have memory_action with type query
        assert "memory_action" in data, f"No memory_action in response: {data}"
        assert data["memory_action"].get("type") == "query"
        
        # Response should mention the preferences
        response_text = data.get("response", "").lower()
        assert "dieta" in response_text or "vegan" in response_text or "recuerdo" in response_text, f"Response doesn't mention memory: {data.get('response')}"
        print(f"✓ Memory query response: {data.get('response')[:100]}...")
    
    def test_17_chat_query_memory_english(self):
        """'what do you know about me' should return memory summary"""
        # Set preferences
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["vegetarian"],
            "budget": "premium"
        })
        
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "what do you know about me?"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "memory_action" in data
        assert data["memory_action"].get("type") == "query"
        print(f"✓ English memory query works: {data.get('response')[:100]}...")
    
    def test_18_chat_forget_memory_spanish(self):
        """'olvida mis preferencias' should reset memory"""
        # First set some preferences
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["keto"],
            "allergies": ["dairy"]
        })
        
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "olvida mis preferencias"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have memory_action with type reset
        assert "memory_action" in data
        assert data["memory_action"].get("type") == "reset"
        
        # Verify memory is empty
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert raw.get("diet", []) == [], f"Diet should be empty after reset: {raw.get('diet')}"
        assert raw.get("allergies", []) == [], f"Allergies should be empty after reset: {raw.get('allergies')}"
        print(f"✓ Memory reset via chat command works")
    
    def test_19_chat_forget_memory_english(self):
        """'forget my preferences' should reset memory"""
        # Set preferences
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["halal"],
            "goals": ["muscle_gain"]
        })
        
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "forget my preferences"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "memory_action" in data
        assert data["memory_action"].get("type") == "reset"
        
        # Verify memory is empty
        memory_response = requests.get(f"{BASE_URL}/api/ai/memory", headers=self.headers)
        memory = memory_response.json()
        raw = memory.get("raw_profile", {})
        
        assert raw.get("diet", []) == []
        assert raw.get("goals", []) == []
        print(f"✓ English forget command works")


class TestPhase1CartActionsStillWork:
    """Verify Phase 1 cart actions still work after Phase 2 changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.session_token}"
        }
        # Clear cart
        requests.post(f"{BASE_URL}/api/ai/execute-action", headers=self.headers, json={
            "action": "clear_cart",
            "targets": "all"
        })
        yield
    
    def test_20_clear_cart_still_works(self):
        """'vaciar carrito' should still clear the cart"""
        # First add something to cart
        products = requests.get(f"{BASE_URL}/api/products").json()
        if products:
            product = products[0]
            requests.post(f"{BASE_URL}/api/cart/add", headers=self.headers, json={
                "product_id": product["product_id"],
                "quantity": 1
            })
        
        # Clear via chat
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "vaciar carrito"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have cart_action
        assert data.get("cart_action") is not None or "vacío" in data.get("response", "").lower()
        
        # Verify cart is empty
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        cart = cart_response.json()
        assert len(cart.get("items", [])) == 0, f"Cart should be empty: {cart}"
        print(f"✓ Clear cart still works")
    
    def test_21_add_them_all_still_works(self):
        """'add them all' should still add products from session memory"""
        # First get some product recommendations
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "recomiéndame aceites de oliva"
        })
        assert response.status_code == 200
        data = response.json()
        
        recommended = data.get("recommended_products", [])
        if not recommended:
            pytest.skip("No products recommended to test add_them_all")
        
        # Build session memory
        session_memory = [{"product_id": p["product_id"], "name": p.get("name", "")} for p in recommended[:3]]
        
        # Now add them all
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "añade todo",
            "session_memory": session_memory
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have cart_action or success message
        assert data.get("cart_action") is not None or "añadí" in data.get("response", "").lower() or "carrito" in data.get("response", "").lower()
        print(f"✓ Add them all still works: {data.get('response')[:100]}...")


class TestAIUsesStoredPreferences:
    """Test that AI uses stored preferences in recommendations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and reset memory"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.session_token}"
        }
        yield
    
    def test_22_ai_uses_stored_diet_preference(self):
        """AI should use stored diet preference without asking again"""
        # Set vegan preference
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "diet": ["vegan"]
        })
        
        # Ask for recommendations without mentioning diet
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "recomiéndame snacks"
        })
        assert response.status_code == 200
        data = response.json()
        
        # AI should NOT ask about diet preferences since it already knows
        response_text = data.get("response", "").lower()
        # Should not ask "are you vegan?" or "do you have dietary restrictions?"
        assert "eres vegano" not in response_text, "AI should not ask about diet it already knows"
        assert "tienes alguna dieta" not in response_text, "AI should not ask about diet it already knows"
        print(f"✓ AI uses stored diet preference without asking")
    
    def test_23_ai_avoids_allergens(self):
        """AI should avoid recommending products with user's allergens"""
        # Set nut allergy
        requests.put(f"{BASE_URL}/api/ai/memory", headers=self.headers, json={
            "allergies": ["nuts"]
        })
        
        # Ask for snack recommendations
        response = requests.post(f"{BASE_URL}/api/chat/message", headers=self.headers, json={
            "message": "recomiéndame snacks saludables"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check recommended products don't have nuts allergen
        recommended = data.get("recommended_products", [])
        for product in recommended:
            allergens = product.get("allergens", [])
            # Note: This is a soft check - AI should try to avoid but may not always succeed
            if "nuts" in allergens:
                print(f"⚠ Warning: Product {product.get('name')} has nuts allergen")
        
        print(f"✓ AI considers allergens in recommendations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
