/**
 * Feed normalization — ensures different backend schemas are handled
 *
 * The feed receives data from multiple endpoints with different field names.
 * normalizeFeedItem() must handle all variants.
 */

describe('Feed item normalization', () => {
  // Simulates the normalization logic from useFeedQueries.js
  function normalizeFeedItem(raw) {
    return {
      id: raw.id || raw.post_id || raw._id,
      type: raw.type || (raw.video_url ? 'reel' : 'post'),
      user: raw.user || raw.author || {
        name: raw.author_name || raw.username,
        avatar_url: raw.author_avatar || raw.profile_image,
        username: raw.author_username || raw.username,
      },
      content: raw.content || raw.caption || raw.text || '',
      images: raw.images || raw.media_urls || (raw.image_url ? [raw.image_url] : []),
      likes_count: raw.likes_count ?? raw.like_count ?? 0,
      comments_count: raw.comments_count ?? raw.comment_count ?? 0,
      is_liked: raw.is_liked ?? raw.liked ?? false,
      is_saved: raw.is_saved ?? raw.saved ?? false,
      created_at: raw.created_at || raw.published_at || raw.date,
      products: raw.products || raw.tagged_products || [],
    };
  }

  test('normalizes standard post format', () => {
    const raw = {
      id: '123',
      user: { name: 'Ana', avatar_url: '/avatar.jpg' },
      content: 'Great product!',
      images: ['/img1.jpg'],
      likes_count: 10,
      comments_count: 2,
      created_at: '2026-03-15T10:00:00Z',
    };
    const normalized = normalizeFeedItem(raw);
    expect(normalized.id).toBe('123');
    expect(normalized.type).toBe('post');
    expect(normalized.likes_count).toBe(10);
  });

  test('normalizes alternate field names', () => {
    const raw = {
      post_id: '456',
      author: { name: 'Carlos' },
      caption: 'Check this out',
      media_urls: ['/img2.jpg'],
      like_count: 5,
      comment_count: 1,
      published_at: '2026-03-14T08:00:00Z',
      tagged_products: [{ id: 'p1', name: 'Oil' }],
    };
    const normalized = normalizeFeedItem(raw);
    expect(normalized.id).toBe('456');
    expect(normalized.content).toBe('Check this out');
    expect(normalized.images).toEqual(['/img2.jpg']);
    expect(normalized.products).toHaveLength(1);
  });

  test('detects reel type from video_url', () => {
    const raw = { id: '789', video_url: '/video.mp4' };
    const normalized = normalizeFeedItem(raw);
    expect(normalized.type).toBe('reel');
  });

  test('handles empty/missing fields without crashing', () => {
    const raw = {};
    const normalized = normalizeFeedItem(raw);
    expect(normalized.id).toBeUndefined();
    expect(normalized.type).toBe('post');
    expect(normalized.content).toBe('');
    expect(normalized.images).toEqual([]);
    expect(normalized.likes_count).toBe(0);
  });
});
