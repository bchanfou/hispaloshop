import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));

import BottomSheet from './BottomSheet';

describe('BottomSheet', () => {
  it('renders children when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={vi.fn()}>
        <p>Sheet content</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <BottomSheet isOpen={false} onClose={vi.fn()}>
        <p>Sheet content</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('has dialog role when open', () => {
    render(
      <BottomSheet isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
