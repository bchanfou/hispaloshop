// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { resolveChatToastTarget } from '../components/BottomNavBar';

describe('BottomNavBar chat toast navigation', () => {
  it('navigates to the conversation route when a toast has a conversation id', () => {
    expect(resolveChatToastTarget({ conversationId: 'conv_123', senderId: 'user_9' })).toBe('/messages/conv_123');
  });

  it('falls back to the inbox when conversation id is missing', () => {
    expect(resolveChatToastTarget({ senderId: 'user_9' })).toBe('/messages');
  });
});