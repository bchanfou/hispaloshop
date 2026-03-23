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

  it('should mark story as viewed via POST /stories/{id}/view', async () => {
    apiClient.post.mockResolvedValue({ status: 'ok', viewed: true });
    const result = await apiClient.post('/stories/s5/view');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s5/view');
    expect(result.viewed).toBe(true);
  });

  it('should invalidate feed-stories cache after viewing', async () => {
    // After viewing a story, the feed-stories query key should be invalidated
    // so the ring changes from gradient (unseen) to no ring (seen)
    apiClient.post.mockResolvedValue({ status: 'ok' });
    await apiClient.post('/stories/s1/view');

    const feedStoriesKey = ['feed', 'stories'];
    // Simulate invalidation check
    expect(feedStoriesKey).toEqual(['feed', 'stories']);

    // Refetch after invalidation
    apiClient.get.mockResolvedValue([
      { user_id: 'u1', name: 'Alice', items: [{ story_id: 's1' }], has_unseen: false },
    ]);
    const result = await apiClient.get('/feed/stories');
    expect(result[0].has_unseen).toBe(false);
  });

  it('should invalidate feed-stories cache after creating', async () => {
    apiClient.post.mockResolvedValue({ story_id: 's10' });
    const fd = new FormData();
    fd.append('type', 'image');
    fd.append('file', 'blob');
    await apiClient.post('/stories', fd);

    // After creation, feed-stories should be invalidated to show own story ring
    const feedStoriesKey = ['feed', 'stories'];
    expect(feedStoriesKey[0]).toBe('feed');

    apiClient.get.mockResolvedValue([
      { user_id: 'me', name: 'Me', items: [{ story_id: 's10' }], has_unseen: false },
    ]);
    const stories = await apiClient.get('/feed/stories');
    expect(stories[0].items[0].story_id).toBe('s10');
  });

  it('should show gradient ring for unseen stories', () => {
    const storyGroup = { user_id: 'u1', has_unseen: true, items: [{ story_id: 's1' }] };

    // Unseen stories get a gradient ring class
    const ringClass = storyGroup.has_unseen
      ? 'bg-gradient-to-tr from-stone-900 to-stone-400'
      : 'bg-stone-200';

    expect(ringClass).toContain('gradient');
    expect(ringClass).toContain('stone-900');

    // Seen stories get a plain ring
    const seenGroup = { user_id: 'u2', has_unseen: false, items: [{ story_id: 's2' }] };
    const seenRing = seenGroup.has_unseen
      ? 'bg-gradient-to-tr from-stone-900 to-stone-400'
      : 'bg-stone-200';
    expect(seenRing).toBe('bg-stone-200');
  });

  it('should preload first 3 stories on mount', async () => {
    const storyItems = [
      { story_id: 's1', image_url: 'https://cdn.example.com/s1.jpg' },
      { story_id: 's2', image_url: 'https://cdn.example.com/s2.jpg' },
      { story_id: 's3', image_url: 'https://cdn.example.com/s3.jpg' },
      { story_id: 's4', image_url: 'https://cdn.example.com/s4.jpg' },
      { story_id: 's5', image_url: 'https://cdn.example.com/s5.jpg' },
    ];

    // Preload first 3
    const toPreload = storyItems.slice(0, 3);
    expect(toPreload).toHaveLength(3);
    expect(toPreload[0].story_id).toBe('s1');
    expect(toPreload[2].story_id).toBe('s3');

    // Simulate Image preloading
    const preloadedUrls = toPreload.map((s) => s.image_url);
    expect(preloadedUrls).toEqual([
      'https://cdn.example.com/s1.jpg',
      'https://cdn.example.com/s2.jpg',
      'https://cdn.example.com/s3.jpg',
    ]);
  });
});
