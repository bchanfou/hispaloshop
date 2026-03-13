import React from 'react';

// Skeleton para productos en grid
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 animate-pulse">
          <div className="h-48 w-full bg-stone-200 rounded-2xl" />
          <div className="h-4 w-3/4 bg-stone-200 rounded" />
          <div className="h-4 w-1/2 bg-stone-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// Skeleton para lista de productos (horizontal)
export function ProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-28 space-y-2 animate-pulse">
          <div className="h-28 w-28 bg-stone-200 rounded-2xl" />
          <div className="h-3 w-20 bg-stone-200 rounded" />
          <div className="h-3 w-12 bg-stone-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// Skeleton para posts (feed social)
export function PostSkeleton() {
  return (
    <div className="bg-white border-b border-stone-100 pb-4 mb-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-stone-200" />
        <div className="space-y-1">
          <div className="h-3 w-24 bg-stone-200 rounded" />
          <div className="h-2 w-12 bg-stone-200 rounded" />
        </div>
      </div>
      {/* Imagen */}
      <div className="w-full aspect-square bg-stone-200" />
      {/* Acciones */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="w-6 h-6 bg-stone-200 rounded" />
        <div className="w-6 h-6 bg-stone-200 rounded" />
        <div className="w-6 h-6 bg-stone-200 rounded" />
      </div>
      {/* Likes y caption */}
      <div className="px-4 space-y-2">
        <div className="h-3 w-20 bg-stone-200 rounded" />
        <div className="h-3 w-full bg-stone-200 rounded" />
      </div>
    </div>
  );
}

// Skeleton para feed completo
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="max-w-md mx-auto">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton para tiendas
export function StoreListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-100 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-stone-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-stone-200 rounded" />
            <div className="h-3 w-24 bg-stone-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton genérico
export function GenericSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-full w-full bg-stone-200 rounded" />
    </div>
  );
}

// Loading spinner centrado
export function CenteredSpinner({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
      <p className="mt-4 text-sm text-stone-500">{message}</p>
    </div>
  );
}
