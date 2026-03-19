import React, { useMemo, useState, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Sparkles } from 'lucide-react';
import ReelCard from './ReelCard';
import PostCard from './PostCard';
import PostDetailModal from './PostDetailModal';
import FeedSkeleton from './FeedSkeleton';
import SuggestedUsersCard from './SuggestedUsersCard';
import { useForYouFeed, useLikePost, feedKeys } from '@/features/feed/queries';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullIndicator from '@/components/ui/PullIndicator';

export default function ForYouFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const feedQuery = useForYouFeed();
  const likeMutation = useLikePost();
  const allPosts = useMemo(() => {
    const raw = (feedQuery.data?.pages || []).flatMap((page) => page?.items || []).filter((p) => p?.id);
    const seen = new Set();
    return raw.filter((p) => {
      const key = String(p.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [feedQuery.data]);
  const hasMore = Boolean(feedQuery.hasNextPage);
  const isInitialLoading = feedQuery.isLoading;
  const error = feedQuery.error;

  // Post detail modal state
  const [modalPost, setModalPost] = useState(null);
  const handleCloseModal = useCallback(() => setModalPost(null), []);

  const { refreshing, progress, handlers } = usePullToRefresh(
    async () => { await queryClient.resetQueries({ queryKey: feedKeys.forYou }); }
  );

  const handleLike = useCallback(async (postId) => {
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
  }, [allPosts, likeMutation]);

  const handleComment = useCallback((postId) => {
    const post = allPosts.find((p) => p.id === postId);
    if (post) setModalPost(post);
    else navigate(`/posts/${postId}`);
  }, [allPosts, navigate]);

  const handleShare = useCallback(async (postId) => {
    const postUrl = `${window.location.origin}/posts/${postId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hispaloshop',
          text: t('feed.sharePrompt', 'Mira esta publicación en Hispaloshop'),
          url: postUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
        // Provide feedback when using clipboard fallback (no native share sheet)
        const { toast } = await import('sonner');
        toast.success(t('common.linkCopied', 'Enlace copiado'));
      }
    } catch {
      // User cancelled share dialog — ignore
    }
  }, [t]);

  if (error) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-stone-400" />
        <p className="text-[14px] font-medium text-stone-700">
          {t('feed.error', 'Error al cargar el feed')}
        </p>
        <p className="mt-1 text-[13px] text-stone-400">
          {t('feed.errorDescription', 'No hemos podido cargar las publicaciones ahora mismo.')}
        </p>
        <button
          type="button"
          onClick={() => feedQuery.refetch()}
          className="mt-5 rounded-full bg-stone-950 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 active:scale-95"
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
      transition={{ duration: 0.25 }}
      className="relative overscroll-none"
      {...handlers}
    >
      <PullIndicator progress={progress} isRefreshing={refreshing} />
      {isInitialLoading && allPosts.length === 0 ? (
        <div aria-busy="true" aria-label="Cargando publicaciones">
          <FeedSkeleton count={3} />
        </div>
      ) : allPosts.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
            <Sparkles className="h-7 w-7 text-stone-400" />
          </div>
          <p className="text-[15px] font-semibold text-stone-950">
            {t('feed.empty.title', 'Tu feed está vacío')}
          </p>
          <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-stone-400">
            {t('feed.empty.description', 'Sigue a productores e influencers para ver publicaciones aquí.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="mt-5 rounded-full bg-stone-950 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 active:scale-95"
          >
            {t('feed.explore', 'Descubrir')}
          </button>
        </div>
      ) : (
        <Virtuoso
          data={allPosts}
          estimatedItemSize={520}
          itemContent={(index, post) => {
            const isReel = post.video_url || post.type === 'reel';
            const animDelay = index < 5 ? index * 0.05 : 0;

            // Inject suggested users after every 5th post (position 4, 14, 24...)
            const showSuggestions = index === 4 || (index > 4 && (index - 4) % 10 === 0);

            if (isReel) {
              return (
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0, 0, 0.2, 1], delay: animDelay }}
                  >
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
                        timestamp: post.created_at ? new Date(post.created_at).getTime() : null,
                      }}
                      embedded
                      onLike={() => handleLike(post.id)}
                      onComment={() => handleComment(post.id)}
                      onShare={() => handleShare(post.id)}
                      priority={index < 2}
                    />
                  </motion.div>
                </div>
              );
            }

            return (
              <div>
                {showSuggestions && <SuggestedUsersCard />}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0, 0, 0.2, 1], delay: animDelay }}
                >
                  <PostCard
                    post={{
                      id: post.id,
                      user: {
                        id: post.user_id,
                        name: post.user_name,
                        avatar: post.user_profile_image,
                        verified: post.user_verified,
                        has_story: post.user_has_story,
                      },
                      media: post.media || [{ url: post.image_url, ratio: '1:1' }],
                      caption: post.caption,
                      likes: post.likes_count,
                      liked: post.is_liked,
                      comments: post.comments_count,
                      productTag: post.product_tag,
                      timestamp: post.created_at ? new Date(post.created_at).getTime() : null,
                    }}
                    onLike={() => handleLike(post.id)}
                    onComment={() => handleComment(post.id)}
                    onShare={() => handleShare(post.id)}
                    priority={index < 2}
                  />
                </motion.div>
              </div>
            );
          }}
          endReached={() => {
            if (hasMore && !feedQuery.isFetchingNextPage) {
              feedQuery.fetchNextPage();
            }
          }}
          overscan={3}
          style={{ height: 'calc(100vh - var(--header-height, 56px) - var(--bottom-nav-height, 64px))' }}
          components={{
            Footer: () => feedQuery.isFetchingNextPage
              ? <FeedSkeleton count={2} />
              : null,
          }}
        />
      )}

      {/* Post detail modal overlay */}
      {modalPost && (
        <PostDetailModal
          postId={modalPost.id || modalPost.post_id}
          post={modalPost}
          onClose={handleCloseModal}
        />
      )}
    </motion.div>
  );
}
