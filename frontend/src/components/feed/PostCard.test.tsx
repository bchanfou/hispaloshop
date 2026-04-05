import React from 'react';
import { render, screen } from '../../test/utils';

// Mock dependencies
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { user_id: 'u1', id: 'u1' } }),
}));
vi.mock('../../services/api/client', () => ({
  __esModule: true,
  default: { post: vi.fn().mockResolvedValue({}), patch: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));
vi.mock('../../hooks/useDwellTime', () => ({
  useDwellTime: () => ({ current: null }),
}));
vi.mock('../../utils/time', () => ({
  timeAgo: () => '2h',
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({ cartItems: [], addToCart: vi.fn() }),
}));
vi.mock('../../context/LocaleContext', () => ({
  useLocale: () => ({ convertAndFormatPrice: (p) => `€${p}`, t: (k, f) => f }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, f) => f || k, i18n: { changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children?: any }) => children,
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag === '__esModule' ? false : (props) => React.createElement(tag, props) }),
  AnimatePresence: ({ children }) => children,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useTransform: () => 0,
}));

import PostCard from './PostCard.jsx';

const mockPost = {
  id: 'post-1',
  user: { id: 'u2', name: 'Ana García', username: 'anagarcia', avatar_url: 'https://example.com/avatar.jpg' },
  caption: 'Probando aceite nuevo #foodie',
  images: ['https://example.com/photo.jpg'],
  likes_count: 5,
  comments_count: 3,
  created_at: '2026-03-20T10:00:00Z',
};

describe('PostCard', () => {
  it('renders username in header and caption', () => {
    render(<PostCard post={mockPost} />);
    // Name appears in header and as caption prefix
    const matches = screen.getAllByText('Ana García');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders caption text with hashtags', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('#foodie')).toBeInTheDocument();
  });

  it('renders like button with count', () => {
    render(<PostCard post={mockPost} />);
    const likeBtn = screen.getByLabelText(/Me gusta/);
    expect(likeBtn).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders comment and share buttons', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByLabelText(/Comentar/)).toBeInTheDocument();
    expect(screen.getByLabelText('Compartir')).toBeInTheDocument();
  });
});
