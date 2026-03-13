import React from 'react';
import { StoriesRow } from '../HispaloStories';

/**
 * StoriesCarousel — wrapper edge-to-edge Instagram-style.
 * Sin padding horizontal interior: el StoriesRow ya gestiona pl-3/pr-3.
 */
const StoriesCarousel = ({ onCreateStory, onViewStory }) => {
  return (
    <section className="border-b border-stone-100 bg-white" data-testid="stories-carousel">
      <StoriesRow onCreateStory={onCreateStory} onViewStory={onViewStory} />
    </section>
  );
};

export default StoriesCarousel;
