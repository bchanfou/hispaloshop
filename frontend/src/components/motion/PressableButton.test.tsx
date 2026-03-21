import React from 'react';
import { render, screen } from '@testing-library/react';
import PressableButton from './PressableButton';

describe('PressableButton', () => {
  it('renders children text', () => {
    render(<PressableButton>Click me</PressableButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies solid variant classes by default', () => {
    render(<PressableButton>Solid</PressableButton>);
    const btn = screen.getByText('Solid');
    expect(btn).toHaveClass('bg-stone-950');
    expect(btn).toHaveClass('text-white');
  });

  it('applies soft variant classes', () => {
    render(<PressableButton variant="soft">Soft</PressableButton>);
    const btn = screen.getByText('Soft');
    expect(btn).toHaveClass('bg-stone-100');
    expect(btn).toHaveClass('text-stone-950');
  });

  it('disables the button when disabled prop is true', () => {
    render(<PressableButton disabled>Disabled</PressableButton>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<PressableButton ref={ref}>Ref</PressableButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
