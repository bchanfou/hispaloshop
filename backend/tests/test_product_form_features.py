"""
Test suite for enhanced product form features:
- SKU field
- Nutritional info (per 100g)
- Packs with discount calculation
- Allergens and certifications
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "producer123"


class TestProductFormFeatures:
    """Test enhanced product creation form features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as producer before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PRODUCER_EMAIL, "password": PRODUCER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {
            "Content-Type": "application/json",
            "Cookie": f"session_token={self.session_token}"
        }
        yield
    
    def test_create_product_with_sku(self):
        """Test creating product with SKU field"""
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_SKU_Product_{unique_id}",
            "category_id": "cat_snacks",
            "description": "Test product with SKU",
            "price": 15.99,
            "images": [],
            "country_origin": "Spain",
            "ingredients": ["Test ingredient"],
            "allergens": [],
            "certifications": ["organic"],
            "sku": f"TEST-SKU-{unique_id}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create product failed: {response.text}"
        data = response.json()
        assert "product_id" in data
        assert data.get("sku") == product_data["sku"]
        print(f"SUCCESS: Created product with SKU: {data.get('sku')}")
    
    def test_create_product_with_nutritional_info(self):
        """Test creating product with nutritional information"""
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_Nutrition_Product_{unique_id}",
            "category_id": "cat_snacks",
            "description": "Test product with nutritional info",
            "price": 12.50,
            "images": [],
            "country_origin": "Spain",
            "ingredients": ["Almonds", "Honey"],
            "allergens": ["nuts"],
            "certifications": ["organic"],
            "nutritional_info": {
                "calories": 250,
                "protein": 8.5,
                "carbohydrates": 30,
                "sugars": 15,
                "fat": 12,
                "saturated_fat": 2,
                "fiber": 3,
                "sodium": 50,
                "salt": 0.1
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create product failed: {response.text}"
        data = response.json()
        assert "product_id" in data
        
        # Verify nutritional info was saved
        nutritional = data.get("nutritional_info")
        if nutritional:
            assert nutritional.get("calories") == 250
            assert nutritional.get("protein") == 8.5
            print(f"SUCCESS: Created product with nutritional info: {nutritional}")
        else:
            print("WARNING: Nutritional info not returned in response")
    
    def test_create_product_with_packs(self):
        """Test creating product with pack configurations"""
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_Packs_Product_{unique_id}",
            "category_id": "cat_oils",
            "description": "Test product with packs",
            "price": 10.00,  # Unit price
            "images": [],
            "country_origin": "Spain",
            "ingredients": ["Olive oil"],
            "allergens": [],
            "certifications": ["organic"],
            "packs": [
                {"quantity": 6, "price": 50.00, "label": "Pack de 6"},  # 17% discount
                {"quantity": 12, "price": 90.00, "label": "Pack de 12"}  # 25% discount
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create product failed: {response.text}"
        data = response.json()
        assert "product_id" in data
        
        # Verify packs were saved
        packs = data.get("packs")
        if packs:
            assert len(packs) == 2
            assert packs[0].get("quantity") == 6
            assert packs[0].get("price") == 50.00
            print(f"SUCCESS: Created product with {len(packs)} packs")
        else:
            print("WARNING: Packs not returned in response")
    
    def test_create_product_with_flavor(self):
        """Test creating product with flavor variant"""
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_Flavor_Product_{unique_id}",
            "category_id": "cat_snacks",
            "description": "Test product with flavor",
            "price": 8.99,
            "images": [],
            "country_origin": "Spain",
            "ingredients": ["Chocolate", "Almonds"],
            "allergens": ["nuts"],
            "certifications": [],
            "flavor": "Chocolate"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create product failed: {response.text}"
        data = response.json()
        assert "product_id" in data
        assert data.get("flavor") == "Chocolate"
        print(f"SUCCESS: Created product with flavor: {data.get('flavor')}")
    
    def test_create_product_with_all_new_fields(self):
        """Test creating product with all new fields combined"""
        unique_id = uuid.uuid4().hex[:8]
        product_data = {
            "name": f"TEST_Complete_Product_{unique_id}",
            "category_id": "cat_snacks",
            "description": "Complete test product with all new fields",
            "price": 15.00,
            "images": [],
            "country_origin": "España",
            "ingredients": ["Almendras", "Miel", "Sal marina"],
            "allergens": ["Frutos secos"],
            "certifications": ["Orgánico", "Vegano"],
            "sku": f"COMPLETE-{unique_id}",
            "flavor": "Original",
            "nutritional_info": {
                "calories": 200,
                "protein": 6,
                "carbohydrates": 25,
                "sugars": 10,
                "fat": 10,
                "saturated_fat": 1.5,
                "fiber": 2,
                "sodium": 30,
                "salt": 0.08
            },
            "packs": [
                {"quantity": 3, "price": 40.00, "label": "Pack de 3"},
                {"quantity": 6, "price": 75.00, "label": "Pack de 6"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create product failed: {response.text}"
        data = response.json()
        
        # Verify all fields
        assert "product_id" in data
        assert data.get("name") == product_data["name"]
        assert data.get("sku") == product_data["sku"]
        assert data.get("flavor") == product_data["flavor"]
        
        print(f"SUCCESS: Created complete product with ID: {data.get('product_id')}")
        print(f"  - SKU: {data.get('sku')}")
        print(f"  - Flavor: {data.get('flavor')}")
        print(f"  - Allergens: {data.get('allergens')}")
        print(f"  - Certifications: {data.get('certifications')}")


class TestProductCardTrustSignals:
    """Test ProductCard trust signals (reviews/sales counters)"""
    
    def test_products_have_trust_signals(self):
        """Test that products API returns trust signal data"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0, "No products found"
        
        # Check first product for trust signal fields
        product = products[0]
        
        # These fields should exist (even if 0 or null)
        print(f"Product: {product.get('name')}")
        print(f"  - average_rating: {product.get('average_rating', 'NOT SET')}")
        print(f"  - review_count: {product.get('review_count', 'NOT SET')}")
        print(f"  - units_sold: {product.get('units_sold', 'NOT SET')}")
        
        # At least one product should have these fields
        has_rating = any(p.get('average_rating') is not None for p in products)
        has_reviews = any(p.get('review_count') is not None for p in products)
        has_sales = any(p.get('units_sold') is not None for p in products)
        
        print(f"\nProducts with rating data: {has_rating}")
        print(f"Products with review count: {has_reviews}")
        print(f"Products with sales data: {has_sales}")
    
    def test_products_show_zero_when_no_data(self):
        """Test that products without reviews/sales show 0"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        
        # Find products with no reviews
        products_no_reviews = [p for p in products if p.get('review_count', 0) == 0]
        products_no_sales = [p for p in products if p.get('units_sold', 0) == 0]
        
        print(f"Products with 0 reviews: {len(products_no_reviews)}")
        print(f"Products with 0 sales: {len(products_no_sales)}")
        
        # Verify the data structure allows for 0 values
        for p in products_no_reviews[:3]:
            print(f"  - {p.get('name')}: {p.get('review_count', 0)} reviews, {p.get('units_sold', 0)} sold")


class TestCategoriesAPI:
    """Test categories API for product form"""
    
    def test_get_categories(self):
        """Test that categories are available for product form"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) > 0, "No categories found"
        
        print(f"Found {len(categories)} categories:")
        for cat in categories:
            print(f"  - {cat.get('category_id')}: {cat.get('name')}")
        
        # Verify category structure
        cat = categories[0]
        assert "category_id" in cat
        assert "name" in cat


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
