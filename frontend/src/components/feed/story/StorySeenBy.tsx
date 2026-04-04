// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Trash2, X } from 'lucide-react';
import i18n from '../../../locales/i18n';

interface Viewer {
  user_id?: string;
  id?: string;
  name?: string;
  username?: string;
  avatar_url?: string;
  profile_image?: string;
  avatar?: string;
}

interface StorySeenByProps {
  isOwnStory: boolean;
  readOnly: boolean;
  viewCount: number;
  showSeenBy: boolean;
  viewers: Viewer[];
  viewersLoading: boolean;
  onToggleSeenBy: () => void;
  onCloseSeenBy: () => void;
  onDeleteClick: () => void;
}

export default function StorySeenBy({
  isOwnStory,
  readOnly,
  viewCount,
  showSeenBy,
  viewers,
  viewersLoading,
  onToggleSeenBy,
  onCloseSeenBy,
  onDeleteClick,
}: StorySeenByProps) {
  if (!isOwnStory || readOnly) return null;

  return (
    <>
      {/* View count + delete buttons */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSeenBy();
        }}
        className="absolute bottom-4 left-4 z-[2] flex items-center gap-1 bg-transparent border-none cursor-pointer"
        aria-label="Ver quien ha visto esta historia"
      >
        <Eye size={14} className="text-white/60" />
        <span className="text-xs text-white/60 font-sans">
          {viewCount} vistas
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick();
        }}
        className="absolute bottom-4 right-4 z-[2] flex items-center gap-1 bg-transparent border-none cursor-pointer"
        aria-label="Eliminar story"
      >
        <Trash2 size={14} className="text-white/60" />
      </button>

      {/* Expandable viewers list */}
      <AnimatePresence>
        {showSeenBy && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[3] bg-black/80 rounded-t-2xl max-h-[50%] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white font-sans">
                {viewCount} vistas
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseSeenBy();
                }}
                className="text-white/60 bg-transparent border-none cursor-pointer p-1"
                aria-label="Cerrar lista de vistas"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {viewersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : viewers.length > 0 ? (
                viewers.map((v, vi) => (
                  <div
                    key={v.user_id || v.id || vi}
                    className="flex items-center gap-3 py-2"
                  >
                    {v.avatar_url || v.profile_image || v.avatar ? (
                      <img
                        src={v.avatar_url || v.profile_image || v.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {(v.username || v.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-white font-sans font-medium truncate">
                        {v.username || v.name || 'Usuario'}
                      </span>
                      {v.name && v.username && (
                        <span className="text-xs text-white/50 font-sans truncate">
                          {v.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-white/40 font-sans py-6">
                  {i18n.t(
                    'story_viewer.sinDatosDeVistasDisponibles',
                    'Sin datos de vistas disponibles',
                  )}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
