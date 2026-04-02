import React from 'react';
import InfoNav from './InfoNav';
import InfoFooter from './InfoFooter';

/**
 * InfoLandingLayout — wrapper for new informational/landing pages.
 * Uses the redesigned Aesop-style InfoNav + InfoFooter.
 * Stone-50 base background.
 */
export default function InfoLandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <InfoNav />
      <main className="flex-1">
        {children}
      </main>
      <InfoFooter />
    </div>
  );
}
