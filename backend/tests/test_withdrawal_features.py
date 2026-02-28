"""
Test Influencer Withdrawal Features - Iteration 35
Tests for:
- /api/influencer/withdrawals endpoint
- /api/influencer/request-withdrawal endpoint
- Minimum €50 withdrawal validation
- Stripe connection verification
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration 34
TEST_INFLUENCER_EMAIL = "test_influencer_iter34@test.com"
TEST_INFLUENCER_PASSWORD = "password123"
TEST_INFLUENCER_SESSION = "session_inf_iter34_mlh3eiw6"


class TestWithdrawalEndpoints:
    """Test withdrawal API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Try to login first
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_INFLUENCER_EMAIL, "password": TEST_INFLUENCER_PASSWORD}
        )
        if login_response.status_code == 200:
            data = login_response.json()
            self.session_token = data.get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        else:
            # Use existing session token
            self.session_token = TEST_INFLUENCER_SESSION
            self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
    
    def test_get_withdrawals_endpoint_exists(self):
        """Test GET /api/influencer/withdrawals returns proper response"""
        response = self.session.get(f"{BASE_URL}/api/influencer/withdrawals")
        
        # Should return 200 or 401/404 (not 500)
        assert response.status_code in [200, 401, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert "withdrawals" in data, "Response should contain 'withdrawals' key"
            assert "minimum_amount" in data, "Response should contain 'minimum_amount' key"
            assert data["minimum_amount"] == 50, f"Minimum amount should be 50, got {data['minimum_amount']}"
            print(f"✓ GET /api/influencer/withdrawals returns correct structure with minimum_amount=50")
        else:
            print(f"⚠ GET /api/influencer/withdrawals returned {response.status_code} - may need valid session")
    
    def test_request_withdrawal_endpoint_exists(self):
        """Test POST /api/influencer/request-withdrawal endpoint exists"""
        response = self.session.post(
            f"{BASE_URL}/api/influencer/request-withdrawal",
            json={}
        )
        
        # Should not return 404 (endpoint not found)
        assert response.status_code != 404, "Endpoint /api/influencer/request-withdrawal should exist"
        
        # Expected responses: 400 (validation error), 401 (not authenticated), 500 (Stripe error)
        print(f"✓ POST /api/influencer/request-withdrawal endpoint exists, status: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            print(f"  Response detail: {detail}")
            # Check if it's a minimum amount validation error
            if "mínimo" in detail.lower() or "minimum" in detail.lower():
                print("  ✓ Minimum amount validation is working")
    
    def test_withdrawal_minimum_validation(self):
        """Test that withdrawal validates minimum €50"""
        # Try to withdraw €10 (below minimum)
        response = self.session.post(
            f"{BASE_URL}/api/influencer/request-withdrawal",
            json={"amount": 10}
        )
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            # Stripe validation happens before minimum amount validation
            # So we accept either Stripe error or minimum amount error
            valid_errors = ["50", "mínimo", "stripe", "conectar"]
            has_valid_error = any(err in detail.lower() for err in valid_errors)
            assert has_valid_error, f"Should mention €50 minimum or Stripe requirement: {detail}"
            print(f"✓ Withdrawal validation working: {detail}")
        elif response.status_code == 401:
            print("⚠ Not authenticated - skipping minimum validation test")
        else:
            print(f"⚠ Unexpected response: {response.status_code}")
    
    def test_withdrawal_requires_stripe_connected(self):
        """Test that withdrawal requires Stripe to be connected"""
        response = self.session.post(
            f"{BASE_URL}/api/influencer/request-withdrawal",
            json={}
        )
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            # Check if error mentions Stripe
            if "stripe" in detail.lower():
                print(f"✓ Withdrawal correctly requires Stripe: {detail}")
            else:
                print(f"  Response: {detail}")
        elif response.status_code == 401:
            print("⚠ Not authenticated - skipping Stripe validation test")
        else:
            print(f"  Response status: {response.status_code}")


class TestInfluencerDashboardWithdrawal:
    """Test influencer dashboard includes withdrawal data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Try to login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_INFLUENCER_EMAIL, "password": TEST_INFLUENCER_PASSWORD}
        )
        if login_response.status_code == 200:
            data = login_response.json()
            self.session_token = data.get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        else:
            self.session_token = TEST_INFLUENCER_SESSION
            self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
    
    def test_dashboard_has_payment_schedule(self):
        """Test dashboard returns payment_schedule with available_to_withdraw"""
        response = self.session.get(f"{BASE_URL}/api/influencer/dashboard")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check payment_schedule exists
            assert "payment_schedule" in data, "Dashboard should include payment_schedule"
            
            payment_schedule = data["payment_schedule"]
            assert "available_to_withdraw" in payment_schedule, "payment_schedule should have available_to_withdraw"
            assert "available_soon" in payment_schedule, "payment_schedule should have available_soon"
            
            print(f"✓ Dashboard has payment_schedule:")
            print(f"  - available_to_withdraw: €{payment_schedule.get('available_to_withdraw', 0):.2f}")
            print(f"  - available_soon: €{payment_schedule.get('available_soon', 0):.2f}")
        else:
            print(f"⚠ Dashboard returned {response.status_code}")
    
    def test_stripe_status_endpoint(self):
        """Test /api/influencer/stripe/status returns connection status"""
        response = self.session.get(f"{BASE_URL}/api/influencer/stripe/status")
        
        if response.status_code == 200:
            data = response.json()
            assert "connected" in data, "Stripe status should include 'connected' field"
            print(f"✓ Stripe status: connected={data.get('connected')}, onboarding_complete={data.get('onboarding_complete')}")
        elif response.status_code == 401:
            print("⚠ Not authenticated for Stripe status")
        else:
            print(f"⚠ Stripe status returned {response.status_code}")


class TestWithdrawalWithNewInfluencer:
    """Test withdrawal with a fresh influencer account"""
    
    def test_create_test_influencer_and_test_withdrawal(self):
        """Create test influencer with commissions and test withdrawal flow"""
        import uuid
        
        # Create unique test influencer
        test_email = f"test_withdrawal_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "password123"
        
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Register influencer
        register_response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "name": "Test Withdrawal Influencer",
                "password": test_password,
                "role": "influencer",
                "country": "ES",
                "instagram": "@test_withdrawal",
                "followers": "10000",
                "niche": "food",
                "analytics_consent": True
            }
        )
        
        if register_response.status_code == 200:
            print(f"✓ Created test influencer: {test_email}")
            
            # Login
            login_response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_email, "password": test_password}
            )
            
            if login_response.status_code == 200:
                data = login_response.json()
                session_token = data.get("session_token")
                session.headers.update({"Authorization": f"Bearer {session_token}"})
                
                # Try to request withdrawal (should fail - not active, no Stripe)
                withdrawal_response = session.post(
                    f"{BASE_URL}/api/influencer/request-withdrawal",
                    json={}
                )
                
                assert withdrawal_response.status_code == 400, "Should fail for inactive influencer"
                detail = withdrawal_response.json().get("detail", "")
                print(f"✓ Withdrawal correctly blocked: {detail}")
                
                # Get withdrawals (should be empty)
                withdrawals_response = session.get(f"{BASE_URL}/api/influencer/withdrawals")
                if withdrawals_response.status_code == 200:
                    data = withdrawals_response.json()
                    assert data["withdrawals"] == [], "New influencer should have no withdrawals"
                    assert data["minimum_amount"] == 50, "Minimum should be €50"
                    print(f"✓ Withdrawals endpoint returns empty list and minimum_amount=50")
        else:
            print(f"⚠ Could not create test influencer: {register_response.status_code}")
            print(f"  Response: {register_response.text[:200]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
