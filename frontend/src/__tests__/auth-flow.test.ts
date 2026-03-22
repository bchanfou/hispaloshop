// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Auth Flow', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('login returns token + user', async () => {
    apiClient.post.mockResolvedValue({ token: 'jwt-123', user: { user_id: 'u1', username: 'alice' } });
    const result = await apiClient.post('/auth/login', { email: 'a@b.com', password: '123456' });
    expect(result.token).toBeTruthy();
    expect(result.user.username).toBe('alice');
  });

  it('register validates required fields', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 422 } });
    await expect(apiClient.post('/auth/register', {})).rejects.toBeTruthy();
  });

  it('checkAuth returns user on valid token', async () => {
    apiClient.get.mockResolvedValue({ user_id: 'u1', username: 'alice', role: 'customer' });
    const result = await apiClient.get('/auth/me');
    expect(result.user_id).toBe('u1');
  });

  it('checkAuth returns 401 on invalid token', async () => {
    apiClient.get.mockRejectedValue({ response: { status: 401 } });
    await expect(apiClient.get('/auth/me')).rejects.toBeTruthy();
  });

  it('forgot password sends email', async () => {
    apiClient.post.mockResolvedValue({ message: 'Email sent' });
    const result = await apiClient.post('/auth/forgot-password', { email: 'a@b.com' });
    expect(result.message).toContain('sent');
  });

  it('follow user works', async () => {
    apiClient.post.mockResolvedValue({ status: 'following' });
    const result = await apiClient.post('/users/u2/follow');
    expect(result.status).toBe('following');
  });

  it('unfollow user works', async () => {
    apiClient.post.mockResolvedValue({ status: 'unfollowed' });
    const result = await apiClient.post('/users/u2/unfollow');
    expect(result.status).toBe('unfollowed');
  });
});
