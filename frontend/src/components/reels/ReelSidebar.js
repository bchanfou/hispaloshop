import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Bookmark, ShoppingBag } from 'lucide-react';

/**
 * Formatea números grandes: 1.2k, 4.5M
 */
function Count({ n }) {
  if (!n && n !== 0) return null;
  let label;
  if (n >= 1_000_000) label = `${(n / 1_000_000).toFixed(1)}M`;
  else if (n >= 1_000) label = `${(n / 1_000).toFixed(1)}k`;
  else label = String(n);

  return (
    <span className="text-[11px] font-semibold tabular-nums leading-none text-white drop-shadow">
      {label}
    </span>
  );
}

/**
 * Botón de acción del sidebar.
 * icon     — ReactElement (el icono ya renderizado)
 * count    — número opcional bajo el icono
 * onClick  — handler
 * active   — estado activo (cambia apariencia)
 */
function SidebarAction({ icon, count, onClick, active = false }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.82 }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="flex flex-col items-center gap-[5px]"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          active ? 'bg-white/15' : 'active:bg-white/10'
        }`}
      >
        {icon}
      </div>
      {count !== undefined ? <Count n={count} /> : null}
    </motion.button>
  );
}

function ReelSidebar({
  reel,
  isLiked,
  likesCount,
  isSaved,
  onLike,
  onSave,
  onOpenComments,
  onShare,
  onOpenProduct,
}) {
  const hasProduct = !!reel.productTag;

  return (
    <div
      className="absolute right-2 z-20 flex flex-col items-center gap-3"
      style={{ bottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 90px), 102px)' }}
    >

      {/* ── Like ── */}
      <SidebarAction
        active={isLiked}
        onClick={onLike}
        count={likesCount}
        icon={
          <Heart
            className={`h-7 w-7 drop-shadow ${
              isLiked ? 'fill-white text-white' : 'text-white'
            }`}
            strokeWidth={isLiked ? 0 : 1.8}
          />
        }
      />

      {/* ── Comentarios ── */}
      <SidebarAction
        onClick={onOpenComments}
        count={reel.stats.comments}
        icon={
          <MessageCircle className="h-7 w-7 text-white drop-shadow" strokeWidth={1.8} />
        }
      />

      {/* ── Compartir ── */}
      <SidebarAction
        onClick={onShare}
        count={reel.stats.shares > 0 ? reel.stats.shares : undefined}
        icon={
          <Send className="h-[26px] w-[26px] -rotate-[10deg] text-white drop-shadow" strokeWidth={1.8} />
        }
      />

      {/* ── Guardar (bookmark) ── */}
      <SidebarAction
        active={isSaved}
        onClick={onSave}
        icon={
          <Bookmark
            className={`h-7 w-7 drop-shadow ${isSaved ? 'fill-white text-white' : 'text-white'}`}
            strokeWidth={isSaved ? 0 : 1.8}
          />
        }
      />

      {/* ── Producto etiquetado (thumbnail cuadrado) ── */}
      {hasProduct ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); onOpenProduct?.(); }}
          className="mt-1 flex flex-col items-center gap-1"
        >
          {/* Thumbnail del producto — 48px con esquinas redondeadas + ring blanco */}
          <div className="h-12 w-12 overflow-hidden rounded-[10px] bg-white/20 ring-[2px] ring-white shadow-lg">
            {reel.productTag.image ? (
              <img
                src={reel.productTag.image}
                alt={reel.productTag.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-white/70" strokeWidth={1.5} />
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none text-white/80 drop-shadow">
            Ver
          </span>
        </motion.button>
      ) : null}

    </div>
  );
}

export default ReelSidebar;
