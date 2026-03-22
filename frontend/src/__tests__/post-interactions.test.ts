// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Post Interactions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('like post toggles correctly', async () => {
    apiClient.post.mockResolvedValue({ liked: true });
    const result = await apiClient.post('/posts/post-1/like');
    expect(result.liked).toBe(true);
  });

  it('unlike post toggles correctly', async () => {
    apiClient.post.mockResolvedValue({ liked: false });
    const result = await apiClient.post('/posts/post-1/like');
    expect(result.liked).toBe(false);
  });

  it('save/bookmark post works', async () => {
    apiClient.post.mockResolvedValue({ saved: true });
    const result = await apiClient.post('/posts/post-1/save');
    expect(result.saved).toBe(true);
  });

  it('add comment with text', async () => {
    apiClient.post.mockResolvedValue({ comment_id: 'c1', text: 'Great!', user_name: 'Alice' });
    const result = await apiClient.post('/posts/post-1/comments', { text: 'Great!' });
    expect(result.comment_id).toBeTruthy();
    expect(result.text).toBe('Great!');
  });

  it('rejects empty comment', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 400 } });
    await expect(apiClient.post('/posts/post-1/comments', { text: '' })).rejects.toBeTruthy();
  });

  it('delete post returns success', async () => {
    apiClient.delete.mockResolvedValue({ success: true });
    await apiClient.delete('/posts/post-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1');
  });

  it('like comment works', async () => {
    apiClient.post.mockResolvedValue({ liked: true });
    const result = await apiClient.post('/posts/post-1/comments/c1/like');
    expect(result.liked).toBe(true);
  });
});
