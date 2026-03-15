import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ProfilePageHeader from '../components/profile/ProfilePageHeader';
import ProfessionalBanner from '../components/profile/ProfessionalBanner';
import {
  Bookmark,
  BookOpen,
  Camera,
  ExternalLink,
  Gift,
  Grid3X3,
  Loader2,
  MoreHorizontal,
  Package,
  PlaySquare,
  Share2,
  ShoppingBag,
  User,
  X,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getDefaultRoute } from '../lib/navigation';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import RecipeOverlay from '../components/recipes/RecipeOverlay';
import OverlayErrorBoundary from '../components/OverlayErrorBoundary';
import {
  useUserAvatar,
  useUserFollow,
  useUserPosts,
  useUserProducts,
  useUserProfile,
  useUserRecipes,
} from '../features/user/hooks';
// useUpdateProfile moved to EditProfileSheet
import { resolveUserImage } from '../features/user/queries';
import { getCloudinarySrcSet } from '../utils/cloudinary';
import FocusTrap from 'focus-trap-react';
import FollowersModal from '../components/social/FollowersModal';
import EditProfileSheet from '../components/profile/EditProfileSheet';
import { useAutocomplete } from '../hooks/useAutocomplete';
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown';
import { useChatContext } from '../context/chat/ChatProvider';

const GridListComponent = React.forwardRef(({ style, children, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    style={{
      ...style,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '2px',
    }}
  >
    {children}
  </div>
));

function CreatePostModal({ onClose, onCreate, creatingPost }) {
  const { t } = useTranslation();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const captionRef = useRef(null);
  const handleCaptionSet = useCallback((val) => setCaption(val), []);
  const ac = useAutocomplete(caption, handleCaptionSet, captionRef);

  const handleFileSelect = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/')) {
      toast.error(t('social.imagesOnly'));
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      toast.error(t('social.maxSize10'));
      return;
    }

    setFile(nextFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(nextFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error(t('social.selectImage'));
      return;
    }

    try {
      await onCreate({ file, caption });
      toast.success(t('social.published'));
      onClose();
    } catch (error) {
      toast.error(error?.message || t('social.errorCreate'));
    }
  };

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg shadow-2xl"
        style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-white)' }}
        data-testid="create-post-modal"
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-black)' }}>{t('social.newPost')}</h3>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ transition: 'var(--transition-fast)' }}>
            <X className="h-5 w-5" style={{ color: 'var(--color-black)' }} />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Vista previa de la publicación" loading="lazy" className="max-h-80 w-full rounded-2xl object-cover" />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute right-3 top-3 rounded-full p-1.5"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed"
              style={{ borderColor: 'var(--color-border)', transition: 'var(--transition-fast)' }}
              data-testid="select-image-btn"
            >
              <Camera className="h-9 w-9" style={{ color: 'var(--color-stone)' }} />
              <span className="text-sm" style={{ color: 'var(--color-stone)' }}>{t('social.selectImage')}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <div className="relative">
            <AutocompleteDropdown
              isOpen={ac.isOpen}
              trigger={ac.trigger}
              suggestions={ac.suggestions}
              activeIndex={ac.activeIndex}
              onSelect={ac.handleSelect}
            />
            <textarea
              ref={captionRef}
              value={caption}
              onChange={ac.handleChange}
              onKeyDown={ac.handleKeyDown}
              onSelect={ac.handleSelect}
              onMouseUp={ac.handleSelect}
              placeholder={t('social.writeCaption')}
              className="h-24 w-full resize-none rounded-2xl p-3 text-sm focus:outline-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-black)' }}
              data-testid="post-caption-input"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || creatingPost}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-black)', color: '#fff', transition: 'var(--transition-fast)' }}
            data-testid="submit-post-btn"
          >
            {creatingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {t('social.publish')}
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}

const HIGHLIGHT_EMOJIS = {
  Recetas: '\uD83C\uDF73',
  Productos: '\uD83D\uDCE6',
  Viajes: '\u2708\uFE0F',
  Eventos: '\uD83C\uDF89',
  Looks: '\uD83D\uDC57',
  Origen: '\uD83C\uDF3F',
};

function ProfileHighlight({ label, active }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 54,
          height: 54,
          border: active ? '2px solid var(--color-green)' : '2px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <span className="text-xl">{HIGHLIGHT_EMOJIS[label] || '\u2B50'}</span>
      </div>
      <span className="text-[11px] font-medium" style={{ color: 'var(--color-stone)' }}>{label}</span>
    </div>
  );
}

function ContentTile({ item, type, onClick }) {
  const imageUrl =
    item?.image_url ||
    item?.images?.[0] ||
    item?.thumbnail_url ||
    item?.cover_image ||
    null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-[3px] text-left transition-opacity duration-150 active:opacity-75"
      style={{ background: 'var(--color-surface)' }}
    >
      {imageUrl ? (
        <img
          src={resolveUserImage(imageUrl)}
          srcSet={getCloudinarySrcSet(resolveUserImage(imageUrl), [200, 400, 800])}
          sizes="33vw"
          alt={item.title || item.name || item.caption || type}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center" style={{ color: 'var(--color-stone)' }}>
          {type === 'recipe' ? <BookOpen className="h-8 w-8" /> : <Grid3X3 className="h-8 w-8" />}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent p-3 text-white">
        <p className="line-clamp-2 text-sm font-medium">{item.title || item.name || item.caption || ''}</p>
      </div>
    </button>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div
      className="mx-4 mt-2 rounded-3xl px-6 py-16 text-center"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
    >
      <Icon className="mx-auto h-12 w-12" style={{ color: 'var(--color-stone)' }} />
      <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--color-black)' }}>{title}</h3>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-stone)' }}>{description}</p>
      {action}
    </div>
  );
}

/* EditProfileModal removed — replaced by EditProfileSheet component */

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const { openConversation } = useChatContext();
  const { profile, isLoading: profileLoading } = useUserProfile(userId);
  const { posts, isLoading: postsLoading, createPost, creatingPost } = useUserPosts(userId);
  const { isFollowing, followersCount, followingCount, toggleFollow } = useUserFollow(userId, profile);
  const { uploadingAvatar, uploadAvatar } = useUserAvatar(userId);
  const [activeTab, setActiveTab] = useState('posts');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
  const [followsModal, setFollowsModal] = useState({ open: false, tab: 'followers' });
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const avatarInputRef = useRef(null);

  const currentUserId = currentUser?.user_id || currentUser?.id || null;
  const isOwnProfile = currentUserId === userId;
  const isSeller = profile?.role === 'producer' || profile?.role === 'importer';
  const isProfessional = ['producer', 'importer', 'influencer'].includes(profile?.role);
  const profileViewCount = profile?.profile_views_30d ?? profile?.seller_stats?.profile_views ?? null;
  const { sellerProducts, isLoading: productsLoading } = useUserProducts(userId, activeTab === 'products' && isSeller);
  const { recipes, isLoading: recipesLoading } = useUserRecipes(userId, activeTab === 'recipes');
  const loading = profileLoading || postsLoading;
  const dashboardUrl = currentUser ? getDefaultRoute(currentUser, currentUser.onboarding_completed) : '/login';

  useEffect(() => {
    if (!isSeller && activeTab === 'products') {
      setActiveTab('posts');
    }
  }, [activeTab, isSeller]);

  const safePosts = Array.isArray(posts) ? posts : [];
  const safeProducts = Array.isArray(sellerProducts) ? sellerProducts : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const postCount = safePosts.length || profile?.posts_count || 0;
  const recipesCount = safeRecipes.length;
  const productsCount = safeProducts.length || profile?.seller_stats?.total_products || 0;
  const fallbackHandle = typeof profile?.name === 'string'
    ? profile.name.toLowerCase().replace(/\s+/g, '')
    : '';
  const displayName = profile?.username ? `@${profile.username}` : `@${fallbackHandle || 'usuario'}`;
  const realName = profile?.name || 'Usuario';

  const highlights = useMemo(() => {
    const items = ['Recetas', 'Productos', 'Viajes', 'Eventos'];
    if (profile?.role === 'influencer') return ['Recetas', 'Looks', 'Viajes', 'Eventos'];
    if (isSeller) return ['Recetas', 'Productos', 'Origen', 'Eventos'];
    return items;
  }, [isSeller, profile?.role]);

  const tabs = [
    { key: 'posts', label: 'Posts', icon: Grid3X3 },
    { key: 'reels', label: 'Reels', icon: PlaySquare },
    ...(isSeller ? [{ key: 'products', label: 'Productos', icon: Package }] : []),
    { key: 'recipes', label: 'Recetas', icon: BookOpen },
    ...(isOwnProfile ? [{ key: 'saved', label: t('profile.tabs.saved', 'Guardados'), icon: Bookmark }] : []),
  ];

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error(t('social.loginToFollow'));
      return;
    }

    try {
      await toggleFollow();
      toast.success(isFollowing ? t('social.unfollowed') : t('social.nowFollowing'));
    } catch {
      toast.error(t('social.errorFollow'));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil de ${realName}`, url });
      } catch {
        return;
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success(t('social.linkCopied'));
  };

  const handleChat = async () => {
    try {
      const getChatType = () => {
        if (profile?.role === 'influencer') return 'collab';
        if (['producer', 'importer'].includes(profile?.role)) return 'b2c';
        return 'c2c';
      };
      const conv = await openConversation(userId, getChatType());
      if (conv?.id) navigate(`/messages/${conv.id}`);
    } catch {
      toast.error('No se pudo abrir el chat');
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('social.imagesOnly'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('social.maxSize5'));
      return;
    }

    try {
      await uploadAvatar(file);
      toast.success(t('social.profileUpdated'));
    } catch {
      toast.error(t('social.errorUpload'));
    }
  };

  const headerUsername = profile?.username || fallbackHandle || 'usuario';

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-white)' }}>
        <ProfilePageHeader username={headerUsername} isOwnProfile={isOwnProfile} onShare={handleShare} />
        <div className="px-4 pt-4">
          {/* Skeleton: avatar + stats */}
          <div className="flex items-center gap-5">
            <div className="h-[72px] w-[72px] rounded-full animate-pulse" style={{ background: 'var(--color-surface)' }} />
            <div className="flex flex-1 items-center justify-around">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="h-5 w-10 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
                  <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton: name + bio */}
          <div className="mt-4 space-y-2">
            <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
            <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
          </div>
          {/* Skeleton: buttons */}
          <div className="mt-4 flex gap-2">
            <div className="h-[34px] flex-1 rounded-full animate-pulse" style={{ background: 'var(--color-surface)' }} />
            <div className="h-[34px] flex-1 rounded-full animate-pulse" style={{ background: 'var(--color-surface)' }} />
            <div className="h-[34px] w-[34px] rounded-full animate-pulse" style={{ background: 'var(--color-surface)' }} />
          </div>
          {/* Skeleton: grid 3x3 */}
          <div className="mt-6 grid grid-cols-3 gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse" style={{ background: 'var(--color-surface)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <ProfilePageHeader username={headerUsername} isOwnProfile={isOwnProfile} onShare={handleShare} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4">

        {/* ── Hero — Instagram mobile-first ── */}
        <section className="-mx-4 px-4 pt-4 pb-2" style={{ background: 'var(--color-white)' }}>

          {/* Fila 1: Avatar + Stats */}
          <div className="flex items-center gap-5">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                style={{
                  padding: profile?.has_active_story ? 2.5 : 0,
                  borderRadius: '50%',
                  background: profile?.has_active_story
                    ? 'linear-gradient(135deg, #2E7D52, #8FCF7A)'
                    : 'transparent',
                  display: 'inline-block',
                }}
              >
                <div
                  style={{
                    padding: profile?.has_active_story ? 2 : 0,
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                >
                  <div
                    className="overflow-hidden rounded-full"
                    style={{
                      width: 72,
                      height: 72,
                      background: 'var(--color-surface)',
                      ...(!profile?.has_active_story
                        ? isOwnProfile
                          ? { boxShadow: '0 0 0 2px var(--color-black), 0 0 0 5px var(--color-white)' }
                          : { boxShadow: '0 0 0 1px var(--color-border)' }
                        : {}),
                    }}
                  >
                    {profile?.profile_image ? (
                      <img
                        src={resolveUserImage(profile.profile_image)}
                        srcSet={getCloudinarySrcSet(resolveUserImage(profile.profile_image), [72, 144, 256])}
                        sizes="72px"
                        alt={`Avatar de ${realName}`}
                        loading="eager"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ color: 'var(--color-stone)' }}>
                        <User className="h-10 w-10" />
                      </div>
                    )}
                    {uploadingAvatar ? (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full shadow-sm"
                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-black)' }}
                    data-testid="change-avatar-btn"
                    aria-label="Cambiar foto de perfil"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </>
              ) : null}
            </div>

            {/* Stats */}
            <div className="flex flex-1 items-center justify-around">
              <button
                className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                onClick={() => setActiveTab('posts')}
              >
                <span className="text-[17px] font-bold tabular-nums tracking-tight" style={{ color: 'var(--color-black)' }}>{postCount}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--color-stone)' }}>publicaciones</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                onClick={() => setFollowsModal({ open: true, tab: 'followers' })}
              >
                <span className="text-[17px] font-bold tabular-nums tracking-tight" style={{ color: 'var(--color-black)' }}>{followersCount}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--color-stone)' }}>seguidores</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                onClick={() => setFollowsModal({ open: true, tab: 'following' })}
              >
                <span className="text-[17px] font-bold tabular-nums tracking-tight" style={{ color: 'var(--color-black)' }}>{followingCount}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--color-stone)' }}>seguidos</span>
              </button>
            </div>
          </div>

          {/* Fila 2: Nombre + rol + bio + link */}
          <div className="mt-3 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-bold tracking-tight leading-tight" style={{ color: 'var(--color-black)' }}>
                {realName}
                {profile?.is_verified && (
                  <svg width="16" height="16" viewBox="0 0 16 16" className="inline ml-1 align-middle">
                    <circle cx="8" cy="8" r="8" fill="#007AFF"/>
                    <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </p>
              {profile?.role && profile.role !== 'customer' && profile.role !== 'consumer' ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-stone)' }}
                >
                  {profile.role === 'producer'
                    ? 'Productor'
                    : profile.role === 'importer'
                      ? 'Importador'
                      : profile.role === 'influencer'
                        ? 'Influencer'
                        : profile.role}
                </span>
              ) : null}
            </div>
            {profile?.bio ? (
              <p className="whitespace-pre-line text-[13px] leading-relaxed" style={{ color: 'var(--color-stone)' }}>{profile.bio}</p>
            ) : null}
            {profile?.website ? (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-semibold hover:underline mt-0.5"
                style={{ color: 'var(--color-black)' }}
              >
                <ExternalLink className="h-3 w-3" />
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            ) : null}

            {/* Diet & Allergy tags */}
            {(profile?.diet_tags?.length > 0 || profile?.allergy_tags?.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile?.diet_tags?.map((tag) => (
                  <span
                    key={`diet-${tag}`}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}
                  >
                    {tag}
                  </span>
                ))}
                {profile?.allergy_tags?.map((tag) => (
                  <span
                    key={`allergy-${tag}`}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Fila 3: Botones de acción */}
          <div className="mt-3.5 flex gap-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="flex-1 h-[34px] rounded-full text-[13px] font-medium"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-black)', transition: 'var(--transition-fast)' }}
                >
                  Editar perfil
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 h-[34px] rounded-full text-[13px] font-medium"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-black)', transition: 'var(--transition-fast)' }}
                >
                  Compartir perfil
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  className="flex-1 h-[34px] rounded-full text-[13px] font-semibold"
                  style={
                    isFollowing
                      ? { background: 'var(--color-surface)', color: 'var(--color-black)', border: '1px solid var(--color-border)', transition: 'var(--transition-fast)' }
                      : { background: 'var(--color-black)', color: '#fff', transition: 'var(--transition-fast)' }
                  }
                  data-testid="follow-btn"
                >
                  {isFollowing ? 'Siguiendo' : t('social.follow', 'Seguir')}
                </button>
                <button
                  onClick={handleChat}
                  className="flex-1 h-[34px] rounded-full text-[13px] font-medium inline-flex items-center justify-center gap-1.5"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-black)', transition: 'var(--transition-fast)' }}
                >
                  <MessageCircle className="h-[14px] w-[14px]" />
                  {t('social.message', 'Mensaje')}
                </button>
                <button
                  onClick={() => {/* Regalo action placeholder */}}
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-black)', transition: 'var(--transition-fast)' }}
                  aria-label="Enviar regalo"
                >
                  <Gift className="h-[15px] w-[15px]" strokeWidth={1.8} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-black)', transition: 'var(--transition-fast)' }}
                    aria-label="Más opciones"
                  >
                    <MoreHorizontal className="h-[15px] w-[15px]" strokeWidth={1.8} />
                  </button>
                  {showOptionsMenu && (
                    <div
                      className="absolute right-0 top-[110%] z-50 min-w-[200px] overflow-hidden rounded-2xl shadow-xl"
                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-white)' }}
                    >
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success(t('social.linkCopied', 'Enlace copiado'));
                          setShowOptionsMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px]"
                        style={{ color: 'var(--color-black)', borderBottom: '1px solid var(--color-border)' }}
                      >
                        <Share2 className="h-4 w-4" /> {t('profile.copyLink', 'Copiar enlace del perfil')}
                      </button>
                      <button
                        onClick={() => setShowOptionsMenu(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px]"
                        style={{ color: 'var(--color-red)', borderBottom: '1px solid var(--color-border)' }}
                      >
                        <X className="h-4 w-4" /> {t('profile.block', 'Bloquear usuario')}
                      </button>
                      <button
                        onClick={() => setShowOptionsMenu(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px]"
                        style={{ color: 'var(--color-red)' }}
                      >
                        <X className="h-4 w-4" /> {t('profile.report', 'Reportar')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Fila 4: Story Highlights */}
          <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-3">
            <div className="flex gap-4">
              {highlights.map((item) => (
                <ProfileHighlight key={item} label={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Banner profesional ── */}
        {isOwnProfile && isProfessional ? (
          <div className="-mx-4 px-4 py-3" style={{ background: 'var(--color-white)', borderTop: '1px solid var(--color-border)' }}>
            <ProfessionalBanner role={profile.role} viewCount={profileViewCount} followersCount={followersCount} />
          </div>
        ) : null}

        <section className="-mx-4 mt-px" style={{ background: 'var(--color-white)' }}>
          {/* Tabs — solo iconos, estilo Instagram */}
          <div style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    aria-label={tab.label}
                    className="flex flex-1 items-center justify-center py-3.5"
                    style={{
                      borderBottom: isActive ? '2px solid var(--color-black)' : '2px solid transparent',
                      color: isActive ? 'var(--color-black)' : 'var(--color-stone)',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2 : 1.5} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1 pb-4">
            {activeTab === 'posts' ? (
              safePosts.length === 0 ? (
                <EmptyState
                  icon={Grid3X3}
                  title={isOwnProfile ? t('social.shareFirstPost', 'Comparte tu primera publicación') : t('social.noPosts', 'Sin publicaciones')}
                  description={
                    isOwnProfile
                      ? 'Comparte imágenes para construir tu perfil social.'
                      : t('social.userNoPosts', 'Este usuario todavía no ha publicado contenido.')
                  }
                  action={
                    isOwnProfile ? (
                      <button
                        type="button"
                        className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold"
                        style={{ background: 'var(--color-black)', color: '#fff', transition: 'var(--transition-fast)' }}
                        onClick={() => setShowCreatePost(true)}
                      >
                        <Camera className="h-4 w-4" />
                        {t('social.newPost')}
                      </button>
                    ) : null
                  }
                />
              ) : (
                <VirtuosoGrid
                  data={safePosts}
                  overscan={200}
                  useWindowScroll
                  components={{ List: GridListComponent }}
                  itemContent={(index, post) => (
                    <ContentTile key={post.post_id || post.id} item={post} type="post" onClick={() => setSelectedPost(post)} />
                  )}
                />
              )
            ) : null}

            {activeTab === 'reels' ? (
              <EmptyState
                icon={PlaySquare}
                title="Sin reels"
                description="Este perfil todavía no ha publicado ningún reel."
              />
            ) : null}

            {activeTab === 'products' ? (
              productsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
                </div>
              ) : safeProducts.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title={t('social.noProducts', 'Sin productos')}
                  description="Este perfil aún no tiene productos publicados."
                />
              ) : (
                <VirtuosoGrid
                  data={safeProducts}
                  overscan={200}
                  useWindowScroll
                  components={{ List: GridListComponent }}
                  itemContent={(index, product) => (
                    <ContentTile key={product.product_id || product.id} item={product} type="product" onClick={() => setSelectedProduct(product)} />
                  )}
                />
              )
            ) : null}

            {activeTab === 'saved' && isOwnProfile ? (
              <EmptyState
                icon={Bookmark}
                title={t('profile.noSavedPosts', 'Sin guardados')}
                description={t('profile.savePostsHint', 'Los posts que guardes aparecerán aquí. Solo tú puedes verlos.')}
              />
            ) : null}

            {activeTab === 'recipes' ? (
              recipesLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-stone)' }} />
                </div>
              ) : recipesCount === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Recetas"
                  description={isOwnProfile ? 'Publica tu primera receta para que aparezca aquí y en la sección principal.' : 'Este perfil todavía no ha compartido recetas.'}
                  action={
                    isOwnProfile ? (
                      <Link
                        to="/recipes/create"
                        className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold"
                        style={{ background: 'var(--color-black)', color: '#fff', transition: 'var(--transition-fast)' }}
                      >
                        <BookOpen className="h-4 w-4" />
                        {t('recipes.createRecipe', 'Crear receta')}
                      </Link>
                    ) : null
                  }
                />
              ) : (
                <VirtuosoGrid
                  data={safeRecipes}
                  overscan={200}
                  useWindowScroll
                  components={{ List: GridListComponent }}
                  itemContent={(index, recipe) => (
                    <ContentTile key={recipe.recipe_id || recipe.id} item={recipe} type="recipe" onClick={() => setSelectedRecipeIndex(index)} />
                  )}
                />
              )
            ) : null}
          </div>
        </section>
      </main>

      {showCreatePost ? (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreate={async ({ file, caption }) => {
            await createPost({ file, caption });
          }}
          creatingPost={creatingPost}
        />
      ) : null}

      {selectedPost ? (
        <OverlayErrorBoundary overlayKey={selectedPost?.post_id} onClose={() => setSelectedPost(null)}>
          <PostViewer
            post={selectedPost}
            posts={safePosts}
            profile={profile}
            currentUser={currentUser}
            onClose={() => setSelectedPost(null)}
            onNavigate={setSelectedPost}
          />
        </OverlayErrorBoundary>
      ) : null}

      {selectedProduct ? (
        <OverlayErrorBoundary overlayKey={selectedProduct?.product_id} onClose={() => setSelectedProduct(null)}>
          <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} />
        </OverlayErrorBoundary>
      ) : null}

      {selectedRecipeIndex !== null && safeRecipes[selectedRecipeIndex] ? (
        <OverlayErrorBoundary overlayKey={safeRecipes[selectedRecipeIndex]?.recipe_id} onClose={() => setSelectedRecipeIndex(null)}>
          <RecipeOverlay
            recipe={safeRecipes[selectedRecipeIndex]}
            onClose={() => setSelectedRecipeIndex(null)}
            showNavigation
            hasPrev={selectedRecipeIndex > 0}
            hasNext={selectedRecipeIndex < safeRecipes.length - 1}
            onNavigate={(direction) =>
              setSelectedRecipeIndex((current) => {
                if (direction === 'prev') return Math.max(0, current - 1);
                return Math.min(safeRecipes.length - 1, current + 1);
              })
            }
          />
        </OverlayErrorBoundary>
      ) : null}

      <EditProfileSheet
        isOpen={showEditProfile}
        profile={profile}
        userId={userId}
        onClose={() => setShowEditProfile(false)}
      />

      <FollowersModal
        isOpen={followsModal.open}
        onClose={() => setFollowsModal((s) => ({ ...s, open: false }))}
        userId={userId}
        currentUserId={currentUserId}
        initialTab={followsModal.tab}
        followersCount={followersCount}
        followingCount={followingCount}
      />
    </div>
  );
}
