// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { getChatMessageId, isChatMessageRead } from '../pages/chat/ChatPage';

describe('ChatPage message contracts', () => {
  it('resolves message ids from either message_id or id', () => {
    expect(getChatMessageId({ message_id: 'msg_1' })).toBe('msg_1');
    expect(getChatMessageId({ id: 'msg_2' })).toBe('msg_2');
  });

  it('treats both read flag and read status as read', () => {
    expect(isChatMessageRead({ read: true })).toBe(true);
    expect(isChatMessageRead({ status: 'read' })).toBe(true);
    expect(isChatMessageRead({ status: 'delivered' })).toBe(false);
  });
});