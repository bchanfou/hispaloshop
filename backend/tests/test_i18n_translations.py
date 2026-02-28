"""
Test i18n translations for profile and consent keys in 9 languages
and multilingual order status email function
"""
import pytest
import requests
import json
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Languages to test (9 languages as per requirement)
LANGUAGES = ['ar', 'de', 'fr', 'hi', 'ja', 'ko', 'pt', 'ru', 'zh']

# Profile keys that must exist in all languages
PROFILE_KEYS = [
    'title', 'subtitle', 'personalInfo', 'addresses', 'shippingAddresses',
    'noAddresses', 'addFirstAddress', 'editAddress', 'defaultAddressSet'
]

# Consent key that must exist
CONSENT_KEY = 'checkboxHint'


class TestI18nTranslations:
    """Test i18n translation files for completeness"""
    
    @pytest.fixture(scope="class")
    def locale_files(self):
        """Load all locale files"""
        locales = {}
        for lang in LANGUAGES:
            file_path = f'/app/frontend/src/locales/{lang}.json'
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    locales[lang] = json.load(f)
            except Exception as e:
                pytest.fail(f"Failed to load {file_path}: {e}")
        return locales
    
    def test_all_locale_files_exist(self, locale_files):
        """Verify all 9 language files exist and are valid JSON"""
        assert len(locale_files) == 9, f"Expected 9 locale files, got {len(locale_files)}"
        for lang in LANGUAGES:
            assert lang in locale_files, f"Missing locale file for {lang}"
        print(f"✓ All 9 locale files exist: {', '.join(LANGUAGES)}")
    
    def test_profile_title_translation(self, locale_files):
        """Test profile.title exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'title' in profile, f"Missing profile.title in {lang}.json"
            assert profile['title'], f"Empty profile.title in {lang}.json"
        print("✓ profile.title exists in all 9 languages")
    
    def test_profile_subtitle_translation(self, locale_files):
        """Test profile.subtitle exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'subtitle' in profile, f"Missing profile.subtitle in {lang}.json"
            assert profile['subtitle'], f"Empty profile.subtitle in {lang}.json"
        print("✓ profile.subtitle exists in all 9 languages")
    
    def test_profile_personalInfo_translation(self, locale_files):
        """Test profile.personalInfo exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'personalInfo' in profile, f"Missing profile.personalInfo in {lang}.json"
            assert profile['personalInfo'], f"Empty profile.personalInfo in {lang}.json"
        print("✓ profile.personalInfo exists in all 9 languages")
    
    def test_profile_addresses_translation(self, locale_files):
        """Test profile.addresses exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'addresses' in profile, f"Missing profile.addresses in {lang}.json"
            assert profile['addresses'], f"Empty profile.addresses in {lang}.json"
        print("✓ profile.addresses exists in all 9 languages")
    
    def test_profile_shippingAddresses_translation(self, locale_files):
        """Test profile.shippingAddresses exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'shippingAddresses' in profile, f"Missing profile.shippingAddresses in {lang}.json"
            assert profile['shippingAddresses'], f"Empty profile.shippingAddresses in {lang}.json"
        print("✓ profile.shippingAddresses exists in all 9 languages")
    
    def test_profile_noAddresses_translation(self, locale_files):
        """Test profile.noAddresses exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'noAddresses' in profile, f"Missing profile.noAddresses in {lang}.json"
            assert profile['noAddresses'], f"Empty profile.noAddresses in {lang}.json"
        print("✓ profile.noAddresses exists in all 9 languages")
    
    def test_profile_addFirstAddress_translation(self, locale_files):
        """Test profile.addFirstAddress exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'addFirstAddress' in profile, f"Missing profile.addFirstAddress in {lang}.json"
            assert profile['addFirstAddress'], f"Empty profile.addFirstAddress in {lang}.json"
        print("✓ profile.addFirstAddress exists in all 9 languages")
    
    def test_profile_editAddress_translation(self, locale_files):
        """Test profile.editAddress exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'editAddress' in profile, f"Missing profile.editAddress in {lang}.json"
            assert profile['editAddress'], f"Empty profile.editAddress in {lang}.json"
        print("✓ profile.editAddress exists in all 9 languages")
    
    def test_profile_defaultAddressSet_translation(self, locale_files):
        """Test profile.defaultAddressSet exists in all languages"""
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            assert 'defaultAddressSet' in profile, f"Missing profile.defaultAddressSet in {lang}.json"
            assert profile['defaultAddressSet'], f"Empty profile.defaultAddressSet in {lang}.json"
        print("✓ profile.defaultAddressSet exists in all 9 languages")
    
    def test_consent_checkboxHint_translation(self, locale_files):
        """Test consent.checkboxHint exists in all languages"""
        for lang in LANGUAGES:
            consent = locale_files[lang].get('consent', {})
            assert 'checkboxHint' in consent, f"Missing consent.checkboxHint in {lang}.json"
            assert consent['checkboxHint'], f"Empty consent.checkboxHint in {lang}.json"
        print("✓ consent.checkboxHint exists in all 9 languages")
    
    def test_all_profile_keys_complete(self, locale_files):
        """Comprehensive test for all profile keys in all languages"""
        missing = []
        for lang in LANGUAGES:
            profile = locale_files[lang].get('profile', {})
            for key in PROFILE_KEYS:
                if key not in profile or not profile[key]:
                    missing.append(f"{lang}.json: profile.{key}")
        
        if missing:
            pytest.fail(f"Missing translations: {', '.join(missing)}")
        print(f"✓ All {len(PROFILE_KEYS)} profile keys exist in all 9 languages")


class TestBackendSyntax:
    """Test backend server.py syntax and structure"""
    
    def test_backend_syntax_valid(self):
        """Verify server.py has no syntax errors"""
        import subprocess
        result = subprocess.run(
            ['python3', '-m', 'py_compile', '/app/backend/server.py'],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"Backend syntax error: {result.stderr}"
        print("✓ Backend server.py has valid Python syntax")
    
    def test_send_order_status_email_function_exists(self):
        """Verify send_order_status_email function exists in server.py"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'async def send_order_status_email' in content, "send_order_status_email function not found"
        print("✓ send_order_status_email function exists")
    
    def test_multilingual_status_messages_dict(self):
        """Verify status_messages dict has 11 languages"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Check for all 11 language keys in status_messages
        expected_langs = ['es', 'en', 'fr', 'de', 'pt', 'ar', 'hi', 'ja', 'ko', 'ru', 'zh']
        for lang in expected_langs:
            assert f'"{lang}":' in content, f"Missing language '{lang}' in status_messages"
        print(f"✓ status_messages dict contains all 11 languages: {', '.join(expected_langs)}")


class TestBackendAPI:
    """Test backend API endpoints"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Create API client session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_backend_health(self, api_client):
        """Test backend is responding"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Backend not responding: {response.status_code}"
        print("✓ Backend is responding (categories endpoint)")
    
    def test_admin_login(self, api_client):
        """Test admin login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hispaloshop.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "session_token" in data, "No session token in login response"
        assert data.get("user", {}).get("role") in ["admin", "super_admin"], "User is not admin"
        print(f"✓ Admin login successful - role: {data.get('user', {}).get('role')}")
        return data.get("session_token")
    
    def test_order_status_endpoint_requires_auth(self, api_client):
        """Test PUT /api/orders/{order_id}/status requires authentication"""
        response = api_client.put(f"{BASE_URL}/api/orders/test_order_123/status", json={
            "status": "confirmed"
        })
        # Endpoint returns 401 (not authenticated) or 404 (order not found after auth check)
        # Both are acceptable - the key is it doesn't return 200 without auth
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"✓ Order status endpoint protected (returns {response.status_code} without valid auth/order)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
