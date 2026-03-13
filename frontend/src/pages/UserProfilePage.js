import BackButton from '../components/BackButton';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen,
  Camera,
  Grid3X3,
  Loader2,
  MessageCircle,
  Package,
  PlaySquare,
  Settings,
  Share2,
  ShoppingBag,
  User,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { getDefaultRoute, getDashboardLabel } from '../lib/navigation';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import RecipeOverlay from '../components/recipes/RecipeOverlay';
import {
  useUserAvatar,
  useUserFollow,
  useUserPosts,
  useUserProducts,
  useUserProfile,
  useUserRecipes,
} from '../features/user/hooks';
import { resolveUserImage } from '../features/user/queries';

function CreatePostModal({ onClose, onCreate, creatingPost }) {
  const { t } = useTranslation();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

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
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t('social.writeCaption')}
            className="h-24 w-full resize-none rounded-2xl border border-stone-200 p-3 text-sm focus:border-stone-400 focus:outline-none"
            data-testid="post-caption-input"
          />
          <Button
            onClick={handleSubmit}
            disabled={!file || creatingPost}
            className="h-11 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800"
            data-testid="submit-post-btn"
          >
            {creatingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {t('social.publish')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileHighlight({ label }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-stone-300 p-1">
        <div className="h-full w-full rounded-full bg-stone-100" />
      </div>
      <span className="text-xs text-stone-600">{label}</span>
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
      className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {imageUrl ? (
        <img
          src={resolveUserImage(imageUrl)}
          alt={item.title || item.name || item.caption || type}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-stone-300">
          {type === 'recipe' ? <BookOpen className="h-8 w-8" /> : <Grid3X3 className="h-8 w-8" />}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3 text-white">
        <p className="line-clamp-2 text-sm font-medium">{item.title || item.name || item.caption || ''}</p>
      </div>
    </button>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-[28px] border border-dashed border-stone-200 bg-white px-6 py-16 text-center">
      <Icon className="mx-auto h-12 w-12 text-stone-300" />
      <h3 className="mt-4 text-lg font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
      {action}
    </div>
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
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null);
  const avatarInputRef = useRef(null);

  const currentUserId = currentUser?.user_id || currentUser?.id || null;
  const isOwnProfile = currentUserId === userId;
  const isSeller = profile?.role === 'producer' || profile?.role === 'importer';
  const { sellerProducts, isLoading: productsLoading } = useUserProducts(userId, activeTab === 'products' && isSeller);
  const { recipes, isLoading: recipesLoading } = useUserRecipes(userId, activeTab === 'recipes');
  const loading = profileLoading || postsLoading;
  const dashboardUrl = currentUser ? getDefaultRoute(currentUser, currentUser.onboarding_completed) : '/login';
  const dashboardLabel = currentUser ? getDashboardLabel(currentUser.role) : 'Panel';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-stone-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <BackButton />

        <section className="mt-6 rounded-[32px] border border-stone-100 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="relative mx-auto md:mx-0">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-stone-200 bg-stone-100 sm:h-36 sm:w-36">
                {profile?.profile_image ? (
                  <img src={resolveUserImage(profile.profile_image)} alt={`Avatar de ${realName}`} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400">
                    <User className="h-12 w-12" />
                  </div>
                )}
                {uploadingAvatar ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-stone-950 text-white shadow-sm"
                    data-testid="change-avatar-btn"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{displayName}</h1>
                    {profile?.role && profile.role !== 'customer' ? (
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
                        {profile.role === 'producer' ? 'Productor' : profile.role === 'importer' ? 'Importador' : profile.role}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-medium text-stone-950">{realName}</p>
                  {profile?.bio ? <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-stone-600">{profile.bio}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isOwnProfile ? (
                    <>
                      <Link to={dashboardUrl}>
                        <Button variant="outline" className="h-10 rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50">
                          <Settings className="h-4 w-4" />
                          {dashboardLabel}
                        </Button>
                      </Link>
                      <Button onClick={() => setShowCreatePost(true)} className="h-10 rounded-full bg-stone-950 text-white hover:bg-stone-800">
                        <Camera className="h-4 w-4" />
                        {t('social.newPost')}
                      </Button>
                      <Link to="/recipes/create">
                        <Button variant="outline" className="h-10 rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50">
                          <BookOpen className="h-4 w-4" />
                          {t('recipes.createRecipe', 'Crear receta')}
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleFollow}
                        className={`h-10 rounded-full ${isFollowing ? 'bg-stone-100 text-stone-800 hover:bg-stone-200' : 'bg-stone-950 text-white hover:bg-stone-800'}`}
                        data-testid="follow-btn"
                      >
                        {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {isFollowing ? 'Siguiendo' : t('social.follow')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId } }));
                        }}
                        className="h-10 rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t('social.message')}
                      </Button>
                    </>
                  )}

                  <Button variant="outline" onClick={handleShare} className="h-10 rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-8">
                <div>
                  <p className="text-lg font-semibold text-stone-950">{postCount}</p>
                  <p className="text-sm text-stone-500">{t('social.posts', 'Posts')}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-stone-950">{followersCount}</p>
                  <p className="text-sm text-stone-500">{t('social.followers', 'Seguidores')}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-stone-950">{followingCount}</p>
                  <p className="text-sm text-stone-500">{t('social.following', 'Siguiendo')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <div className="flex gap-5 pb-2">
              {highlights.map((item) => (
                <ProfileHighlight key={item} label={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="border-b border-stone-200">
            <div className="flex gap-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm transition-colors ${
                      activeTab === tab.key ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-500 hover:text-stone-950'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6">
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
                      <Button className="mt-5 rounded-full bg-stone-950 text-white hover:bg-stone-800" onClick={() => setShowCreatePost(true)}>
                        <Camera className="h-4 w-4" />
                        {t('social.newPost')}
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                  {safePosts.map((post) => (
                    <ContentTile key={post.post_id || post.id} item={post} type="post" onClick={() => setSelectedPost(post)} />
                  ))}
                </div>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                  {safeProducts.map((product) => (
                    <ContentTile key={product.product_id || product.id} item={product} type="product" onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>
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
                      <Link to="/recipes/create">
                        <Button className="mt-5 rounded-full bg-stone-950 text-white hover:bg-stone-800">
                          <BookOpen className="h-4 w-4" />
                          {t('recipes.createRecipe', 'Crear receta')}
                        </Button>
                      </Link>
                    ) : null
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                  {safeRecipes.map((recipe, index) => (
                    <ContentTile key={recipe.recipe_id || recipe.id} item={recipe} type="recipe" onClick={() => setSelectedRecipeIndex(index)} />
                  ))}
                </div>
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
        <PostViewer
          post={selectedPost}
          posts={safePosts}
          profile={profile}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
        />
      ) : null}

      {selectedProduct ? (
        <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} />
      ) : null}

      {selectedRecipeIndex !== null && safeRecipes[selectedRecipeIndex] ? (
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
      ) : null}
    </div>
  );
}
