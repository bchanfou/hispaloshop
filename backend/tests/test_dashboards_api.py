"""
Dashboard API Tests for Hispaloshop
Tests Admin, Producer, and Customer dashboard endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://auth-rework.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"email": "admin@hispaloshop.com", "password": "admin123"}
PRODUCER_CREDS = {"email": "producer@test.com", "password": "producer123"}
CUSTOMER_CREDS = {"email": "test@example.com", "password": "password123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin session token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["session_token"]


@pytest.fixture(scope="module")
def producer_token():
    """Get producer session token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCER_CREDS)
    assert response.status_code == 200, f"Producer login failed: {response.text}"
    return response.json()["session_token"]


@pytest.fixture(scope="module")
def customer_token():
    """Get customer session token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    assert response.status_code == 200, f"Customer login failed: {response.text}"
    return response.json()["session_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ============================================
# ADMIN DASHBOARD TESTS
# ============================================

class TestAdminDashboard:
    """Admin dashboard endpoint tests"""

    def test_admin_login(self):
        """Test admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@hispaloshop.com"

    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "pending_producers" in data
        assert "total_producers" in data
        assert "pending_products" in data
        assert "total_products" in data
        assert "pending_certificates" in data
        assert "total_orders" in data
        # Verify data types
        assert isinstance(data["total_producers"], int)
        assert isinstance(data["total_products"], int)

    def test_admin_get_producers(self, admin_token):
        """Test admin can get all producers"""
        response = requests.get(f"{BASE_URL}/api/admin/producers", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            producer = data[0]
            assert "user_id" in producer
            assert "email" in producer
            assert "role" in producer
            assert producer["role"] == "producer"

    def test_admin_get_products(self, admin_token):
        """Test admin can get all products"""
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            product = data[0]
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
            assert "approved" in product

    def test_admin_get_certificates(self, admin_token):
        """Test admin can get all certificates"""
        response = requests.get(f"{BASE_URL}/api/admin/certificates", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_admin_get_orders(self, admin_token):
        """Test admin can get all orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_admin_producer_status_update(self, admin_token):
        """Test admin can update producer status"""
        # First get a producer
        response = requests.get(f"{BASE_URL}/api/admin/producers", headers=auth_headers(admin_token))
        producers = response.json()
        if len(producers) > 0:
            # Find a non-approved producer or use the first one
            producer_id = producers[0]["user_id"]
            # Test status update
            response = requests.put(
                f"{BASE_URL}/api/admin/producers/{producer_id}/status?status=approved",
                headers=auth_headers(admin_token)
            )
            assert response.status_code == 200

    def test_admin_product_approve(self, admin_token):
        """Test admin can approve/reject products"""
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers(admin_token))
        products = response.json()
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = requests.put(
                f"{BASE_URL}/api/admin/products/{product_id}/approve?approved=true",
                headers=auth_headers(admin_token)
            )
            assert response.status_code == 200

    def test_admin_unauthorized_access(self, customer_token):
        """Test customer cannot access admin endpoints"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers(customer_token))
        assert response.status_code == 403


# ============================================
# PRODUCER DASHBOARD TESTS
# ============================================

class TestProducerDashboard:
    """Producer dashboard endpoint tests"""

    def test_producer_login(self):
        """Test producer can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "producer"
        assert data["user"]["email"] == "producer@test.com"

    def test_producer_stats(self, producer_token):
        """Test producer stats endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/producer/stats", headers=auth_headers(producer_token))
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data
        assert "approved_products" in data
        assert "pending_products" in data
        assert "total_orders" in data
        assert "account_status" in data

    def test_producer_get_products(self, producer_token):
        """Test producer can get their own products"""
        response = requests.get(f"{BASE_URL}/api/producer/products", headers=auth_headers(producer_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_producer_get_certificates(self, producer_token):
        """Test producer can get their certificates"""
        response = requests.get(f"{BASE_URL}/api/producer/certificates", headers=auth_headers(producer_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_producer_get_orders(self, producer_token):
        """Test producer can get orders containing their products"""
        response = requests.get(f"{BASE_URL}/api/producer/orders", headers=auth_headers(producer_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_producer_get_payments(self, producer_token):
        """Test producer can get payment summary"""
        response = requests.get(f"{BASE_URL}/api/producer/payments", headers=auth_headers(producer_token))
        assert response.status_code == 200
        data = response.json()
        assert "total_sold" in data
        assert "producer_share" in data
        assert "platform_commission" in data
        assert "commission_rate" in data

    def test_producer_create_product(self, producer_token):
        """Test producer can create a new product"""
        product_data = {
            "name": "TEST_New Organic Product",
            "category_id": "cat_snacks",
            "description": "Test product description",
            "price": 15.99,
            "images": ["https://example.com/image.jpg"],
            "country_origin": "Spain",
            "ingredients": ["Ingredient 1", "Ingredient 2"],
            "allergens": [],
            "certifications": ["organic"]
        }
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=auth_headers(producer_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "product_id" in data
        assert data["name"] == "TEST_New Organic Product"
        # Cleanup - delete the test product (admin only)

    def test_producer_unauthorized_admin_access(self, producer_token):
        """Test producer cannot access admin endpoints"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers(producer_token))
        assert response.status_code == 403


# ============================================
# CUSTOMER DASHBOARD TESTS
# ============================================

class TestCustomerDashboard:
    """Customer dashboard endpoint tests"""

    def test_customer_login(self):
        """Test customer can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["user"]["role"] == "customer"
        assert data["user"]["email"] == "test@example.com"

    def test_customer_stats(self, customer_token):
        """Test customer stats endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/customer/stats", headers=auth_headers(customer_token))
        assert response.status_code == 200
        data = response.json()
        assert "total_orders" in data
        assert "pending_orders" in data

    def test_customer_get_orders(self, customer_token):
        """Test customer can get their orders"""
        response = requests.get(f"{BASE_URL}/api/customer/orders", headers=auth_headers(customer_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_customer_get_profile(self, customer_token):
        """Test customer can get their profile"""
        response = requests.get(f"{BASE_URL}/api/customer/profile", headers=auth_headers(customer_token))
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data

    def test_customer_update_profile(self, customer_token):
        """Test customer can update their profile"""
        update_data = {"name": "Test User Updated", "country": "Spain"}
        response = requests.put(
            f"{BASE_URL}/api/customer/profile",
            json=update_data,
            headers=auth_headers(customer_token)
        )
        assert response.status_code == 200
        # Revert the change
        requests.put(
            f"{BASE_URL}/api/customer/profile",
            json={"name": "Test User", "country": "Spain"},
            headers=auth_headers(customer_token)
        )

    def test_customer_get_preferences(self, customer_token):
        """Test customer can get their preferences"""
        response = requests.get(f"{BASE_URL}/api/preferences", headers=auth_headers(customer_token))
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "diet_preferences" in data
        assert "allergens" in data

    def test_customer_update_preferences(self, customer_token):
        """Test customer can update dietary preferences"""
        prefs_data = {
            "diet_preferences": ["Vegan", "Gluten-Free"],
            "allergens": ["Nuts"],
            "goals": "Healthy eating"
        }
        response = requests.post(
            f"{BASE_URL}/api/preferences",
            json=prefs_data,
            headers=auth_headers(customer_token)
        )
        assert response.status_code == 200
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/preferences", headers=auth_headers(customer_token))
        data = response.json()
        assert "Vegan" in data["diet_preferences"]
        assert "Gluten-Free" in data["diet_preferences"]
        assert "Nuts" in data["allergens"]

    def test_customer_unauthorized_admin_access(self, customer_token):
        """Test customer cannot access admin endpoints"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers(customer_token))
        assert response.status_code == 403

    def test_customer_unauthorized_producer_access(self, customer_token):
        """Test customer cannot access producer endpoints"""
        response = requests.get(f"{BASE_URL}/api/producer/stats", headers=auth_headers(customer_token))
        assert response.status_code == 403


# ============================================
# AUTHENTICATION TESTS
# ============================================

class TestAuthentication:
    """Authentication and authorization tests"""

    def test_invalid_login(self):
        """Test login with invalid credentials fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_logout(self, customer_token):
        """Test logout endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers=auth_headers(customer_token)
        )
        assert response.status_code == 200

    def test_unauthenticated_access(self):
        """Test accessing protected endpoints without auth fails"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401

    def test_get_current_user(self, customer_token):
        """Test getting current user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(customer_token))
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
