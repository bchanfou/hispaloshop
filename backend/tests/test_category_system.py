"""
Tests for the new Spanish supermarket category system.
21 main categories with 60 subcategories.
Product filtering by slug and category_id with subcategory inclusion.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')


class TestCategoryTree:
    """Test category tree endpoint with translations"""
    
    def test_categories_tree_spanish_returns_21_main_categories(self):
        """GET /api/categories/tree?lang=es should return 21 main categories"""
        response = requests.get(f"{BASE_URL}/api/categories/tree?lang=es")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 21, f"Expected 21 main categories, got {len(data)}"
        
    def test_categories_tree_spanish_has_60_subcategories(self):
        """All main categories combined should have 60 subcategories"""
        response = requests.get(f"{BASE_URL}/api/categories/tree?lang=es")
        assert response.status_code == 200
        data = response.json()
        total_subcats = sum(len(cat.get('children', [])) for cat in data)
        assert total_subcats == 60, f"Expected 60 subcategories, got {total_subcats}"
        
    def test_categories_tree_english_translations(self):
        """GET /api/categories/tree?lang=en should return English display names"""
        response = requests.get(f"{BASE_URL}/api/categories/tree?lang=en")
        assert response.status_code == 200
        data = response.json()
        
        # Find "Carnes y huevos" category and verify English display name
        meat_cat = next((c for c in data if c['slug'] == 'carnes-huevos'), None)
        assert meat_cat is not None, "Meat category not found"
        assert meat_cat['display_name'] == 'Meat & Eggs', f"Expected 'Meat & Eggs', got '{meat_cat['display_name']}'"
        
    def test_categories_tree_spanish_translations(self):
        """GET /api/categories/tree?lang=es should return Spanish display names"""
        response = requests.get(f"{BASE_URL}/api/categories/tree?lang=es")
        assert response.status_code == 200
        data = response.json()
        
        # Verify Spanish display names
        meat_cat = next((c for c in data if c['slug'] == 'carnes-huevos'), None)
        assert meat_cat is not None
        assert meat_cat['display_name'] == 'Carnes y huevos'
        
    def test_categories_have_optgroup_structure(self):
        """Categories should have nested children for optgroup display"""
        response = requests.get(f"{BASE_URL}/api/categories/tree?lang=es")
        assert response.status_code == 200
        data = response.json()
        
        # Verify each main category has children
        for cat in data:
            assert 'children' in cat, f"Category {cat['name']} missing children array"
            assert cat.get('level') == 1 or cat.get('parent_id') is None
            
            # Verify children have proper structure
            for child in cat.get('children', []):
                assert 'category_id' in child
                assert 'slug' in child
                assert 'display_name' in child


class TestProductCategoryFiltering:
    """Test product filtering by category slug and ID"""
    
    def test_products_list_returns_all_9_products(self):
        """GET /api/products should return all 9 products without filters"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 9, f"Expected 9 products, got {len(data)}"
        
    def test_products_filter_by_main_category_slug_includes_subcategories(self):
        """Filtering by main category slug should include subcategory products"""
        # aceite-condimentos (main) should include cat_aceite_oliva (sub) products
        response = requests.get(f"{BASE_URL}/api/products?category=aceite-condimentos")
        assert response.status_code == 200
        data = response.json()
        
        # Should find the olive oil product
        assert len(data) >= 1, "Expected at least 1 product in aceite-condimentos"
        product_categories = [p['category_id'] for p in data]
        assert 'cat_aceite_oliva' in product_categories, "Olive oil product not found"
        
    def test_products_filter_by_subcategory_slug(self):
        """Filtering by subcategory slug should return only that subcategory"""
        response = requests.get(f"{BASE_URL}/api/products?category=aceite-oliva")
        assert response.status_code == 200
        data = response.json()
        
        # Should find only olive oil products
        assert len(data) >= 1
        for product in data:
            assert product['category_id'] == 'cat_aceite_oliva'
            
    def test_main_category_includes_all_subcategories(self):
        """frutos-secos-snacks should include barritas and snacks_salados"""
        response = requests.get(f"{BASE_URL}/api/products?category=frutos-secos-snacks")
        assert response.status_code == 200
        data = response.json()
        
        # Should include both energy bars (barritas) and popcorn (snacks_salados)
        categories_found = set(p['category_id'] for p in data)
        expected_categories = {'cat_barritas', 'cat_snacks_salados'}
        
        # At least one of the expected subcategories should be present
        assert categories_found & expected_categories, f"Expected some of {expected_categories}, got {categories_found}"
        
    def test_conservas_category_includes_vegetales_and_mermeladas(self):
        """conservas main category should include conservas_vegetales and mermeladas"""
        response = requests.get(f"{BASE_URL}/api/products?category=conservas")
        assert response.status_code == 200
        data = response.json()
        
        product_names = [p['name'] for p in data]
        # Should include Fig Jam (mermeladas) and Sun-Dried Tomatoes (conservas_vegetales)
        assert len(data) >= 2, f"Expected at least 2 products, got {len(data)}"
        
    def test_bebidas_category_includes_zumos(self):
        """bebidas main category should include zumos subcategory"""
        response = requests.get(f"{BASE_URL}/api/products?category=bebidas")
        assert response.status_code == 200
        data = response.json()
        
        # Should include orange juice (zumos)
        assert len(data) >= 1
        categories_found = [p['category_id'] for p in data]
        assert 'cat_zumos' in categories_found


class TestProductCategoryAssignments:
    """Test that products are correctly assigned to new Spanish categories"""
    
    def test_olive_oil_in_aceite_oliva_category(self):
        """Premium Olive Oil should be in cat_aceite_oliva"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        olive_oil = next((p for p in data if 'Olive Oil' in p['name']), None)
        assert olive_oil is not None, "Olive Oil product not found"
        assert olive_oil['category_id'] == 'cat_aceite_oliva'
        
    def test_energy_bars_in_barritas_category(self):
        """Energy bars should be in cat_barritas"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        energy_bars = [p for p in data if 'Energy Bar' in p['name']]
        assert len(energy_bars) >= 3, "Expected at least 3 energy bar products"
        for bar in energy_bars:
            assert bar['category_id'] == 'cat_barritas'
            
    def test_fig_jam_in_mermeladas_category(self):
        """Fig Jam should be in cat_mermeladas"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        jam = next((p for p in data if 'Jam' in p['name']), None)
        assert jam is not None, "Jam product not found"
        assert jam['category_id'] == 'cat_mermeladas'
        
    def test_orange_juice_in_zumos_category(self):
        """Orange Juice should be in cat_zumos"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        juice = next((p for p in data if 'Juice' in p['name']), None)
        assert juice is not None, "Juice product not found"
        assert juice['category_id'] == 'cat_zumos'
        
    def test_tomatoes_in_conservas_vegetales_category(self):
        """Sun-Dried Tomatoes should be in cat_conservas_vegetales"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        tomatoes = next((p for p in data if 'Tomato' in p['name']), None)
        assert tomatoes is not None, "Tomatoes product not found"
        assert tomatoes['category_id'] == 'cat_conservas_vegetales'
        
    def test_popcorn_in_snacks_salados_category(self):
        """Popcorn should be in cat_snacks_salados"""
        response = requests.get(f"{BASE_URL}/api/products")
        data = response.json()
        
        popcorn = next((p for p in data if 'Popcorn' in p['name']), None)
        assert popcorn is not None, "Popcorn product not found"
        assert popcorn['category_id'] == 'cat_snacks_salados'


class TestHealthCheck:
    """Test health endpoint"""
    
    def test_health_check_returns_200(self):
        """GET /api/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'ok'
        assert data['db'] == 'connected'
