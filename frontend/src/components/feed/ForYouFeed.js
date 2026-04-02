import React, { useMemo, useState, useCallback, useRef, Component } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, TrendingUp, ShoppingBag, Heart } from 'lucide-react';
import ReelCard from './ReelCard';
import PostCard from './PostCard';
import PostDetailModal from './PostDetailModal';
import FeedSkeleton from './FeedSkeleton';
import SuggestedUsersCard from './SuggestedUsersCard';
import SponsoredProductCard from './SponsoredProductCard';
import FeedRecipeCard from './FeedRecipeCard';
import { useForYouFeed, useLikePost, feedKeys } from '../../features/feed/queries';
import apiClient from '../../services/api/client';
import { useHaptics } from '../../hooks/useHaptics';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import PullIndicator from '../../components/ui/PullIndicator';
import { useSponsoredContent } from '../../hooks/useSponsoredContent';

/* ── P-15: Weekly summary card (Sundays only) ── */
function WeeklySummaryCard() {
  const { t } = useTranslation();
  const { data: weeklyStats } = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/gamification/weekly-summary');
        return res || {};
      } catch { return {}; }
    },
    staleTime: 3_600_000,
  });
  const navigate = useNavigate();
  const stats = weeklyStats || {};
  const postsLiked = stats.posts_liked ?? stats.likes_given ?? 0;
  const productsSaved = stats.products_saved ?? stats.saves ?? 0;
  const ordersPlaced = stats.orders_placed ?? stats.orders ?? 0;

  return (
    <div className="mx-3 my-3 rounded-2xl bg-stone-950 p-5 text-white">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">{t('for_you_feed.tuSemanaEnHispaloshop', 'Tu semana en HispaloShop')}</p>
      <p className="text-[15px] font-bold leading-snug mb-4">Resumen semanal</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex flex-col items-center gap-1">
          <Heart size={18} className="text-stone-300" />
          <span className="text-lg font-bold">{postsLiked}</span>
          <span className="text-[10px] text-stone-400">Likes</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ShoppingBag size={18} className="text-stone-300" />
          <span className="text-lg font-bold">{productsSaved}</span>
          <span className="text-[10px] text-stone-400">Guardados</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <TrendingUp size={18} className="text-stone-300" />
          <span className="text-lg font-bold">{ordersPlaced}</span>
          <span className="text-[10px] text-stone-400">Pedidos</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/discover')}
        className="w-full rounded-full bg-white text-stone-950 py-2 text-[13px] font-semibold border-none cursor-pointer hover:bg-stone-100 transition-colors"
      >
        Descubrir más
      </button>
    </div>
  );
}

/** Lightweight error boundary that silently hides a single broken feed item. */
class FeedItemBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.warn('[ForYouFeed] Item render error:', err); }
  render() { return this.state.hasError ? null : this.props.children; }
}

export default function ForYouFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const feedQuery = useForYouFeed();
  const likeMutation = useLikePost();
  const { trigger } = useHaptics();
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

  // Pre-compute next reel video URL for each index (avoids O(n²) .slice().find() inside itemContent)
  const nextReelUrlByIndex = useMemo(() => {
    const map = {};
    for (let i = allPosts.length - 2; i >= 0; i--) {
      const next = allPosts.slice(i + 1).find(p => p.video_url || p.type === 'reel');
      map[i] = next?.video_url || null;
    }
    return map;
  }, [allPosts]);
  const hasMore = Boolean(feedQuery.hasNextPage);
  const isInitialLoading = feedQuery.isLoading;
  const error = feedQuery.error;

  // Suggested users dismissal (session-only)
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);

  // Sponsored / promoted content
  const { sponsoredProducts, recipes } = useSponsoredContent();
  const [dismissedSponsored, setDismissedSponsored] = useState(new Set());

  // Post detail modal state
  const [modalPost, setModalPost] = useState(null);
  const handleCloseModal = useCallback(() => setModalPost(null), []);

  const virtuosoRef = useRef(null);

  const { refreshing, progress, handlers } = usePullToRefresh(
    async () => { await queryClient.refetchQueries({ queryKey: feedKeys.forYou, type: 'active' }); }
  );

  const handleLike = useCallback(async (postId) => {
    // Read current liked state from React Query cache (not stale closure)
    // to avoid race conditions when liking multiple posts rapidly
    const pages = queryClient.getQueryData(feedKeys.forYou)?.pages || [];
    let currentLiked = false;
    for (const page of pages) {
      const found = (page?.items || []).find(
        (p) => String(p.id) === String(postId) || String(p.post_id) === String(postId)
      );
      if (found) {
        currentLiked = Boolean(found.is_liked || found.liked);
        break;
      }
    }

    try {
      await likeMutation.mutateAsync({ postId, liked: currentLiked });
    } catch {
      // Query layer handles rollback and error state.
    }
  }, [likeMutation, queryClient]);

  const handleComment = useCallback((postId) => {
    const post = allPosts.find((p) => p.id === postId);
    if (post) setModalPost(post);
    else navigate(`/posts/${postId}`);
  }, [allPosts, navigate]);

  // Cards (PostCard/ReelCard) handle sharing themselves before calling onShare.
  // This callback is intentionally a no-op to avoid opening the share sheet twice.
  const handleShare = useCallback(() => {}, []);

  // "New content" pill (must be before early returns to satisfy hooks rules)
  const showNewContentPill = feedQuery.isFetching && !feedQuery.isFetchingNextPage && allPosts.length > 0;

  const handleNewContentClick = useCallback(() => {
    trigger('light');
    virtuosoRef.current?.scrollToIndex({ index: 0, behavior: 'smooth' });
    queryClient.invalidateQueries({ queryKey: feedKeys.forYou });
  }, [queryClient, trigger]);

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
          className="mt-5 rounded-full bg-stone-950 px-6 py-3 min-h-[44px] text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 active:scale-95"
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
            type="button"
            className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-stone-950 text-white text-xs font-semibold px-5 py-3 min-h-[44px] rounded-full shadow-lg cursor-pointer border-none"
            aria-live="polite"
            aria-label="Cargar nuevo contenido"
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
      ) : allPosts.length === 0 ? (
        <div className="px-4 py-8 space-y-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-stone-950">Bienvenido a HispaloShop</p>
            <p className="text-sm text-stone-500 mt-1">{t('for_you_feed.sigueProductoresParaVerSuContenido', 'Sigue productores para ver su contenido aquí')}</p>
          </div>
          <SuggestedUsersCard />
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="w-full py-3 bg-stone-950 text-white rounded-full text-sm font-semibold"
          >
            Explorar productos
          </button>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={allPosts}
          defaultItemHeight={460}
          itemContent={(index, post) => {
            const isReel = post.video_url || post.type === 'reel';
            const shouldAnimate = index < 5;
            const animDelay = shouldAnimate ? index * 0.05 : 0;

            // P-15: Weekly summary card on Sundays at position 3
            const isSunday = new Date().getDay() === 0;
            const showWeeklySummary = isSunday && index === 3;

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

            // Build a safe user object — same as FollowingFeed for consistency
            const safeUser = (post.user && typeof post.user === 'object')
              ? { ...post.user, has_story: post.user_has_story ?? post.user.has_story ?? false }
              : {
              id: post.user_id,
              name: post.user_name || post.author_name || 'Usuario',
              username: post.username || post.author_username,
              avatar: post.user_profile_image || post.author_avatar,
              avatar_url: post.user_profile_image || post.author_avatar,
              verified: post.user_verified ?? false,
              has_story: post.user_has_story ?? false,
            };

            if (isReel) {
              return (
                <FeedItemBoundary>
                <div className="mb-2">
                  {showWeeklySummary && <WeeklySummaryCard />}
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
                        post_id: post.id,
                        user: safeUser,
                        videoUrl: post.video_url || post.media?.[0]?.url,
                        video_url: post.video_url || post.media?.[0]?.url,
                        thumbnail: post.thumbnail || post.image_url,
                        caption: post.caption || '',
                        likes_count: post.likes_count || 0,
                        likes: post.likes_count || 0,
                        liked: post.is_liked || post.liked || false,
                        is_saved: post.is_saved ?? post.saved ?? false,
                        saved: post.is_saved ?? post.saved ?? false,
                        comments_count: post.comments_count || 0,
                        comments: post.comments_count || 0,
                        shares: post.shares_count || 0,
                        productTag: post.product_tag,
                        products: Array.isArray(post.products) ? post.products : Array.isArray(post.tagged_products) ? post.tagged_products : [],
                        created_at: post.created_at || null,
                        timestamp: post.created_at ? new Date(post.created_at).getTime() : null,
                        liked_by_sample: post.liked_by_sample || post.liked_by || null,
                        is_following: post.is_following ?? safeUser?.is_followed_by_me ?? false,
                      }}
                      embedded
                      onLike={() => handleLike(post.id)}
                      onComment={() => handleComment(post.id)}
                      onShare={() => handleShare(post.id)}
                      onExpand={() => navigate(`/reels?id=${post.id}`)}
                      priority={index < 2}
                      nextVideoUrl={nextReelUrlByIndex[index]}
                    />
                  </motion.div>
                </div>
                </FeedItemBoundary>
              );
            }

            return (
              <FeedItemBoundary>
              <div className="mb-2">
                {showWeeklySummary && <WeeklySummaryCard />}
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
                      user: safeUser,
                      user_has_story: post.user_has_story ?? false,
                      media: post.media || (post.image_url ? [{ url: post.image_url, ratio: '1:1' }] : post.images?.map(url => ({ url, ratio: '1:1' })) || []),
                      caption: post.caption || '',
                      likes: post.likes_count || 0,
                      liked: post.is_liked || post.liked || false,
                      is_saved: post.is_saved ?? post.saved ?? false,
                      saved: post.is_saved ?? post.saved ?? false,
                      comments: post.comments_count || 0,
                      productTag: post.product_tag,
                      tagged_products: post.tagged_products,
                      products: post.products,
                      timestamp: post.created_at ? new Date(post.created_at).getTime() : null,
                    }}
                    onLike={() => handleLike(post.id)}
                    onComment={() => handleComment(post.id)}
                    onShare={() => handleShare(post.id)}
                    priority={index < 2}
                  />
                </motion.div>
              </div>
              </FeedItemBoundary>
            );
          }}
          endReached={() => {
            if (hasMore && !feedQuery.isFetchingNextPage) {
              feedQuery.fetchNextPage();
            }
          }}
          overscan={3}
          increaseViewportBy={{ top: 0, bottom: 1500 }}
          style={{ height: 'calc(100vh - 52px - 64px)' }}
          components={{
            Footer: () => {
              if (feedQuery.isFetchingNextPage) return <FeedSkeleton count={2} />;
              if (!hasMore && allPosts.length > 0) return (
                <div className="flex flex-col items-center gap-2 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-stone-200">
                    <Check className="h-7 w-7 text-stone-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-stone-950">{t('feed.caughtUp.title', 'Estás al día')}</p>
                  <p className="text-[13px] text-stone-400">{t('feed.caughtUp.description', 'Has visto todas las publicaciones nuevas')}</p>
                </div>
              );
              return null;
            },
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
