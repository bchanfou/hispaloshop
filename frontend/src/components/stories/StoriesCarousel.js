import React from 'react';
import { StoriesRow } from '../HispaloStories';

/**
 * StoriesCarousel — wrapper edge-to-edge Instagram-style.
 * Sin padding horizontal interior: el StoriesRow ya gestiona pl-3/pr-3.
 */
const StoriesCarousel = ({ onCreateStory, onViewStory }) => {
  return (
    <section className="border-b border-stone-100 bg-white" data-testid="stories-carousel">
      <style>{`
        @media (min-width: 1024px) {
          [data-testid="stories-carousel"] [data-testid="stories-row"] {
            padding: 16px 4px;
            gap: 20px;
          }
          [data-testid="stories-carousel"] .story-circle {
            width: 72px !important;
            height: 72px !important;
          }
          [data-testid="stories-carousel"] .story-label {
            width: 72px !important;
          }
        }
      `}</style>
      <StoriesRow onCreateStory={onCreateStory} onViewStory={onViewStory} />
    </section>
  );
};

export default StoriesCarousel;
