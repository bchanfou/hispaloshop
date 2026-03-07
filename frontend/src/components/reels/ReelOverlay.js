import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ReelOverlay({ reel }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const hasProduct = !!reel.productTag;

  // Formatear descripción con hashtags clicables
  const formatDescription = (text) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span 
            key={i} 
            className="text-[#E6A532] cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/discover?hashtag=${part.slice(1)}`);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleProductClick = () => {
    if (reel.productTag) {
      navigate(`/products/${reel.productTag.id}`);
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={() => window.history.back()}
          className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
        >
          ✕
        </button>
        <span className="text-white font-medium text-sm">Reels</span>
        <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
          ⋯
        </button>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
        <div className="pr-20">
          {/* Info creador */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-semibold text-base drop-shadow-lg">
              @{reel.user.username}
            </span>
            {reel.user.verified && (
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            )}
          </div>

          {/* Descripción */}
          <div className="mb-3">
            <p 
              className={`text-white/90 text-sm leading-relaxed drop-shadow-lg ${
                expanded ? '' : 'line-clamp-2'
              }`}
            >
              {formatDescription(reel.description)}
            </p>
            {reel.description.length > 100 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-white/70 text-xs mt-1 hover:text-white"
              >
                {expanded ? 'Menos' : 'Más'}
              </button>
            )}
          </div>

          {/* Audio */}
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="w-4 h-4 text-white/80" />
            <div className="flex items-center gap-1 overflow-hidden">
              <motion.div
                animate={{ x: [0, -100] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 10, 
                  ease: 'linear' 
                }}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <span className="text-white/80 text-sm">
                  {reel.audio.original ? 'Sonido original' : reel.audio.name}
                </span>
                <span className="text-white/60 text-sm">-</span>
                <span className="text-white/80 text-sm">{reel.audio.author}</span>
                <span className="text-white/60 text-sm mx-2">•</span>
                <span className="text-white/80 text-sm">
                  {reel.audio.original ? 'Sonido original' : reel.audio.name}
                </span>
                <span className="text-white/60 text-sm">-</span>
                <span className="text-white/80 text-sm">{reel.audio.author}</span>
              </motion.div>
            </div>
          </div>

          {/* Producto etiquetado */}
          <AnimatePresence>
            {hasProduct && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProductClick();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 cursor-pointer hover:bg-white/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-lg bg-white/20 overflow-hidden flex-shrink-0">
                  <img
                    src={reel.productTag.image}
                    alt={reel.productTag.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {reel.productTag.name}
                  </p>
                  <p className="text-white/90 font-bold text-sm">
                    €{reel.productTag.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-white text-sm font-medium">
                  <span>Ver</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default ReelOverlay;
