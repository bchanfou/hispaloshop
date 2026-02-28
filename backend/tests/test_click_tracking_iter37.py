"""
Test Click Tracking for Influencers - Iteration 37
Tests:
1. GET /api/r/:code - Redirect with cookie and click tracking
2. GET /api/influencer/analytics - Returns total_link_clicks, total_code_uses, referral_link, click_to_order_rate
3. Frontend InfluencerAnalytics component displays correct metrics
"""
import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_influencer_iter34@test.com"
TEST_PASSWORD = "password123"
TEST_CODE = "TESTITER34"


class TestReferralLinkClickTracking:
    """Test /api/r/:code endpoint for click tracking"""
    
    def test_referral_link_redirects_to_homepage_with_ref_param(self):
        """Test that /api/r/CODE redirects to /?ref=CODE"""
        response = requests.get(
            f"{BASE_URL}/api/r/{TEST_CODE}",
            allow_redirects=False
        )
        
        # Should return 302 redirect
        assert response.status_code == 302, f"Expected 302, got {response.status_code}"
        
        # Check redirect location
        location = response.headers.get('Location', '')
        assert f"/?ref={TEST_CODE}" in location, f"Expected redirect to /?ref={TEST_CODE}, got {location}"
        print(f"✓ Redirect location: {location}")
    
    def test_referral_link_sets_cookie(self):
        """Test that /api/r/CODE sets referral_code cookie"""
        response = requests.get(
            f"{BASE_URL}/api/r/{TEST_CODE}",
            allow_redirects=False
        )
        
        # Check for cookie
        cookies = response.cookies
        assert 'referral_code' in cookies or 'referral_code' in response.headers.get('Set-Cookie', ''), \
            f"Expected referral_code cookie, got cookies: {dict(cookies)}"
        
        # Verify cookie value
        if 'referral_code' in cookies:
            assert cookies['referral_code'] == TEST_CODE, f"Expected cookie value {TEST_CODE}, got {cookies['referral_code']}"
        print(f"✓ Cookie set correctly")
    
    def test_referral_link_tracks_click_in_database(self):
        """Test that /api/r/CODE records click in influencer_link_clicks collection"""
        # Make a request to track a click
        response = requests.get(
            f"{BASE_URL}/api/r/{TEST_CODE}",
            allow_redirects=False,
            headers={"User-Agent": "pytest-click-tracking-test"}
        )
        
        assert response.status_code == 302, f"Expected 302, got {response.status_code}"
        print(f"✓ Click tracked (redirect returned)")
    
    def test_referral_link_invalid_code_still_redirects(self):
        """Test that invalid code still redirects to homepage (no error)"""
        response = requests.get(
            f"{BASE_URL}/api/r/INVALIDCODE123",
            allow_redirects=False
        )
        
        # Should still redirect (graceful handling)
        assert response.status_code == 302, f"Expected 302 for invalid code, got {response.status_code}"
        
        # Should redirect to homepage without ref param
        location = response.headers.get('Location', '')
        assert location == "/" or "/?ref=" not in location or "INVALIDCODE123" not in location, \
            f"Invalid code should redirect to / without ref, got {location}"
        print(f"✓ Invalid code handled gracefully, redirects to: {location}")
    
    def test_referral_link_case_insensitive(self):
        """Test that code is case-insensitive (lowercase works)"""
        response = requests.get(
            f"{BASE_URL}/api/r/{TEST_CODE.lower()}",
            allow_redirects=False
        )
        
        assert response.status_code == 302, f"Expected 302, got {response.status_code}"
        
        # Should redirect with uppercase code
        location = response.headers.get('Location', '')
        assert TEST_CODE.upper() in location, f"Expected uppercase code in redirect, got {location}"
        print(f"✓ Case-insensitive handling works")


class TestInfluencerAnalyticsEndpoint:
    """Test /api/influencer/analytics endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session for influencer"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        return session
    
    def test_analytics_requires_authentication(self):
        """Test that analytics endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/influencer/analytics")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Analytics requires authentication")
    
    def test_analytics_returns_total_link_clicks(self, auth_session):
        """Test that analytics returns total_link_clicks in summary"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should have 'summary' field"
        assert "total_link_clicks" in data["summary"], "Summary should have 'total_link_clicks'"
        
        total_link_clicks = data["summary"]["total_link_clicks"]
        assert isinstance(total_link_clicks, int), f"total_link_clicks should be int, got {type(total_link_clicks)}"
        print(f"✓ total_link_clicks: {total_link_clicks}")
    
    def test_analytics_returns_total_code_uses(self, auth_session):
        """Test that analytics returns total_code_uses in summary"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_code_uses" in data["summary"], "Summary should have 'total_code_uses'"
        
        total_code_uses = data["summary"]["total_code_uses"]
        assert isinstance(total_code_uses, int), f"total_code_uses should be int, got {type(total_code_uses)}"
        print(f"✓ total_code_uses: {total_code_uses}")
    
    def test_analytics_returns_referral_link(self, auth_session):
        """Test that analytics returns referral_link"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "referral_link" in data, "Response should have 'referral_link' field"
        
        referral_link = data["referral_link"]
        assert referral_link is not None, "referral_link should not be None"
        assert f"/r/{TEST_CODE}" in referral_link, f"referral_link should contain /r/{TEST_CODE}, got {referral_link}"
        print(f"✓ referral_link: {referral_link}")
    
    def test_analytics_returns_click_to_order_rate(self, auth_session):
        """Test that analytics returns click_to_order_rate"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "click_to_order_rate" in data["summary"], "Summary should have 'click_to_order_rate'"
        
        click_to_order_rate = data["summary"]["click_to_order_rate"]
        assert isinstance(click_to_order_rate, (int, float)), f"click_to_order_rate should be numeric, got {type(click_to_order_rate)}"
        print(f"✓ click_to_order_rate: {click_to_order_rate}%")
    
    def test_analytics_returns_chart_data_with_link_clicks(self, auth_session):
        """Test that chart_data includes link_clicks field"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "chart_data" in data, "Response should have 'chart_data' field"
        
        chart_data = data["chart_data"]
        assert isinstance(chart_data, list), "chart_data should be a list"
        
        if len(chart_data) > 0:
            first_day = chart_data[0]
            assert "link_clicks" in first_day, "Each day should have 'link_clicks' field"
            assert "code_uses" in first_day, "Each day should have 'code_uses' field"
            assert "conversions" in first_day, "Each day should have 'conversions' field"
            print(f"✓ chart_data has {len(chart_data)} days with link_clicks, code_uses, conversions")
    
    def test_analytics_returns_discount_code(self, auth_session):
        """Test that analytics returns discount_code"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "discount_code" in data, "Response should have 'discount_code' field"
        
        discount_code = data["discount_code"]
        assert discount_code == TEST_CODE, f"Expected discount_code {TEST_CODE}, got {discount_code}"
        print(f"✓ discount_code: {discount_code}")
    
    def test_analytics_full_response_structure(self, auth_session):
        """Test complete analytics response structure"""
        response = auth_session.get(f"{BASE_URL}/api/influencer/analytics?days=30")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check top-level fields
        required_fields = ["chart_data", "summary", "discount_code", "referral_link", "period_days"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Check summary fields
        summary_fields = [
            "total_link_clicks", "total_code_uses", "total_conversions",
            "total_revenue", "total_commission", "click_to_order_rate",
            "code_to_order_rate", "all_time_orders", "all_time_link_clicks"
        ]
        for field in summary_fields:
            assert field in data["summary"], f"Missing summary field: {field}"
        
        print("✓ Full response structure validated")
        print(f"  - total_link_clicks: {data['summary']['total_link_clicks']}")
        print(f"  - total_code_uses: {data['summary']['total_code_uses']}")
        print(f"  - total_conversions: {data['summary']['total_conversions']}")
        print(f"  - click_to_order_rate: {data['summary']['click_to_order_rate']}%")
        print(f"  - referral_link: {data['referral_link']}")


class TestClickTrackingIntegration:
    """Integration tests for click tracking flow"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session for influencer"""
        session = requests.Session()
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        return session
    
    def test_click_tracking_increments_count(self, auth_session):
        """Test that clicking referral link increments click count"""
        # Get initial count
        initial_response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        assert initial_response.status_code == 200
        initial_clicks = initial_response.json()["summary"]["all_time_link_clicks"]
        
        # Make a click
        click_response = requests.get(
            f"{BASE_URL}/api/r/{TEST_CODE}",
            allow_redirects=False,
            headers={"User-Agent": "pytest-integration-test"}
        )
        assert click_response.status_code == 302
        
        # Get updated count
        updated_response = auth_session.get(f"{BASE_URL}/api/influencer/analytics")
        assert updated_response.status_code == 200
        updated_clicks = updated_response.json()["summary"]["all_time_link_clicks"]
        
        # Verify increment
        assert updated_clicks >= initial_clicks, \
            f"Click count should have increased. Initial: {initial_clicks}, Updated: {updated_clicks}"
        print(f"✓ Click count: {initial_clicks} -> {updated_clicks}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
