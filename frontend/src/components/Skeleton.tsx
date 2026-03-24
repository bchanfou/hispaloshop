// @ts-nocheck
import React from 'react';

interface SkeletonProps {
  className?: string;
  [key: string]: any;
}

export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div className={`skeleton-shimmer rounded ${className}`} {...rest} />
  );
}

interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText({ lines = 3 }: SkeletonTextProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-[60%]' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
      <Skeleton className="w-full h-48" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4">
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-32" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function StoriesBarSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 shrink-0">
          <Skeleton className="w-[60px] h-[60px] rounded-full" />
          <Skeleton className="w-12 h-2.5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Cover */}
      <Skeleton className="w-full h-[140px] rounded-none" />
      <div className="px-4">
        {/* Avatar overlapping cover */}
        <Skeleton className="w-20 h-20 rounded-full -mt-10 mb-3 border-[3px] border-white" />
        <Skeleton className="h-5 w-[50%] mb-2" />
        <Skeleton className="h-3.5 w-[30%] mb-4" />
        {/* Stats row */}
        <div className="flex gap-6 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="w-10 h-[18px]" />
              <Skeleton className="w-[60px] h-3" />
            </div>
          ))}
        </div>
        {/* Grid 3x3 */}
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-square rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-[80%]" />
        <Skeleton className="h-3 w-[50%]" />
      </div>
      <Skeleton className="w-10 h-3 shrink-0" />
    </div>
  );
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-[45%]" />
            <Skeleton className="h-3 w-[70%]" />
          </div>
          <Skeleton className="w-8 h-3 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
