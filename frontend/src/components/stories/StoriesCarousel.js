import React from 'react';
import { StoriesRow } from '../HispaloStories';

const StoriesCarousel = ({ onCreateStory, onViewStory }) => {
  return (
    <section className="border-b border-stone-100 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <StoriesRow onCreateStory={onCreateStory} onViewStory={onViewStory} />
      </div>
    </section>
  );
};

export default StoriesCarousel;
