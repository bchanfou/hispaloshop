import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGS = ['es', 'en', 'ko'];

/**
 * LangRoute — Reads /:lang from URL, sets i18n language, renders children.
 * If lang is unsupported, redirects to /es/ equivalent.
 */
export default function LangRoute({
  children,
  lang: forcedLang,
}: {
  children: React.ReactNode;
  lang?: string;
}) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const resolvedLang = forcedLang || lang;

  const isValid = Boolean(resolvedLang && SUPPORTED_LANGS.includes(resolvedLang));

  useEffect(() => {
    if (isValid && resolvedLang && i18n.language !== resolvedLang) {
      i18n.changeLanguage(resolvedLang);
    }
  }, [resolvedLang, isValid, i18n]);

  if (!isValid) {
    const safeLang = resolvedLang || '';
    const pathname = window.location.pathname || '/';
    const remainingPath = safeLang
      ? (pathname.replace(new RegExp(`^/${safeLang}`), '') || '/')
      : pathname;
    return <Navigate to={`/es${remainingPath}`} replace />;
  }

  return <>{children}</>;
}
