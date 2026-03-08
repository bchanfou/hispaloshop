import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, UserPlus, AlertCircle } from 'lucide-react';
import ReelCard from './ReelCard';
import PostCard from './PostCard';
import FeedSkeleton from './FeedSkeleton';
import { useFeed } from '@/hooks/useFeed';
import { api } from '@/lib/api';

// Sugerencias de perfiles (mantener hasta tener endpoint real)
const SUGGESTED_PROFILES = [
  { id: 's1', name: 'Panadería Artesanal', avatar: 'https://i.pravatar.cc/150?u=6', followers: '12.5k' },
  { id: 's2', name: 'Conservas Doña Maria', avatar: 'https://i.pravatar.cc/150?u=7', followers: '8.2k' },
  { id: 's3', name: 'Chocolates Finos', avatar: 'https://i.pravatar.cc/150?u=8', followers: '15.1k' },
];

function SuggestedProfiles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <div className="bg-white p-4 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#E6A532]" />
        <h3 className="text-sm font-semibold text-[#1A1A1A]">
          {t('feed.suggestedForYou', 'Sugerencias para ti')}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {SUGGESTED_PROFILES.map((profile) => (
          <div
            key={profile.id}
            className="flex-shrink-0 w-24 text-center"
          >
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border border-stone-200"
            />
            <p className="text-xs font-medium text-[#1A1A1A] truncate">{profile.name}</p>
            <p className="text-xs text-[#6B7280]">{profile.followers}</p>
            <button
              onClick={() => navigate('/discover?scope=profiles')}
              className="mt-2 px-3 py-1 bg-[#2D5A3D] text-white text-xs rounded-full flex items-center gap-1 mx-auto hover:bg-[#234a30] transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              {t('feed.follow', 'Seguir')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ForYouFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(null);
  const { posts, nextCursor, hasMore, isLoading, error } = useFeed({ cursor });
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
    // Implement share functionality
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="pb-20"
    >
      {/* Sugerencias de perfiles */}
      <SuggestedProfiles />

      {/* Feed content */}
      {isLoading && allPosts.length === 0 ? (
        <FeedSkeleton count={3} />
      ) : allPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Sparkles className="w-12 h-12 text-stone-300 mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">
            {t('feed.empty.title', 'Tu feed está vacío')}
          </h3>
          <p className="text-stone-500 max-w-sm">
            {t('feed.empty.description', 'Sigue a productores e influencers para ver su contenido aquí')}
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            {t('feed.explore', 'Descubrir')}
          </button>
        </div>
      ) : (
        <>
          {allPosts.map((post, index) => {
            const isLast = index === allPosts.length - 1;
            
            // Determine if post is a reel (video) or regular post
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
    </motion.div>
  );
}
