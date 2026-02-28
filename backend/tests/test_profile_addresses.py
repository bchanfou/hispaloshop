"""
Test suite for Customer Profile Address Management and Producer Profile features.
Tests:
- Customer addresses CRUD (GET, POST, PUT, DELETE /api/customer/addresses)
- Customer set default address (PUT /api/customer/addresses/{id}/default)
- Producer profile (GET /api/producer/profile)
- Producer addresses (PUT /api/producer/addresses)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "producer123"


class TestCustomerAddressManagement:
    """Test customer address CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        self.customer_token = response.cookies.get('session_token')
        yield
        # Cleanup: Delete test addresses
        self._cleanup_test_addresses()
    
    def _cleanup_test_addresses(self):
        """Remove test addresses created during tests"""
        try:
            response = self.session.get(f"{BASE_URL}/api/customer/addresses")
            if response.status_code == 200:
                addresses = response.json().get('addresses', [])
                for addr in addresses:
                    if addr.get('name', '').startswith('TEST_'):
                        self.session.delete(f"{BASE_URL}/api/customer/addresses/{addr['address_id']}")
        except:
            pass
    
    def test_get_customer_addresses(self):
        """Test GET /api/customer/addresses returns list of addresses"""
        response = self.session.get(f"{BASE_URL}/api/customer/addresses")
        assert response.status_code == 200
        data = response.json()
        assert 'addresses' in data
        assert isinstance(data['addresses'], list)
        print(f"✓ GET /api/customer/addresses - Found {len(data['addresses'])} addresses")
    
    def test_create_customer_address(self):
        """Test POST /api/customer/addresses creates new address"""
        address_data = {
            "name": "TEST_Home",
            "full_name": "Test User",
            "street": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "country": "Spain",
            "phone": "+34 600 000 000",
            "is_default": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/customer/addresses", json=address_data)
        assert response.status_code == 200, f"Create address failed: {response.text}"
        data = response.json()
        assert 'address_id' in data
        
        # Verify address was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/customer/addresses")
        assert get_response.status_code == 200
        addresses = get_response.json().get('addresses', [])
        created_addr = next((a for a in addresses if a.get('name') == 'TEST_Home'), None)
        assert created_addr is not None, "Created address not found in list"
        assert created_addr['full_name'] == address_data['full_name']
        assert created_addr['street'] == address_data['street']
        print(f"✓ POST /api/customer/addresses - Created address: {data['address_id']}")
    
    def test_update_customer_address(self):
        """Test PUT /api/customer/addresses/{id} updates address"""
        # First create an address
        create_response = self.session.post(f"{BASE_URL}/api/customer/addresses", json={
            "name": "TEST_Update",
            "full_name": "Original Name",
            "street": "Original Street",
            "city": "Original City",
            "postal_code": "11111",
            "country": "Spain"
        })
        assert create_response.status_code == 200
        address_id = create_response.json()['address_id']
        
        # Update the address
        update_data = {
            "name": "TEST_Updated",
            "full_name": "Updated Name",
            "street": "Updated Street",
            "city": "Updated City",
            "postal_code": "22222",
            "country": "Portugal"
        }
        update_response = self.session.put(f"{BASE_URL}/api/customer/addresses/{address_id}", json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update by fetching addresses
        get_response = self.session.get(f"{BASE_URL}/api/customer/addresses")
        addresses = get_response.json().get('addresses', [])
        updated_addr = next((a for a in addresses if a.get('address_id') == address_id), None)
        assert updated_addr is not None
        assert updated_addr['full_name'] == "Updated Name"
        assert updated_addr['city'] == "Updated City"
        print(f"✓ PUT /api/customer/addresses/{address_id} - Address updated successfully")
    
    def test_delete_customer_address(self):
        """Test DELETE /api/customer/addresses/{id} removes address"""
        # First create an address
        create_response = self.session.post(f"{BASE_URL}/api/customer/addresses", json={
            "name": "TEST_Delete",
            "full_name": "To Delete",
            "street": "Delete Street",
            "city": "Delete City",
            "postal_code": "99999",
            "country": "Spain"
        })
        assert create_response.status_code == 200
        address_id = create_response.json()['address_id']
        
        # Delete the address
        delete_response = self.session.delete(f"{BASE_URL}/api/customer/addresses/{address_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/customer/addresses")
        addresses = get_response.json().get('addresses', [])
        deleted_addr = next((a for a in addresses if a.get('address_id') == address_id), None)
        assert deleted_addr is None, "Address was not deleted"
        print(f"✓ DELETE /api/customer/addresses/{address_id} - Address deleted successfully")
    
    def test_set_default_address(self):
        """Test PUT /api/customer/addresses/{id}/default sets address as default"""
        # Create two addresses
        addr1_response = self.session.post(f"{BASE_URL}/api/customer/addresses", json={
            "name": "TEST_Default1",
            "full_name": "First Address",
            "street": "First Street",
            "city": "First City",
            "postal_code": "11111",
            "country": "Spain",
            "is_default": True
        })
        assert addr1_response.status_code == 200
        addr1_id = addr1_response.json()['address_id']
        
        addr2_response = self.session.post(f"{BASE_URL}/api/customer/addresses", json={
            "name": "TEST_Default2",
            "full_name": "Second Address",
            "street": "Second Street",
            "city": "Second City",
            "postal_code": "22222",
            "country": "Spain",
            "is_default": False
        })
        assert addr2_response.status_code == 200
        addr2_id = addr2_response.json()['address_id']
        
        # Set second address as default
        default_response = self.session.put(f"{BASE_URL}/api/customer/addresses/{addr2_id}/default")
        assert default_response.status_code == 200, f"Set default failed: {default_response.text}"
        
        # Verify second address is now default
        get_response = self.session.get(f"{BASE_URL}/api/customer/addresses")
        addresses = get_response.json().get('addresses', [])
        
        addr1 = next((a for a in addresses if a.get('address_id') == addr1_id), None)
        addr2 = next((a for a in addresses if a.get('address_id') == addr2_id), None)
        
        assert addr2 is not None and addr2.get('is_default') == True, "Second address should be default"
        assert addr1 is None or addr1.get('is_default') == False, "First address should not be default"
        print(f"✓ PUT /api/customer/addresses/{addr2_id}/default - Default address set successfully")
    
    def test_address_validation_required_fields(self):
        """Test that address creation requires mandatory fields"""
        # Missing required fields
        invalid_data = {
            "name": "TEST_Invalid",
            "full_name": "Test User"
            # Missing: street, city, postal_code, country
        }
        response = self.session.post(f"{BASE_URL}/api/customer/addresses", json=invalid_data)
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
        print("✓ Address validation - Required fields enforced")


class TestCustomerAddressAuth:
    """Test authentication requirements for address endpoints"""
    
    def test_get_addresses_requires_auth(self):
        """Test GET /api/customer/addresses requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/addresses")
        assert response.status_code == 401
        print("✓ GET /api/customer/addresses requires authentication")
    
    def test_create_address_requires_auth(self):
        """Test POST /api/customer/addresses requires authentication"""
        response = requests.post(f"{BASE_URL}/api/customer/addresses", json={
            "name": "Test",
            "full_name": "Test",
            "street": "Test",
            "city": "Test",
            "postal_code": "12345",
            "country": "Spain"
        })
        assert response.status_code == 401
        print("✓ POST /api/customer/addresses requires authentication")
    
    def test_delete_address_requires_auth(self):
        """Test DELETE /api/customer/addresses/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/customer/addresses/addr_test123")
        assert response.status_code == 401
        print("✓ DELETE /api/customer/addresses requires authentication")
    
    def test_set_default_requires_auth(self):
        """Test PUT /api/customer/addresses/{id}/default requires authentication"""
        response = requests.put(f"{BASE_URL}/api/customer/addresses/addr_test123/default")
        assert response.status_code == 401
        print("✓ PUT /api/customer/addresses/{id}/default requires authentication")


class TestProducerProfile:
    """Test producer profile and address management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as producer before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PRODUCER_EMAIL,
            "password": PRODUCER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Producer login failed: {response.text}")
        yield
    
    def test_get_producer_profile(self):
        """Test GET /api/producer/profile returns producer data"""
        response = self.session.get(f"{BASE_URL}/api/producer/profile")
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert 'email' in data or 'user_id' in data
        print(f"✓ GET /api/producer/profile - Profile retrieved")
        print(f"  Company: {data.get('company_name', 'N/A')}")
        print(f"  Contact: {data.get('contact_person', 'N/A')}")
    
    def test_update_producer_addresses(self):
        """Test PUT /api/producer/addresses updates office and warehouse addresses"""
        address_data = {
            "office_address": {
                "full_name": "Office Contact",
                "street": "123 Office Street",
                "city": "Madrid",
                "postal_code": "28001",
                "country": "Spain",
                "phone": "+34 600 111 111"
            },
            "warehouse_address": {
                "full_name": "Warehouse Manager",
                "street": "456 Warehouse Ave",
                "city": "Barcelona",
                "postal_code": "08001",
                "country": "Spain",
                "phone": "+34 600 222 222"
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/producer/addresses", json=address_data)
        assert response.status_code == 200, f"Update addresses failed: {response.text}"
        
        # Verify addresses were saved by fetching profile
        profile_response = self.session.get(f"{BASE_URL}/api/producer/profile")
        assert profile_response.status_code == 200
        profile = profile_response.json()
        
        if profile.get('office_address'):
            assert profile['office_address']['city'] == "Madrid"
            print("✓ Office address saved correctly")
        
        if profile.get('warehouse_address'):
            assert profile['warehouse_address']['city'] == "Barcelona"
            print("✓ Warehouse address saved correctly")
        
        print("✓ PUT /api/producer/addresses - Addresses updated successfully")
    
    def test_update_only_office_address(self):
        """Test updating only office address without warehouse"""
        address_data = {
            "office_address": {
                "full_name": "New Office Contact",
                "street": "789 New Office St",
                "city": "Valencia",
                "postal_code": "46001",
                "country": "Spain"
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/producer/addresses", json=address_data)
        assert response.status_code == 200
        print("✓ PUT /api/producer/addresses - Office only update successful")
    
    def test_update_only_warehouse_address(self):
        """Test updating only warehouse address without office"""
        address_data = {
            "warehouse_address": {
                "full_name": "New Warehouse Contact",
                "street": "321 New Warehouse Rd",
                "city": "Seville",
                "postal_code": "41001",
                "country": "Spain"
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/producer/addresses", json=address_data)
        assert response.status_code == 200
        print("✓ PUT /api/producer/addresses - Warehouse only update successful")


class TestProducerProfileAuth:
    """Test authentication requirements for producer endpoints"""
    
    def test_get_profile_requires_auth(self):
        """Test GET /api/producer/profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/producer/profile")
        assert response.status_code == 401
        print("✓ GET /api/producer/profile requires authentication")
    
    def test_update_addresses_requires_auth(self):
        """Test PUT /api/producer/addresses requires authentication"""
        response = requests.put(f"{BASE_URL}/api/producer/addresses", json={
            "office_address": {"street": "Test"}
        })
        assert response.status_code == 401
        print("✓ PUT /api/producer/addresses requires authentication")
    
    def test_customer_cannot_access_producer_profile(self):
        """Test that customer role cannot access producer endpoints"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Try to access producer profile
        response = session.get(f"{BASE_URL}/api/producer/profile")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Customer cannot access producer profile (role check working)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
