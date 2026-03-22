// @ts-nocheck
import { describe, it, expect } from 'vitest';

import { buildInternalChatStartConversationPayload } from '../features/chat/queries/useInternalChatQueries';

describe('Internal Chat Contracts', () => {
  it('builds a start conversation payload accepted by the legacy backend', () => {
    expect(buildInternalChatStartConversationPayload('user_123')).toEqual({
      recipient_id: 'user_123',
      other_user_id: 'user_123',
    });
  });
});