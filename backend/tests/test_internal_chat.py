"""
Internal Chat System API Tests - Phase 1B
Tests for WebSocket-based real-time messaging, REST API endpoints, and message status indicators
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRODUCER_SESSION = 'session_1c7de88e440747b6a374e7a31173c966'  # Latest producer session
INFLUENCER_SESSION = 'test_session_influencer_1770861440332'
PRODUCER_USER_ID = 'user_testprod001'
INFLUENCER_USER_ID = 'test-influencer-1770861440332'
CONVERSATION_ID = 'conv_f01ee36854f6'


class TestInternalChatConversations:
    """Tests for /internal-chat/conversations endpoint"""
    
    def test_get_conversations_as_producer(self):
        """Producer should be able to get their conversations list"""
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations",
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should have at least one conversation
        if len(data) > 0:
            conv = data[0]
            assert "conversation_id" in conv, "Conversation should have conversation_id"
            assert "participants" in conv, "Conversation should have participants"
            assert "other_user_name" in conv, "Conversation should have other_user_name"
            assert "unread_count" in conv, "Conversation should have unread_count"
            print(f"✓ Producer has {len(data)} conversation(s)")
            print(f"  - First conversation with: {conv.get('other_user_name')}")
    
    def test_get_conversations_as_influencer(self):
        """Influencer should be able to get their conversations list"""
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations",
            cookies={"session_token": INFLUENCER_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Influencer has {len(data)} conversation(s)")
    
    def test_get_conversations_unauthorized(self):
        """Unauthenticated request should fail"""
        response = requests.get(f"{BASE_URL}/api/internal-chat/conversations")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized request correctly rejected")


class TestInternalChatMessages:
    """Tests for /internal-chat/conversations/{id}/messages endpoint"""
    
    def test_get_messages_for_conversation(self):
        """Should be able to get messages for a conversation"""
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations/{CONVERSATION_ID}/messages",
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            msg = data[0]
            assert "message_id" in msg, "Message should have message_id"
            assert "content" in msg, "Message should have content"
            assert "sender_id" in msg, "Message should have sender_id"
            assert "status" in msg, "Message should have status"
            assert "created_at" in msg, "Message should have created_at"
            print(f"✓ Conversation has {len(data)} message(s)")
            print(f"  - Latest message status: {msg.get('status')}")
    
    def test_get_messages_nonexistent_conversation(self):
        """Should return 404 for non-existent conversation"""
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations/nonexistent_conv/messages",
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent conversation correctly returns 404")


class TestSendMessage:
    """Tests for POST /internal-chat/messages endpoint"""
    
    def test_send_message_to_existing_conversation(self):
        """Should be able to send a message to an existing conversation"""
        test_content = f"Test message from pytest at {time.time()}"
        
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/messages",
            json={
                "conversation_id": CONVERSATION_ID,
                "content": test_content
            },
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message_id" in data, "Response should have message_id"
        assert data["content"] == test_content, "Content should match"
        assert data["sender_id"] == PRODUCER_USER_ID, "Sender should be producer"
        assert data["status"] in ["sent", "delivered"], f"Status should be sent or delivered, got {data['status']}"
        print(f"✓ Message sent successfully with status: {data['status']}")
        
        # Verify message appears in conversation
        verify_response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations/{CONVERSATION_ID}/messages",
            cookies={"session_token": PRODUCER_SESSION}
        )
        messages = verify_response.json()
        message_ids = [m["message_id"] for m in messages]
        assert data["message_id"] in message_ids, "Sent message should appear in conversation"
        print("✓ Message verified in conversation history")
    
    def test_send_message_empty_content(self):
        """Should reject empty message content"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/messages",
            json={
                "conversation_id": CONVERSATION_ID,
                "content": ""
            },
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 422, f"Expected 422 for empty content, got {response.status_code}"
        print("✓ Empty message correctly rejected")
    
    def test_send_message_without_conversation_or_recipient(self):
        """Should reject message without conversation_id or recipient_id"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/messages",
            json={
                "content": "Test message"
            },
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Message without conversation/recipient correctly rejected")


class TestStartConversation:
    """Tests for POST /internal-chat/start-conversation endpoint"""
    
    def test_start_conversation_with_existing_user(self):
        """Should be able to start/get conversation with another user"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/start-conversation?recipient_id={INFLUENCER_USER_ID}",
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "conversation_id" in data, "Response should have conversation_id"
        assert "is_new" in data, "Response should indicate if conversation is new"
        print(f"✓ Conversation started/retrieved: {data['conversation_id']}, is_new: {data['is_new']}")
    
    def test_start_conversation_with_nonexistent_user(self):
        """Should return 404 for non-existent recipient"""
        response = requests.post(
            f"{BASE_URL}/api/internal-chat/start-conversation?recipient_id=nonexistent_user_id",
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent recipient correctly returns 404")


class TestMarkMessageRead:
    """Tests for PUT /internal-chat/messages/{id}/read endpoint"""
    
    def test_mark_message_as_read(self):
        """Should be able to mark a message as read"""
        # First, get messages to find one to mark as read
        messages_response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations/{CONVERSATION_ID}/messages",
            cookies={"session_token": INFLUENCER_SESSION}
        )
        messages = messages_response.json()
        
        # Find a message from producer (not from influencer)
        producer_messages = [m for m in messages if m["sender_id"] == PRODUCER_USER_ID]
        
        if producer_messages:
            msg_id = producer_messages[0]["message_id"]
            response = requests.put(
                f"{BASE_URL}/api/internal-chat/messages/{msg_id}/read",
                cookies={"session_token": INFLUENCER_SESSION}
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            print(f"✓ Message {msg_id} marked as read")
        else:
            print("⚠ No producer messages found to mark as read")


class TestUnreadCount:
    """Tests for GET /internal-chat/unread-count endpoint"""
    
    def test_get_unread_count(self):
        """Should be able to get total unread message count"""
        response = requests.get(
            f"{BASE_URL}/api/internal-chat/unread-count",
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # API returns 'unread_count' field
        assert "unread_count" in data, "Response should have unread_count field"
        assert isinstance(data["unread_count"], int), "Count should be an integer"
        print(f"✓ Unread count: {data['unread_count']}")


class TestDirectoryEndpoints:
    """Tests for directory endpoints used by internal chat"""
    
    def test_get_influencers_directory(self):
        """Should be able to get list of influencers"""
        response = requests.get(f"{BASE_URL}/api/directory/influencers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Directory has {len(data)} influencer(s)")
    
    def test_get_producers_directory(self):
        """Should be able to get list of producers/stores"""
        response = requests.get(f"{BASE_URL}/api/directory/producers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Directory has {len(data)} producer(s)")


class TestMessageStatusIndicators:
    """Tests for message status indicators (sent, delivered, read)"""
    
    def test_message_status_flow(self):
        """Test the message status flow: sent -> delivered -> read"""
        # Send a new message
        test_content = f"Status test message {time.time()}"
        
        send_response = requests.post(
            f"{BASE_URL}/api/internal-chat/messages",
            json={
                "conversation_id": CONVERSATION_ID,
                "content": test_content
            },
            cookies={"session_token": PRODUCER_SESSION}
        )
        assert send_response.status_code == 200
        
        sent_msg = send_response.json()
        msg_id = sent_msg["message_id"]
        initial_status = sent_msg["status"]
        print(f"✓ Message sent with initial status: {initial_status}")
        
        # Verify status is 'sent' or 'delivered'
        assert initial_status in ["sent", "delivered"], f"Initial status should be sent or delivered, got {initial_status}"
        
        # Mark as read by influencer
        read_response = requests.put(
            f"{BASE_URL}/api/internal-chat/messages/{msg_id}/read",
            cookies={"session_token": INFLUENCER_SESSION}
        )
        assert read_response.status_code == 200, f"Failed to mark as read: {read_response.text}"
        print("✓ Message marked as read by recipient")
        
        # Verify status is now 'read'
        messages_response = requests.get(
            f"{BASE_URL}/api/internal-chat/conversations/{CONVERSATION_ID}/messages",
            cookies={"session_token": PRODUCER_SESSION}
        )
        messages = messages_response.json()
        
        updated_msg = next((m for m in messages if m["message_id"] == msg_id), None)
        assert updated_msg is not None, "Message should exist in conversation"
        assert updated_msg["status"] == "read", f"Status should be 'read', got {updated_msg['status']}"
        print(f"✓ Message status updated to: {updated_msg['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
