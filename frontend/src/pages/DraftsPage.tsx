// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image, Clapperboard, CirclePlus, Trash2 } from 'lucide-react';

const DRAFT_KEYS = [
  { key: 'post_draft', type: 'Post', Icon: Image, route: '/create/post' },
  { key: 'reel_draft', type: 'Reel', Icon: Clapperboard, route: '/create/reel' },
  { key: 'story_draft', type: 'Story', Icon: CirclePlus, route: '/create/story' },
];

const MAX_AGE = 24 * 60 * 60 * 1000; // 24h

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Hace un momento';
  if (diff < 3600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86400_000) return `Hace ${Math.floor(diff / 3600_000)}h`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getPreviewText(draft, type) {
  if (type === 'Post' || type === 'Reel') return draft.caption || 'Sin descripción';
  if (type === 'Story') {
    const count = (draft.textOverlays?.length || 0) + (draft.stickerOverlays?.length || 0);
    return count > 0 ? `${count} elemento${count > 1 ? 's' : ''}` : 'Sin contenido';
  }
  return '';
}

export default function DraftsPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);

  const loadDrafts = useCallback(() => {
    const result = [];
    for (const { key, type, Icon, route } of DRAFT_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const draft = JSON.parse(raw);
        const age = Date.now() - (draft.savedAt || 0);
        if (age >= MAX_AGE) {
          localStorage.removeItem(key);
          continue;
        }
        result.push({ key, type, Icon, route, draft, savedAt: draft.savedAt });
      } catch {
        /* ignore corrupt entries */
      }
    }
    result.sort((a, b) => b.savedAt - a.savedAt);
    setDrafts(result);
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleDelete = (key) => {
    if (!window.confirm('¿Eliminar este borrador?')) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    loadDrafts();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-[600px] mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="bg-transparent border-none cursor-pointer p-1"
            aria-label="Volver"
          >
            <ChevronLeft className="text-stone-950 w-[22px] h-[22px]" />
          </button>
          <h1 className="text-[17px] font-semibold text-stone-950 m-0">
            Borradores
          </h1>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 py-5">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center">
              <Image size={24} className="text-stone-400" />
            </div>
            <p className="text-sm text-stone-500 text-center">
              No tienes borradores
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {drafts.map(({ key, type, Icon, route, draft, savedAt }) => (
              <div
                key={key}
                className="flex items-center gap-3 bg-stone-50 rounded-2xl p-4 border border-stone-100"
              >
                {/* Type icon */}
                <div className="w-11 h-11 rounded-xl bg-stone-200 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-stone-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-950 m-0">
                    {type}
                  </p>
                  <p className="text-xs text-stone-500 m-0 truncate">
                    {getPreviewText(draft, type)}
                  </p>
                  <p className="text-[11px] text-stone-400 m-0 mt-0.5">
                    {formatTime(savedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(route)}
                    className="text-xs font-semibold text-white bg-stone-950 rounded-full px-4 py-2 border-none cursor-pointer hover:bg-stone-800 transition-colors"
                  >
                    Continuar
                  </button>
                  <button
                    onClick={() => handleDelete(key)}
                    className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 border-none cursor-pointer flex items-center justify-center transition-colors"
                    aria-label={`Eliminar borrador de ${type}`}
                  >
                    <Trash2 size={15} className="text-stone-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
