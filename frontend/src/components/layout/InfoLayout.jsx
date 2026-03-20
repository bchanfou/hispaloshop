import React from 'react';
import InfoHeader from './InfoHeader';
import Footer from './Footer';

/**
 * InfoLayout — for informational/landing pages (no session required)
 * Transparent header over hero, no bottom nav, footer at bottom.
 */
export default function InfoLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
    }}>
      <InfoHeader />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
