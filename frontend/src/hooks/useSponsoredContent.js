import { useEffect, useState } from 'react';
import apiClient from '../services/api/client';

/**
 * Fetches sponsored products and popular recipes on mount for feed insertion.
 * Returns { sponsoredProducts, recipes } arrays.
 * Silently returns empty arrays on error — feed should never break.
 */
export function useSponsoredContent() {
  const [sponsoredProducts, setSponsoredProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        // Try sponsored endpoint first, fallback to trending
        let data;
        try {
          data = await apiClient.get('/products?sponsored=true&limit=3');
        } catch {
          data = await apiClient.get('/discovery/trending?type=products&limit=3');
        }
        if (!cancelled) {
          const items = Array.isArray(data) ? data : data?.items || data?.products || [];
          setSponsoredProducts(items.slice(0, 3));
        }
      } catch {
        // Silent — no sponsored content is fine
      }
    }

    async function fetchRecipes() {
      try {
        const data = await apiClient.get('/recipes?sort=popular&limit=2');
        if (!cancelled) {
          const items = Array.isArray(data) ? data : data?.items || data?.recipes || [];
          setRecipes(items.slice(0, 2));
        }
      } catch {
        // Silent
      }
    }

    fetchProducts();
    fetchRecipes();

    return () => { cancelled = true; };
  }, []);

  return { sponsoredProducts, recipes };
}
