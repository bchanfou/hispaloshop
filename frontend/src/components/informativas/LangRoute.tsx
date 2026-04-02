import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ja', 'ko'];

/**
 * LangRoute — Reads /:lang from URL, sets i18n language, renders children.
 * If lang is unsupported, redirects to /es/ equivalent.
 */
export default function LangRoute({ children }: { children: React.ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  const isValid = lang && SUPPORTED_LANGS.includes(lang);

  useEffect(() => {
    if (isValid && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, isValid, i18n]);

  if (!isValid) {
    // Redirect unsupported lang to default (es)
    return <Navigate to={`/es${window.location.pathname.replace(`/${lang}`, '')}`} replace />;
  }

  return <>{children}</>;
}
