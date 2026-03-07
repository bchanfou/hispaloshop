import React from 'react';

function SkeletonPulse({ className }) {
  return (
    <div className={`bg-stone-200 animate-pulse ${className}`} />
  );
}

function PostSkeleton() {
  return (
    <div className="bg-white mb-2">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-4 py-3">
        <SkeletonPulse className="w-8 h-8 rounded-full" />
        <SkeletonPulse className="w-32 h-4 rounded" />
      </div>
      
      {/* Image skeleton */}
      <SkeletonPulse className="w-full aspect-square" />
      
      {/* Actions skeleton */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex gap-4">
          <SkeletonPulse className="w-6 h-6 rounded-full" />
          <SkeletonPulse className="w-6 h-6 rounded-full" />
          <SkeletonPulse className="w-6 h-6 rounded-full" />
        </div>
        <SkeletonPulse className="w-6 h-6 rounded-full" />
      </div>
      
      {/* Info skeleton */}
      <div className="px-4 pb-4 space-y-2">
        <SkeletonPulse className="w-20 h-4 rounded" />
        <SkeletonPulse className="w-full h-4 rounded" />
        <SkeletonPulse className="w-2/3 h-4 rounded" />
      </div>
    </div>
  );
}

function ReelSkeleton() {
  return (
    <SkeletonPulse className="aspect-[9/16] rounded-lg" />
  );
}

function FeedSkeleton({ count = 3, type = 'posts' }) {
  if (type === 'mixed') {
    return (
      <div className="pb-20">
        {/* Grid de reels */}
        <div className="grid grid-cols-2 gap-1 p-1 mb-2">
          {[...Array(4)].map((_, i) => (
            <ReelSkeleton key={i} />
          ))}
        </div>
        
        {/* Sugerencias skeleton */}
        <div className="bg-white p-4 mb-2">
          <SkeletonPulse className="w-40 h-4 rounded mb-3" />
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 flex flex-col items-center p-3 bg-stone-50 rounded-xl w-28">
                <SkeletonPulse className="w-14 h-14 rounded-full mb-2" />
                <SkeletonPulse className="w-20 h-3 rounded mb-1" />
                <SkeletonPulse className="w-16 h-2 rounded" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Post skeleton */}
        <PostSkeleton />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {[...Array(count)].map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

export default FeedSkeleton;
