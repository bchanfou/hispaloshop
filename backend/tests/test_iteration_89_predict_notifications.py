"""
Iteration 89 - Hispalo Predict Notifications Tests
Tests:
  1. POST /api/admin/cron/predict-notifications - Cron endpoint for overdue prediction notifications
  2. GET /api/user/notifications - Get user notifications list with unread count
  3. PUT /api/user/notifications/{notification_id}/read - Mark notification as read
  4. PUT /api/user/notifications/read-all - Mark all notifications as read
  5. Role-based access control for cron endpoint
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hispaloshop.com"
ADMIN_PASSWORD = "password123"
CUSTOMER_EMAIL = "test@example.com"
CUSTOMER_PASSWORD = "password123"


class TestSession:
    """Helper to manage authentication sessions"""
    
    @staticmethod
    def login(email: str, password: str) -> tuple:
        """Login and return (session, user_data)"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
            return session, data
        return session, None


class TestNotificationCRUDEndpoints:
    """Tests for notification CRUD operations (routes/notifications.py)"""
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Login as customer and return session"""
        session, data = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert data is not None, f"Customer login failed for {CUSTOMER_EMAIL}"
        return session
    
    def test_get_user_notifications_returns_200(self, customer_session):
        """GET /api/user/notifications should return 200 for authenticated user"""
        response = customer_session.get(f"{BASE_URL}/api/user/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "notifications" in data, "Response should contain 'notifications' key"
        assert "unread_count" in data, "Response should contain 'unread_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
    
    def test_get_notifications_with_limit(self, customer_session):
        """GET /api/user/notifications?limit=5 should respect limit parameter"""
        response = customer_session.get(f"{BASE_URL}/api/user/notifications?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["notifications"]) <= 5, "Should respect limit parameter"
    
    def test_mark_notification_read_endpoint_exists(self, customer_session):
        """PUT /api/user/notifications/{id}/read endpoint should exist"""
        # First get notifications to find one to mark
        response = customer_session.get(f"{BASE_URL}/api/user/notifications")
        assert response.status_code == 200
        
        data = response.json()
        if data["notifications"]:
            notif_id = data["notifications"][0]["notification_id"]
            mark_response = customer_session.put(f"{BASE_URL}/api/user/notifications/{notif_id}/read")
            # Should return 200 even if already read
            assert mark_response.status_code == 200, f"Mark read failed: {mark_response.text}"
            assert "message" in mark_response.json()
        else:
            # If no notifications, test with fake ID - should still return 200 (no match found)
            mark_response = customer_session.put(f"{BASE_URL}/api/user/notifications/fake_id_123/read")
            assert mark_response.status_code == 200
    
    def test_mark_all_notifications_read(self, customer_session):
        """PUT /api/user/notifications/read-all should mark all notifications as read"""
        response = customer_session.put(f"{BASE_URL}/api/user/notifications/read-all")
        assert response.status_code == 200, f"Mark all read failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        
        # Verify all are now read
        verify_response = customer_session.get(f"{BASE_URL}/api/user/notifications")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        # After marking all read, unread_count should be 0
        assert verify_data["unread_count"] == 0, f"Expected 0 unread, got {verify_data['unread_count']}"
    
    def test_notifications_require_authentication(self):
        """Notification endpoints should require authentication"""
        unauthenticated_session = requests.Session()
        
        response = unauthenticated_session.get(f"{BASE_URL}/api/user/notifications")
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got {response.status_code}"


class TestPredictNotificationsCronEndpoint:
    """Tests for POST /api/admin/cron/predict-notifications (routes/cron.py)"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session, data = TestSession.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert data is not None, f"Admin login failed for {ADMIN_EMAIL}"
        return session
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Login as customer and return session"""
        session, data = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert data is not None, f"Customer login failed for {CUSTOMER_EMAIL}"
        return session
    
    def test_cron_endpoint_requires_admin_role(self, customer_session):
        """POST /api/admin/cron/predict-notifications should require admin role"""
        response = customer_session.post(f"{BASE_URL}/api/admin/cron/predict-notifications")
        # Should return 403 Forbidden for non-admin
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}: {response.text}"
    
    def test_cron_endpoint_requires_authentication(self):
        """POST /api/admin/cron/predict-notifications should require authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.post(f"{BASE_URL}/api/admin/cron/predict-notifications")
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_cron_endpoint_returns_200_for_admin(self, admin_session):
        """POST /api/admin/cron/predict-notifications should return 200 for admin"""
        response = admin_session.post(f"{BASE_URL}/api/admin/cron/predict-notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "notified_users" in data, "Response should contain 'notified_users'"
        assert "notified_products" in data, "Response should contain 'notified_products'"
        assert "skipped_already_notified" in data, "Response should contain 'skipped_already_notified'"
        assert "total_customers_checked" in data, "Response should contain 'total_customers_checked'"
        
        # All values should be integers
        assert isinstance(data["notified_users"], int)
        assert isinstance(data["notified_products"], int)
        assert isinstance(data["skipped_already_notified"], int)
        assert isinstance(data["total_customers_checked"], int)
    
    def test_cron_skips_recently_notified_users(self, admin_session):
        """Second call within 24h should skip already-notified users"""
        # First call
        response1 = admin_session.post(f"{BASE_URL}/api/admin/cron/predict-notifications")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second call immediately after
        response2 = admin_session.post(f"{BASE_URL}/api/admin/cron/predict-notifications")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # If first call notified users, second call should have skipped them
        if data1["notified_users"] > 0:
            assert data2["skipped_already_notified"] >= data1["notified_users"], \
                f"Expected skipped >= {data1['notified_users']}, got {data2['skipped_already_notified']}"
            # Second call should notify fewer or equal users
            assert data2["notified_users"] <= data1["notified_users"], \
                "Second call should not notify more users than first call within 24h"


class TestPredictOverdueNotificationContent:
    """Tests for predict_overdue notification content verification"""
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Login as customer and return session"""
        session, data = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert data is not None, f"Customer login failed"
        return session
    
    def test_predict_overdue_notification_has_correct_type(self, customer_session):
        """predict_overdue notifications should have correct type field"""
        response = customer_session.get(f"{BASE_URL}/api/user/notifications")
        assert response.status_code == 200
        
        data = response.json()
        # Find predict_overdue notifications
        predict_notifs = [n for n in data["notifications"] if n.get("type") == "predict_overdue"]
        
        if predict_notifs:
            notif = predict_notifs[0]
            # Verify notification structure
            assert "notification_id" in notif, "Should have notification_id"
            assert "type" in notif, "Should have type"
            assert notif["type"] == "predict_overdue", "Type should be predict_overdue"
            assert "title" in notif, "Should have title"
            assert "message" in notif, "Should have message"
            assert "link" in notif, "Should have link"
            assert notif["link"] == "/dashboard/predictions", "Link should point to /dashboard/predictions"
            print(f"Found predict_overdue notification: {notif['title']}")
        else:
            print("No predict_overdue notifications found (may need to run cron first)")
    
    def test_notification_has_created_at_timestamp(self, customer_session):
        """Notifications should have created_at timestamp"""
        response = customer_session.get(f"{BASE_URL}/api/user/notifications")
        assert response.status_code == 200
        
        data = response.json()
        if data["notifications"]:
            notif = data["notifications"][0]
            assert "created_at" in notif, "Notification should have created_at"


class TestHealthAndPrerequisites:
    """Basic health checks before running main tests"""
    
    def test_api_health(self):
        """API should be healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "ok", f"API status not ok: {data}"
    
    def test_admin_login_works(self):
        """Admin login should work"""
        session, data = TestSession.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert data is not None, "Admin login failed"
        assert data.get("user", {}).get("role") in ["admin", "super_admin"], \
            f"Expected admin role, got {data.get('user', {}).get('role')}"
    
    def test_customer_login_works(self):
        """Customer login should work"""
        session, data = TestSession.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        assert data is not None, "Customer login failed"
        assert data.get("user", {}).get("role") == "customer", \
            f"Expected customer role, got {data.get('user', {}).get('role')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
