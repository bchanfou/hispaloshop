import React from 'react';
import { StoriesRow } from '../HispaloStories';

const StoriesCarousel = () => {
  return (
    <section className="border-b border-stone-100 bg-white px-4 py-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Historias
          </p>
        </div>
        <StoriesRow />
      </div>
    </section>
  );
};

export default StoriesCarousel;
