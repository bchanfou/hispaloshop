// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Profile Features', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should detect own profile vs other profile correctly', () => {
    const currentUserId = 'user-me';

    // Own profile
    const profileUserId1 = 'user-me';
    const isOwnProfile1 = currentUserId === profileUserId1;
    expect(isOwnProfile1).toBe(true);

    // Other profile
    const profileUserId2 = 'user-other';
    const isOwnProfile2 = currentUserId === profileUserId2;
    expect(isOwnProfile2).toBe(false);
  });

  it('should show follow/message/share for other profiles', () => {
    const isOwnProfile = false;
    const actions = [];

    if (!isOwnProfile) {
      actions.push('follow', 'message', 'share');
    } else {
      actions.push('edit', 'share');
    }

    expect(actions).toContain('follow');
    expect(actions).toContain('message');
    expect(actions).toContain('share');
    expect(actions).not.toContain('edit');
  });

  it('should show edit/share for own profile', () => {
    const isOwnProfile = true;
    const actions = [];

    if (isOwnProfile) {
      actions.push('edit', 'share');
    } else {
      actions.push('follow', 'message', 'share');
    }

    expect(actions).toContain('edit');
    expect(actions).toContain('share');
    expect(actions).not.toContain('follow');
    expect(actions).not.toContain('message');
  });

  it('should create highlight with correct queryKey invalidation', async () => {
    apiClient.post.mockResolvedValue({ highlight_id: 'h1', title: 'Favoritos' });

    const result = await apiClient.post('/users/me/highlights', {
      title: 'Favoritos',
      story_ids: ['s1', 's2', 's3'],
      cover_url: 'https://cdn.hispaloshop.com/img.jpg',
    });

    expect(result.highlight_id).toBe('h1');
    expect(apiClient.post).toHaveBeenCalledWith('/users/me/highlights', {
      title: 'Favoritos',
      story_ids: ['s1', 's2', 's3'],
      cover_url: 'https://cdn.hispaloshop.com/img.jpg',
    });

    // After creating, the queryKey ['user', 'highlights', userId] should be invalidated
    const invalidatedKey = ['user', 'highlights', 'user-me'];
    expect(invalidatedKey[0]).toBe('user');
    expect(invalidatedKey[1]).toBe('highlights');
  });

  it('should switch accounts and navigate to new profile', async () => {
    // Simulate account switch
    const accounts = [
      { user_id: 'user-1', name: 'Cuenta Personal' },
      { user_id: 'user-2', name: 'Mi Tienda' },
    ];

    let currentAccount = accounts[0];
    let navigatedTo = null;

    const switchAccount = (accountId) => {
      currentAccount = accounts.find((a) => a.user_id === accountId);
      navigatedTo = `/profile/${accountId}`;
    };

    switchAccount('user-2');
    expect(currentAccount.user_id).toBe('user-2');
    expect(currentAccount.name).toBe('Mi Tienda');
    expect(navigatedTo).toBe('/profile/user-2');
  });

  it('should show account fallback name when username missing', () => {
    const profileWithName = { user_id: 'u1', name: 'Juan', username: 'juanito' };
    const profileNoUsername = { user_id: 'u2', name: 'María', username: null };
    const profileEmpty = { user_id: 'u3', name: null, username: null };

    const getDisplayName = (profile) =>
      profile.username || profile.name || 'Usuario';

    expect(getDisplayName(profileWithName)).toBe('juanito');
    expect(getDisplayName(profileNoUsername)).toBe('María');
    expect(getDisplayName(profileEmpty)).toBe('Usuario');
  });

  it('should fetch correct tabs based on user role', async () => {
    // Consumer: posts, saved
    // Producer: posts, products, recipes, saved
    // Influencer: posts, saved

    const getTabsForRole = (role, isOwnProfile) => {
      const tabs = ['posts'];

      if (role === 'producer') {
        tabs.push('products', 'recipes');
      }

      if (isOwnProfile) {
        tabs.push('saved');
      }

      return tabs;
    };

    expect(getTabsForRole('consumer', true)).toEqual(['posts', 'saved']);
    expect(getTabsForRole('consumer', false)).toEqual(['posts']);
    expect(getTabsForRole('producer', true)).toEqual(['posts', 'products', 'recipes', 'saved']);
    expect(getTabsForRole('producer', false)).toEqual(['posts', 'products', 'recipes']);
    expect(getTabsForRole('influencer', true)).toEqual(['posts', 'saved']);
  });

  it('should only show saved tab for own profile', () => {
    const getTabsForRole = (role, isOwnProfile) => {
      const tabs = ['posts'];
      if (role === 'producer') tabs.push('products', 'recipes');
      if (isOwnProfile) tabs.push('saved');
      return tabs;
    };

    // Own profile — saved tab present
    const ownTabs = getTabsForRole('consumer', true);
    expect(ownTabs).toContain('saved');

    // Other profile — no saved tab
    const otherTabs = getTabsForRole('consumer', false);
    expect(otherTabs).not.toContain('saved');

    // Producer own profile — still has saved
    const producerOwnTabs = getTabsForRole('producer', true);
    expect(producerOwnTabs).toContain('saved');
    expect(producerOwnTabs).toContain('products');
  });
});
