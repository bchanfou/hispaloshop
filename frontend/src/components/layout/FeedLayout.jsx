import React from 'react';
import DesktopSidebar from './DesktopSidebar';

/**
 * FeedLayout — wraps feed pages (Home, Discover, Communities, Stores)
 * with the DesktopSidebar on lg+ screens.
 * Used inside AppLayout.
 */
export default function FeedLayout({ children }) {
  return (
    <div className="feed-layout-wrapper" style={{
      width: '100%',
      background: 'var(--color-cream)',
    }}>
      <style>{`
        .feed-layout {
          display: flex;
          gap: 40px;
          max-width: calc(var(--container-feed) + var(--container-sidebar) + 40px);
          margin: 0 auto;
          padding: 0 var(--content-px);
          align-items: flex-start;
        }
        .feed-column {
          flex: 1;
          min-width: 0;
          max-width: var(--container-feed);
        }
        .feed-sidebar-slot {
          display: none;
          width: var(--container-sidebar);
          flex-shrink: 0;
        }
        @media (min-width: 1024px) {
          .feed-layout {
            padding: 0 var(--content-px-desktop);
          }
          .feed-sidebar-slot {
            display: block;
          }
        }
        @media (min-width: 1440px) {
          .feed-layout {
            gap: 56px;
            padding: 0;
          }
        }
        @media (hover: hover) {
          .product-card-hover:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-md);
          }
          .post-card-hover:hover {
            transform: scale(1.005);
            box-shadow: var(--shadow-sm);
          }
          .reel-card-hover:hover .reel-hover-overlay {
            opacity: 1;
          }
        }
      `}</style>

      <div className="feed-layout">
        <div className="feed-column">
          {children}
        </div>
        <div className="feed-sidebar-slot">
          <DesktopSidebar />
        </div>
      </div>
    </div>
  );
}
