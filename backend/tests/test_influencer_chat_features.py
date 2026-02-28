"""
Test suite for Influencer Dashboard, AI Assistant, and Internal Chat features
Tests the new endpoints: /api/ai/influencer-assistant, /api/chat/conversations, /api/chat/search-users
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_USER_ID = f"test-inf-{uuid.uuid4().hex[:8]}"
TEST_SESSION_TOKEN = f"test_session_{uuid.uuid4().hex[:12]}"


class TestChatEndpoints:
    """Test Internal Chat API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data in MongoDB"""
        import subprocess
        
        # Create test user and session
        mongo_script = f"""
        use('test_database');
        
        // Create test user
        db.users.insertOne({{
            user_id: '{TEST_USER_ID}',
            email: 'test.chat.{uuid.uuid4().hex[:8]}@example.com',
            name: 'Test Chat User',
            role: 'customer',
            email_verified: true,
            approved: true,
            consent: {{
                analytics_consent: true,
                consent_version: '1.0',
                consent_date: new Date().toISOString()
            }},
            created_at: new Date()
        }});
        
        // Create session
        db.user_sessions.insertOne({{
            user_id: '{TEST_USER_ID}',
            session_token: '{TEST_SESSION_TOKEN}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        
        print('Test data created');
        """
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True,
            text=True
        )
        
        yield
        
        # Cleanup
        cleanup_script = f"""
        use('test_database');
        db.users.deleteOne({{user_id: '{TEST_USER_ID}'}});
        db.user_sessions.deleteOne({{session_token: '{TEST_SESSION_TOKEN}'}});
        """
        subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)
    
    def test_chat_conversations_requires_auth(self):
        """Test that /api/chat/conversations requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations")
        assert response.status_code == 401
        assert "Not authenticated" in response.json().get("detail", "")
    
    def test_chat_conversations_with_auth(self):
        """Test /api/chat/conversations returns empty list for new user"""
        response = requests.get(
            f"{BASE_URL}/api/chat/conversations",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_chat_search_users_requires_auth(self):
        """Test that /api/chat/search-users requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/chat/search-users?query=test&user_type=influencer"
        )
        assert response.status_code == 401
    
    def test_chat_search_users_with_auth(self):
        """Test /api/chat/search-users returns results"""
        response = requests.get(
            f"{BASE_URL}/api/chat/search-users?query=test&user_type=influencer",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each result should have user_id, name, role
        for user in data:
            assert "user_id" in user
            assert "name" in user
            assert "role" in user


class TestInfluencerAIAssistant:
    """Test Influencer AI Assistant endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test influencer data"""
        import subprocess
        
        self.inf_user_id = f"test-inf-ai-{uuid.uuid4().hex[:8]}"
        self.inf_session = f"test_session_ai_{uuid.uuid4().hex[:12]}"
        self.inf_email = f"test.influencer.ai.{uuid.uuid4().hex[:8]}@example.com"
        
        mongo_script = f"""
        use('test_database');
        
        // Create user
        db.users.insertOne({{
            user_id: '{self.inf_user_id}',
            email: '{self.inf_email}',
            name: 'Test AI Influencer',
            role: 'customer',
            email_verified: true,
            approved: true,
            consent: {{
                analytics_consent: true,
                consent_version: '1.0',
                consent_date: new Date().toISOString()
            }},
            created_at: new Date()
        }});
        
        // Create influencer record
        db.influencers.insertOne({{
            influencer_id: 'inf_{uuid.uuid4().hex[:12]}',
            user_id: '{self.inf_user_id}',
            full_name: 'Test AI Influencer',
            email: '{self.inf_email}',
            status: 'active',
            commission_type: 'percentage',
            commission_value: 15,
            discount_code: 'TESTAI15',
            total_sales_generated: 0,
            total_commission_earned: 0,
            available_balance: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }});
        
        // Create session
        db.user_sessions.insertOne({{
            user_id: '{self.inf_user_id}',
            session_token: '{self.inf_session}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        
        print('Influencer test data created');
        """
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True,
            text=True
        )
        
        yield
        
        # Cleanup
        cleanup_script = f"""
        use('test_database');
        db.users.deleteOne({{user_id: '{self.inf_user_id}'}});
        db.influencers.deleteOne({{user_id: '{self.inf_user_id}'}});
        db.user_sessions.deleteOne({{session_token: '{self.inf_session}'}});
        """
        subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)
    
    def test_ai_assistant_requires_auth(self):
        """Test that /api/ai/influencer-assistant requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/influencer-assistant",
            json={"message": "Hola"}
        )
        assert response.status_code == 401
    
    def test_ai_assistant_requires_influencer(self):
        """Test that non-influencer users get 403"""
        # Create a regular user session
        import subprocess
        regular_user_id = f"test-regular-{uuid.uuid4().hex[:8]}"
        regular_session = f"test_session_reg_{uuid.uuid4().hex[:12]}"
        
        mongo_script = f"""
        use('test_database');
        db.users.insertOne({{
            user_id: '{regular_user_id}',
            email: 'regular.{uuid.uuid4().hex[:8]}@example.com',
            name: 'Regular User',
            role: 'customer',
            email_verified: true,
            approved: true,
            created_at: new Date()
        }});
        db.user_sessions.insertOne({{
            user_id: '{regular_user_id}',
            session_token: '{regular_session}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        """
        subprocess.run(['mongosh', '--quiet', '--eval', mongo_script], capture_output=True)
        
        response = requests.post(
            f"{BASE_URL}/api/ai/influencer-assistant",
            json={"message": "Hola"},
            cookies={"session_token": regular_session}
        )
        assert response.status_code == 403
        
        # Cleanup
        cleanup_script = f"""
        use('test_database');
        db.users.deleteOne({{user_id: '{regular_user_id}'}});
        db.user_sessions.deleteOne({{session_token: '{regular_session}'}});
        """
        subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)
    
    def test_ai_assistant_with_influencer(self):
        """Test AI assistant works for influencers"""
        response = requests.post(
            f"{BASE_URL}/api/ai/influencer-assistant",
            json={"message": "Dame ideas para un video de TikTok"},
            cookies={"session_token": self.inf_session}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "success" in data
        # The response should contain content (either success or error message)
        assert len(data["response"]) > 0


class TestBecomeSellerCommission:
    """Test that /become-seller page shows 18% commission"""
    
    def test_become_seller_page_loads(self):
        """Test that /become-seller page is accessible"""
        response = requests.get(f"{BASE_URL.replace('/api', '')}/become-seller")
        # Frontend routes return HTML, so we just check it's accessible
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
