// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { resolveOpenChatTarget } from '../components/BottomNavBar';
import { getToastConversationTarget } from '../components/notifications/ChatToastContainer';

describe('ChatToastContainer toast navigation', () => {
  it('navigates to the conversation route when a toast has a conversation id', () => {
    expect(getToastConversationTarget({ conversationId: 'conv_123', senderId: 'user_9' })).toBe('/messages/conv_123');
  });

  it('falls back to the inbox when conversation id is missing', () => {
    expect(getToastConversationTarget({ senderId: 'user_9' })).toBe('/messages');
  });
});

describe('BottomNavBar open chat target resolution', () => {
  it('uses conversation id when provided by event detail', () => {
    expect(resolveOpenChatTarget({ conversationId: 'conv_44' })).toBe('/messages/conv_44');
  });

  it('uses new-conversation route when a target user id is provided', () => {
    expect(resolveOpenChatTarget({ userId: 'user_9' })).toBe('/messages/new?to=user_9');
  });

  it('falls back to inbox when no detail is provided', () => {
    expect(resolveOpenChatTarget(undefined)).toBe('/messages');
  });
});