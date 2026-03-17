import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChefHat, Clock3, Users, Loader2, Plus, User, ShoppingCart, X, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { resolveUserImage } from '../features/user/queries';

const DIFFICULTY_PILLS = [
  { id: 'all', label: 'Todas' },
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Media' },
  { id: 'hard', label: 'Difícil' },
];

const TIME_PILLS = [
  { id: 'all', label: 'Cualquier' },
  { id: '15', label: '<15 min' },
  { id: '30', label: '<30 min' },
  { id: '60', label: '<60 min' },
];

const DIET_PILLS = [
  { id: 'all', label: 'Todas' },
  { id: 'vegano', label: 'Vegano' },
  { id: 'sin_gluten', label: 'Sin gluten' },
  { id: 'vegetariano', label: 'Vegetariano' },
];

const DIFFICULTY_COLORS = {
  easy: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Fácil' },
  medium: { bg: 'rgba(217,119,6,0.1)', color: '#d97706', label: 'Media' },
  hard: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626', label: 'Difícil' },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── RecipeCard ── */
function RecipeCard({ recipe }) {
  const diff = DIFFICULTY_COLORS[recipe.difficulty] || DIFFICULTY_COLORS.easy;
  const hasProducts = recipe.ingredients?.some(i => i.product || i.product_id);

  return (
    <Link
      to={`/recipes/${recipe.recipe_id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        transition: 'var(--transition-fast)',
      }}>
        {/* Image 4:3 */}
        <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: 'var(--color-surface)', position: 'relative' }}>
          {recipe.image_url ? (
            <img
              src={resolveUserImage(recipe.image_url)}
              alt={recipe.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={32} color="var(--color-stone)" />
            </div>
          )}
          {/* Difficulty badge */}
          <span style={{
            position: 'absolute', top: 8, left: 8,
            fontSize: 10, fontWeight: 700,
            padding: '3px 8px', borderRadius: 'var(--radius-full, 999px)',
            background: diff.bg, color: diff.color,
          }}>
            {diff.label}
          </span>
          {/* Comprable badge */}
          {hasProducts && (
            <span style={{
              position: 'absolute', top: 8, right: 8,
              fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-black)', color: 'var(--color-white)',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <ShoppingCart size={10} /> Comprable
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: 10 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-black)',
            margin: 0, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            fontFamily: 'var(--font-sans)',
          }}>
            {recipe.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock3 size={11} /> {recipe.time_minutes || 0} min
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Users size={11} /> {recipe.servings || 1}
            </span>
          </div>
          {recipe.author_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {recipe.author_avatar ? (
                  <img src={recipe.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={10} color="var(--color-stone)" />
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                {recipe.author_name}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Seasonal Banner ── */
function SeasonalBanner() {
  const month = new Date().getMonth();
  let season, emoji;
  if (month >= 2 && month <= 4) { season = 'Primavera'; emoji = '🌸'; }
  else if (month >= 5 && month <= 7) { season = 'Verano'; emoji = '☀️'; }
  else if (month >= 8 && month <= 10) { season = 'Otoño'; emoji = '🍂'; }
  else { season = 'Invierno'; emoji = '❄️'; }

  return (
    <div style={{
      background: 'var(--color-black)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 16px',
      marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <span style={{ fontSize: 36 }}>{emoji}</span>
      <div>
        <p style={{
          fontSize: 15, fontWeight: 700, color: 'var(--color-white)',
          margin: '0 0 4px', fontFamily: 'var(--font-sans)',
        }}>
          Recetas de {season}
        </p>
        <p style={{
          fontSize: 12, color: 'rgba(255,255,255,0.7)',
          margin: 0, fontFamily: 'var(--font-sans)',
        }}>
          Descubre platos de temporada con ingredientes frescos
        </p>
      </div>
    </div>
  );
}

/* ── FilterSection ── */
function FilterSection({ label, pills, active, onSelect }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-stone)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
        {label}
      </p>
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {pills.map(p => {
          const isActive = active === p.id;
          return (
            <button key={p.id} onClick={() => onSelect(p.id)}
              style={{
                flexShrink: 0, padding: '5px 12px',
                borderRadius: 'var(--radius-full, 999px)',
                border: isActive ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
                background: isActive ? 'var(--color-black)' : 'var(--color-white)',
                color: isActive ? 'var(--color-white)' : 'var(--color-black)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'var(--transition-fast)',
                fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
              }}>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/*  MAIN COMPONENT                           */
/* ══════════════════════════════════════════ */
export default function RecipesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [dietFilter, setDietFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFetchError(false);
    apiClient.get('/recipes')
      .then(data => { if (active) { setRecipes(Array.isArray(data) ? data : []); setFetchError(false); } })
      .catch(() => { if (active) { setRecipes([]); setFetchError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.toLowerCase().trim();
    return recipes.filter(r => {
      if (needle && !(r.title || '').toLowerCase().includes(needle)
        && !(r.author_name || '').toLowerCase().includes(needle)
        && !r.tags?.some(t => t.toLowerCase().includes(needle))) return false;
      if (difficulty !== 'all' && r.difficulty !== difficulty) return false;
      if (timeFilter !== 'all') {
        const max = parseInt(timeFilter, 10);
        if ((r.time_minutes || 999) > max) return false;
      }
      if (dietFilter !== 'all') {
        const tags = (r.tags || []).map(t => t.toLowerCase());
        const diet = (r.diet || '').toLowerCase();
        if (!tags.includes(dietFilter) && diet !== dietFilter) return false;
      }
      return true;
    });
  }, [recipes, debouncedSearch, difficulty, timeFilter, dietFilter]);

  useEffect(() => { setVisibleCount(12); }, [debouncedSearch, difficulty, timeFilter, dietFilter]);

  /* Infinite scroll */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= filtered.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(p => p + 12); },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  const font = { fontFamily: 'var(--font-sans)' };
  const hasFilters = difficulty !== 'all' || timeFilter !== 'all' || dietFilter !== 'all' || searchInput;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver">
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)', flex: 1 }}>Recetas</span>
        {user && (
          <Link to="/recipes/create" style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full, 999px)',
            background: 'var(--color-black)', color: 'var(--color-white)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Plus size={14} /> Crear
          </Link>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '12px 16px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--color-stone)"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar recetas..."
            style={{
              width: '100%', height: 44, paddingLeft: 42,
              paddingRight: searchInput ? 36 : 14,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-white)',
              fontSize: 14, color: 'var(--color-black)',
              outline: 'none', boxSizing: 'border-box', ...font,
            }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <X size={13} color="var(--color-stone)" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ padding: '12px 16px 4px', maxWidth: 600, margin: '0 auto' }}>
        <FilterSection label="Dificultad" pills={DIFFICULTY_PILLS} active={difficulty} onSelect={setDifficulty} />
        <FilterSection label="Tiempo" pills={TIME_PILLS} active={timeFilter} onSelect={setTimeFilter} />
        <FilterSection label="Dieta" pills={DIET_PILLS} active={dietFilter} onSelect={setDietFilter} />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '8px 16px 100px' }}>
        {/* ── Seasonal Banner ── */}
        {!searchInput && !hasFilters && <SeasonalBanner />}

        {/* ── Results header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {!loading && (
            <span style={{ fontSize: 12, color: 'var(--color-stone)' }}>
              {filtered.length} receta{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
          {hasFilters && (
            <button onClick={() => { setSearchInput(''); setDifficulty('all'); setTimeFilter('all'); setDietFilter('all'); }}
              style={{
                fontSize: 12, fontWeight: 600, color: 'var(--color-stone)',
                background: 'none', border: 'none', cursor: 'pointer', ...font,
              }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{
                aspectRatio: '3/4', borderRadius: 'var(--radius-xl)',
                background: 'var(--color-surface)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : fetchError ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
          }}>
            <ChefHat size={56} color="var(--color-stone)" strokeWidth={1} />
            <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', margin: 0 }}>
              No pudimos cargar las recetas
            </p>
            <button onClick={() => { setLoading(true); setFetchError(false); apiClient.get('/recipes').then(data => setRecipes(Array.isArray(data) ? data : [])).catch(() => setFetchError(true)).finally(() => setLoading(false)); }}
              style={{
                padding: '10px 24px', background: 'var(--color-black)',
                color: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
                fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}>
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
          }}>
            <ChefHat size={56} color="var(--color-stone)" strokeWidth={1} />
            <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', margin: 0 }}>
              No se encontraron recetas
            </p>
            {hasFilters && (
              <button onClick={() => { setSearchInput(''); setDifficulty('all'); setTimeFilter('all'); setDietFilter('all'); }}
                style={{
                  padding: '10px 24px', background: 'var(--color-black)',
                  color: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
                  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                }}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {filtered.slice(0, visibleCount).map((recipe, i) => (
                <motion.div
                  key={recipe.recipe_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <RecipeCard recipe={recipe} />
                </motion.div>
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Loader2 size={24} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
