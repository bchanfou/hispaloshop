import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import { useTranslation } from 'react-i18next';

/**
 * AuthLayout — centered layout for auth pages (login, register, verify, etc.)
 * Logo at top, centered card, no nav.
 */
import i18n from "../../locales/i18n";
export default function AuthLayout({
  children
}) {
  return <div className="min-h-screen flex flex-col items-center bg-stone-50">
      {/* Logo */}
      <div className="pt-8 pb-6 flex items-center justify-center">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <Logo variant="full" theme="light" size={120} />
        </Link>
      </div>

      {/* Content card */}
      <main className="w-full max-w-[400px] px-4 flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer links */}
      <div className="py-6 px-4 flex gap-4 justify-center flex-wrap">
        {[{
        label: i18n.t('auth_layout.terminos', 'Términos'),
        to: '/terms'
      }, {
        label: 'Privacidad',
        to: '/privacy'
      }, {
        label: 'Ayuda',
        to: '/help'
      }].map(link => <Link key={link.to} to={link.to} className="text-xs text-stone-500 no-underline hover:text-stone-950 transition-colors">
            {link.label}
          </Link>)}
      </div>
    </div>;
}