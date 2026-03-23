// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { normalizeHIConversation } from '../features/chat/queries/useHIChatQueries';

describe('HI chat contracts', () => {
  it('aligns id and conversation_id for hi conversations', () => {
    expect(normalizeHIConversation({ conversation_id: 'conv_hi_1' })).toEqual({
      conversation_id: 'conv_hi_1',
      id: 'conv_hi_1',
    });
  });
});