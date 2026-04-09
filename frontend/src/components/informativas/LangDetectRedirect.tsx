import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LANDING_LANGS = ['es', 'en', 'ko'];

/**
 * Detects the user's i18n language and redirects from a bare landing route
 * to the /{lang}/ prefixed version. Used for routes like /consumidor → /es/consumidor.
 *
 * Falls back to the non-prefixed route if lang is already set in the URL or
 * if the language isn't one of our active landing languages.
 */
export default function LangDetectRedirect({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const lang = i18n.language?.split('-')[0];

  // Only redirect if the current lang is a supported landing lang AND
  // the URL doesn't already have a lang prefix
  const hasLangPrefix = LANDING_LANGS.some(l => location.pathname.startsWith(`/${l}/`) || location.pathname === `/${l}`);

  if (!hasLangPrefix && lang && LANDING_LANGS.includes(lang) && lang !== 'es') {
    return <Navigate to={`/${lang}${location.pathname}${location.search}${location.hash}`} replace />;
  }

  return <>{children}</>;
}
