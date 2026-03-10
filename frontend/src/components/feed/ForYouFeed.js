import React, { useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import ReelCard from './ReelCard';
import PostCard from './PostCard';
import FeedSkeleton from './FeedSkeleton';
import { useForYouFeed, useLikePost } from '@/features/feed/queries';

export default function ForYouFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const feedQuery = useForYouFeed();
  const likeMutation = useLikePost();
  const observerRef = useRef();
  const allPosts = useMemo(
    () => (feedQuery.data?.pages || []).flatMap((page) => page?.items || []),
    [feedQuery.data]
  );
  const hasMore = Boolean(feedQuery.hasNextPage);
  const isLoading = feedQuery.isLoading || feedQuery.isFetchingNextPage;
  const error = feedQuery.error;

  const lastPostRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          feedQuery.fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [feedQuery.fetchNextPage, hasMore, isLoading]
  );

  const handleLike = async (postId) => {
    const targetPost = allPosts.find((post) => post.id === postId);
    if (!targetPost) return;

    try {
      await likeMutation.mutateAsync({
        postId,
        liked: Boolean(targetPost.is_liked || targetPost.liked),
      });
    } catch {
      // Query layer handles rollback and error state.
    }
  };

  const handleComment = (postId) => {
    navigate(`/posts/${postId}`);
  };

  const handleShare = async (postId) => {
    if (!navigator.share) return;

    await navigator.share({
      title: 'Hispaloshop',
      text: 'Mira esta publicación en Hispaloshop',
      url: `${window.location.origin}/posts/${postId}`,
    });
  };

  if (error) {
    return (
      <div className="px-4 py-12">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-[28px] border border-stone-200 bg-white px-6 py-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-stone-300" />
          <p className="text-base font-medium text-stone-950">
            {t('feed.error', 'Error al cargar el feed')}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            No hemos podido cargar las publicaciones ahora mismo.
          </p>
          <Button
            onClick={() => feedQuery.refetch()}
            className="mt-5 h-11 rounded-full bg-stone-950 px-6 text-white hover:bg-stone-800"
          >
            {t('common.retry', 'Reintentar')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="pb-20"
    >
      {isLoading && allPosts.length === 0 ? (
        <FeedSkeleton count={3} />
      ) : allPosts.length === 0 ? (
        <div className="px-4 py-12">
          <div className="mx-auto flex max-w-md flex-col items-center rounded-[28px] border border-stone-200 bg-white px-6 py-8 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-stone-300" />
            <h3 className="text-lg font-semibold text-stone-950">
              {t('feed.empty.title', 'Tu feed está vacío')}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">
              {t(
                'feed.empty.description',
                'Sigue a productores e influencers para empezar a ver publicaciones útiles aquí.'
              )}
            </p>
            <Button
              onClick={() => navigate('/discover')}
              className="mt-5 h-11 rounded-full bg-stone-950 px-6 text-white hover:bg-stone-800"
            >
              {t('feed.explore', 'Descubrir')}
            </Button>
          </div>
        </div>
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

          {feedQuery.isFetchingNextPage ? <FeedSkeleton count={2} /> : null}
        </>
      )}
    </motion.div>
  );
}
