// Section 3.6.6 — F-01
// Compact 3-dot popover menu used on every comment/review row that the
// current user owns. Renders Editar / Eliminar items. Click-outside closes.
// Stone palette, Lucide icons. Tap target ≥ 44px (F-08 compliant).

import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CommentActionsMenu({
  onEdit,
  onDelete,
  align = 'right',
  triggerSize = 32,
  iconColor = 'text-stone-400',
  hoverColor = 'hover:text-stone-700',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`bg-transparent border-none cursor-pointer p-2 inline-flex items-center justify-center ${iconColor} ${hoverColor} transition-colors`}
        style={{ minWidth: 44, minHeight: 44 }}
        aria-label={ariaLabel || t('comments.actions.menu', 'Más opciones')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={triggerSize === 32 ? 16 : 18} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 z-50 min-w-[140px] rounded-2xl bg-white shadow-xl border border-stone-100 overflow-hidden`}
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm text-stone-950 hover:bg-stone-50 transition-colors bg-transparent border-none cursor-pointer"
            >
              <Pencil size={14} strokeWidth={1.8} />
              {t('common.edit', 'Editar')}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm text-stone-950 hover:bg-stone-50 transition-colors bg-transparent border-none cursor-pointer"
            >
              <Trash2 size={14} strokeWidth={1.8} />
              {t('common.delete', 'Eliminar')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
