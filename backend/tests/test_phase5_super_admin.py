"""
Phase 5 Tests: Super Admin Role and i18n
Tests for:
- Super Admin endpoints (CRUD for admin accounts)
- Role-based access control
- i18n configuration endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@hispaloshop.com"
SUPER_ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"

def unique_email(prefix="TEST"):
    """Generate unique email for testing"""
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"


class TestSuperAdminEndpoints:
    """Test Super Admin CRUD operations for admin accounts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.super_admin_token = token
        else:
            pytest.skip("Super admin login failed")
        
        yield
        
        # Cleanup: Delete test admins created during tests
        try:
            admins = self.session.get(f"{BASE_URL}/api/super-admin/admins").json()
            for admin in admins:
                if admin.get("email", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/super-admin/admins/{admin['user_id']}")
        except:
            pass
    
    def test_list_admins(self):
        """GET /api/super-admin/admins - List all admin accounts"""
        response = self.session.get(f"{BASE_URL}/api/super-admin/admins")
        
        assert response.status_code == 200
        admins = response.json()
        assert isinstance(admins, list)
        assert len(admins) >= 1  # At least the super admin
        
        # Verify admin structure
        admin = admins[0]
        assert "user_id" in admin
        assert "email" in admin
        assert "name" in admin
        assert "role" in admin
        assert admin["role"] in ["admin", "super_admin"]
        print(f"SUCCESS: Listed {len(admins)} admin(s)")
    
    def test_create_admin(self):
        """POST /api/super-admin/admins - Create new admin account"""
        admin_data = {
            "email": unique_email("TEST_new_admin"),
            "name": "TEST New Admin",
            "password": "testadmin123",
            "role": "admin"
        }
        
        response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == admin_data["email"]
        print(f"SUCCESS: Created admin with user_id: {data['user_id']}")
        
        # Verify admin appears in list
        list_response = self.session.get(f"{BASE_URL}/api/super-admin/admins")
        admins = list_response.json()
        admin_emails = [a["email"].lower() for a in admins]
        assert admin_data["email"].lower() in admin_emails
        print("SUCCESS: New admin appears in admin list")
    
    def test_create_admin_duplicate_email(self):
        """POST /api/super-admin/admins - Reject duplicate email"""
        admin_data = {
            "email": SUPER_ADMIN_EMAIL,  # Already exists
            "name": "Duplicate Admin",
            "password": "testadmin123",
            "role": "admin"
        }
        
        response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower()
        print("SUCCESS: Duplicate email correctly rejected")
    
    def test_create_super_admin(self):
        """POST /api/super-admin/admins - Create super admin account"""
        admin_data = {
            "email": unique_email("TEST_super_admin"),
            "name": "TEST Super Admin",
            "password": "testadmin123",
            "role": "super_admin"
        }
        
        response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"SUCCESS: Created super admin with user_id: {data['user_id']}")
    
    def test_update_admin_status_suspend(self):
        """PUT /api/super-admin/admins/{user_id}/status - Suspend admin"""
        # First create an admin
        admin_data = {
            "email": unique_email("TEST_suspend_admin"),
            "name": "TEST Suspend Admin",
            "password": "testadmin123",
            "role": "admin"
        }
        create_response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        user_id = create_response.json()["user_id"]
        
        # Suspend the admin
        response = self.session.put(
            f"{BASE_URL}/api/super-admin/admins/{user_id}/status",
            json={"status": "suspended"}
        )
        
        assert response.status_code == 200
        assert "suspended" in response.json().get("message", "").lower()
        print(f"SUCCESS: Admin {user_id} suspended")
    
    def test_update_admin_status_reactivate(self):
        """PUT /api/super-admin/admins/{user_id}/status - Reactivate admin"""
        # First create and suspend an admin
        admin_data = {
            "email": unique_email("TEST_reactivate_admin"),
            "name": "TEST Reactivate Admin",
            "password": "testadmin123",
            "role": "admin"
        }
        create_response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        user_id = create_response.json()["user_id"]
        
        # Suspend first
        self.session.put(
            f"{BASE_URL}/api/super-admin/admins/{user_id}/status",
            json={"status": "suspended"}
        )
        
        # Reactivate
        response = self.session.put(
            f"{BASE_URL}/api/super-admin/admins/{user_id}/status",
            json={"status": "active"}
        )
        
        assert response.status_code == 200
        assert "active" in response.json().get("message", "").lower()
        print(f"SUCCESS: Admin {user_id} reactivated")
    
    def test_update_admin_status_invalid(self):
        """PUT /api/super-admin/admins/{user_id}/status - Reject invalid status"""
        # First create an admin
        admin_data = {
            "email": unique_email("TEST_invalid_status_admin"),
            "name": "TEST Invalid Status Admin",
            "password": "testadmin123",
            "role": "admin"
        }
        create_response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        user_id = create_response.json()["user_id"]
        
        # Try invalid status
        response = self.session.put(
            f"{BASE_URL}/api/super-admin/admins/{user_id}/status",
            json={"status": "invalid_status"}
        )
        
        assert response.status_code == 400
        print("SUCCESS: Invalid status correctly rejected")
    
    def test_delete_admin(self):
        """DELETE /api/super-admin/admins/{user_id} - Delete admin account"""
        # First create an admin
        admin_data = {
            "email": unique_email("TEST_delete_admin"),
            "name": "TEST Delete Admin",
            "password": "testadmin123",
            "role": "admin"
        }
        create_response = self.session.post(f"{BASE_URL}/api/super-admin/admins", json=admin_data)
        user_id = create_response.json()["user_id"]
        
        # Delete the admin
        response = self.session.delete(f"{BASE_URL}/api/super-admin/admins/{user_id}")
        
        assert response.status_code == 200
        assert "deleted" in response.json().get("message", "").lower()
        print(f"SUCCESS: Admin {user_id} deleted")
        
        # Verify admin no longer in list
        list_response = self.session.get(f"{BASE_URL}/api/super-admin/admins")
        admins = list_response.json()
        admin_ids = [a["user_id"] for a in admins]
        assert user_id not in admin_ids
        print("SUCCESS: Deleted admin no longer in list")
    
    def test_cannot_delete_self(self):
        """DELETE /api/super-admin/admins/{user_id} - Cannot delete own account"""
        # Get current user's ID
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        my_user_id = me_response.json()["user_id"]
        
        # Try to delete self
        response = self.session.delete(f"{BASE_URL}/api/super-admin/admins/{my_user_id}")
        
        assert response.status_code == 400
        assert "cannot delete your own" in response.json().get("detail", "").lower()
        print("SUCCESS: Cannot delete own account")


class TestSuperAdminAccessControl:
    """Test that non-super-admins cannot access super admin endpoints"""
    
    def test_customer_cannot_access_super_admin_endpoints(self):
        """Customer should get 403 on super admin endpoints"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        
        token = response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access super admin endpoints
        list_response = session.get(f"{BASE_URL}/api/super-admin/admins")
        assert list_response.status_code == 403
        print("SUCCESS: Customer cannot list admins (403)")
        
        create_response = session.post(f"{BASE_URL}/api/super-admin/admins", json={
            "email": "test@test.com",
            "name": "Test",
            "password": "test1234",
            "role": "admin"
        })
        assert create_response.status_code == 403
        print("SUCCESS: Customer cannot create admin (403)")
    
    def test_unauthenticated_cannot_access_super_admin_endpoints(self):
        """Unauthenticated requests should get 401"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try without auth
        response = session.get(f"{BASE_URL}/api/super-admin/admins")
        assert response.status_code == 401
        print("SUCCESS: Unauthenticated request gets 401")


class TestI18nConfiguration:
    """Test i18n configuration endpoints"""
    
    def test_get_locale_config(self):
        """GET /api/config/locale - Get full locale configuration"""
        response = requests.get(f"{BASE_URL}/api/config/locale")
        
        assert response.status_code == 200
        config = response.json()
        
        # Verify structure
        assert "countries" in config
        assert "languages" in config
        assert "currencies" in config
        assert "default_country" in config
        assert "default_language" in config
        assert "default_currency" in config
        
        print(f"SUCCESS: Locale config has {len(config['countries'])} countries, {len(config['languages'])} languages")
    
    def test_get_languages(self):
        """GET /api/config/languages - Get supported languages"""
        response = requests.get(f"{BASE_URL}/api/config/languages")
        
        assert response.status_code == 200
        languages = response.json()
        
        # Verify all 11 languages are present
        expected_languages = ["en", "es", "fr", "de", "pt", "ar", "hi", "zh", "ja", "ko", "ru"]
        for lang in expected_languages:
            assert lang in languages, f"Missing language: {lang}"
        
        print(f"SUCCESS: All {len(expected_languages)} languages present")
    
    def test_get_countries(self):
        """GET /api/config/countries - Get supported countries"""
        response = requests.get(f"{BASE_URL}/api/config/countries")
        
        assert response.status_code == 200
        countries = response.json()
        
        # Verify some key countries
        assert "ES" in countries  # Spain
        assert "US" in countries  # USA
        assert "FR" in countries  # France
        
        # Verify country structure
        spain = countries["ES"]
        assert "name" in spain
        assert "flag" in spain
        assert "currency" in spain
        assert "languages" in spain
        
        print(f"SUCCESS: {len(countries)} countries configured")
    
    def test_get_currencies(self):
        """GET /api/config/currencies - Get supported currencies"""
        response = requests.get(f"{BASE_URL}/api/config/currencies")
        
        assert response.status_code == 200
        currencies = response.json()
        
        # Verify key currencies
        assert "EUR" in currencies
        assert "USD" in currencies
        assert "GBP" in currencies
        
        # Verify currency structure
        eur = currencies["EUR"]
        assert "symbol" in eur
        assert "name" in eur
        
        print(f"SUCCESS: {len(currencies)} currencies configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
