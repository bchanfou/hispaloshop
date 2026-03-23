// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { normalizeChatConversation } from '../context/chat/ChatProvider';

describe('ChatProvider conversation contracts', () => {
  it('keeps id and conversation_id aligned when backend returns only conversation_id', () => {
    expect(normalizeChatConversation({ conversation_id: 'conv_1', unread_count: 2 })).toEqual({
      conversation_id: 'conv_1',
      id: 'conv_1',
      unread_count: 2,
    });
  });

  it('keeps id and conversation_id aligned when backend returns only id', () => {
    expect(normalizeChatConversation({ id: 'conv_2', unread_count: 1 })).toEqual({
      id: 'conv_2',
      conversation_id: 'conv_2',
      unread_count: 1,
    });
  });
});
