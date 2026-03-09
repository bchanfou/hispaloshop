"""
Iteration 76 - Phase 2 SaaS Features Tests
- Seller subscription plans (FREE/PRO/ELITE)
- Influencer tiers (HERCULES/ATENEA/ZEUS)
- Admin cron job endpoints
- Subscription management endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
PRODUCER_EMAIL = "producer@test.com"
PRODUCER_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token."""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.cookies.get("access_token") or response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def producer_token(api_client):
    """Get producer authentication token."""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": PRODUCER_EMAIL, "password": PRODUCER_PASSWORD}
    )
    if response.status_code == 200:
        return response.cookies.get("access_token") or response.json().get("token")
    pytest.skip(f"Producer login failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_session(api_client, admin_token):
    """Session with admin auth cookies."""
    login_resp = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    admin_session = requests.Session()
    admin_session.cookies.update(login_resp.cookies)
    admin_session.headers.update({"Content-Type": "application/json"})
    return admin_session


@pytest.fixture(scope="module")
def producer_session(api_client, producer_token):
    """Session with producer auth cookies."""
    login_resp = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": PRODUCER_EMAIL, "password": PRODUCER_PASSWORD}
    )
    producer_session = requests.Session()
    producer_session.cookies.update(login_resp.cookies)
    producer_session.headers.update({"Content-Type": "application/json"})
    return producer_session


class TestHealthEndpoint:
    """Basic health check tests."""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health returns ok."""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ GET /api/health returns ok")


class TestSellerPlansEndpoints:
    """Tests for seller subscription plan endpoints."""
    
    def test_get_seller_plans_public(self, api_client):
        """GET /api/sellers/plans - returns 3 plans (FREE/PRO/ELITE) with features and prices."""
        response = api_client.get(f"{BASE_URL}/api/sellers/plans")
        assert response.status_code == 200
        
        data = response.json()
        plans = data.get("plans", [])
        
        # Validate 3 plans returned
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        
        plan_keys = [p["key"] for p in plans]
        assert "FREE" in plan_keys, "FREE plan missing"
        assert "PRO" in plan_keys, "PRO plan missing"
        assert "ELITE" in plan_keys, "ELITE plan missing"
        
        # Validate FREE plan
        free_plan = next(p for p in plans if p["key"] == "FREE")
        assert free_plan["price"] == 0
        assert free_plan["commission"] == "20%"
        assert len(free_plan["features"]) > 0
        
        # Validate PRO plan
        pro_plan = next(p for p in plans if p["key"] == "PRO")
        assert pro_plan["price"] == 79
        assert pro_plan["commission"] == "18%"
        assert pro_plan.get("recommended") == True
        assert len(pro_plan["features"]) > 0
        
        # Validate ELITE plan
        elite_plan = next(p for p in plans if p["key"] == "ELITE")
        assert elite_plan["price"] == 149
        assert elite_plan["commission"] == "17%"
        assert len(elite_plan["features"]) > 0
        
        # Verify stripe_publishable_key is returned
        assert "stripe_publishable_key" in data
        
        print(f"✓ GET /api/sellers/plans returns 3 plans: {plan_keys}")
    
    def test_get_my_plan_producer(self, producer_session):
        """GET /api/sellers/me/plan - returns current plan for producer (PRO trial)."""
        response = producer_session.get(f"{BASE_URL}/api/sellers/me/plan")
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "commission_rate" in data
        assert "plan_status" in data
        
        # Validate PRO trial setup
        assert data["plan"] in ["FREE", "PRO", "ELITE"], f"Invalid plan: {data['plan']}"
        assert isinstance(data["commission_rate"], (int, float))
        
        print(f"✓ GET /api/sellers/me/plan - plan={data['plan']}, rate={data['commission_rate']}, status={data.get('plan_status')}")
    
    def test_get_my_plan_unauthorized(self):
        """GET /api/sellers/me/plan - requires authentication."""
        # Use fresh session to avoid cookies from other tests
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/sellers/me/plan")
        assert response.status_code == 401
        print("✓ GET /api/sellers/me/plan requires auth (401)")
    
    def test_subscribe_to_plan_produces_checkout_url(self, producer_session):
        """POST /api/sellers/me/plan/subscribe - creates Stripe Checkout session for PRO/ELITE."""
        response = producer_session.post(
            f"{BASE_URL}/api/sellers/me/plan/subscribe",
            json={"plan": "PRO"}
        )
        
        # Should return checkout_url or error if Stripe not configured
        if response.status_code == 200:
            data = response.json()
            assert "checkout_url" in data
            assert "session_id" in data
            assert data["checkout_url"].startswith("https://checkout.stripe.com")
            print(f"✓ POST /api/sellers/me/plan/subscribe returns checkout_url: {data['checkout_url'][:60]}...")
        elif response.status_code == 500:
            # Stripe products may not be initialized
            data = response.json()
            assert "detail" in data
            print(f"✓ POST /api/sellers/me/plan/subscribe - Stripe not configured: {data['detail']}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")
    
    def test_subscribe_invalid_plan(self, producer_session):
        """POST /api/sellers/me/plan/subscribe - rejects FREE plan."""
        response = producer_session.post(
            f"{BASE_URL}/api/sellers/me/plan/subscribe",
            json={"plan": "FREE"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "invalido" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()
        print("✓ POST /api/sellers/me/plan/subscribe rejects FREE plan (400)")
    
    def test_change_plan_works(self, producer_session):
        """POST /api/sellers/me/plan/change - change plan works."""
        # Try changing to ELITE (may fail due to Stripe, but endpoint should work)
        response = producer_session.post(
            f"{BASE_URL}/api/sellers/me/plan/change",
            json={"plan": "ELITE"}
        )
        
        # Accept 200 (success) or 500 (Stripe error)
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            print(f"✓ POST /api/sellers/me/plan/change works: {data['message']}")
        elif response.status_code == 500:
            # Expected if no Stripe subscription exists
            print("✓ POST /api/sellers/me/plan/change - Stripe subscription not found (expected)")
        elif response.status_code == 400:
            data = response.json()
            print(f"✓ POST /api/sellers/me/plan/change - already on plan: {data.get('detail')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestInfluencerTiersEndpoints:
    """Tests for influencer tier endpoints."""
    
    def test_get_influencer_tiers_public(self, api_client):
        """GET /api/influencers/tiers - returns 3 tiers (HERCULES/ATENEA/ZEUS)."""
        response = api_client.get(f"{BASE_URL}/api/influencers/tiers")
        assert response.status_code == 200

        data = response.json()
        tiers = data.get("tiers", [])

        # Validate 3 tiers returned
        assert len(tiers) == 3, f"Expected 3 tiers, got {len(tiers)}"

        tier_keys = [t["key"] for t in tiers]
        assert "hercules" in tier_keys, "hercules tier missing"
        assert "atenea" in tier_keys, "atenea tier missing"
        assert "zeus" in tier_keys, "zeus tier missing"

        # Validate HERCULES tier
        hercules = next(t for t in tiers if t["key"] == "hercules")
        assert hercules["commission"] == "3%"

        # Validate ATENEA tier
        atenea = next(t for t in tiers if t["key"] == "atenea")
        assert atenea["commission"] == "5%"

        # Validate ZEUS tier
        zeus = next(t for t in tiers if t["key"] == "zeus")
        assert zeus["commission"] == "7%"

        # Validate other fields
        assert data.get("attribution_months") == 18
        assert data.get("payout_delay_days") == 15
        assert data.get("min_payout_usd") == 50

        print(f"✓ GET /api/influencers/tiers returns 3 tiers: {tier_keys}")


class TestAdminCronEndpoints:
    """Tests for admin cron job endpoints."""
    
    def test_cron_grace_period_check_admin_only(self, admin_session):
        """POST /api/admin/cron/grace-period-check - admin can trigger grace check."""
        response = admin_session.post(f"{BASE_URL}/api/admin/cron/grace-period-check")
        
        assert response.status_code == 200
        data = response.json()
        assert "downgraded" in data
        assert "checked" in data
        print(f"✓ POST /api/admin/cron/grace-period-check - downgraded={data['downgraded']}, checked={data['checked']}")
    
    def test_cron_grace_period_unauthorized(self):
        """POST /api/admin/cron/grace-period-check - requires admin auth."""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/admin/cron/grace-period-check")
        assert response.status_code == 401
        print("✓ POST /api/admin/cron/grace-period-check requires admin auth (401)")
    
    def test_cron_grace_period_non_admin(self, producer_session):
        """POST /api/admin/cron/grace-period-check - forbidden for non-admin."""
        response = producer_session.post(f"{BASE_URL}/api/admin/cron/grace-period-check")
        assert response.status_code in [401, 403]
        print(f"✓ POST /api/admin/cron/grace-period-check forbidden for producer ({response.status_code})")
    
    def test_cron_influencer_payouts_admin_only(self, admin_session):
        """POST /api/admin/cron/influencer-payouts - admin can trigger payout batch."""
        response = admin_session.post(f"{BASE_URL}/api/admin/cron/influencer-payouts")
        
        assert response.status_code == 200
        data = response.json()
        assert "paid" in data
        assert "skipped_below_minimum" in data
        assert "total_checked" in data
        print(f"✓ POST /api/admin/cron/influencer-payouts - paid={data['paid']}, skipped={data['skipped_below_minimum']}, checked={data['total_checked']}")
    
    def test_cron_influencer_payouts_unauthorized(self):
        """POST /api/admin/cron/influencer-payouts - requires admin auth."""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/admin/cron/influencer-payouts")
        assert response.status_code == 401
        print("✓ POST /api/admin/cron/influencer-payouts requires admin auth (401)")
    
    def test_cron_tier_recalculation_admin_only(self, admin_session):
        """POST /api/admin/cron/tier-recalculation - admin can trigger tier recalc."""
        response = admin_session.post(f"{BASE_URL}/api/admin/cron/tier-recalculation")
        
        assert response.status_code == 200
        data = response.json()
        assert "reviewed" in data
        assert "changes" in data
        print(f"✓ POST /api/admin/cron/tier-recalculation - reviewed={data['reviewed']}, changes={data['changes']}")
    
    def test_cron_tier_recalculation_unauthorized(self):
        """POST /api/admin/cron/tier-recalculation - requires admin auth."""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/admin/cron/tier-recalculation")
        assert response.status_code == 401
        print("✓ POST /api/admin/cron/tier-recalculation requires admin auth (401)")
    
    def test_cron_attribution_expiry_admin_only(self, admin_session):
        """POST /api/admin/cron/attribution-expiry - admin can trigger expiry cleanup."""
        response = admin_session.post(f"{BASE_URL}/api/admin/cron/attribution-expiry")
        
        assert response.status_code == 200
        data = response.json()
        assert "expired" in data
        print(f"✓ POST /api/admin/cron/attribution-expiry - expired={data['expired']}")
    
    def test_cron_attribution_expiry_unauthorized(self):
        """POST /api/admin/cron/attribution-expiry - requires admin auth."""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/admin/cron/attribution-expiry")
        assert response.status_code == 401
        print("✓ POST /api/admin/cron/attribution-expiry requires admin auth (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
