import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

interface TranslatableTextProps {
  /** The text to display (already translated by the API) */
  text: string;
  /** The original untranslated text */
  originalText?: string;
  /** ISO code of the source language (e.g. "es") */
  translatedFrom?: string;
  /** Optional CSS class for the text container */
  className?: string;
  /** Render as a specific element (default: span) */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3';
}

/**
 * Wraps dynamic content that may have been translated by the API.
 * Shows a "Translated from [language]" indicator and a toggle to see the original.
 */
export default function TranslatableText({
  text,
  originalText,
  translatedFrom,
  className = '',
  as: Tag = 'span',
}: TranslatableTextProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const { t } = useLocale();

  // If there's no translation (same language), just render the text
  if (!translatedFrom || !originalText || originalText === text) {
    return <Tag className={className}>{text}</Tag>;
  }

  const displayText = showOriginal ? originalText : text;

  return (
    <span className={`inline ${className}`}>
      <Tag>{displayText}</Tag>
      <span className="inline-flex items-center gap-1 ml-1.5">
        <button
          type="button"
          onClick={() => setShowOriginal(!showOriginal)}
          className="inline-flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          aria-label={showOriginal ? t('common.seeTranslation') : t('common.seeOriginal')}
        >
          <Globe className="w-3 h-3" />
          <span className="underline decoration-dotted">
            {showOriginal
              ? (t('common.seeTranslation') || 'See translation')
              : (t('common.seeOriginal') || 'See original')}
          </span>
        </button>
      </span>
    </span>
  );
}
