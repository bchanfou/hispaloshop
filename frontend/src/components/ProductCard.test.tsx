import React from 'react';
import { render, screen } from '../test/utils';

// Mock heavy dependencies before importing the component
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { user_id: 'u1' } }),
}));
vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}));
vi.mock('../context/LocaleContext', () => ({
  useLocale: () => ({
    convertAndFormatPrice: (p: number) => `${p.toFixed(2)} €`,
    t: (_key: string, fallback: string) => fallback,
  }),
}));
vi.mock('../hooks/useHaptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));
vi.mock('./ui/ProductImage.tsx', () => ({
  __esModule: true,
  default: ({ productName }: { productName: string }) => <img alt={productName} />,
}));

import ProductCard from './ProductCard';

const mockProduct = {
  product_id: 'p1',
  name: 'Aceite de oliva virgen extra',
  price: 12.99,
  currency: 'EUR',
  images: ['https://example.com/oil.jpg'],
  producer_name: 'Finca El Olivo',
};

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Aceite de oliva virgen extra')).toBeInTheDocument();
    expect(screen.getByText('12.99 €')).toBeInTheDocument();
  });

  it('renders producer name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Finca El Olivo')).toBeInTheDocument();
  });

  it('renders add-to-cart button', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByLabelText('Añadir al carrito')).toBeInTheDocument();
  });

  it('returns null when no product id', () => {
    const { container } = render(<ProductCard product={{ name: 'No ID' }} />);
    expect(container.innerHTML).toBe('');
  });
});
