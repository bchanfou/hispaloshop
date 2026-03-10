import React from 'react';

function SkeletonPulse({ className }) {
  return <div className={`animate-pulse bg-stone-200 ${className}`} />;
}

function PostSkeleton() {
  return (
    <div className="border-b border-stone-100 bg-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <SkeletonPulse className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <SkeletonPulse className="h-4 w-28 rounded-full" />
            <SkeletonPulse className="h-3 w-16 rounded-full" />
          </div>
        </div>

        <SkeletonPulse className="aspect-square w-full" />

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex gap-2">
            <SkeletonPulse className="h-10 w-10 rounded-full" />
            <SkeletonPulse className="h-10 w-10 rounded-full" />
            <SkeletonPulse className="h-10 w-10 rounded-full" />
          </div>
          <SkeletonPulse className="h-10 w-10 rounded-full" />
        </div>

        <div className="space-y-2 px-4 pb-4">
          <SkeletonPulse className="h-4 w-24 rounded-full" />
          <SkeletonPulse className="h-4 w-full rounded-full" />
          <SkeletonPulse className="h-4 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ReelSkeleton() {
  return <SkeletonPulse className="aspect-[9/16] rounded-[28px]" />;
}

function FeedSkeleton({ count = 3, type = 'posts' }) {
  if (type === 'mixed') {
    return (
      <div className="pb-20">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
          {[...Array(4)].map((_, index) => (
            <ReelSkeleton key={index} />
          ))}
        </div>
        <PostSkeleton />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {[...Array(count)].map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  );
}

export default FeedSkeleton;
