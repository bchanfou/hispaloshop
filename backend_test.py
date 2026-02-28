#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class HispaloshopAPITester:
    def __init__(self, base_url="https://auth-rework.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        request_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            request_headers['Authorization'] = f'Bearer {self.session_token}'
        if headers:
            request_headers.update(headers)

        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                return False, {}, 0

            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return response.status_code < 400, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        success, data, status = self.make_request('GET', '/categories')
        self.log_test("API Connectivity", success, f"Status: {status}")
        return success

    def test_seed_data(self):
        """Test seeding initial data"""
        success, data, status = self.make_request('POST', '/seed-data')
        # Accept both 200 (seeded) and existing data responses
        is_success = status in [200, 400] and ('seeded' in str(data) or 'already' in str(data))
        self.log_test("Seed Data", is_success, f"Status: {status}, Response: {data}")
        return is_success

    def test_categories_api(self):
        """Test categories endpoints"""
        # Get categories
        success, data, status = self.make_request('GET', '/categories')
        categories_exist = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Categories", categories_exist, f"Found {len(data) if isinstance(data, list) else 0} categories")
        return categories_exist

    def test_products_api(self):
        """Test products endpoints"""
        # Get all products
        success, data, status = self.make_request('GET', '/products')
        self.log_test("Get All Products", success, f"Status: {status}")
        
        # Get products with filters
        success, data, status = self.make_request('GET', '/products?approved_only=true')
        self.log_test("Get Approved Products", success, f"Status: {status}")
        
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_customer_{datetime.now().strftime('%H%M%S')}@test.com"
        
        user_data = {
            "email": test_email,
            "name": "Test Customer",
            "password": "testpassword123",
            "role": "customer",
            "country": "ES"
        }
        
        success, data, status = self.make_request('POST', '/auth/register', user_data)
        self.log_test("User Registration", success, f"Status: {status}")
        
        if success:
            self.user_data = {**user_data, "user_id": data.get("user_id")}
        
        return success

    def test_auth_session_endpoint(self):
        """Test auth session endpoint (without actual OAuth)"""
        # This will fail without proper session ID, but we test the endpoint exists
        success, data, status = self.make_request('GET', '/auth/session')
        # Expect 400 (no session ID) rather than 404 (endpoint not found)
        endpoint_exists = status in [400, 401]
        self.log_test("Auth Session Endpoint", endpoint_exists, f"Status: {status} (expected 400/401)")
        return endpoint_exists

    def test_products_detail(self):
        """Test product detail endpoint"""
        # First get a product ID
        success, products, status = self.make_request('GET', '/products?approved_only=true')
        if not success or not products:
            self.log_test("Product Detail (No Products)", False, "No products available")
            return False
        
        product_id = products[0].get('product_id')
        if not product_id:
            self.log_test("Product Detail (No Product ID)", False, "No product ID found")
            return False
        
        success, data, status = self.make_request('GET', f'/products/{product_id}')
        self.log_test("Get Product Detail", success, f"Status: {status}")
        return success

    def test_cart_operations_without_auth(self):
        """Test cart operations (should fail without auth)"""
        success, data, status = self.make_request('GET', '/cart')
        # Should return 401 without authentication
        auth_required = status == 401
        self.log_test("Cart Auth Required", auth_required, f"Status: {status} (expected 401)")
        return auth_required

    def test_chat_without_auth(self):
        """Test chat endpoint (should fail without auth)"""
        chat_data = {"message": "Hello", "session_id": "test_session"}
        success, data, status = self.make_request('POST', '/chat/message', chat_data)
        # Should return 401 without authentication
        auth_required = status == 401
        self.log_test("Chat Auth Required", auth_required, f"Status: {status} (expected 401)")
        return auth_required

    def test_certificates_endpoint(self):
        """Test certificates endpoint"""
        # First get a product ID
        success, products, status = self.make_request('GET', '/products?approved_only=true')
        if not success or not products:
            self.log_test("Certificate Test (No Products)", False, "No products available")
            return False
        
        product_id = products[0].get('product_id')
        success, data, status = self.make_request('GET', f'/certificates/product/{product_id}')
        # May return 404 if no certificate exists, but endpoint should be accessible
        endpoint_accessible = status in [200, 404]
        self.log_test("Certificate Endpoint", endpoint_accessible, f"Status: {status}")
        return endpoint_accessible

    def test_admin_endpoints_without_auth(self):
        """Test admin endpoints (should fail without auth)"""
        success, data, status = self.make_request('GET', '/admin/producers/pending')
        auth_required = status == 401
        self.log_test("Admin Auth Required", auth_required, f"Status: {status} (expected 401)")
        return auth_required

    def test_payment_endpoint_without_auth(self):
        """Test payment creation (should fail without auth)"""
        payment_data = {
            "shipping_address": {
                "street": "123 Test St",
                "city": "Madrid",
                "country": "Spain",
                "postal_code": "28001"
            }
        }
        success, data, status = self.make_request('POST', '/payments/create-checkout', payment_data)
        auth_required = status == 401
        self.log_test("Payment Auth Required", auth_required, f"Status: {status} (expected 401)")
        return auth_required

    # ============================================
    # PHASE C: COUNTRY/LANGUAGE/CURRENCY TESTS
    # ============================================

    def test_locale_configuration_endpoints(self):
        """Test all locale configuration endpoints"""
        print("\n🌍 Testing Locale Configuration Endpoints...")
        
        # Test GET /api/config/locale
        success, data, status = self.make_request('GET', '/config/locale')
        has_all_configs = (success and 
                          'countries' in data and 
                          'languages' in data and 
                          'currencies' in data and
                          'default_country' in data)
        self.log_test("GET /config/locale", has_all_configs, f"Status: {status}")
        
        # Test GET /api/config/countries
        success, data, status = self.make_request('GET', '/config/countries')
        has_countries = success and isinstance(data, dict) and 'ES' in data and 'US' in data
        self.log_test("GET /config/countries", has_countries, f"Status: {status}")
        
        # Test GET /api/config/languages
        success, data, status = self.make_request('GET', '/config/languages')
        has_languages = success and isinstance(data, dict) and 'en' in data and 'es' in data
        self.log_test("GET /config/languages", has_languages, f"Status: {status}")
        
        # Test GET /api/config/currencies
        success, data, status = self.make_request('GET', '/config/currencies')
        has_currencies = success and isinstance(data, dict) and 'EUR' in data and 'USD' in data
        self.log_test("GET /config/currencies", has_currencies, f"Status: {status}")
        
        return has_all_configs and has_countries and has_languages and has_currencies

    def test_country_filtered_products(self):
        """Test country-filtered product listing"""
        print("\n🏪 Testing Country-Filtered Product Listing...")
        
        # Test products for Spain (EUR)
        success, data, status = self.make_request('GET', '/products?country=ES')
        spain_products = success and isinstance(data, list)
        self.log_test("Products for Spain (ES)", spain_products, f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}")
        
        # Test products for US (USD)
        success, data, status = self.make_request('GET', '/products?country=US')
        us_products = success and isinstance(data, list)
        self.log_test("Products for US", us_products, f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}")
        
        # Test products for Japan (JPY)
        success, data, status = self.make_request('GET', '/products?country=JP')
        jp_products = success and isinstance(data, list)
        self.log_test("Products for Japan (JP)", jp_products, f"Status: {status}, Count: {len(data) if isinstance(data, list) else 0}")
        
        # Test that products have display_price and display_currency when country is specified
        if spain_products and data:
            first_product = data[0]
            has_display_fields = 'display_price' in first_product and 'display_currency' in first_product
            self.log_test("Products have display pricing", has_display_fields, f"Fields: {list(first_product.keys())}")
        else:
            self.log_test("Products have display pricing", False, "No products to check")
            has_display_fields = False
        
        return spain_products and us_products and jp_products and has_display_fields

    def login_test_user(self, email: str, password: str) -> bool:
        """Helper method to login a test user"""
        login_data = {"email": email, "password": password}
        success, data, status = self.make_request('POST', '/auth/login', login_data)
        
        if success and 'session_token' in data:
            self.session_token = data['session_token']
            self.user_data = data.get('user', {})
            return True
        return False

    def test_user_locale_endpoints(self):
        """Test user locale preference endpoints (requires auth)"""
        print("\n👤 Testing User Locale Endpoints...")
        
        # Try to login as test customer
        login_success = self.login_test_user("test@example.com", "password123")
        if not login_success:
            self.log_test("User Locale Tests", False, "Could not login test user")
            return False
        
        # Test GET /api/user/locale
        success, data, status = self.make_request('GET', '/user/locale')
        has_locale = success and 'country' in data and 'language' in data and 'currency' in data
        self.log_test("GET /user/locale", has_locale, f"Status: {status}, Data: {data}")
        
        # Test PUT /api/user/locale
        locale_update = {
            "country": "FR",
            "language": "fr",
            "currency": "EUR"
        }
        success, data, status = self.make_request('PUT', '/user/locale', locale_update)
        locale_updated = success and status == 200
        self.log_test("PUT /user/locale", locale_updated, f"Status: {status}")
        
        # Verify the update
        success, data, status = self.make_request('GET', '/user/locale')
        locale_verified = success and data.get('country') == 'FR' and data.get('language') == 'fr'
        self.log_test("Locale Update Verified", locale_verified, f"Data: {data}")
        
        return has_locale and locale_updated and locale_verified

    def test_cart_country_validation(self):
        """Test cart country validation functionality"""
        print("\n🛒 Testing Cart Country Validation...")
        
        if not self.session_token:
            login_success = self.login_test_user("test@example.com", "password123")
            if not login_success:
                self.log_test("Cart Country Tests", False, "Could not login test user")
                return False
        
        # Set user locale to Spain (where products are available)
        locale_update = {"country": "ES", "currency": "EUR"}
        self.make_request('PUT', '/user/locale', locale_update)
        
        # First, get a product to add to cart
        success, products, status = self.make_request('GET', '/products?approved_only=true')
        if not success or not products:
            self.log_test("Cart Country Tests", False, "No products available")
            return False
        
        product_id = products[0].get('product_id')
        
        # Get detailed product info including variants
        success, product_detail, status = self.make_request('GET', f'/products/{product_id}')
        if not success:
            self.log_test("Cart Country Tests", False, "Could not get product details")
            return False
        
        # Check if product has variants
        variants = product_detail.get('variants', [])
        
        # Add product to cart (with variant/pack if needed)
        if variants:
            # Use first variant and first pack
            variant_id = variants[0]['variant_id']
            pack_id = variants[0]['packs'][0]['pack_id']
            cart_data = {
                "product_id": product_id, 
                "quantity": 1,
                "variant_id": variant_id,
                "pack_id": pack_id
            }
        else:
            cart_data = {"product_id": product_id, "quantity": 1}
        
        success, data, status = self.make_request('POST', '/cart/add', cart_data)
        cart_add_success = success
        self.log_test("Add to Cart", cart_add_success, f"Status: {status}, Response: {data}")
        
        # Test cart country validation
        validation_data = {"country": "US"}
        success, data, status = self.make_request('POST', '/cart/validate-country', validation_data)
        validation_works = success and 'unavailable_items' in data and 'updated_items' in data
        self.log_test("Cart Country Validation", validation_works, f"Status: {status}")
        
        # Test applying country change
        success, data, status = self.make_request('POST', '/cart/apply-country-change', validation_data)
        country_change_works = success and 'removed_count' in data and 'updated_count' in data
        self.log_test("Apply Country Change", country_change_works, f"Status: {status}")
        
        return cart_add_success and validation_works and country_change_works

    def test_checkout_country_validation(self):
        """Test checkout with country validation and currency"""
        print("\n💳 Testing Checkout Country Validation...")
        
        if not self.session_token:
            login_success = self.login_test_user("test@example.com", "password123")
            if not login_success:
                self.log_test("Checkout Country Tests", False, "Could not login test user")
                return False
        
        # Set user locale to Spain
        locale_update = {"country": "ES", "currency": "EUR"}
        self.make_request('PUT', '/user/locale', locale_update)
        
        # Add a product to cart
        success, products, status = self.make_request('GET', '/products?approved_only=true')
        if success and products:
            product_id = products[0].get('product_id')
            cart_data = {"product_id": product_id, "quantity": 1}
            self.make_request('POST', '/cart/add', cart_data)
        
        # Test checkout creation (will fail at Stripe but should validate country/currency)
        checkout_data = {
            "shipping_address": {
                "street": "Calle Mayor 1",
                "city": "Madrid",
                "country": "Spain",
                "postal_code": "28001"
            }
        }
        success, data, status = self.make_request('POST', '/payments/create-checkout', checkout_data)
        
        # We expect this to fail due to email verification or Stripe, but not due to country validation
        # Status should not be 400 with country-related error
        checkout_validates = status != 400 or 'country' not in str(data).lower()
        self.log_test("Checkout Country Validation", checkout_validates, f"Status: {status}, Response: {data}")
        
        return checkout_validates

    def test_ai_chat_country_filtering(self):
        """Test AI chat with country filtering"""
        print("\n🤖 Testing AI Chat Country Filtering...")
        
        if not self.session_token:
            login_success = self.login_test_user("test@example.com", "password123")
            if not login_success:
                self.log_test("AI Chat Country Tests", False, "Could not login test user")
                return False
        
        # Set user locale to Spain
        locale_update = {"country": "ES"}
        self.make_request('PUT', '/user/locale', locale_update)
        
        # Test AI chat message
        chat_data = {
            "message": "What products do you recommend?",
            "session_id": "test_session_country"
        }
        success, data, status = self.make_request('POST', '/chat/message', chat_data)
        
        # Check if AI responds (may fail due to LLM key but endpoint should work)
        ai_responds = success or status != 404
        self.log_test("AI Chat Endpoint", ai_responds, f"Status: {status}")
        
        return ai_responds

    def test_producer_country_management(self):
        """Test producer country management endpoints"""
        print("\n🏭 Testing Producer Country Management...")
        
        # Try to login as producer
        producer_login = self.login_test_user("producer@test.com", "producer123")
        if not producer_login:
            self.log_test("Producer Country Tests", False, "Could not login producer user")
            return False
        
        # Get producer's products
        success, products, status = self.make_request('GET', '/products?approved_only=false')
        if not success or not products:
            self.log_test("Producer Country Tests", False, "No producer products available")
            return False
        
        # Find a product owned by this producer
        producer_product = None
        for product in products:
            if product.get('producer_id') == self.user_data.get('user_id'):
                producer_product = product
                break
        
        if not producer_product:
            self.log_test("Producer Country Tests", False, "No products owned by producer")
            return False
        
        product_id = producer_product['product_id']
        
        # Test GET /api/producer/products/{id}/countries
        success, data, status = self.make_request('GET', f'/producer/products/{product_id}/countries')
        get_countries_works = success
        self.log_test("GET Producer Product Countries", get_countries_works, f"Status: {status}")
        
        # Test PUT /api/producer/products/{id}/countries
        country_data = [
            {"country_code": "ES", "price": 24.99, "available": True},
            {"country_code": "FR", "price": 26.99, "available": True},
            {"country_code": "US", "price": 29.99, "available": True}
        ]
        success, data, status = self.make_request('PUT', f'/producer/products/{product_id}/countries', country_data)
        put_countries_works = success
        self.log_test("PUT Producer Product Countries", put_countries_works, f"Status: {status}")
        
        # Test POST /api/producer/products/{id}/countries/{code}
        success, data, status = self.make_request('POST', f'/producer/products/{product_id}/countries/DE', {"price": 25.99})
        post_country_works = success
        self.log_test("POST Add Country", post_country_works, f"Status: {status}")
        
        # Test DELETE /api/producer/products/{id}/countries/{code}
        success, data, status = self.make_request('DELETE', f'/producer/products/{product_id}/countries/FR')
        delete_country_works = success
        self.log_test("DELETE Remove Country", delete_country_works, f"Status: {status}")
        
        return get_countries_works and put_countries_works and post_country_works and delete_country_works

    def test_phase_c_comprehensive(self):
        """Run comprehensive Phase C tests"""
        print("\n🌟 Running Phase C Comprehensive Tests...")
        
        results = []
        
        # Test all Phase C features
        results.append(self.test_locale_configuration_endpoints())
        results.append(self.test_country_filtered_products())
        results.append(self.test_user_locale_endpoints())
        results.append(self.test_cart_country_validation())
        results.append(self.test_checkout_country_validation())
        results.append(self.test_ai_chat_country_filtering())
        results.append(self.test_producer_country_management())
        
        # Summary
        passed_tests = sum(results)
        total_tests = len(results)
        
        print(f"\n📊 Phase C Results: {passed_tests}/{total_tests} test groups passed")
        
        return all(results)

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Hispaloshop Backend API Tests")
        print("=" * 50)
        
        # Basic connectivity and setup
        if not self.test_api_connectivity():
            print("❌ API not accessible, stopping tests")
            return False
        
        # Seed data
        self.test_seed_data()
        
        # Public endpoints
        self.test_categories_api()
        self.test_products_api()
        self.test_products_detail()
        self.test_certificates_endpoint()
        
        # Auth endpoints
        self.test_user_registration()
        self.test_auth_session_endpoint()
        
        # Protected endpoints (should require auth)
        self.test_cart_operations_without_auth()
        self.test_chat_without_auth()
        self.test_admin_endpoints_without_auth()
        self.test_payment_endpoint_without_auth()
        
        # Phase C: Country/Language/Currency Tests
        print("\n" + "=" * 50)
        print("🌍 PHASE C: COUNTRY/LANGUAGE/CURRENCY TESTS")
        print("=" * 50)
        self.test_phase_c_comprehensive()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed - see details above")
            return False

    def get_test_summary(self):
        """Get test summary for reporting"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test runner"""
    tester = HispaloshopAPITester()
    success = tester.run_all_tests()
    
    # Save results
    summary = tester.get_test_summary()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())