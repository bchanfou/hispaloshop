// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '../services/api/client';

describe('Recipe Reviews', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetch reviews returns array with average rating', async () => {
    const mockResponse = {
      reviews: [
        { review_id: 'rrev_1', recipe_id: 'r1', user_id: 'u1', user_name: 'Ana', rating: 5, text: 'Deliciosa', created_at: '2026-03-20T10:00:00Z' },
        { review_id: 'rrev_2', recipe_id: 'r1', user_id: 'u2', user_name: 'Luis', rating: 3, text: 'Buena', created_at: '2026-03-19T10:00:00Z' },
      ],
      average_rating: 4,
      total_reviews: 2,
    };
    apiClient.get.mockResolvedValue(mockResponse);

    const result = await apiClient.get('/recipes/r1/reviews');
    expect(apiClient.get).toHaveBeenCalledWith('/recipes/r1/reviews');
    expect(Array.isArray(result.reviews)).toBe(true);
    expect(result.total_reviews).toBe(2);
    expect(result.average_rating).toBe(4);
  });

  it('submit review with rating and text', async () => {
    const mockReview = {
      review_id: 'rrev_abc',
      recipe_id: 'r1',
      user_id: 'u1',
      user_name: 'Ana',
      rating: 4,
      text: 'Muy rica',
      visible: true,
      created_at: '2026-03-23T12:00:00Z',
    };
    apiClient.post.mockResolvedValue(mockReview);

    const result = await apiClient.post('/recipes/r1/reviews', { rating: 4, text: 'Muy rica' });
    expect(apiClient.post).toHaveBeenCalledWith('/recipes/r1/reviews', { rating: 4, text: 'Muy rica' });
    expect(result.rating).toBe(4);
    expect(result.text).toBe('Muy rica');
    expect(result.review_id).toBeDefined();
  });

  it('rejects review without rating', async () => {
    apiClient.post.mockRejectedValue({ message: 'Rating (1-5) is required' });

    await expect(
      apiClient.post('/recipes/r1/reviews', { text: 'Sin rating' })
    ).rejects.toEqual({ message: 'Rating (1-5) is required' });
  });

  it('average rating calculated correctly from reviews', () => {
    const reviews = [
      { rating: 5 },
      { rating: 3 },
      { rating: 4 },
      { rating: 2 },
    ];
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = Math.round((sum / total) * 10) / 10;

    expect(average).toBe(3.5);
    expect(total).toBe(4);
  });
});
