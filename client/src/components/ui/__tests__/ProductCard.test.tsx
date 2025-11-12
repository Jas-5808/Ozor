import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductCard } from '../ProductCard';
import { Product } from '../../../types';

// Мок для useApp
vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    toggleLike: vi.fn(),
    isLiked: vi.fn(() => false),
  }),
}));

const mockProduct: Product = {
  product_id: '1',
  product_name: 'Test Product',
  product_description: 'Test Description',
  category: {
    id: 'cat1',
    name: 'Category 1',
  },
  refferal_price: 1000,
  main_image: '/test-image.jpg',
  variant_id: 'var1',
  variant_sku: 'SKU001',
  price: 900,
  stock: 10,
  variant_attributes: [],
};

const renderProductCard = (product: Product, props = {}) => {
  return render(
    <BrowserRouter>
      <ProductCard product={product} {...props} />
    </BrowserRouter>
  );
};

describe('ProductCard', () => {
  it('renders product name', () => {
    renderProductCard(mockProduct);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders product price', () => {
    renderProductCard(mockProduct);
    expect(screen.getByText(/900/)).toBeInTheDocument();
  });

  it('renders product image', () => {
    renderProductCard(mockProduct);
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src');
  });

  it('disables add to cart button when stock is 0', () => {
    const productNoStock = { ...mockProduct, stock: 0 };
    renderProductCard(productNoStock);
    const button = screen.getByRole('button', { name: /нет в наличии/i });
    expect(button).toBeDisabled();
  });

  it('disables add to cart button when price is 0', () => {
    const productNoPrice = { ...mockProduct, price: 0 };
    renderProductCard(productNoPrice);
    const button = screen.getByRole('button', { name: /цена не указана/i });
    expect(button).toBeDisabled();
  });

  it('renders like button', () => {
    renderProductCard(mockProduct);
    const likeButton = screen.getByLabelText(/добавить в избранное/i);
    expect(likeButton).toBeInTheDocument();
  });
});

