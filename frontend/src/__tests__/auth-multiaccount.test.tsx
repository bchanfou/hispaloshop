// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '../test/utils';

const { mockAuthApi, mockSetSentryUser } = vi.hoisted(() => ({
  mockAuthApi: {
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
  mockSetSentryUser: vi.fn(),
}));

vi.mock('../lib/authApi', () => ({
  authApi: mockAuthApi,
}));

vi.mock('../lib/sentry', () => ({
  setUser: mockSetSentryUser,
}));

vi.mock('../lib/auth', () => ({
  getToken: vi.fn(() => localStorage.getItem('hispalo_access_token') || localStorage.getItem('hsp_token')),
  removeToken: vi.fn(() => {
    localStorage.removeItem('hispalo_access_token');
    localStorage.removeItem('hsp_token');
    localStorage.removeItem('hispalo_refresh_token');
    localStorage.removeItem('hispalo_user');
  }),
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

function Harness() {
  const { user, initialized, logout, switchAccount, logoutAccount } = useAuth();

  if (!initialized) return <div>loading</div>;

  return (
    <div>
      <div data-testid="username">{user?.username || 'anon'}</div>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => logoutAccount({ user_id: 'u1' })}>logout-active-with-fallback</button>
      <button
        onClick={() => switchAccount({
          user_id: 'u2',
          username: 'broken',
          token: 'bad-token',
        })}
      >
        switch-invalid
      </button>
    </div>
  );
}

describe('AuthProvider multi-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('logout removes the active account from saved accounts', async () => {
    localStorage.setItem('hispalo_access_token', 'token-1');
    localStorage.setItem('hsp_token', 'token-1');
    localStorage.setItem('hsp_accounts', JSON.stringify([
      { user_id: 'u1', username: 'alice', token: 'token-1' },
      { user_id: 'u2', username: 'bob', token: 'token-2' },
    ]));

    mockAuthApi.getCurrentUser.mockResolvedValueOnce({ user_id: 'u1', username: 'alice', role: 'customer' });
    mockAuthApi.logout.mockResolvedValueOnce({ ok: true });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await screen.findByText('alice');

    await act(async () => {
      fireEvent.click(screen.getByText('logout'));
    });

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('hsp_accounts') || '[]')).toEqual([
        { user_id: 'u2', username: 'bob', token: 'token-2' },
      ]);
    });

    expect(localStorage.getItem('hispalo_access_token')).toBeNull();
    expect(localStorage.getItem('hsp_token')).toBeNull();
  });

  it('invalid saved account is removed and current session is restored on switch failure', async () => {
    localStorage.setItem('hispalo_access_token', 'token-1');
    localStorage.setItem('hsp_token', 'token-1');
    localStorage.setItem('hsp_accounts', JSON.stringify([
      { user_id: 'u1', username: 'alice', token: 'token-1' },
      { user_id: 'u2', username: 'broken', token: 'bad-token' },
    ]));

    mockAuthApi.getCurrentUser
      .mockResolvedValueOnce({ user_id: 'u1', username: 'alice', role: 'customer' })
      .mockResolvedValueOnce(null);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await screen.findByText('alice');

    await act(async () => {
      fireEvent.click(screen.getByText('switch-invalid'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('alice');
    });

    expect(localStorage.getItem('hispalo_access_token')).toBe('token-1');
    expect(localStorage.getItem('hsp_token')).toBe('token-1');
    expect(JSON.parse(localStorage.getItem('hsp_accounts') || '[]')).toEqual([
      expect.objectContaining({ user_id: 'u1', username: 'alice', token: 'token-1' }),
    ]);
  });

  it('logout of active account switches to another valid saved account', async () => {
    localStorage.setItem('hispalo_access_token', 'token-1');
    localStorage.setItem('hsp_token', 'token-1');
    localStorage.setItem('hsp_accounts', JSON.stringify([
      { user_id: 'u1', username: 'alice', token: 'token-1' },
      { user_id: 'u2', username: 'bob', token: 'token-2' },
    ]));

    mockAuthApi.getCurrentUser
      .mockResolvedValueOnce({ user_id: 'u1', username: 'alice', role: 'customer' })
      .mockResolvedValueOnce({ user_id: 'u2', username: 'bob', role: 'customer' });
    mockAuthApi.logout.mockResolvedValueOnce({ ok: true });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await screen.findByText('alice');

    await act(async () => {
      fireEvent.click(screen.getByText('logout-active-with-fallback'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('bob');
    });

    expect(localStorage.getItem('hispalo_access_token')).toBe('token-2');
    expect(localStorage.getItem('hsp_token')).toBe('token-2');
    expect(JSON.parse(localStorage.getItem('hsp_accounts') || '[]')).toEqual([
      expect.objectContaining({ user_id: 'u2', username: 'bob', token: 'token-2' }),
    ]);
  });
});
