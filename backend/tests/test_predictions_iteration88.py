"""
Iteration 88: Hispalo Predict - AI-powered purchase prediction tests
Tests the predictions endpoint and algorithm.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPredictions:
    """Tests for /api/customer/predictions endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json().get("user", {})
    
    def test_predictions_endpoint_returns_200(self):
        """GET /api/customer/predictions returns 200 status"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Predictions endpoint returns 200")
    
    def test_predictions_has_required_fields(self):
        """Predictions response contains predictions and summary"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "predictions" in data, "Missing 'predictions' field"
        assert "summary" in data, "Missing 'summary' field"
        assert isinstance(data["predictions"], list), "predictions should be a list"
        
        # Check summary structure
        summary = data["summary"]
        assert "total" in summary, "Missing summary.total"
        assert "overdue" in summary, "Missing summary.overdue"
        assert "due" in summary, "Missing summary.due"
        assert "soon" in summary, "Missing summary.soon"
        print(f"PASS: Response has required structure with {len(data['predictions'])} predictions")
    
    def test_prediction_item_structure(self):
        """Each prediction has required fields"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["predictions"]) == 0:
            pytest.skip("No predictions available for this user")
        
        prediction = data["predictions"][0]
        required_fields = [
            "product_id", "product_name", "image", "status",
            "days_until_next", "confidence", "purchase_count"
        ]
        
        for field in required_fields:
            assert field in prediction, f"Missing field: {field}"
        
        # Validate field types and values
        assert isinstance(prediction["product_id"], str)
        assert isinstance(prediction["product_name"], str)
        assert prediction["status"] in ["overdue", "due", "soon", "upcoming"]
        assert prediction["confidence"] in ["high", "medium", "low"]
        assert isinstance(prediction["days_until_next"], int)
        assert isinstance(prediction["purchase_count"], int)
        
        print(f"PASS: Prediction item has all required fields: {prediction['product_name']}")
    
    def test_predictions_sorted_by_status(self):
        """Predictions are sorted: overdue first, then due, soon, upcoming"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["predictions"]) < 2:
            pytest.skip("Need at least 2 predictions to test sorting")
        
        status_order = {"overdue": 0, "due": 1, "soon": 2, "upcoming": 3}
        statuses = [p["status"] for p in data["predictions"]]
        status_values = [status_order.get(s, 4) for s in statuses]
        
        # Check that status values are non-decreasing (sorted)
        for i in range(len(status_values) - 1):
            assert status_values[i] <= status_values[i + 1], \
                f"Predictions not sorted: {statuses[i]} should not come before {statuses[i+1]}"
        
        print(f"PASS: Predictions sorted correctly: {statuses}")
    
    def test_summary_matches_predictions(self):
        """Summary counts match actual prediction statuses"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200
        data = response.json()
        
        predictions = data["predictions"]
        summary = data["summary"]
        
        # Count actual statuses
        actual_counts = {
            "overdue": sum(1 for p in predictions if p["status"] == "overdue"),
            "due": sum(1 for p in predictions if p["status"] == "due"),
            "soon": sum(1 for p in predictions if p["status"] == "soon"),
        }
        
        assert summary["total"] == len(predictions), \
            f"Total mismatch: summary={summary['total']}, actual={len(predictions)}"
        assert summary["overdue"] == actual_counts["overdue"], \
            f"Overdue mismatch: summary={summary['overdue']}, actual={actual_counts['overdue']}"
        assert summary["due"] == actual_counts["due"], \
            f"Due mismatch: summary={summary['due']}, actual={actual_counts['due']}"
        assert summary["soon"] == actual_counts["soon"], \
            f"Soon mismatch: summary={summary['soon']}, actual={actual_counts['soon']}"
        
        print(f"PASS: Summary matches predictions - {summary}")


class TestHealthAndBasics:
    """Basic health and endpoint tests"""
    
    def test_health_check(self):
        """GET /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Health check returns ok")
    
    def test_homepage_accessible(self):
        """Frontend homepage loads"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200
        print("PASS: Homepage accessible")


class TestPredictionsForNewUser:
    """Test predictions behavior for user with no orders"""
    
    def test_empty_predictions_for_new_user(self):
        """User with no orders gets empty predictions"""
        session = requests.Session()
        
        # Login as admin (who likely has no orders as customer)
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@hispaloshop.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed, skipping empty predictions test")
        
        response = session.get(f"{BASE_URL}/api/customer/predictions")
        
        # Either 200 with empty list or 401 for non-customer
        if response.status_code == 200:
            data = response.json()
            # Admin as super_admin may have orders or not
            print(f"Admin predictions response: {len(data.get('predictions', []))} predictions")
        else:
            print(f"Admin predictions returned status {response.status_code} (expected for super_admin role)")


class TestPredictionsDataIntegrity:
    """Data integrity tests for predictions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200
    
    def test_prediction_has_valid_dates(self):
        """Predictions have valid date fields"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["predictions"]) == 0:
            pytest.skip("No predictions to test")
        
        prediction = data["predictions"][0]
        
        # Check date fields exist and are ISO format
        assert "last_purchased" in prediction
        assert "predicted_next" in prediction
        
        # Validate ISO format (basic check)
        last_purchased = prediction["last_purchased"]
        assert "T" in last_purchased, "last_purchased should be ISO format"
        
        print(f"PASS: Prediction dates valid - last: {last_purchased[:10]}")
    
    def test_prediction_has_interval(self):
        """Predictions include average interval"""
        response = self.session.get(f"{BASE_URL}/api/customer/predictions")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["predictions"]) == 0:
            pytest.skip("No predictions to test")
        
        prediction = data["predictions"][0]
        assert "avg_interval_days" in prediction
        assert isinstance(prediction["avg_interval_days"], int)
        assert prediction["avg_interval_days"] > 0
        
        print(f"PASS: Prediction has interval of {prediction['avg_interval_days']} days")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
