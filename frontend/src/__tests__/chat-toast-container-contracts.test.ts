// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { getToastConversationId, getToastConversationTarget } from '../components/notifications/ChatToastContainer';

describe('Chat toast contracts', () => {
  it('resolves conversation ids from either conversationId or conversation_id', () => {
    expect(getToastConversationId({ conversationId: 'conv_1' })).toBe('conv_1');
    expect(getToastConversationId({ conversation_id: 'conv_2' })).toBe('conv_2');
  });

  it('falls back to inbox when no conversation id is present', () => {
    expect(getToastConversationTarget({ senderId: 'user_1' })).toBe('/messages');
  });
});