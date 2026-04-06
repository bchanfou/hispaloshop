// @ts-nocheck
/**
 * Generic discover section wrapper — emoji + title + "Ver todo →" + dismiss ✕ + skeleton/empty state.
 * Used by all 8 sections in DiscoverPage.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const DISMISS_KEY_PREFIX = 'hs_discover_dismiss_';

export default function DiscoverSection({
  id,
  emoji,  // DEPRECATED — use `icon` prop instead (Lucide component)
  icon: IconComponent = null,
  titleKey,
  titleFallback,
  seeAllHref,
  children,
  isEmpty = false,
  emptyMessage,
  emptyCta,
  emptyCtaHref,
  loading = false,
  skeletonCount = 4,
  dismissable = true,
  className = '',
}) {
  const { t } = useTranslation();
  const storageKey = `${DISMISS_KEY_PREFIX}${id}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  };

  const title = t(`discover.${titleKey}`, titleFallback);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.section
          initial={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className={`mb-6 ${className}`}
          aria-label={title}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {IconComponent && <IconComponent className="w-4 h-4 text-stone-400 shrink-0" />}
              {!IconComponent && emoji && <span className="text-lg shrink-0">{emoji}</span>}
              <h2 className="text-base font-bold text-stone-950 truncate">{title}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {seeAllHref && !isEmpty && (
                <Link
                  to={seeAllHref}
                  className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-950 no-underline"
                >
                  {t('discover.seeAll', 'Ver todo')} <ArrowRight size={14} />
                </Link>
              )}
              {dismissable && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label={t('discover.dismiss', 'Ocultar esta sección')}
                  className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="flex gap-3 px-4 overflow-hidden">
              {Array.from({ length: skeletonCount }, (_, i) => (
                <div key={i} className="w-[140px] h-[180px] shrink-0 rounded-2xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && isEmpty && (
            <div className="mx-4 p-5 rounded-2xl border border-dashed border-stone-200 text-center">
              <p className="text-sm text-stone-500 mb-3">{emptyMessage}</p>
              {emptyCta && emptyCtaHref && (
                <Link
                  to={emptyCtaHref}
                  className="text-sm font-semibold text-stone-950 hover:underline no-underline"
                >
                  {emptyCta} →
                </Link>
              )}
            </div>
          )}

          {/* Content */}
          {!loading && !isEmpty && children}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
