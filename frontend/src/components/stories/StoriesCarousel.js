import React from 'react';
import { StoriesRow } from '../HispaloStories';

const StoriesCarousel = () => {
  return (
    <div className="bg-white py-4 border-b border-stone-100">
      <div className="px-4">
        <StoriesRow />
      </div>
    </div>
  );
};

export default StoriesCarousel;
