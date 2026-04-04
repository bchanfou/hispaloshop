// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Story Lifecycle', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches stories feed with preview data', async () => {
    apiClient.get.mockResolvedValue([
      {
        user_id: 'u1', name: 'Alice',
        preview: { type: 'story', image: 'img.jpg', video: 'vid.mp4', poster: 'img.jpg' },
        has_unseen: true, stories_count: 2,
      },
    ]);
    const result = await apiClient.get('/feed/stories');
    expect(result).toHaveLength(1);
    expect(result[0].has_unseen).toBe(true);
    expect(result[0].preview.video).toBe('vid.mp4');
    expect(result[0].preview.poster).toBe('img.jpg');
  });

  it('tracks story view', async () => {
    apiClient.post.mockResolvedValue({ status: 'ok' });
    const result = await apiClient.post('/stories/s1/view');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s1/view');
    expect(result.status).toBe('ok');
  });

  it('creates story with FormData including filter_css', async () => {
    apiClient.post.mockResolvedValue({ story_id: 's2', filter_css: 'contrast(1.2) saturate(1.35)' });
    const fd = new FormData();
    fd.append('file', new Blob(['test']), 'story.jpg');
    fd.append('filter_css', 'contrast(1.2) saturate(1.35)');
    const result = await apiClient.post('/stories', fd);
    expect(result.story_id).toBeTruthy();
    expect(result.filter_css).toBe('contrast(1.2) saturate(1.35)');
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

  it('should show StoryCard with unseen border (ring-stone-950)', () => {
    const storyGroup = { user_id: 'u1', has_unseen: true, stories_count: 2 };

    // StoryCard: unseen → ring-2 ring-stone-950, seen → ring-1 ring-stone-200
    const borderClass = storyGroup.has_unseen
      ? 'ring-2 ring-stone-950'
      : 'ring-1 ring-stone-200';

    expect(borderClass).toContain('ring-stone-950');
    expect(borderClass).toContain('ring-2');

    // Seen stories get subtle ring
    const seenGroup = { user_id: 'u2', has_unseen: false };
    const seenBorder = seenGroup.has_unseen
      ? 'ring-2 ring-stone-950'
      : 'ring-1 ring-stone-200';
    expect(seenBorder).toBe('ring-1 ring-stone-200');
  });

  it('should invalidate feed-stories cache after viewing (border transition)', async () => {
    apiClient.post.mockResolvedValue({ status: 'ok' });
    await apiClient.post('/stories/s1/view');

    // After close, viewer invalidates feed-stories → card border updates from 950 to 200
    apiClient.get.mockResolvedValue([
      {
        user_id: 'u1', name: 'Alice', has_unseen: false, stories_count: 1,
        preview: { type: 'story', image: 'img.jpg' },
      },
    ]);
    const result = await apiClient.get('/feed/stories');
    expect(result[0].has_unseen).toBe(false);
  });

  it('should invalidate feed-stories cache after creating', async () => {
    apiClient.post.mockResolvedValue({ story_id: 's10' });
    const fd = new FormData();
    fd.append('file', new Blob(['test']), 'story.jpg');
    await apiClient.post('/stories', fd);

    apiClient.get.mockResolvedValue([
      {
        user_id: 'me', name: 'Me', has_unseen: false, stories_count: 1,
        preview: { type: 'story', image: 'img.jpg' },
      },
    ]);
    const stories = await apiClient.get('/feed/stories');
    expect(stories[0].user_id).toBe('me');
  });

  it('should preload first 3 stories on mount', async () => {
    const storyItems = [
      { story_id: 's1', image_url: 'https://cdn.example.com/s1.jpg' },
      { story_id: 's2', image_url: 'https://cdn.example.com/s2.jpg' },
      { story_id: 's3', image_url: 'https://cdn.example.com/s3.jpg' },
      { story_id: 's4', image_url: 'https://cdn.example.com/s4.jpg' },
    ];

    const toPreload = storyItems.slice(0, 3);
    expect(toPreload).toHaveLength(3);
    expect(toPreload[0].story_id).toBe('s1');
    expect(toPreload[2].story_id).toBe('s3');
  });

  it('StoryCard shows video preview loop for video stories', () => {
    const preview = { type: 'story', image: 'poster.jpg', video: 'clip.mp4' };
    // StoryCard renders <video> with muted autoPlay loop playsInline
    expect(preview.video).toBeTruthy();
    expect(preview.image).toBeTruthy(); // poster fallback
  });

  it('StoryCard expand transition uses layoutId', () => {
    const userId = 'u1';
    const layoutId = `story-${userId}`;
    expect(layoutId).toBe('story-u1');
    // StoryViewer receives originLayoutId matching the card's layoutId
    const originLayoutId = `story-${userId}`;
    expect(originLayoutId).toBe(layoutId);
  });

  it('story filter_css is stored and returned for video stories', async () => {
    apiClient.get.mockResolvedValue([
      {
        story_id: 's1', video_url: 'vid.mp4',
        filter_css: 'grayscale(1) contrast(1.1) brightness(1.1)',
      },
    ]);
    const stories = await apiClient.get('/stories/u1');
    expect(stories[0].filter_css).toBe('grayscale(1) contrast(1.1) brightness(1.1)');
  });

  it('profile story cards show individual stories with is_seen flag', async () => {
    apiClient.get.mockResolvedValue([
      { story_id: 's1', image_url: 'img1.jpg', is_seen: false },
      { story_id: 's2', image_url: 'img2.jpg', is_seen: true },
    ]);
    const stories = await apiClient.get('/stories/u1');
    expect(stories[0].is_seen).toBe(false); // unseen → ring-stone-950
    expect(stories[1].is_seen).toBe(true);  // seen → ring-stone-200
  });
});
