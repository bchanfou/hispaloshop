"""
Test cases for:
1. Producer image upload functionality
2. Product variants/flavors endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductVariantsEndpoint:
    """Test the /api/products/{product_id}/variants endpoint"""
    
    def test_variants_endpoint_returns_flavors(self):
        """Test that variants endpoint returns all flavor variants for a product"""
        # Product with flavor_group_id: prod_98cba8b51e57 (Chocolate flavor)
        product_id = "prod_98cba8b51e57"
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/variants")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        variants = response.json()
        assert isinstance(variants, list), "Response should be a list"
        assert len(variants) == 3, f"Expected 3 flavor variants, got {len(variants)}"
        
        # Verify all expected flavors are present
        flavors = [v.get('flavor') for v in variants]
        assert 'Chocolate' in flavors, "Chocolate flavor should be present"
        assert 'Vanilla' in flavors, "Vanilla flavor should be present"
        assert 'Strawberry' in flavors, "Strawberry flavor should be present"
        
        print(f"SUCCESS: Found {len(variants)} flavor variants: {flavors}")
    
    def test_variants_include_packs(self):
        """Test that variants endpoint returns pack information"""
        product_id = "prod_98cba8b51e57"
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/variants")
        assert response.status_code == 200
        
        variants = response.json()
        
        # Each variant should have packs
        for variant in variants:
            assert 'packs' in variant, f"Variant {variant.get('product_id')} should have packs"
            packs = variant['packs']
            assert len(packs) >= 2, f"Expected at least 2 packs, got {len(packs)}"
            
            # Verify pack structure
            for pack in packs:
                assert 'quantity' in pack, "Pack should have quantity"
                assert 'price' in pack, "Pack should have price"
        
        print("SUCCESS: All variants have packs with correct structure")
    
    def test_variants_include_required_fields(self):
        """Test that variants endpoint returns all required fields"""
        product_id = "prod_98cba8b51e57"
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/variants")
        assert response.status_code == 200
        
        variants = response.json()
        required_fields = ['product_id', 'name', 'flavor', 'price', 'images', 'packs']
        
        for variant in variants:
            for field in required_fields:
                assert field in variant, f"Variant missing required field: {field}"
        
        print("SUCCESS: All variants have required fields")
    
    def test_product_without_variants(self):
        """Test that products without flavor_group_id return results (legacy behavior)"""
        # Use a product that doesn't have flavor variants
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        # Find a product without flavor_group_id
        for product in products:
            if not product.get('flavor_group_id') and not product.get('parent_product_id'):
                product_id = product['product_id']
                
                variants_response = requests.get(f"{BASE_URL}/api/products/{product_id}/variants")
                # Should return 200 - legacy system may return multiple products
                assert variants_response.status_code == 200
                variants = variants_response.json()
                # Just verify it returns a list (legacy behavior returns all approved products)
                assert isinstance(variants, list), "Should return a list"
                print(f"SUCCESS: Product {product_id} variants endpoint returned {len(variants)} items")
                return
        
        print("SKIP: No product without flavor_group_id found")


class TestImageUploadEndpoint:
    """Test the image upload endpoint"""
    
    def test_upload_endpoint_exists(self):
        """Test that the upload endpoint exists"""
        # This is a POST endpoint that requires authentication
        # We just verify it returns 401 (unauthorized) not 404 (not found)
        response = requests.post(f"{BASE_URL}/api/upload/product-image")
        
        # Should return 401 (unauthorized) or 422 (validation error), not 404
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print(f"SUCCESS: Upload endpoint exists (returned {response.status_code})")


class TestProductDetailEndpoint:
    """Test the product detail endpoint"""
    
    def test_product_detail_returns_packs(self):
        """Test that product detail returns packs configuration"""
        product_id = "prod_98cba8b51e57"
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        
        product = response.json()
        
        # Product should have packs
        assert 'packs' in product, "Product should have packs field"
        packs = product['packs']
        assert len(packs) >= 2, f"Expected at least 2 packs, got {len(packs)}"
        
        # Verify pack structure
        for pack in packs:
            assert 'quantity' in pack, "Pack should have quantity"
            assert 'price' in pack, "Pack should have price"
            if 'discount_percentage' in pack:
                assert isinstance(pack['discount_percentage'], (int, float)), "Discount should be numeric"
        
        print(f"SUCCESS: Product has {len(packs)} packs configured")
    
    def test_product_detail_returns_flavor(self):
        """Test that product detail returns flavor field"""
        product_id = "prod_98cba8b51e57"
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        
        product = response.json()
        
        # Product should have flavor
        assert 'flavor' in product, "Product should have flavor field"
        assert product['flavor'] == 'Chocolate', f"Expected 'Chocolate', got '{product['flavor']}'"
        
        print(f"SUCCESS: Product has flavor: {product['flavor']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
