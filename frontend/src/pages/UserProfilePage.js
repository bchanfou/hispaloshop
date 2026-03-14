import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ProfilePageHeader from '../components/profile/ProfilePageHeader';
import ProfessionalBanner from '../components/profile/ProfessionalBanner';
import {
  BookOpen,
  Camera,
  Globe,
  Grid3X3,
  Loader2,
  Package,
  PlaySquare,
  Share2,
  ShoppingBag,
  User,
  X,
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
import { useUpdateProfile } from '../hooks/api';
import { resolveUserImage } from '../features/user/queries';
import { getCloudinarySrcSet } from '../utils/cloudinary';
import FocusTrap from 'focus-trap-react';
import FollowersModal from '../components/social/FollowersModal';
import { useAutocomplete } from '../hooks/useAutocomplete';
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown';

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
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[28px] bg-white shadow-2xl" data-testid="create-post-modal">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <h3 className="font-semibold text-stone-950">{t('social.newPost')}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-stone-100">
            <X className="h-5 w-5" />
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
                className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-200 transition-colors hover:border-stone-400 hover:bg-stone-50"
              data-testid="select-image-btn"
            >
              <Camera className="h-9 w-9 text-stone-400" />
              <span className="text-sm text-stone-500">{t('social.selectImage')}</span>
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
              className="h-24 w-full resize-none rounded-2xl border border-stone-200 p-3 text-sm focus:border-stone-400 focus:outline-none"
              data-testid="post-caption-input"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || creatingPost}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-stone-950 text-[14px] font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
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

function ProfileHighlight({ label }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      {/* Outer black ring → white gap → inner content */}
      <div className="h-[66px] w-[66px] rounded-full bg-stone-950 p-[1.5px]">
        <div className="h-full w-full rounded-full bg-white p-[3px]">
          <div className="h-full w-full rounded-full bg-stone-100" />
        </div>
      </div>
      <span className="text-[11px] font-medium text-stone-700">{label}</span>
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
      className="group relative aspect-square overflow-hidden rounded-[3px] bg-stone-100 text-left transition-opacity duration-150 active:opacity-75"
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
        <div className="flex h-full items-center justify-center text-stone-300">
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
    <div className="mx-4 mt-2 rounded-3xl border border-stone-100 bg-white px-6 py-16 text-center">
      <Icon className="mx-auto h-12 w-12 text-stone-200" />
      <h3 className="mt-4 text-lg font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
      {action}
    </div>
  );
}

function EditProfileModal({ profile, userId, onClose }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useUpdateProfile();
  const [draft, setDraft] = useState({
    name:     profile?.name     || '',
    username: profile?.username || '',
    bio:      profile?.bio      || '',
    website:  profile?.website  || '',
  });

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const handleSave = () => {
    mutate(draft, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
        toast.success('Perfil actualizado');
        onClose();
      },
      onError: () => toast.error('No se pudo guardar. Inténtalo de nuevo.'),
    });
  };

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] text-stone-500 active:opacity-50"
          >
            Cancelar
          </button>
          <span className="text-[15px] font-semibold text-stone-950">Editar perfil</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1 text-[14px] font-semibold text-stone-950 disabled:opacity-50 active:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar
          </button>
        </div>

        {/* Fields */}
        <div className="divide-y divide-stone-100">
          {/* Nombre */}
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">Nombre</p>
            <input
              type="text"
              value={draft.name}
              onChange={set('name')}
              placeholder="Tu nombre"
              className="mt-1 w-full bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
            />
          </div>
          {/* Usuario */}
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">Usuario</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[15px] text-stone-400">@</span>
              <input
                type="text"
                value={draft.username}
                onChange={set('username')}
                placeholder="nombre_de_usuario"
                className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
              />
            </div>
          </div>
          {/* Bio */}
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">Bio</p>
            <textarea
              value={draft.bio}
              onChange={set('bio')}
              placeholder="Cuéntanos algo sobre ti…"
              rows={3}
              maxLength={150}
              className="mt-1 w-full resize-none bg-transparent text-[15px] leading-relaxed text-stone-950 outline-none placeholder:text-stone-400"
            />
            <p className="mt-1 text-right text-[11px] text-stone-400">{draft.bio.length}/150</p>
          </div>
          {/* Enlace web */}
          <div className="flex items-center gap-2 px-4 py-3.5">
            <Globe className="h-4 w-4 shrink-0 text-stone-400" />
            <input
              type="url"
              value={draft.website}
              onChange={set('website')}
              placeholder="Enlace web"
              className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
            />
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
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
      <div className="min-h-screen bg-white">
        <ProfilePageHeader username={headerUsername} isOwnProfile={isOwnProfile} onShare={handleShare} />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-stone-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <ProfilePageHeader username={headerUsername} isOwnProfile={isOwnProfile} onShare={handleShare} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4">

        {/* ── Hero — Instagram mobile-first ── */}
        <section className="-mx-4 bg-white px-4 pt-4 pb-2">

          {/* Fila 1: Avatar + Stats */}
          <div className="flex items-center gap-5">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`h-[86px] w-[86px] overflow-hidden rounded-full bg-stone-100 ${isOwnProfile ? 'ring-[2px] ring-stone-950 ring-offset-[3px] ring-offset-white' : 'ring-[1px] ring-stone-200 ring-offset-0'}`}>
                {profile?.profile_image ? (
                  <img
                    src={resolveUserImage(profile.profile_image)}
                    srcSet={getCloudinarySrcSet(resolveUserImage(profile.profile_image), [86, 172, 256])}
                    sizes="86px"
                    alt={`Avatar de ${realName}`}
                    loading="eager"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-300">
                    <User className="h-10 w-10" />
                  </div>
                )}
                {uploadingAvatar ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900 shadow-sm"
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
                <span className="text-[18px] font-bold tabular-nums tracking-tight text-stone-950">{postCount}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-stone-400">publicaciones</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                onClick={() => setFollowsModal({ open: true, tab: 'followers' })}
              >
                <span className="text-[18px] font-bold tabular-nums tracking-tight text-stone-950">{followersCount}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-stone-400">seguidores</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                onClick={() => setFollowsModal({ open: true, tab: 'following' })}
              >
                <span className="text-[18px] font-bold tabular-nums tracking-tight text-stone-950">{followingCount}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-stone-400">seguidos</span>
              </button>
            </div>
          </div>

          {/* Fila 2: Nombre + rol + bio */}
          <div className="mt-3 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-bold tracking-tight leading-tight text-stone-950">{realName}</p>
              {profile?.role && profile.role !== 'customer' && profile.role !== 'consumer' ? (
                <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">
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
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-stone-600">{profile.bio}</p>
            ) : null}
          </div>

          {/* Fila 3: Botones de acción */}
          <div className="mt-3.5 flex gap-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="flex-1 h-[34px] rounded-full border border-stone-200 bg-white text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-50 active:bg-stone-100"
                >
                  Editar perfil
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 h-[34px] rounded-full border border-stone-200 bg-white text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-50 active:bg-stone-100"
                >
                  Compartir perfil
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  className={`flex-1 h-[34px] rounded-full text-[13px] font-semibold transition-colors ${
                    isFollowing
                      ? 'border border-stone-200 bg-white text-stone-950 hover:bg-stone-50 active:bg-stone-100'
                      : 'bg-stone-950 text-white hover:bg-stone-800 active:bg-stone-700'
                  }`}
                  data-testid="follow-btn"
                >
                  {isFollowing ? 'Siguiendo' : t('social.follow', 'Seguir')}
                </button>
                <button
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId } }))
                  }
                  className="flex-1 h-[34px] rounded-full border border-stone-200 bg-white text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-50 active:bg-stone-100"
                >
                  {t('social.message', 'Mensaje')}
                </button>
                <button
                  onClick={handleShare}
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 active:bg-stone-100"
                  aria-label="Compartir perfil"
                >
                  <Share2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
                </button>
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
          <div className="-mx-4 bg-white px-4 py-3 border-t border-stone-100">
            <ProfessionalBanner role={profile.role} viewCount={profileViewCount} followersCount={followersCount} />
          </div>
        ) : null}

        <section className="-mx-4 mt-px bg-white">
          {/* Tabs — solo iconos, estilo Instagram */}
          <div className="border-b border-stone-100">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    aria-label={tab.label}
                    className={`flex flex-1 items-center justify-center border-b-2 py-3.5 transition-colors ${
                      activeTab === tab.key
                        ? 'border-stone-950 text-stone-950'
                        : 'border-transparent text-stone-300 hover:text-stone-600'
                    }`}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={activeTab === tab.key ? 2 : 1.5} />
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
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800"
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
                  <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
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

            {activeTab === 'recipes' ? (
              recipesLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
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
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800"
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

      {showEditProfile ? (
        <EditProfileModal
          profile={profile}
          userId={userId}
          onClose={() => setShowEditProfile(false)}
        />
      ) : null}

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
