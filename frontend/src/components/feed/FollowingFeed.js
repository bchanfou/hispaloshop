import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, AlertCircle } from 'lucide-react';
import PostCard from './PostCard';
import ReelCard from './ReelCard';
import FeedSkeleton from './FeedSkeleton';
import { useFollowingFeed } from '@/hooks/useFeed';
import { api } from '@/lib/api';

function EmptyFollowing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
        <Users className="w-10 h-10 text-stone-400" />
      </div>
      <h3 className="text-lg font-medium text-stone-900 mb-2">
        {t('feed.following.empty.title', 'No sigues a nadie todavía')}
      </h3>
      <p className="text-stone-500 max-w-sm mb-6">
        {t('feed.following.empty.description', 'Sigue a productores, importadores e influencers para ver su contenido en esta sección')}
      </p>
      <button
        onClick={() => navigate('/discover')}
        className="px-6 py-2 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-colors"
      >
        {t('feed.discoverUsers', 'Descubrir usuarios')}
      </button>
    </div>
  );
}

function FollowingFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(null);
  const { posts, nextCursor, hasMore, isLoading, error } = useFollowingFeed(cursor);
  const [allPosts, setAllPosts] = useState([]);
  const observerRef = useRef();

  // Accumulate posts
  useEffect(() => {
    if (posts.length > 0) {
      setAllPosts(prev => cursor ? [...prev, ...posts] : posts);
    }
  }, [posts, cursor]);

  // Infinite scroll
  const lastPostRef = useCallback((node) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setCursor(nextCursor);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoading, hasMore, nextCursor]);

  const handleLike = async (postId) => {
    try {
      await api.toggleLikePost(postId);
      // Optimistic update
      setAllPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: !post.is_liked, likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1 }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId) => {
    navigate(`/posts/${postId}`);
  };

  const handleShare = (postId) => {
    if (navigator.share) {
      navigator.share({
        title: 'Hispaloshop',
        text: 'Mira este post en Hispaloshop',
        url: `${window.location.origin}/posts/${postId}`,
      });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-stone-600 text-center">{t('feed.error', 'Error al cargar el feed')}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-lg"
        >
          {t('common.retry', 'Reintentar')}
        </button>
      </div>
    );
  }

  // Show empty state only when not loading and no posts
  if (!isLoading && allPosts.length === 0 && !cursor) {
    return <EmptyFollowing />;
  }

  return (
    <div className="pb-20">
      {isLoading && allPosts.length === 0 ? (
        <FeedSkeleton count={3} />
      ) : (
        <>
          {allPosts.map((post, index) => {
            const isLast = index === allPosts.length - 1;
            const isReel = post.video_url || post.type === 'reel';
            
            if (isReel) {
              return (
                <div ref={isLast ? lastPostRef : null} key={post.id}>
                  <ReelCard
                    reel={{
                      id: post.id,
                      user: {
                        id: post.user_id,
                        name: post.user_name,
                        avatar: post.user_profile_image,
                      },
                      videoUrl: post.video_url || post.media?.[0]?.url,
                      thumbnail: post.thumbnail || post.image_url,
                      caption: post.caption,
                      likes: post.likes_count,
                      liked: post.is_liked,
                      comments: post.comments_count,
                      shares: post.shares_count || 0,
                      productTag: post.product_tag,
                      timestamp: new Date(post.created_at).getTime(),
                    }}
                    onLike={() => handleLike(post.id)}
                    onComment={() => handleComment(post.id)}
                    onShare={() => handleShare(post.id)}
                  />
                </div>
              );
            }
            
            return (
              <div ref={isLast ? lastPostRef : null} key={post.id}>
                <PostCard
                  post={{
                    id: post.id,
                    user: {
                      id: post.user_id,
                      name: post.user_name,
                      avatar: post.user_profile_image,
                      verified: post.user_verified,
                    },
                    media: post.media || [{ url: post.image_url, ratio: '1:1' }],
                    caption: post.caption,
                    likes: post.likes_count,
                    liked: post.is_liked,
                    comments: post.comments_count,
                    productTag: post.product_tag,
                    timestamp: new Date(post.created_at).getTime(),
                  }}
                  onLike={() => handleLike(post.id)}
                  onComment={() => handleComment(post.id)}
                  onShare={() => handleShare(post.id)}
                />
              </div>
            );
          })}
          
          {isLoading && <FeedSkeleton count={2} />}
        </>
      )}
    </div>
  );
}

export default FollowingFeed;
