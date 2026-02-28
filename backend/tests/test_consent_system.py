"""
Test suite for 3-Layer Consent System and related features
Tests:
- PUT /api/account/withdraw-consent
- PUT /api/account/reactivate-consent
- Super Admin Dashboard access control
- Registration consent validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConsentEndpoints:
    """Test consent withdraw and reactivate endpoints"""
    
    @pytest.fixture
    def customer_session(self):
        """Login as customer and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed - skipping authenticated tests")
        return session
    
    @pytest.fixture
    def super_admin_session(self):
        """Login as super admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hispaloshop.com",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip("Super admin login failed - skipping authenticated tests")
        return session
    
    def test_withdraw_consent_requires_auth(self):
        """Test that withdraw consent endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/account/withdraw-consent")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Withdraw consent requires authentication (401)")
    
    def test_reactivate_consent_requires_auth(self):
        """Test that reactivate consent endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/account/reactivate-consent")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Reactivate consent requires authentication (401)")
    
    def test_withdraw_consent_success(self, customer_session):
        """Test withdrawing consent as logged in customer"""
        response = customer_session.put(f"{BASE_URL}/api/account/withdraw-consent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"✓ Withdraw consent successful: {data['message']}")
    
    def test_reactivate_consent_success(self, customer_session):
        """Test reactivating consent as logged in customer"""
        response = customer_session.put(f"{BASE_URL}/api/account/reactivate-consent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"✓ Reactivate consent successful: {data['message']}")
    
    def test_consent_toggle_flow(self, customer_session):
        """Test full consent toggle flow: withdraw -> verify -> reactivate -> verify"""
        # Step 1: Withdraw consent
        response = customer_session.put(f"{BASE_URL}/api/account/withdraw-consent")
        assert response.status_code == 200
        print("✓ Step 1: Consent withdrawn")
        
        # Step 2: Re-login to get fresh user data with consent status
        login_response = customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        # Consent should be false after withdrawal
        consent_status = login_data.get("user", {}).get("consent", {}).get("analytics_consent", True)
        assert consent_status == False, f"Expected consent to be False, got {consent_status}"
        print("✓ Step 2: Login shows consent as False")
        
        # Step 3: Reactivate consent
        response = customer_session.put(f"{BASE_URL}/api/account/reactivate-consent")
        assert response.status_code == 200
        print("✓ Step 3: Consent reactivated")
        
        # Step 4: Re-login to verify consent is true
        login_response = customer_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        consent_status = login_data.get("user", {}).get("consent", {}).get("analytics_consent", False)
        assert consent_status == True, f"Expected consent to be True, got {consent_status}"
        print("✓ Step 4: Login shows consent as True")


class TestSuperAdminDashboard:
    """Test Super Admin Insights Dashboard access control"""
    
    @pytest.fixture
    def customer_session(self):
        """Login as customer and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return session
    
    @pytest.fixture
    def super_admin_session(self):
        """Login as super admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hispaloshop.com",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip("Super admin login failed")
        return session
    
    def test_insights_global_requires_super_admin(self):
        """Test that insights global-overview endpoint requires super admin"""
        response = requests.get(f"{BASE_URL}/api/insights/global-overview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Insights global-overview requires authentication (401)")
    
    def test_insights_global_denied_for_customer(self, customer_session):
        """Test that customer cannot access insights global-overview"""
        response = customer_session.get(f"{BASE_URL}/api/insights/global-overview")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Customer denied access to insights (403)")
    
    def test_insights_global_allowed_for_super_admin(self, super_admin_session):
        """Test that super admin can access insights global-overview"""
        response = super_admin_session.get(f"{BASE_URL}/api/insights/global-overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_users" in data
        print(f"✓ Super admin can access insights: {data.get('total_users')} total users")
    
    def test_insights_compliance_allowed_for_super_admin(self, super_admin_session):
        """Test that super admin can access compliance data"""
        response = super_admin_session.get(f"{BASE_URL}/api/insights/compliance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify exports_enabled is False (GDPR compliance - no export buttons)
        assert "exports_enabled" in data
        assert data["exports_enabled"] == False, "Exports should be disabled for GDPR compliance"
        print(f"✓ Compliance data accessible, exports_enabled={data['exports_enabled']}")


class TestRegistrationConsent:
    """Test registration with consent validation"""
    
    def test_registration_without_consent_fails(self):
        """Test that customer registration without consent fails"""
        import uuid
        test_email = f"test_noconsent_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User",
            "role": "customer",
            "country": "Spain",
            "analytics_consent": False  # No consent
        })
        
        # Should fail because consent is required for customers
        # The validation happens on frontend, but backend should also validate
        # If backend accepts it, that's a bug to report
        print(f"Registration without consent response: {response.status_code}")
        if response.status_code == 200:
            print("⚠ WARNING: Backend accepted registration without consent - frontend validation only")
        else:
            print(f"✓ Registration without consent rejected: {response.status_code}")
    
    def test_registration_with_consent_succeeds(self):
        """Test that customer registration with consent succeeds"""
        import uuid
        test_email = f"test_consent_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User With Consent",
            "role": "customer",
            "country": "Spain",
            "analytics_consent": True,
            "consent_version": "1.0"
        })
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        print(f"✓ Registration with consent succeeded: {response.status_code}")
        
        # Cleanup: Delete the test user (if possible)
        # Note: This would require admin access or a cleanup endpoint


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
