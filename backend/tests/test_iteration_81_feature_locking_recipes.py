"""
Iteration 81 - Feature Locking (Seller Plans) and Recipes API Tests

Tests cover:
1. Seller Plans API - /api/sellers/me/plan
2. Recipes CRUD - /api/recipes (GET, POST, GET by ID)
3. Recipe Shopping List - /api/recipes/{recipe_id}/shopping-list

Test accounts:
- producer@test.com / password123 (ELITE plan on trial)
- test@example.com / password123 (customer)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://auth-rework.preview.emergentagent.com')


class TestHealthCheck:
    """Basic health check - must pass first"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


class TestSellerPlansAPI:
    """Test seller subscription/plan endpoints"""
    
    @pytest.fixture(scope="class")
    def producer_session(self):
        """Login as producer and return authenticated session"""
        session = requests.Session()
        
        # Login as producer
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Producer login failed: {login_response.status_code} - {login_response.text}")
        
        print(f"✓ Producer logged in successfully")
        return session
    
    def test_get_public_plans(self):
        """GET /api/sellers/plans - Returns available seller plans (public)"""
        response = requests.get(f"{BASE_URL}/api/sellers/plans")
        assert response.status_code == 200
        data = response.json()
        
        # Verify plans structure
        assert "plans" in data
        plans = data["plans"]
        assert len(plans) >= 3  # FREE, PRO, ELITE
        
        # Check plan keys
        plan_keys = [p["key"] for p in plans]
        assert "FREE" in plan_keys
        assert "PRO" in plan_keys
        assert "ELITE" in plan_keys
        
        # Verify FREE plan has 20% commission
        free_plan = next(p for p in plans if p["key"] == "FREE")
        assert free_plan["commission"] == "20%"
        
        # Verify PRO plan has 18% commission
        pro_plan = next(p for p in plans if p["key"] == "PRO")
        assert pro_plan["commission"] == "18%"
        
        # Verify ELITE plan has 17% commission
        elite_plan = next(p for p in plans if p["key"] == "ELITE")
        assert elite_plan["commission"] == "17%"
        
        print(f"✓ Seller plans: {plan_keys}")
    
    def test_get_my_plan_authenticated(self, producer_session):
        """GET /api/sellers/me/plan - Returns current seller's plan details"""
        response = producer_session.get(f"{BASE_URL}/api/sellers/me/plan")
        assert response.status_code == 200
        data = response.json()
        
        # Verify plan structure
        assert "plan" in data
        assert "commission_rate" in data
        assert "plan_status" in data
        
        # Plan should be FREE, PRO, or ELITE
        assert data["plan"] in ["FREE", "PRO", "ELITE"]
        
        # Commission rate should be a valid decimal
        assert 0.10 <= data["commission_rate"] <= 0.25
        
        print(f"✓ Producer plan: {data['plan']} (commission: {data['commission_rate']*100}%)")
        print(f"  Plan status: {data.get('plan_status', 'N/A')}")
        
        # If trial, check trial_ends_at
        if data.get("plan_status") == "trialing" and data.get("trial_ends_at"):
            print(f"  Trial ends: {data['trial_ends_at']}")
        
    
    def test_get_my_plan_unauthenticated(self):
        """GET /api/sellers/me/plan - Should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/sellers/me/plan")
        assert response.status_code == 401
        print("✓ Plan endpoint requires authentication")


class TestRecipesAPI:
    """Test recipes CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        
        # Login as producer (who can create recipes)
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        print("✓ Authenticated for recipe tests")
        return session
    
    def test_get_recipes_list(self):
        """GET /api/recipes - Returns list of recipes (public)"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200
        data = response.json()
        
        # Should return an array (empty or with recipes)
        assert isinstance(data, list)
        
        print(f"✓ GET /api/recipes returned {len(data)} recipes")
        
        # If recipes exist, verify structure
        if len(data) > 0:
            recipe = data[0]
            assert "recipe_id" in recipe
            assert "title" in recipe
            print(f"  First recipe: {recipe.get('title', 'N/A')}")
        
    
    def test_create_recipe(self, auth_session):
        """POST /api/recipes - Create a new recipe"""
        test_recipe = {
            "title": f"TEST_Recipe_{uuid.uuid4().hex[:6]}",
            "difficulty": "easy",
            "time_minutes": 30,
            "servings": 4,
            "ingredients": [
                {"name": "Aceite de oliva", "quantity": "2", "unit": "tbsp"},
                {"name": "Ajo", "quantity": "3", "unit": "cloves"},
                {"name": "Sal", "quantity": "1", "unit": "tsp"}
            ],
            "steps": [
                "Calentar el aceite en una sarten",
                "Anadir el ajo y dorar ligeramente",
                "Sazonar con sal"
            ],
            "tags": ["test", "quick", "spanish"]
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/recipes",
            json=test_recipe
        )
        
        assert response.status_code in [200, 201], f"Create recipe failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response contains recipe_id
        assert "recipe_id" in data
        assert data["title"] == test_recipe["title"]
        assert data["difficulty"] == "easy"
        assert data["time_minutes"] == 30
        assert data["servings"] == 4
        
        print(f"✓ Created recipe: {data['recipe_id']}")
        
    
    def test_get_recipe_by_id(self, auth_session):
        """GET /api/recipes/{recipe_id} - Get recipe details with enriched ingredients"""
        # First create a recipe to test
        test_recipe = {
            "title": f"TEST_RecipeDetail_{uuid.uuid4().hex[:6]}",
            "difficulty": "medium",
            "time_minutes": 45,
            "servings": 2,
            "ingredients": [
                {"name": "Tomates", "quantity": "4", "unit": "pcs"},
            ],
            "steps": ["Paso 1", "Paso 2"],
            "tags": ["test"]
        }
        
        # Create recipe
        create_response = auth_session.post(f"{BASE_URL}/api/recipes", json=test_recipe)
        assert create_response.status_code in [200, 201]
        recipe_id = create_response.json()["recipe_id"]
        
        # Now get recipe details
        response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["recipe_id"] == recipe_id
        assert data["title"] == test_recipe["title"]
        assert data["difficulty"] == "medium"
        assert "ingredients" in data
        assert "steps" in data
        
        # Ingredients should be enriched (even if no product match)
        ingredients = data["ingredients"]
        assert len(ingredients) > 0
        
        print(f"✓ GET /api/recipes/{recipe_id} returned recipe with {len(ingredients)} ingredients")
        
    
    def test_get_nonexistent_recipe(self):
        """GET /api/recipes/{invalid_id} - Should return 404"""
        response = requests.get(f"{BASE_URL}/api/recipes/recipe_nonexistent123")
        assert response.status_code == 404
        print("✓ Non-existent recipe returns 404")
    
    def test_recipe_search(self):
        """GET /api/recipes?q=test - Search recipes by query"""
        response = requests.get(f"{BASE_URL}/api/recipes?q=TEST_")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Recipe search returned {len(data)} results for 'TEST_'")
    
    def test_recipe_filter_by_difficulty(self):
        """GET /api/recipes?difficulty=easy - Filter by difficulty"""
        response = requests.get(f"{BASE_URL}/api/recipes?difficulty=easy")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # All returned recipes should be easy (if any)
        for recipe in data:
            if recipe.get("difficulty"):
                assert recipe["difficulty"] == "easy"
        
        print(f"✓ Recipe difficulty filter returned {len(data)} easy recipes")
    
    def test_create_recipe_unauthenticated(self):
        """POST /api/recipes - Should require authentication"""
        test_recipe = {
            "title": "Unauthorized Recipe",
            "difficulty": "easy",
            "time_minutes": 10,
            "servings": 1,
            "ingredients": [{"name": "Test", "quantity": "1", "unit": "pcs"}],
            "steps": ["Test step"],
            "tags": []
        }
        
        response = requests.post(f"{BASE_URL}/api/recipes", json=test_recipe)
        assert response.status_code == 401
        print("✓ Recipe creation requires authentication")


class TestRecipeShoppingList:
    """Test recipe shopping list feature"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login as customer for shopping list tests"""
        session = requests.Session()
        
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Customer login failed: {login_response.status_code}")
        
        return session
    
    @pytest.fixture(scope="class")
    def test_recipe_id(self):
        """Create a test recipe for shopping list tests"""
        # Login as producer to create recipe
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "producer@test.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Cannot create test recipe")
        
        test_recipe = {
            "title": f"TEST_ShoppingList_{uuid.uuid4().hex[:6]}",
            "difficulty": "easy",
            "time_minutes": 15,
            "servings": 2,
            "ingredients": [
                {"name": "Olive Oil", "quantity": "100", "unit": "ml"},
            ],
            "steps": ["Mix ingredients"],
            "tags": ["test"]
        }
        
        response = session.post(f"{BASE_URL}/api/recipes", json=test_recipe)
        if response.status_code in [200, 201]:
            return response.json()["recipe_id"]
        pytest.skip("Could not create test recipe")
    
    def test_shopping_list_requires_auth(self, test_recipe_id):
        """POST /api/recipes/{id}/shopping-list - Requires authentication"""
        response = requests.post(f"{BASE_URL}/api/recipes/{test_recipe_id}/shopping-list")
        assert response.status_code == 401
        print("✓ Shopping list requires authentication")
    
    def test_shopping_list_authenticated(self, auth_session, test_recipe_id):
        """POST /api/recipes/{id}/shopping-list - Add ingredients to cart"""
        response = auth_session.post(f"{BASE_URL}/api/recipes/{test_recipe_id}/shopping-list")
        
        # Either 200 success or 404 if no products match ingredients
        assert response.status_code in [200, 400, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Should return added count and total
            print(f"✓ Shopping list created: {data.get('added', 0)} items added")
        else:
            print(f"✓ Shopping list endpoint responded (no matching products): {response.status_code}")


class TestInfluencerTiers:
    """Test influencer tier endpoints (for completeness)"""
    
    def test_get_influencer_tiers(self):
        """GET /api/influencers/tiers - Public tier info"""
        response = requests.get(f"{BASE_URL}/api/influencers/tiers")
        assert response.status_code == 200
        data = response.json()
        
        assert "tiers" in data
        tier_keys = [t["key"] for t in data["tiers"]]
        assert "perseo" in tier_keys
        assert "aquiles" in tier_keys
        assert "hercules" in tier_keys
        assert "apolo" in tier_keys
        assert "zeus" in tier_keys
        
        print(f"✓ Influencer tiers: {tier_keys}")


# Cleanup function to run after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_recipes():
    """Cleanup TEST_ prefixed recipes after tests"""
    yield
    # Note: In production, implement cleanup of TEST_ recipes
    # For now, they accumulate but are easily identifiable


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
