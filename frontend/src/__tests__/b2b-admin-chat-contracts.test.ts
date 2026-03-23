// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { getB2BConversationId } from '../pages/b2b/B2BChatPage';
import { getEscalationConversationId } from '../pages/admin/EscalationChat';

describe('B2B and escalation chat contracts', () => {
  it('resolves B2B conversation ids from conversation_id or id', () => {
    expect(getB2BConversationId({ conversation_id: 'b2b_1' })).toBe('b2b_1');
    expect(getB2BConversationId({ id: 'b2b_2' })).toBe('b2b_2');
  });

  it('resolves escalation conversation ids from conversation_id or id', () => {
    expect(getEscalationConversationId({ conversation_id: 'esc_1' })).toBe('esc_1');
    expect(getEscalationConversationId({ id: 'esc_2' })).toBe('esc_2');
  });
});