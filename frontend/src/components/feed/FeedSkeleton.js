import React from 'react';

function SkeletonPulse({ className }) {
  return <div className={`animate-pulse bg-stone-100 ${className}`} />;
}

// Skeleton que refleja el layout IG del nuevo PostCard (sin max-w, avatar 32px)
function PostSkeleton() {
  return (
    <div className="border-b border-stone-100 bg-white" aria-hidden="true">
      {/* Header: avatar 36px + líneas de nombre */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <SkeletonPulse className="h-9 w-9 shrink-0 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonPulse className="h-3 w-24 rounded-full" />
          <SkeletonPulse className="h-2.5 w-14 rounded-full" />
        </div>
      </div>

      {/* Imagen full-width */}
      <SkeletonPulse className="aspect-square w-full" />

      {/* Acciones */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-4">
          <SkeletonPulse className="h-6 w-6 rounded-full" />
          <SkeletonPulse className="h-6 w-6 rounded-full" />
          <SkeletonPulse className="h-6 w-6 rounded-full" />
        </div>
        <SkeletonPulse className="h-6 w-6 rounded-full" />
      </div>

      {/* Caption */}
      <div className="space-y-2 px-4 pb-3">
        <SkeletonPulse className="h-3 w-20 rounded-full" />
        <SkeletonPulse className="h-3 w-full rounded-full" />
        <SkeletonPulse className="h-3 w-3/5 rounded-full" />
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
      <div>
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
    <div>
      {[...Array(count)].map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  );
}

export default FeedSkeleton;
