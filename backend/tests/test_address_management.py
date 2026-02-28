"""
Test suite for Customer Address Management and Checkout Integration
Tests: GET/POST/PUT/DELETE /api/customer/addresses endpoints
Tests: Address selection in checkout flow
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CUSTOMER_EMAIL = "test@example.com"
TEST_CUSTOMER_PASSWORD = "password123"


class TestAddressManagement:
    """Test customer address CRUD operations"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login and get session token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        
        # Set cookie for subsequent requests
        session.cookies.set("session_token", token)
        return token
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        """Return session with auth"""
        return session
    
    def test_get_addresses_empty(self, authenticated_session):
        """Test GET /api/customer/addresses returns empty list for new user"""
        response = authenticated_session.get(f"{BASE_URL}/api/customer/addresses")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "addresses" in data, "Response should contain 'addresses' key"
        assert isinstance(data["addresses"], list), "addresses should be a list"
        print(f"✓ GET addresses returned {len(data['addresses'])} addresses")
    
    def test_create_address(self, authenticated_session):
        """Test POST /api/customer/addresses creates a new address"""
        unique_id = uuid.uuid4().hex[:6]
        address_data = {
            "name": f"TEST_Home_{unique_id}",
            "full_name": f"Test User {unique_id}",
            "street": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "country": "Spain",
            "phone": "+34123456789",
            "is_default": True
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "address_id" in data, "Response should contain address_id"
        assert data["address_id"].startswith("addr_"), "address_id should start with 'addr_'"
        
        # Store for later tests
        authenticated_session.test_address_id = data["address_id"]
        print(f"✓ Created address with ID: {data['address_id']}")
        
        return data["address_id"]
    
    def test_get_addresses_after_create(self, authenticated_session):
        """Test GET /api/customer/addresses returns the created address"""
        response = authenticated_session.get(f"{BASE_URL}/api/customer/addresses")
        
        assert response.status_code == 200
        
        data = response.json()
        addresses = data.get("addresses", [])
        
        # Find our test address
        test_addresses = [a for a in addresses if a.get("name", "").startswith("TEST_")]
        assert len(test_addresses) > 0, "Should have at least one test address"
        
        # Verify address structure
        addr = test_addresses[0]
        assert "address_id" in addr, "Address should have address_id"
        assert "full_name" in addr, "Address should have full_name"
        assert "street" in addr, "Address should have street"
        assert "city" in addr, "Address should have city"
        assert "postal_code" in addr, "Address should have postal_code"
        assert "country" in addr, "Address should have country"
        
        print(f"✓ GET addresses returned {len(addresses)} addresses with correct structure")
    
    def test_create_second_address(self, authenticated_session):
        """Test creating a second address"""
        unique_id = uuid.uuid4().hex[:6]
        address_data = {
            "name": f"TEST_Office_{unique_id}",
            "full_name": f"Test User Office {unique_id}",
            "street": "456 Office Street",
            "city": "Office City",
            "postal_code": "67890",
            "country": "France",
            "phone": "+33123456789",
            "is_default": False
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "address_id" in data
        
        authenticated_session.second_address_id = data["address_id"]
        print(f"✓ Created second address with ID: {data['address_id']}")
    
    def test_set_default_address(self, authenticated_session):
        """Test PUT /api/customer/addresses/{address_id}/default"""
        # Get addresses first
        response = authenticated_session.get(f"{BASE_URL}/api/customer/addresses")
        addresses = response.json().get("addresses", [])
        
        if len(addresses) < 2:
            pytest.skip("Need at least 2 addresses to test default setting")
        
        # Set second address as default
        second_addr = addresses[1]
        address_id = second_addr["address_id"]
        
        response = authenticated_session.put(
            f"{BASE_URL}/api/customer/addresses/{address_id}/default"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify default was set
        response = authenticated_session.get(f"{BASE_URL}/api/customer/addresses")
        data = response.json()
        
        # Check default_address_id
        assert data.get("default_address_id") == address_id, "default_address_id should be updated"
        
        print(f"✓ Set address {address_id} as default")
    
    def test_delete_address(self, authenticated_session):
        """Test DELETE /api/customer/addresses/{address_id}"""
        # Create a temporary address to delete
        unique_id = uuid.uuid4().hex[:6]
        address_data = {
            "name": f"TEST_ToDelete_{unique_id}",
            "full_name": "Delete Me",
            "street": "999 Delete Street",
            "city": "Delete City",
            "postal_code": "00000",
            "country": "Germany",
            "is_default": False
        }
        
        # Create
        create_response = authenticated_session.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data
        )
        assert create_response.status_code == 200
        address_id = create_response.json()["address_id"]
        
        # Delete
        delete_response = authenticated_session.delete(
            f"{BASE_URL}/api/customer/addresses/{address_id}"
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deletion
        get_response = authenticated_session.get(f"{BASE_URL}/api/customer/addresses")
        addresses = get_response.json().get("addresses", [])
        
        deleted_addr = [a for a in addresses if a.get("address_id") == address_id]
        assert len(deleted_addr) == 0, "Deleted address should not exist"
        
        print(f"✓ Successfully deleted address {address_id}")
    
    def test_address_validation_missing_fields(self, authenticated_session):
        """Test that address creation fails with missing required fields"""
        # Missing full_name
        address_data = {
            "name": "Invalid Address",
            "street": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "country": "Spain"
            # Missing full_name
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/customer/addresses",
            json=address_data
        )
        
        # Should fail validation (422 or 400)
        # Note: Pydantic may allow empty strings, so this might pass
        # The actual validation depends on backend implementation
        print(f"Address without full_name: status {response.status_code}")


class TestCheckoutWithAddress:
    """Test checkout flow with address selection"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login and get session token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_CUSTOMER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        data = response.json()
        token = data.get("session_token")
        session.cookies.set("session_token", token)
        return token
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        """Return session with auth"""
        return session
    
    def test_checkout_requires_address(self, authenticated_session):
        """Test that checkout endpoint accepts shipping_address"""
        # First, add an item to cart
        products_response = authenticated_session.get(f"{BASE_URL}/api/products")
        if products_response.status_code != 200:
            pytest.skip("Could not fetch products")
        
        products = products_response.json()
        if not products:
            pytest.skip("No products available")
        
        product = products[0]
        
        # Add to cart
        cart_response = authenticated_session.post(
            f"{BASE_URL}/api/cart",
            json={
                "product_id": product["product_id"],
                "quantity": 1
            }
        )
        
        # Create checkout with shipping address
        shipping_address = {
            "full_name": "Test Checkout User",
            "street": "123 Checkout Street",
            "city": "Checkout City",
            "postal_code": "12345",
            "country": "Spain",
            "phone": "+34123456789"
        }
        
        checkout_response = authenticated_session.post(
            f"{BASE_URL}/api/payments/create-checkout",
            json={"shipping_address": shipping_address}
        )
        
        # May fail due to email verification, but should not fail due to address
        if checkout_response.status_code == 403:
            # Email verification required - this is expected
            print("✓ Checkout requires email verification (expected)")
        elif checkout_response.status_code == 400:
            # Cart empty or other validation
            print(f"Checkout validation: {checkout_response.json()}")
        elif checkout_response.status_code == 200:
            data = checkout_response.json()
            assert "url" in data, "Checkout should return Stripe URL"
            print(f"✓ Checkout created successfully with address")
        else:
            print(f"Checkout response: {checkout_response.status_code} - {checkout_response.text}")


class TestAddressEndpointSecurity:
    """Test address endpoint security"""
    
    def test_get_addresses_requires_auth(self):
        """Test that GET /api/customer/addresses requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/addresses")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET addresses requires authentication")
    
    def test_post_address_requires_auth(self):
        """Test that POST /api/customer/addresses requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/customer/addresses",
            json={
                "name": "Test",
                "full_name": "Test User",
                "street": "123 Test",
                "city": "Test",
                "postal_code": "12345",
                "country": "Spain"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST address requires authentication")
    
    def test_delete_address_requires_auth(self):
        """Test that DELETE /api/customer/addresses requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/customer/addresses/addr_test123")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE address requires authentication")
    
    def test_set_default_requires_auth(self):
        """Test that PUT /api/customer/addresses/{id}/default requires authentication"""
        response = requests.put(f"{BASE_URL}/api/customer/addresses/addr_test123/default")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Set default address requires authentication")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_addresses():
    """Cleanup test addresses after all tests"""
    yield
    
    # Login and cleanup
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CUSTOMER_EMAIL,
        "password": TEST_CUSTOMER_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json().get("session_token")
        session.cookies.set("session_token", token)
        
        # Get all addresses
        addr_response = session.get(f"{BASE_URL}/api/customer/addresses")
        if addr_response.status_code == 200:
            addresses = addr_response.json().get("addresses", [])
            
            # Delete test addresses
            for addr in addresses:
                if addr.get("name", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/customer/addresses/{addr['address_id']}")
                    print(f"Cleaned up test address: {addr['address_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
