import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import ProductCard from '../components/ProductCard';
import { getGroupBySlug, getCategoriesByGroup } from '../constants/categories';

export default function ExploreCategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubSlug, setActiveSubSlug] = useState(null);

  const group = useMemo(() => getGroupBySlug(slug), [slug]);

  const subcategories = useMemo(() => {
    if (!group) return [];
    return getCategoriesByGroup(group.slug);
  }, [group]);

  // Reset active sub when group changes
  useEffect(() => {
    setActiveSubSlug(null);
  }, [slug]);

  // Fetch products — by subcategory if selected, otherwise by first subcategory or group slug
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const categoryParam = activeSubSlug || (subcategories.length > 0 ? subcategories[0].slug : slug);

    apiClient
      .get('/products', { params: { category: categoryParam, limit: 40 } })
      .then((res) => {
        if (!cancelled) setProducts(res.data?.products || res.data || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeSubSlug, subcategories, slug]);

  if (!group) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-sans)' }}>
        <span style={{ fontSize: 48 }}>🔍</span>
        <p style={{ color: 'var(--color-stone)', fontSize: 15 }}>Categoría no encontrada</p>
        <button onClick={() => navigate('/explore')} style={{ color: 'var(--color-black)', fontWeight: 600, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Volver a Explorar
        </button>
      </div>
    );
  }

  const effectiveSubSlug = activeSubSlug || (subcategories.length > 0 ? subcategories[0].slug : null);

  return (
    <div style={{ fontFamily: 'var(--font-sans)', minHeight: '100vh', background: 'var(--color-white)' }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate('/explore')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver"
        >
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 22 }}>{group.emoji}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>{group.label}</span>
      </div>

      {/* Subcategory pills */}
      {subcategories.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '12px 16px', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {subcategories.map((cat) => {
            const isActive = cat.slug === effectiveSubSlug;
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveSubSlug(cat.slug)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--radius-full)',
                  border: '1px solid ' + (isActive ? 'var(--color-black)' : 'var(--color-border)'),
                  background: isActive ? 'var(--color-black)' : 'var(--color-white)',
                  color: isActive ? 'var(--color-white)' : 'var(--color-black)',
                  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  cursor: 'pointer', transition: 'var(--transition-fast)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Product grid */}
      <div style={{ padding: '8px 16px 80px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                background: 'var(--color-surface, #f5f5f4)',
                borderRadius: 'var(--radius-xl)',
                aspectRatio: '3/4',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
          }}>
            <span style={{ fontSize: 48 }}>📦</span>
            <p style={{ color: 'var(--color-stone)', fontSize: 15, textAlign: 'center' }}>
              No hay productos en esta categoría todavía
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
          >
            {products.map((product) => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
