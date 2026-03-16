"""
Iteration 67 - Financial Dashboard Frontend + Backend Integration Tests
Tests for /super-admin/finance page, ledger APIs, Excel export, payouts, and refunds
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000')

class TestFinancialDashboardAPIs:
    """Test all API endpoints used by the Financial Dashboard"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hispaloshop.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("session_token")
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Get customer session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        return data.get("session_token")
    
    # === GET /api/admin/financial-ledger Tests ===
    
    def test_financial_ledger_admin_access(self, admin_session):
        """Admin should be able to access financial ledger"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial-ledger",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "entries" in data, "Response should contain 'entries'"
        assert "summary" in data, "Response should contain 'summary'"
        
        # Verify summary fields
        summary = data["summary"]
        assert "total_gross" in summary, "Summary should contain total_gross"
        assert "total_platform_fee" in summary, "Summary should contain total_platform_fee"
        assert "total_seller_net" in summary, "Summary should contain total_seller_net"
        assert "total_usd_equivalent" in summary, "Summary should contain total_usd_equivalent"
        
        print(f"Ledger entries count: {len(data['entries'])}")
        print(f"Summary: {summary}")
    
    def test_financial_ledger_customer_forbidden(self, customer_session):
        """Customer should not access financial ledger"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial-ledger",
            headers={"Authorization": f"Bearer {customer_session}"}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
    
    def test_financial_ledger_unauthenticated(self):
        """Unauthenticated request should be rejected"""
        response = requests.get(f"{BASE_URL}/api/admin/financial-ledger")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_financial_ledger_entry_structure(self, admin_session):
        """Verify ledger entry has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial-ledger?limit=1",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["entries"]) > 0:
            entry = data["entries"][0]
            required_fields = [
                "ledger_id", "event_type", "order_id", "currency",
                "usd_equivalent", "product_subtotal", "product_tax_amount",
                "product_tax_type", "platform_fee", "seller_net",
                "vat_rate_applied", "buyer_country", "created_at"
            ]
            for field in required_fields:
                assert field in entry, f"Entry missing required field: {field}"
            print(f"Entry event_type: {entry['event_type']}")
            print(f"Entry usd_equivalent: {entry['usd_equivalent']}")
    
    # === GET /api/admin/export/financial-report Tests ===
    
    def test_excel_export_admin_access(self, admin_session):
        """Admin should be able to download Excel report"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/financial-report",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify content type is xlsx
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "xlsx" in content_type or "octet-stream" in content_type, \
            f"Expected spreadsheet content type, got: {content_type}"
        
        # Verify content length
        content_length = len(response.content)
        assert content_length > 1000, f"Excel file too small: {content_length} bytes"
        print(f"Excel file size: {content_length} bytes")
    
    def test_excel_export_customer_forbidden(self, customer_session):
        """Customer should not download Excel report"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/financial-report",
            headers={"Authorization": f"Bearer {customer_session}"}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
    
    # === GET /api/payments/scheduled-payouts Tests ===
    
    def test_scheduled_payouts_admin_access(self, admin_session):
        """Admin should access scheduled payouts list"""
        response = requests.get(
            f"{BASE_URL}/api/payments/scheduled-payouts",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Scheduled payouts count: {len(data)}")
    
    def test_scheduled_payouts_customer_forbidden(self, customer_session):
        """Customer should not access scheduled payouts"""
        response = requests.get(
            f"{BASE_URL}/api/payments/scheduled-payouts",
            headers={"Authorization": f"Bearer {customer_session}"}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
    
    # === POST /api/payments/process-influencer-payouts Tests ===
    
    def test_process_payouts_admin_access(self, admin_session):
        """Admin should be able to trigger payout processing"""
        response = requests.post(
            f"{BASE_URL}/api/payments/process-influencer-payouts",
            headers={"Authorization": f"Bearer {admin_session}"},
            json={}
        )
        # Should be 200 even if no payouts to process
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"Process payouts response: {data}")
    
    def test_process_payouts_customer_forbidden(self, customer_session):
        """Customer should not process payouts"""
        response = requests.post(
            f"{BASE_URL}/api/payments/process-influencer-payouts",
            headers={"Authorization": f"Bearer {customer_session}"},
            json={}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
    
    # === POST /api/payments/refund/{order_id} Tests ===
    
    def test_refund_invalid_order(self, admin_session):
        """Refund for non-existent order should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/payments/refund/nonexistent_order_123",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_refund_customer_forbidden(self, customer_session):
        """Customer should not be able to refund orders"""
        response = requests.post(
            f"{BASE_URL}/api/payments/refund/any_order_id",
            headers={"Authorization": f"Bearer {customer_session}"}
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
    
    # === Filter Tests ===
    
    def test_financial_ledger_filter_by_event_type(self, admin_session):
        """Test ledger filtering by event_type"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial-ledger?event_type=order_paid",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # If there are entries, all should be order_paid type
        for entry in data["entries"]:
            assert entry["event_type"] == "order_paid", f"Expected order_paid, got {entry['event_type']}"
        print(f"Filtered entries (order_paid): {len(data['entries'])}")
    
    def test_financial_ledger_filter_by_date_range(self, admin_session):
        """Test ledger filtering by date range"""
        response = requests.get(
            f"{BASE_URL}/api/admin/financial-ledger?date_from=2026-01-01&date_to=2026-12-31",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Entries in date range: {len(data['entries'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
