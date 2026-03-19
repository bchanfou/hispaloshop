import React from 'react';

function SkeletonPulse({ className }) {
  return <div className={`animate-pulse bg-stone-100 rounded ${className}`} />;
}

/**
 * PostSkeleton — mirrors PostCard layout exactly to prevent CLS.
 *
 * PostCard structure:
 *   1. Header: 40px avatar · username line · timestamp line
 *   2. Image: full-width aspect-[4/5] (portrait) or aspect-square
 *   3. Action bar: ♥ 💬 share (left) · bookmark (right)
 *   4. Likes count line
 *   5. Caption: 2 lines (bold username + text)
 *   6. Comments hint line
 */
function PostSkeleton() {
  return (
    <div className="border-b border-stone-100 bg-white" aria-hidden="true">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Avatar — 40px circle */}
        <SkeletonPulse className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5 flex-1">
          {/* Username */}
          <SkeletonPulse className="h-3 w-28 rounded-full" />
          {/* Timestamp */}
          <SkeletonPulse className="h-2.5 w-16 rounded-full" />
        </div>
        {/* More icon placeholder */}
        <SkeletonPulse className="h-5 w-5 rounded-full shrink-0" />
      </div>

      {/* ── Image — 4:5 portrait matches most PostCard media ── */}
      <SkeletonPulse className="aspect-[4/5] w-full rounded-none" />

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-4">
          {/* Heart */}
          <SkeletonPulse className="h-6 w-6 rounded-full" />
          {/* Comment */}
          <SkeletonPulse className="h-6 w-6 rounded-full" />
          {/* Share */}
          <SkeletonPulse className="h-6 w-6 rounded-full" />
        </div>
        {/* Bookmark */}
        <SkeletonPulse className="h-6 w-6 rounded-full" />
      </div>

      {/* ── Caption area ── */}
      <div className="px-3 pb-4 space-y-2 mt-1">
        {/* Likes count */}
        <SkeletonPulse className="h-3 w-24 rounded-full" />
        {/* Caption line 1: username + start of text */}
        <SkeletonPulse className="h-3 w-full rounded-full" />
        {/* Caption line 2 */}
        <SkeletonPulse className="h-3 w-4/5 rounded-full" />
        {/* View comments hint */}
        <SkeletonPulse className="h-2.5 w-32 rounded-full mt-1" />
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
