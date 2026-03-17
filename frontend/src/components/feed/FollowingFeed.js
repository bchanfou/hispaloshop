import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Users } from 'lucide-react';
import PostCard from './PostCard';
import ReelCard from './ReelCard';
import FeedSkeleton from './FeedSkeleton';
import { useFollowingFeed, useLikePost } from '@/features/feed/queries';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullIndicator from '@/components/ui/PullIndicator';

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
  const feedQuery = useFollowingFeed();
  const likeMutation = useLikePost();
  const allPosts = useMemo(
    () => (feedQuery.data?.pages || []).flatMap((page) => page?.items || []),
    [feedQuery.data]
  );
  const hasMore = Boolean(feedQuery.hasNextPage);
  const isLoading = feedQuery.isLoading || feedQuery.isFetchingNextPage;
  const error = feedQuery.error;

  const { refreshing, progress, handlers } = usePullToRefresh(
    async () => { await feedQuery.refetch(); }
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
    const postUrl = `${window.location.origin}/posts/${postId}`;

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
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-stone-300" />
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ position: 'relative', overscrollBehavior: 'none' }}
      {...handlers}
    >
      <PullIndicator progress={progress} isRefreshing={refreshing} />
      {isLoading && allPosts.length === 0 ? (
        <FeedSkeleton count={3} />
      ) : (
        <Virtuoso
          data={allPosts}
          estimatedItemSize={520}
          itemContent={(index, post) => {
            const isReel = post.video_url || post.type === 'reel';
            const animDelay = index < 5 ? index * 0.05 : 0;

            if (isReel) {
              return (
                <div style={{ paddingBottom: 0 }}>
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
                        timestamp: new Date(post.created_at).getTime(),
                      }}
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
              <div style={{ paddingBottom: 0 }}>
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
                      timestamp: new Date(post.created_at).getTime(),
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
    </motion.div>
  );
}

export default FollowingFeed;
