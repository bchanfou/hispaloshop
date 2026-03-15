import React from 'react';
import DesktopSidebar from './DesktopSidebar';

/**
 * FeedLayout — wraps feed pages (Home, Discover) with the DesktopSidebar
 * Used inside AppLayout. Adds a right sidebar on xl+ screens.
 */
export default function FeedLayout({ children }) {
  return (
    <div style={{
      display: 'flex',
      maxWidth: 'var(--max-width)',
      margin: '0 auto',
      gap: 0,
    }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>

      {/* Right sidebar — xl+ only */}
      <div className="hidden xl:block" style={{ paddingLeft: 24, paddingRight: 16 }}>
        <DesktopSidebar />
      </div>
    </div>
  );
}
