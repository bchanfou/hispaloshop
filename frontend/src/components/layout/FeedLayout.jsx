import React from 'react';
import DesktopSidebar from './DesktopSidebar';

/**
 * FeedLayout — wraps feed pages (Home, Discover, Communities, Stores)
 * with the DesktopSidebar on xl+ screens.
 * Feed column is max 600px, right sidebar 320px.
 */
export default function FeedLayout({ children }) {
  return (
    <div className="w-full bg-white">
      <style>{`
        .feed-layout {
          display: flex;
          gap: 32px;
          max-width: calc(470px + 320px + 32px);
          margin: 0 auto;
          padding: 0;
          align-items: flex-start;
          justify-content: center;
        }
        .feed-column {
          flex: 1;
          min-width: 0;
          max-width: 470px;
        }
        .feed-sidebar-slot {
          display: none;
          width: 320px;
          flex-shrink: 0;
        }
        @media (min-width: 1024px) {
          .feed-layout {
            padding: 0;
          }
          .feed-sidebar-slot {
            display: block;
          }
        }
        @media (min-width: 1440px) {
          .feed-layout {
            gap: 40px;
            max-width: calc(470px + 320px + 40px);
            padding: 0;
          }
        }
        @media (hover: hover) {
          .product-card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          .post-card-hover:hover {
            transform: scale(1.005);
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
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
