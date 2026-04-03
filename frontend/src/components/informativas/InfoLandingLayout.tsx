import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import InfoNav from './InfoNav';
import InfoFooter from './InfoFooter';
import { useScrollToHash } from '../../hooks/useScrollToHash';
import { useLandingI18n } from '../../hooks/useLandingI18n';

/**
 * InfoLandingLayout — wrapper for new informational/landing pages.
 * Uses the redesigned Aesop-style InfoNav + InfoFooter.
 * Stone-50 base background. Auto-scrolls to #hash anchors.
 * Fade transition between pages.
 */
export default function InfoLandingLayout({ children }: { children: React.ReactNode }) {
  useScrollToHash();
  const i18nReady = useLandingI18n();
  const { pathname } = useLocation();

  if (!i18nReady) return null;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <InfoNav />
      <motion.main
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex-1"
      >
        {children}
      </motion.main>
      <InfoFooter />
    </div>
  );
}
