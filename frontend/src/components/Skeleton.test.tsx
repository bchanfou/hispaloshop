import React from 'react';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonText, ProductGridSkeleton } from './Skeleton';

describe('Skeleton', () => {
  it('applies skeleton-shimmer class', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('skeleton-shimmer');
    expect(el).toHaveClass('rounded');
  });

  it('passes extra className', () => {
    const { container } = render(<Skeleton className="h-8 w-20" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('h-8');
    expect(el).toHaveClass('w-20');
  });
});

describe('SkeletonText', () => {
  it('renders correct number of lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    const skeletons = container.querySelectorAll('.skeleton-shimmer');
    expect(skeletons).toHaveLength(4);
  });

  it('defaults to 3 lines', () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll('.skeleton-shimmer');
    expect(skeletons).toHaveLength(3);
  });
});

describe('ProductGridSkeleton', () => {
  it('renders given count of skeleton cards', () => {
    const { container } = render(<ProductGridSkeleton count={4} />);
    // Each ProductCardSkeleton has multiple .skeleton-shimmer elements (5 each)
    const grid = container.firstChild as HTMLElement;
    expect(grid.children).toHaveLength(4);
  });
});
