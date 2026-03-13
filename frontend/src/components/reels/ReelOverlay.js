import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * ReelOverlay — bottom info layer (IG-style)
 * Top bar ha sido movido a ReelsContainer (tab "Para ti / Amigos").
 * Props:
 *   reel          – datos del reel normalizado
 *   isFollowing   – bool: si el usuario autenticado sigue al autor
 *   toggleFollow  – fn: seguir/dejar de seguir
 */
function ReelOverlay({ reel, isFollowing, toggleFollow }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const hasProduct    = !!reel.productTag;
  const hasDesc       = reel.description?.trim().length > 0;
  const descLong      = reel.description?.length > 80;

  // Formatear hashtags clicables
  const formatDescription = (text) => {
    if (!text) return null;
    return text.split(/(#[a-zA-Z0-9_]+)/g).map((part, i) =>
      part.startsWith('#') ? (
        <span
          key={i}
          className="font-semibold text-white cursor-pointer"
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

  const audioLabel = reel.audio?.original
    ? `Sonido original · ${reel.audio.author}`
    : `${reel.audio?.name} · ${reel.audio?.author}`;

  return (
    /* Bottom overlay — deja espacio a la derecha para el sidebar (pr-[72px]) */
    <div
      className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pt-24"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
    >
      <div className="pr-[76px]">

        {/* ── Fila 1: avatar + username + Seguir ── */}
        <div className="mb-2 flex items-center gap-2.5">
          {/* Avatar — enlaza al perfil */}
          <Link
            to={`/user/${reel.user.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-white/20 ring-[1.5px] ring-white/60">
              {reel.user.avatar ? (
                <img
                  src={reel.user.avatar}
                  alt={reel.user.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                /* Placeholder silhouette */
                <svg className="h-full w-full fill-white/50" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>
          </Link>

          {/* Username + verified */}
          <Link
            to={`/user/${reel.user.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 min-w-0"
          >
            <span className="truncate text-[14px] font-semibold leading-tight text-white drop-shadow">
              {reel.user.username}
            </span>
            {reel.user.verified ? (
              <svg className="h-3.5 w-3.5 shrink-0 fill-white/90" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : null}
          </Link>

          {/* Botón Seguir / Siguiendo */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFollow?.(); }}
            className={`shrink-0 rounded-full px-3 py-[3px] text-[12px] font-semibold leading-tight transition-all active:opacity-70 ${
              isFollowing
                ? 'border border-white/40 text-white/70'
                : 'border border-white text-white'
            }`}
          >
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
        </div>

        {/* ── Fila 2: descripción + "más" ── */}
        {hasDesc ? (
          <div className="mb-2.5">
            <p
              className={`text-[13px] leading-[1.45] text-white/90 drop-shadow ${
                expanded ? '' : 'line-clamp-2'
              }`}
            >
              {formatDescription(reel.description)}
            </p>
            {descLong ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                className="mt-0.5 text-[12px] font-medium text-white/60 active:text-white"
              >
                {expanded ? 'Menos' : 'más'}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ── Fila 3: audio ticker ── */}
        <div className="mb-3 flex items-center gap-1.5 overflow-hidden">
          <Music2 className="h-[13px] w-[13px] shrink-0 text-white/80" strokeWidth={2} />
          {/* Marquee — la pista se mueve de derecha a izquierda */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="flex items-center gap-6 whitespace-nowrap"
            >
              {/* Se duplica para crear efecto marquee continuo */}
              {[0, 1].map((i) => (
                <span key={i} className="text-[12px] font-medium text-white/80">
                  {audioLabel}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ── Fila 4: producto etiquetado ── */}
        <AnimatePresence>
          {hasProduct ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/products/${reel.productTag.id}`);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/25 bg-white/12 px-3 py-2.5 backdrop-blur-sm transition-colors active:bg-white/20"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/20">
                <img
                  src={reel.productTag.image}
                  alt={reel.productTag.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-medium text-white">{reel.productTag.name}</p>
                <p className="text-[13px] font-bold text-white">€{reel.productTag.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-0.5 text-[13px] font-medium text-white/80">
                <span>Ver</span>
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </div>
            </motion.button>
          ) : null}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default ReelOverlay;
