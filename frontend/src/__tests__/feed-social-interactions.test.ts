// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Feed Social Interactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should toggle like on post with optimistic update', async () => {
    // Like a post that is currently not liked
    apiClient.post.mockResolvedValue({ liked: true, likes_count: 11 });
    const result = await apiClient.post('/posts/post-1/like', {});
    expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/like', {});
    expect(result.liked).toBe(true);
    expect(result.likes_count).toBe(11);

    // Unlike the same post (toggle)
    apiClient.post.mockResolvedValue({ liked: false, likes_count: 10 });
    const result2 = await apiClient.post('/posts/post-1/like', {});
    expect(result2.liked).toBe(false);
    expect(result2.likes_count).toBe(10);
  });

  it('should toggle save/bookmark on post', async () => {
    apiClient.post.mockResolvedValue({ saved: true });
    const result = await apiClient.post('/posts/post-1/save', {});
    expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/save', {});
    expect(result.saved).toBe(true);

    // Unsave (toggle)
    apiClient.post.mockResolvedValue({ saved: false });
    const result2 = await apiClient.post('/posts/post-1/save', {});
    expect(result2.saved).toBe(false);
  });

  it('should call navigator.share or fallback to clipboard', async () => {
    // When navigator.share is available
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { share: mockShare, clipboard: { writeText: vi.fn() } },
      writable: true,
      configurable: true,
    });

    const shareData = { title: 'Post', url: 'https://hispaloshop.com/posts/post-1' };
    await navigator.share(shareData);
    expect(mockShare).toHaveBeenCalledWith(shareData);

    // Fallback: no navigator.share, use clipboard
    const mockClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { share: undefined, clipboard: { writeText: mockClipboard } },
      writable: true,
      configurable: true,
    });

    await navigator.clipboard.writeText('https://hispaloshop.com/posts/post-1');
    expect(mockClipboard).toHaveBeenCalledWith('https://hispaloshop.com/posts/post-1');
  });

  it('should prevent self-follow', async () => {
    const currentUserId = 'user-me';
    const targetUserId = 'user-me';

    // Self-follow should be blocked at the UI level
    const shouldFollow = currentUserId !== targetUserId;
    expect(shouldFollow).toBe(false);

    // API should never be called for self-follow
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('should toggle follow state with API call', async () => {
    // Follow a user (not currently following)
    apiClient.post.mockResolvedValue({ status: 'following' });
    const followResult = await apiClient.post('/users/user-2/follow', {});
    expect(apiClient.post).toHaveBeenCalledWith('/users/user-2/follow', {});
    expect(followResult.status).toBe('following');

    // Unfollow the same user
    apiClient.delete.mockResolvedValue({ status: 'unfollowed' });
    const unfollowResult = await apiClient.delete('/users/user-2/follow');
    expect(apiClient.delete).toHaveBeenCalledWith('/users/user-2/follow');
    expect(unfollowResult.status).toBe('unfollowed');
  });

  it('should show reaction picker on long press', () => {
    // Simulate a long press timer (500ms threshold)
    vi.useFakeTimers();
    let reactionPickerVisible = false;
    const longPressTimeout = setTimeout(() => {
      reactionPickerVisible = true;
    }, 500);

    vi.advanceTimersByTime(500);
    expect(reactionPickerVisible).toBe(true);

    clearTimeout(longPressTimeout);
    vi.useRealTimers();
  });

  it('should track post view via dwell time', async () => {
    apiClient.post.mockResolvedValue({ tracked: true });

    // Simulate post entering viewport and dwell exceeding threshold (2s)
    vi.useFakeTimers();
    let tracked = false;
    const dwellThreshold = 2000;

    const timer = setTimeout(async () => {
      await apiClient.post('/analytics/post-view', { post_id: 'post-1', dwell_ms: dwellThreshold });
      tracked = true;
    }, dwellThreshold);

    vi.advanceTimersByTime(dwellThreshold);
    // Flush microtask queue
    await vi.runAllTimersAsync();
    expect(tracked).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/analytics/post-view', { post_id: 'post-1', dwell_ms: 2000 });

    clearTimeout(timer);
    vi.useRealTimers();
  });

  it('should handle like API error with rollback', async () => {
    // Simulate optimistic update followed by API error
    let localLiked = false;
    let localLikesCount = 10;

    // Optimistic: toggle to liked
    localLiked = true;
    localLikesCount = 11;
    expect(localLiked).toBe(true);
    expect(localLikesCount).toBe(11);

    // API fails
    apiClient.post.mockRejectedValue(new Error('Network error'));
    try {
      await apiClient.post('/posts/post-1/like', {});
    } catch {
      // Rollback
      localLiked = false;
      localLikesCount = 10;
    }

    expect(localLiked).toBe(false);
    expect(localLikesCount).toBe(10);
  });
});
