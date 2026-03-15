import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../../context/LocaleContext';

/**
 * ReelOverlay — bottom info layer (v2 design)
 * Includes username, description, and GREEN buy button for tagged products.
 */
function ReelOverlay({ reel, isFollowing, toggleFollow, onAddToCart }) {
  const navigate = useNavigate();
  const { convertAndFormatPrice } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const hasProduct = !!reel.productTag;
  const hasDesc = reel.description?.trim().length > 0;
  const descLong = reel.description?.length > 80;

  const formatDescription = (text) => {
    if (!text) return null;
    return text.split(/(#[a-zA-Z0-9_]+)/g).map((part, i) =>
      part.startsWith('#') ? (
        <span
          key={i}
          style={{ fontWeight: 600, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/discover?hashtag=${part.slice(1)}`);
          }}
        >
          {part}
        </span>
      ) : part
    );
  };

  const displayPrice = hasProduct
    ? convertAndFormatPrice(reel.productTag.price, 'EUR')
    : '';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10"
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
        paddingTop: 80,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div style={{ paddingRight: 72 }}>
        {/* Username + Follow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Link
            to={`/user/${reel.user.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
              background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.6)',
              flexShrink: 0,
            }}>
              {reel.user.avatar ? (
                <img src={reel.user.avatar} alt={reel.user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg style={{ width: '100%', height: '100%', fill: 'rgba(255,255,255,0.5)' }} viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>
            <span style={{
              fontSize: 14, fontWeight: 600, color: '#fff',
              fontFamily: 'var(--font-sans)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}>
              {reel.user.username}
            </span>
          </Link>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFollow?.(); }}
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '3px 12px',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              background: 'none', cursor: 'pointer',
              border: isFollowing ? '1px solid rgba(255,255,255,0.4)' : '1px solid #fff',
              color: isFollowing ? 'rgba(255,255,255,0.7)' : '#fff',
              flexShrink: 0,
            }}
          >
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
        </div>

        {/* Description */}
        {hasDesc && (
          <div style={{ marginBottom: 10 }}>
            <p style={{
              fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.9)',
              fontFamily: 'var(--font-sans)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {formatDescription(reel.description)}
            </p>
            {descLong && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                style={{
                  marginTop: 2, fontSize: 12, fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {expanded ? 'Menos' : 'más'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* GREEN buy button — full width, 44px, only when product tagged */}
      <AnimatePresence>
        {hasProduct && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
            style={{
              width: '100%', height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-green)',
              color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              marginTop: 12,
              transition: 'var(--transition-fast)',
            }}
          >
            <ShoppingCart size={18} strokeWidth={2} />
            <span>Añadir al carrito · {displayPrice}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReelOverlay;
