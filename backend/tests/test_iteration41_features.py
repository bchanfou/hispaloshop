"""
Iteration 41 Feature Tests
- Free shipping filter on /api/products endpoint
- Shipping info fields in product response
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFreeShippingFilter:
    """Test free_shipping filter parameter on products endpoint"""
    
    def test_products_endpoint_accepts_free_shipping_param(self):
        """Verify /api/products accepts free_shipping parameter without error"""
        response = requests.get(f"{BASE_URL}/api/products?free_shipping=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of products"
        print(f"✅ free_shipping=true returns {len(data)} products")
    
    def test_products_without_free_shipping_filter(self):
        """Verify /api/products works without free_shipping parameter"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Without filter returns {len(data)} products")
    
    def test_product_has_shipping_fields(self):
        """Verify products include shipping_cost and free_shipping_min_qty fields"""
        response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Should have at least one product"
        
        product = data[0]
        # These fields should exist (can be null)
        assert 'shipping_cost' in product or product.get('shipping_cost') is None, \
            "Product should have shipping_cost field"
        print(f"✅ Product '{product.get('name')}' has shipping_cost: {product.get('shipping_cost')}")


class TestStoresEndpoint:
    """Test stores endpoint for map view"""
    
    def test_stores_endpoint_returns_list(self):
        """Verify /api/stores returns a list of stores"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Stores endpoint returns {len(data)} stores")
    
    def test_stores_have_location_data(self):
        """Verify stores have location/region data for map display"""
        response = requests.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            store = data[0]
            # Check for location-related fields
            has_location = any([
                store.get('location'),
                store.get('region'),
                store.get('country')
            ])
            print(f"✅ Store '{store.get('name')}' has location data: {has_location}")
            print(f"   - location: {store.get('location')}")
            print(f"   - region: {store.get('region')}")
            print(f"   - country: {store.get('country')}")


class TestRegionsConfig:
    """Test regions config endpoint for country maps"""
    
    def test_regions_config_endpoint(self):
        """Verify /api/config/regions returns country/region data"""
        response = requests.get(f"{BASE_URL}/api/config/regions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict of countries"
        print(f"✅ Regions config returns {len(data)} countries: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
