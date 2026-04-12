// Section 3.6.6 — F-01
// Renders a comment/review body with three modes:
//   1. Read mode: text + optional "(editado)" badge.
//   2. Edit mode: textarea + Guardar/Cancelar buttons (Cmd+Enter to save).
//   3. Deleted mode: italic placeholder "[mensaje eliminado]" preserving the
//      thread slot so reply structures stay intact.
//
// State machine is owned by the parent (via `editing` + `onSave/onCancel`)
// so each surface can wire its own optimistic update + rollback. The
// component is purely presentational.

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EditableCommentText({
  text,
  edited = false,
  deleted = false,
  editing = false,
  saving = false,
  maxLength = 500,
  minLength = 1,
  onSave,
  onCancel,
  className = '',
  textClassName = 'text-[13px] leading-relaxed text-stone-950',
  deletedClassName = 'text-[13px] italic text-stone-400',
  editedBadgeClassName = 'text-[11px] text-stone-400 ml-1.5',
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(text || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setDraft(text || '');
      // Defer focus so the textarea is mounted.
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          (text || '').length,
          (text || '').length,
        );
      });
    }
  }, [editing, text]);

  if (deleted) {
    return (
      <p className={`${deletedClassName} ${className}`}>
        {t('comments.deletedPlaceholder', '[mensaje eliminado]')}
      </p>
    );
  }

  if (editing) {
    const trimmed = draft.trim();
    const tooShort = trimmed.length < minLength;
    const tooLong = trimmed.length > maxLength;
    const canSave = !tooShort && !tooLong && !saving && trimmed !== (text || '').trim();

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSave) {
        e.preventDefault();
        onSave?.(trimmed);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    return (
      <div className={className}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={Math.min(6, Math.max(2, Math.ceil((draft.length || 0) / 60)))}
          maxLength={maxLength + 50}
          disabled={saving}
          className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-stone-950 focus:outline-none focus:border-stone-400 resize-none disabled:opacity-50"
          aria-label={t('comments.edit.textarea', 'Editar comentario')}
        />
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className={`text-[11px] ${tooLong ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
            {trimmed.length}/{maxLength}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-stone-600 bg-transparent border border-stone-200 cursor-pointer disabled:opacity-50 min-h-[32px]"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={() => canSave && onSave?.(trimmed)}
              disabled={!canSave}
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white bg-stone-950 border-none cursor-pointer disabled:opacity-40 min-h-[32px]"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {t('common.save', 'Guardar')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span className={`${textClassName} ${className}`}>
      {text}
      {edited && (
        <span className={editedBadgeClassName}>
          {t('comments.editedBadge', '(editado)')}
        </span>
      )}
    </span>
  );
}
