import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { API } from '../../utils/api';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';

export function SocialFeed({ type = 'for_you' }) {
  const loaderRef = useRef(null);
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error
  } = useInfiniteQuery({
    queryKey: ['feed', type],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await API.get(`/posts/feed?type=${type}&page=${pageParam}`);
      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta.has_more) return undefined;
      return lastPage.meta.page + 1;
    }
  });

  // Infinite scroll con IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error cargando feed</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const posts = data?.pages.flatMap(page => page.posts) || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      {posts.map((post) => (
        <PostCard key={post.id || post._id} post={post} />
      ))}
      
      {/* Infinite scroll trigger */}
      <div ref={loaderRef} className="h-20 flex items-center justify-center">
        {isFetchingNextPage && (
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        )}
        {!hasNextPage && posts.length > 0 && (
          <p className="text-gray-500 text-sm">No hay mas posts</p>
        )}
      </div>
    </div>
  );
}
