import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all heavy dependencies
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
vi.mock('./create/CreateContentSheet', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('./notifications/MessageToast', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../features/chat/hooks/useInternalChatData', () => ({
  useInternalChatData: () => ({ conversations: [], reloadConversations: vi.fn() }),
}));
vi.mock('../lib/auth', () => ({
  getToken: () => null,
}));
vi.mock('../services/api/client', () => ({
  __esModule: true,
  default: {},
  getWSUrl: () => 'ws://localhost/ws/chat',
}));
vi.mock('../hooks/useHaptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));

import BottomNavBar from './BottomNavBar';

function renderNav(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <BottomNavBar />
    </MemoryRouter>,
  );
}

describe('BottomNavBar', () => {
  it('renders 5 nav items (Home, Explore, Create, Reels, Profile)', () => {
    renderNav();
    expect(screen.getByTestId('bottom-nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-explore')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-post')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-reels')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-profile')).toBeInTheDocument();
  });

  it('hides on admin routes', () => {
    renderNav('/admin/dashboard');
    expect(screen.queryByTestId('bottom-nav-bar')).not.toBeInTheDocument();
  });

  it('hides on login route', () => {
    renderNav('/login');
    expect(screen.queryByTestId('bottom-nav-bar')).not.toBeInTheDocument();
  });
});
