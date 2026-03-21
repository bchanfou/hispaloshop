import React, { useMemo, useState, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Users } from 'lucide-react';
import PostCard from './PostCard';
import ReelCard from './ReelCard';
import PostDetailModal from './PostDetailModal';
import FeedSkeleton from './FeedSkeleton';
import SuggestedUsersCard from './SuggestedUsersCard';
import SponsoredProductCard from './SponsoredProductCard';
import FeedRecipeCard from './FeedRecipeCard';
import { useFollowingFeed, useLikePost, feedKeys } from '../../features/feed/queries';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import PullIndicator from '../../components/ui/PullIndicator';
import { useSponsoredContent } from '../../hooks/useSponsoredContent';

function EmptyFollowing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
        <Users className="h-7 w-7 text-stone-400" />
      </div>
      <p className="text-[15px] font-semibold text-stone-950">
        {t('feed.following.empty.title', 'No sigues a nadie todavía')}
      </p>
      <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-stone-400">
        {t(
          'feed.following.empty.description',
          'Sigue a productores, importadores e influencers para ver su contenido aquí.'
        )}
      </p>
      <button
        type="button"
        onClick={() => navigate('/discover')}
        className="mt-5 rounded-full bg-stone-950 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 active:scale-95"
      >
        {t('feed.discoverUsers', 'Descubrir usuarios')}
      </button>
    </div>
  );
}

function FollowingFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const feedQuery = useFollowingFeed();
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

  // Suggested users dismissal (session-only)
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);

  // Sponsored / promoted content
  const { sponsoredProducts, recipes } = useSponsoredContent();
  const [dismissedSponsored, setDismissedSponsored] = useState(new Set());

  const [modalPost, setModalPost] = useState(null);
  const handleCloseModal = useCallback(() => setModalPost(null), []);

  const { refreshing, progress, handlers } = usePullToRefresh(
    async () => { await queryClient.resetQueries({ queryKey: feedKeys.following }); }
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

  if (!feedQuery.isLoading && allPosts.length === 0) {
    return <EmptyFollowing />;
  }

  // Show "new content" pill when a background refetch is in progress (not pagination)
  // and there is already data loaded so the user can act on it.
  const showNewContentPill = feedQuery.isFetching && !feedQuery.isFetchingNextPage && allPosts.length > 0;

  const handleNewContentClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries({ queryKey: feedKeys.following });
  }, [queryClient]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="relative overscroll-none"
      {...handlers}
    >
      {/* "New content available" floating pill */}
      <AnimatePresence>
        {showNewContentPill && (
          <motion.button
            key="new-content-pill"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={handleNewContentClick}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-stone-950 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg cursor-pointer border-none"
            aria-live="polite"
          >
            Nuevo contenido
          </motion.button>
        )}
      </AnimatePresence>

      <PullIndicator progress={progress} isRefreshing={refreshing} />
      {isInitialLoading && allPosts.length === 0 ? (
        <div aria-busy="true" aria-label="Cargando publicaciones">
          <FeedSkeleton count={3} />
        </div>
      ) : (
        <Virtuoso
          data={allPosts}
          estimatedItemSize={520}
          itemContent={(index, post) => {
            const isReel = post.video_url || post.type === 'reel';
            const shouldAnimate = index < 5;
            const animDelay = shouldAnimate ? index * 0.05 : 0;

            // Inject suggested users after every 5th post (position 4, 14, 24...) unless dismissed
            const showSuggestions = !dismissedSuggestions && (index === 4 || (index > 4 && (index - 4) % 10 === 0));

            // Promoted product card every ~8 posts (positions 7, 15, 23...)
            const sponsoredSlot = (index >= 7 && (index - 7) % 8 === 0) ? sponsoredProducts[Math.floor((index - 7) / 8) % Math.max(sponsoredProducts.length, 1)] : null;
            const showSponsored = sponsoredSlot && sponsoredProducts.length > 0 && !dismissedSponsored.has(sponsoredSlot.id);

            // Recipe card every ~15 posts (positions 14, 29...)
            const recipeSlot = (index >= 14 && (index - 14) % 15 === 0) ? recipes[Math.floor((index - 14) / 15) % Math.max(recipes.length, 1)] : null;
            const showRecipe = recipeSlot && recipes.length > 0;

            const motionProps = shouldAnimate
              ? { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0, 0, 0.2, 1], delay: animDelay } }
              : {};

            if (isReel) {
              return (
                <div className="px-4 py-3">
                  {showSuggestions && <SuggestedUsersCard onDismiss={() => setDismissedSuggestions(true)} />}
                  {showSponsored && (
                    <SponsoredProductCard
                      product={sponsoredSlot}
                      onDismiss={() => setDismissedSponsored(prev => new Set(prev).add(sponsoredSlot.id))}
                    />
                  )}
                  {showRecipe && <FeedRecipeCard recipe={recipeSlot} />}
                  <motion.div {...motionProps}>
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
                      nextVideoUrl={allPosts.slice(index + 1).find(p => p.video_url || p.type === 'reel')?.video_url}
                    />
                  </motion.div>
                </div>
              );
            }

            return (
              <div>
                {showSuggestions && <SuggestedUsersCard onDismiss={() => setDismissedSuggestions(true)} />}
                {showSponsored && (
                  <SponsoredProductCard
                    product={sponsoredSlot}
                    onDismiss={() => setDismissedSponsored(prev => new Set(prev).add(sponsoredSlot.id))}
                  />
                )}
                {showRecipe && <FeedRecipeCard recipe={recipeSlot} />}
                <motion.div {...motionProps}>
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
          increaseViewportBy={{ top: 0, bottom: 1500 }}
          style={{ height: 'calc(100vh - 56px - 64px)' }}
          components={{
            Footer: () => {
              if (feedQuery.isFetchingNextPage) return <FeedSkeleton count={2} />;
              if (!hasMore && allPosts.length > 0) return (
                <div className="flex flex-col items-center gap-2 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-stone-200">
                    <Check className="h-7 w-7 text-stone-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-stone-950">Estás al día</p>
                  <p className="text-[13px] text-stone-400">Has visto todas las publicaciones nuevas</p>
                </div>
              );
              return null;
            },
          }}
        />
      )}

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

export default FollowingFeed;
