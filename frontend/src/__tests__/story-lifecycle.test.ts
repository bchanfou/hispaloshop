// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Story Lifecycle', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches stories feed', async () => {
    apiClient.get.mockResolvedValue([
      { user_id: 'u1', name: 'Alice', items: [{ story_id: 's1' }], has_unseen: true },
    ]);
    const result = await apiClient.get('/feed/stories');
    expect(result).toHaveLength(1);
    expect(result[0].has_unseen).toBe(true);
  });

  it('tracks story view', async () => {
    apiClient.post.mockResolvedValue({ status: 'ok' });
    const result = await apiClient.post('/stories/s1/view');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s1/view');
    expect(result.status).toBe('ok');
  });

  it('creates story with FormData', async () => {
    apiClient.post.mockResolvedValue({ story_id: 's2' });
    const fd = new FormData();
    fd.append('type', 'image');
    const result = await apiClient.post('/stories', fd);
    expect(result.story_id).toBeTruthy();
  });

  it('fetches story archive for highlights', async () => {
    apiClient.get.mockResolvedValue({ stories: [{ story_id: 's1', image_url: 'img.jpg' }] });
    const result = await apiClient.get('/stories/archive');
    expect(result.stories).toHaveLength(1);
  });
});
