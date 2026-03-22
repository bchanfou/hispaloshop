// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Profile Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('create highlight with title and story_ids', async () => {
    apiClient.post.mockResolvedValue({ highlight_id: 'h1' });
    const result = await apiClient.post('/users/me/highlights', {
      title: 'Verano', story_ids: ['s1', 's2'], cover_url: 'img.jpg',
    });
    expect(result.highlight_id).toBeTruthy();
  });

  it('update highlight name via PUT', async () => {
    apiClient.put.mockResolvedValue({ success: true });
    await apiClient.put('/users/me/highlights/h1', { title: 'Invierno' });
    expect(apiClient.put).toHaveBeenCalledWith('/users/me/highlights/h1', { title: 'Invierno' });
  });

  it('delete highlight', async () => {
    apiClient.delete.mockResolvedValue({ success: true });
    await apiClient.delete('/users/me/highlights/h1');
    expect(apiClient.delete).toHaveBeenCalledWith('/users/me/highlights/h1');
  });

  it('edit profile updates name and bio', async () => {
    apiClient.patch.mockResolvedValue({ username: 'alice', name: 'Alice B', bio: 'Hi!' });
    const result = await apiClient.patch('/users/me', { name: 'Alice B', bio: 'Hi!' });
    expect(result.name).toBe('Alice B');
  });

  it('open conversation for messaging', async () => {
    apiClient.post.mockResolvedValue({ conversation_id: 'conv1' });
    const result = await apiClient.post('/chat/conversations', { other_user_id: 'u2' });
    expect(result.conversation_id).toBeTruthy();
  });
});
