import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEO from './SEO';

function renderSEO(props = {}) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>,
  );
}

describe('SEO', () => {
  it('sets default title with Hispaloshop suffix', async () => {
    renderSEO({ title: 'Tienda' });
    await waitFor(() => {
      expect(document.title).toBe('Tienda | Hispaloshop');
    });
  });

  it('does not duplicate Hispaloshop in title', async () => {
    renderSEO({ title: 'Hispaloshop — Inicio' });
    await waitFor(() => {
      expect(document.title).toBe('Hispaloshop — Inicio');
    });
  });

  it('sets meta description', async () => {
    renderSEO({ description: 'Test description' });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).toBeTruthy();
      expect(meta?.getAttribute('content')).toBe('Test description');
    });
  });

  it('adds noindex when specified', async () => {
    renderSEO({ noindex: true });
    await waitFor(() => {
      const robots = document.querySelector('meta[name="robots"]');
      expect(robots?.getAttribute('content')).toBe('noindex, nofollow');
    });
  });
});
