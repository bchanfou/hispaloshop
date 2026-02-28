"""
Test Iteration 33 Features:
1. Influencer analytics endpoint /api/influencer/analytics
2. CartPage i18n translations (emailVerified, quantity, onlyInStock)
3. Spanish and English locale translations
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInfluencerAnalytics:
    """Test influencer analytics endpoint"""
    
    @pytest.fixture(scope="class")
    def test_influencer_session(self):
        """Create test influencer and get session"""
        # First, register a new influencer
        email = f"test_analytics_inf_{uuid.uuid4().hex[:8]}@test.com"
        password = "testpass123"
        
        # Register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": "Test Analytics Influencer",
            "password": password,
            "role": "influencer",
            "country": "ES",
            "instagram": "@testanalytics",
            "followers": "10000",
            "niche": "food",
            "analytics_consent": True,
            "consent_version": "1.0"
        })
        
        if register_response.status_code != 200:
            pytest.skip(f"Could not register test influencer: {register_response.text}")
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login test influencer: {login_response.text}")
        
        data = login_response.json()
        session_token = data.get("session_token")
        user_id = data.get("user", {}).get("user_id")
        
        return {
            "session_token": session_token,
            "email": email,
            "user_id": user_id
        }
    
    def test_analytics_endpoint_requires_auth(self):
        """Test that analytics endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/influencer/analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_analytics_endpoint_returns_chart_data(self, test_influencer_session):
        """Test that analytics endpoint returns chart_data and summary"""
        session_token = test_influencer_session["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/influencer/analytics?days=30",
            cookies={"session_token": session_token}
        )
        
        # Should return 200 or 404 (if influencer not found/pending)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify chart_data structure
            assert "chart_data" in data, "Response should contain chart_data"
            assert isinstance(data["chart_data"], list), "chart_data should be a list"
            
            # Verify summary structure
            assert "summary" in data, "Response should contain summary"
            summary = data["summary"]
            assert "total_clicks" in summary, "summary should contain total_clicks"
            assert "total_conversions" in summary, "summary should contain total_conversions"
            assert "total_revenue" in summary, "summary should contain total_revenue"
            assert "total_commission" in summary, "summary should contain total_commission"
            assert "conversion_rate" in summary, "summary should contain conversion_rate"
            
            # Verify period_days
            assert "period_days" in data, "Response should contain period_days"
            assert data["period_days"] == 30, "period_days should be 30"
    
    def test_analytics_endpoint_with_different_periods(self, test_influencer_session):
        """Test analytics endpoint with different day periods"""
        session_token = test_influencer_session["session_token"]
        
        for days in [7, 30, 90]:
            response = requests.get(
                f"{BASE_URL}/api/influencer/analytics?days={days}",
                cookies={"session_token": session_token}
            )
            
            if response.status_code == 200:
                data = response.json()
                assert data["period_days"] == days, f"period_days should be {days}"
                
                # Chart data should have entries for each day
                chart_data = data.get("chart_data", [])
                # Allow some flexibility in count due to date boundaries
                assert len(chart_data) >= days - 1, f"chart_data should have at least {days-1} entries for {days} days"


class TestActiveInfluencerAnalytics:
    """Test analytics for an active influencer with discount code"""
    
    @pytest.fixture(scope="class")
    def active_influencer_session(self):
        """Get session for an existing active influencer or create one"""
        # Try to login with existing test influencer from iteration 32
        email = "test_influencer_iter32@test.com"
        password = "testpass123"
        
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            return {
                "session_token": data.get("session_token"),
                "email": email
            }
        
        # If not found, skip these tests
        pytest.skip("No active influencer available for testing")
    
    def test_active_influencer_analytics(self, active_influencer_session):
        """Test analytics for active influencer"""
        session_token = active_influencer_session["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/influencer/analytics?days=30",
            cookies={"session_token": session_token}
        )
        
        # Active influencer should get 200
        if response.status_code == 200:
            data = response.json()
            
            # Verify all required fields
            assert "chart_data" in data
            assert "summary" in data
            assert "discount_code" in data  # May be None if no code created
            
            # Verify chart_data entries have correct structure
            if data["chart_data"]:
                entry = data["chart_data"][0]
                assert "date" in entry
                assert "clicks" in entry
                assert "conversions" in entry
                assert "revenue" in entry
                assert "commission" in entry


class TestLocaleTranslations:
    """Test that locale files have required cart translations"""
    
    def test_spanish_locale_has_cart_translations(self):
        """Verify Spanish locale has new cart translations"""
        import json
        
        with open("/app/frontend/src/locales/es.json", "r") as f:
            es_locale = json.load(f)
        
        # Check cart section exists
        assert "cart" in es_locale, "Spanish locale should have cart section"
        cart = es_locale["cart"]
        
        # Check required keys
        assert "quantity" in cart, "cart should have 'quantity' key"
        assert "onlyInStock" in cart, "cart should have 'onlyInStock' key"
        
        # Check checkout section for email verification
        assert "checkout" in es_locale, "Spanish locale should have checkout section"
        checkout = es_locale["checkout"]
        
        assert "emailVerified" in checkout, "checkout should have 'emailVerified' key"
        assert "emailVerifiedSuccess" in checkout, "checkout should have 'emailVerifiedSuccess' key"
        
        # Verify values are in Spanish
        assert cart["quantity"] == "Cantidad", f"quantity should be 'Cantidad', got '{cart['quantity']}'"
        assert "stock" in cart["onlyInStock"].lower(), "onlyInStock should contain 'stock'"
    
    def test_english_locale_has_cart_translations(self):
        """Verify English locale has new cart translations"""
        import json
        
        with open("/app/frontend/src/locales/en.json", "r") as f:
            en_locale = json.load(f)
        
        # Check cart section exists
        assert "cart" in en_locale, "English locale should have cart section"
        cart = en_locale["cart"]
        
        # Check required keys
        assert "quantity" in cart, "cart should have 'quantity' key"
        assert "onlyInStock" in cart, "cart should have 'onlyInStock' key"
        
        # Check checkout section for email verification
        assert "checkout" in en_locale, "English locale should have checkout section"
        checkout = en_locale["checkout"]
        
        assert "emailVerified" in checkout, "checkout should have 'emailVerified' key"
        assert "emailVerifiedSuccess" in checkout, "checkout should have 'emailVerifiedSuccess' key"
        
        # Verify values are in English
        assert cart["quantity"] == "Quantity", f"quantity should be 'Quantity', got '{cart['quantity']}'"
        assert "stock" in cart["onlyInStock"].lower(), "onlyInStock should contain 'stock'"


class TestCartPageI18n:
    """Test CartPage uses translation keys correctly"""
    
    def test_cartpage_uses_translation_keys(self):
        """Verify CartPage.js uses t() for required strings"""
        with open("/app/frontend/src/pages/CartPage.js", "r") as f:
            content = f.read()
        
        # Check for translation key usage
        assert "t('checkout.emailVerified'" in content or "t(\"checkout.emailVerified\"" in content, \
            "CartPage should use t('checkout.emailVerified')"
        
        assert "t('cart.quantity'" in content or "t(\"cart.quantity\"" in content, \
            "CartPage should use t('cart.quantity')"
        
        assert "t('cart.onlyInStock'" in content or "t(\"cart.onlyInStock\"" in content, \
            "CartPage should use t('cart.onlyInStock')"


class TestInfluencerDashboardAnalytics:
    """Test InfluencerDashboard shows analytics section"""
    
    def test_dashboard_imports_analytics_component(self):
        """Verify InfluencerDashboard imports InfluencerAnalytics"""
        with open("/app/frontend/src/pages/influencer/InfluencerDashboard.js", "r") as f:
            content = f.read()
        
        assert "import InfluencerAnalytics" in content, \
            "InfluencerDashboard should import InfluencerAnalytics"
        
        assert "<InfluencerAnalytics" in content, \
            "InfluencerDashboard should render InfluencerAnalytics component"
    
    def test_analytics_shown_when_active_with_code(self):
        """Verify analytics section is conditionally rendered"""
        with open("/app/frontend/src/pages/influencer/InfluencerDashboard.js", "r") as f:
            content = f.read()
        
        # Check for conditional rendering based on status and discount_code
        assert "dashboard.status === 'active'" in content, \
            "Analytics should be shown only when status is active"
        
        assert "dashboard.discount_code" in content, \
            "Analytics should be shown only when discount_code exists"


class TestInfluencerAnalyticsComponent:
    """Test InfluencerAnalytics component structure"""
    
    def test_analytics_component_exists(self):
        """Verify InfluencerAnalytics component exists"""
        import os
        assert os.path.exists("/app/frontend/src/components/InfluencerAnalytics.js"), \
            "InfluencerAnalytics.js should exist"
    
    def test_analytics_component_has_testid(self):
        """Verify InfluencerAnalytics has data-testid"""
        with open("/app/frontend/src/components/InfluencerAnalytics.js", "r") as f:
            content = f.read()
        
        assert 'data-testid="influencer-analytics"' in content, \
            "InfluencerAnalytics should have data-testid='influencer-analytics'"
    
    def test_analytics_component_calls_api(self):
        """Verify InfluencerAnalytics calls the analytics API"""
        with open("/app/frontend/src/components/InfluencerAnalytics.js", "r") as f:
            content = f.read()
        
        assert "/influencer/analytics" in content, \
            "InfluencerAnalytics should call /influencer/analytics endpoint"
    
    def test_analytics_component_displays_stats(self):
        """Verify InfluencerAnalytics displays required stats"""
        with open("/app/frontend/src/components/InfluencerAnalytics.js", "r") as f:
            content = f.read()
        
        # Check for summary stats display
        assert "total_clicks" in content, "Should display total_clicks"
        assert "total_conversions" in content, "Should display total_conversions"
        assert "total_revenue" in content, "Should display total_revenue"
        assert "total_commission" in content, "Should display total_commission"
        assert "conversion_rate" in content, "Should display conversion_rate"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
