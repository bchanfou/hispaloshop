"""
Test Iteration 84 - Stores List Page Region Zoom Filter Feature

Tests:
- Backend /api/config/regions endpoint returns 16 countries
- Backend /api/stores filtering by country and region
- Store data validation (country and region fields exist)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestConfigRegions:
    """Test /api/config/regions endpoint for region data"""
    
    def test_regions_endpoint_returns_16_countries(self):
        """Verify /api/config/regions returns 16 countries"""
        response = requests.get(f"{BASE_URL}/api/config/regions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) == 16, f"Expected 16 countries, got {len(data)}"
        print(f"✓ Regions endpoint returns {len(data)} countries")
    
    def test_regions_spain_has_regions(self):
        """Verify Spain (ES) has administrative regions"""
        response = requests.get(f"{BASE_URL}/api/config/regions")
        assert response.status_code == 200
        
        data = response.json()
        assert "ES" in data
        spain = data["ES"]
        assert "name" in spain
        assert "regions" in spain
        assert len(spain["regions"]) == 19  # 17 autonomous communities + Ceuta + Melilla
        
        # Check Andalucía and Cataluña exist
        region_codes = [r["code"] for r in spain["regions"]]
        assert "AN" in region_codes, "Andalucía (AN) should exist"
        assert "CT" in region_codes, "Cataluña (CT) should exist"
        print(f"✓ Spain has {len(spain['regions'])} regions including AN and CT")
    
    def test_regions_have_correct_structure(self):
        """Verify each country has name and regions array"""
        response = requests.get(f"{BASE_URL}/api/config/regions")
        assert response.status_code == 200
        
        data = response.json()
        for code, country in data.items():
            assert "name" in country, f"Country {code} missing 'name'"
            assert "regions" in country, f"Country {code} missing 'regions'"
            assert isinstance(country["regions"], list)
            for region in country["regions"]:
                assert "code" in region, f"Region in {code} missing 'code'"
                assert "name" in region, f"Region in {code} missing 'name'"
        print(f"✓ All {len(data)} countries have correct structure")


class TestStoresFiltering:
    """Test /api/stores endpoint with country and region filters"""
    
    def test_stores_returns_all_stores(self):
        """GET /api/stores returns all stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        
        stores = response.json()
        assert isinstance(stores, list)
        assert len(stores) >= 1, "Expected at least 1 store"
        print(f"✓ GET /api/stores returns {len(stores)} stores")
    
    def test_stores_filter_by_country_spain(self):
        """GET /api/stores?country=ES returns Spanish stores"""
        response = requests.get(f"{BASE_URL}/api/stores?country=ES")
        assert response.status_code == 200
        
        stores = response.json()
        assert isinstance(stores, list)
        assert len(stores) == 3, f"Expected 3 Spanish stores, got {len(stores)}"
        
        # Verify all stores have country=ES
        for store in stores:
            assert store.get("country") == "ES", f"Store {store.get('name')} has wrong country"
        print(f"✓ GET /api/stores?country=ES returns {len(stores)} stores")
    
    def test_stores_filter_by_country_and_region_andalucia(self):
        """GET /api/stores?country=ES&region=AN returns Andalucía stores"""
        response = requests.get(f"{BASE_URL}/api/stores?country=ES&region=AN")
        assert response.status_code == 200
        
        stores = response.json()
        assert isinstance(stores, list)
        assert len(stores) == 1, f"Expected 1 Andalucía store, got {len(stores)}"
        
        store = stores[0]
        assert store.get("name") == "Artisan Foods Co"
        assert store.get("region") == "AN"
        print(f"✓ GET /api/stores?country=ES&region=AN returns 1 store: {store.get('name')}")
    
    def test_stores_filter_by_country_and_region_cataluna(self):
        """GET /api/stores?country=ES&region=CT returns Cataluña stores"""
        response = requests.get(f"{BASE_URL}/api/stores?country=ES&region=CT")
        assert response.status_code == 200
        
        stores = response.json()
        assert isinstance(stores, list)
        assert len(stores) == 2, f"Expected 2 Cataluña stores, got {len(stores)}"
        
        for store in stores:
            assert store.get("region") == "CT", f"Store {store.get('name')} has wrong region"
        print(f"✓ GET /api/stores?country=ES&region=CT returns {len(stores)} stores")
    
    def test_stores_have_country_and_region_fields(self):
        """Verify stores have country and region fields"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        
        stores = response.json()
        for store in stores:
            assert "country" in store, f"Store {store.get('name')} missing 'country' field"
            assert "region" in store, f"Store {store.get('name')} missing 'region' field"
        print(f"✓ All {len(stores)} stores have country and region fields")
    
    def test_stores_filter_empty_result(self):
        """GET /api/stores with non-existent country returns empty list"""
        response = requests.get(f"{BASE_URL}/api/stores?country=XX")
        assert response.status_code == 200
        
        stores = response.json()
        assert isinstance(stores, list)
        assert len(stores) == 0, "Expected empty list for non-existent country"
        print(f"✓ GET /api/stores?country=XX returns empty list")


class TestStoreDetail:
    """Test individual store endpoints"""
    
    def test_get_store_by_slug(self):
        """GET /api/store/{slug} returns store details"""
        response = requests.get(f"{BASE_URL}/api/store/artisan-foods-co")
        assert response.status_code == 200
        
        store = response.json()
        assert store.get("name") == "Artisan Foods Co"
        assert store.get("country") == "ES"
        assert store.get("region") == "AN"
        assert "coordinates" in store
        print(f"✓ GET /api/store/artisan-foods-co returns store with region data")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
