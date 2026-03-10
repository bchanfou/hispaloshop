import BackButton from '../components/BackButton';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  Grid3X3,
  Heart,
  MessageCircle,
  ShoppingBag,
  Star,
  Settings,
  Camera,
  Share2,
  UserPlus,
  UserMinus,
  X,
  Loader2,
  ImagePlus,
  Send,
  Package,
  Trophy,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { getDefaultRoute, getDashboardLabel } from '../lib/navigation';
import PostViewer from '../components/PostViewer';
import { StoriesRow } from '../components/HispaloStories';
import BadgeGrid from '../components/BadgeGrid';
import {
  useUserAvatar,
  useUserBadges,
  useUserFollow,
  useUserPosts,
  useUserProducts,
  useUserProfile,
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl" data-testid="create-post-modal">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="font-semibold text-primary">{t('social.newPost')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full max-h-80 object-cover rounded-xl" />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-slate-950/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-accent hover:bg-stone-50 transition-colors"
              data-testid="select-image-btn"
            >
              <ImagePlus className="w-10 h-10 text-stone-400" />
              <span className="text-sm text-text-muted">{t('social.selectImage')}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t('social.writeCaption')}
            className="w-full p-3 border border-stone-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            data-testid="post-caption-input"
          />
          <Button
            onClick={handleSubmit}
            disabled={!file || creatingPost}
            className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl h-11"
            data-testid="submit-post-btn"
          >
            {creatingPost ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {t('social.publish')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const { profile, isLoading: profileLoading } = useUserProfile(userId);
  const { posts, isLoading: postsLoading, createPost, creatingPost } = useUserPosts(userId);
  const { badges, isLoading: badgesLoading } = useUserBadges(userId, currentUser?.user_id === userId);
  const { isFollowing, followersCount, followingCount, toggleFollow } = useUserFollow(userId, profile);
  const { uploadingAvatar, uploadAvatar } = useUserAvatar(userId);
  const [activeTab, setActiveTab] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const avatarInputRef = useRef(null);

  const isOwnProfile = currentUser?.user_id === userId;
  const isSeller = profile?.role === 'producer' || profile?.role === 'importer';
  const { sellerProducts } = useUserProducts(userId, activeTab === 'products' && isSeller);
  const loading = profileLoading || postsLoading || badgesLoading;
  const dashboardUrl = currentUser ? getDefaultRoute(currentUser, currentUser.onboarding_completed) : '/login';
  const dashboardLabel = currentUser ? getDashboardLabel(currentUser.role) : 'Panel';

  useEffect(() => {
    if (profile && activeTab === null) {
      setActiveTab(isSeller ? 'products' : 'posts');
    }
  }, [activeTab, isSeller, profile]);

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
        await navigator.share({ title: `Perfil de ${profile?.name}`, url });
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
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <BackButton />
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {profile?.profile_image ? (
                  <img src={resolveUserImage(profile.profile_image)} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-stone-400" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-primary text-white p-2 rounded-full hover:bg-primary-hover transition-colors"
                    data-testid="change-avatar-btn"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold text-primary">{profile?.name}</h1>
                {profile?.username && <span className="text-sm text-text-muted">@{profile.username}</span>}

                {profile?.role && profile.role !== 'customer' && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      profile.role === 'influencer'
                        ? 'bg-purple-100 text-purple-700'
                        : profile.role === 'producer' || profile.role === 'importer'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {profile.role === 'influencer'
                      ? t('social.roleInfluencer')
                      : profile.role === 'producer'
                        ? t('social.roleSeller')
                        : profile.role === 'importer'
                          ? 'Importador'
                          : profile.role}
                  </span>
                )}

                {!isOwnProfile && currentUser && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFollow}
                      className={`${isFollowing ? 'bg-stone-200 text-primary hover:bg-stone-300' : 'bg-accent text-white hover:bg-accent/90'}`}
                      data-testid="follow-btn"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Siguiendo
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t('social.follow')}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId } }));
                      }}
                      className="border-stone-300"
                      data-testid="message-btn"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t('social.message')}
                    </Button>
                  </div>
                )}

                {isOwnProfile && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <Link to={dashboardUrl}>
                      <Button
                        variant="outline"
                        className="border-stone-300 bg-white text-primary hover:bg-stone-50"
                        data-testid="profile-dashboard-btn"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {dashboardLabel}
                      </Button>
                    </Link>
                    <Button
                      onClick={() => setShowCreatePost(true)}
                      className="bg-primary hover:bg-primary-hover text-white"
                      data-testid="create-post-btn"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {t('social.newPost')}
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={handleShare}
                  className="text-text-muted hover:text-primary"
                  data-testid="share-profile-btn"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex justify-center md:justify-start gap-8 mb-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{posts.length}</p>
                  <p className="text-sm text-text-muted">{t('social.posts')}</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-70">
                  <p className="text-xl font-bold text-primary">{followersCount}</p>
                  <p className="text-sm text-text-muted">{t('social.followers')}</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-70">
                  <p className="text-xl font-bold text-primary">{followingCount}</p>
                  <p className="text-sm text-text-muted">{t('social.following')}</p>
                </div>
              </div>

              {profile?.bio && <p className="text-primary max-w-md">{profile.bio}</p>}
              {profile?.location && (
                <div className="flex items-center gap-1 text-text-muted mt-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              {profile?.created_at && (
                <div className="flex items-center gap-1 text-text-muted mt-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Miembro desde {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}

              {badges.length > 0 && (
                <div className="mt-3">
                  <BadgeGrid badges={badges} compact />
                </div>
              )}

              {profile?.seller_stats && (
                <div className="mt-4 bg-stone-50 rounded-xl p-4 border border-stone-200" data-testid="seller-stats-card">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-lg font-bold text-primary">{profile.seller_stats.avg_rating || '-'}</span>
                      </div>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider">{profile.seller_stats.review_count} Reviews</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{profile.seller_stats.total_products}</p>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider">Productos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{followersCount}</p>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider">Seguidores</p>
                    </div>
                  </div>
                  {profile.seller_stats.verified && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-accent font-medium">
                      <Star className="w-3.5 h-3.5" /> {t('social.verifiedSeller')}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    {profile.seller_stats.store_slug && (
                      <Link to={`/store/${profile.seller_stats.store_slug}`} className="flex-1" data-testid="view-store-link">
                        <Button variant="outline" className="w-full rounded-xl text-xs h-9">
                          <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Ver tienda
                        </Button>
                      </Link>
                    )}
                    {!isOwnProfile && (
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl text-xs h-9"
                        onClick={() => {
                          if (!currentUser) {
                            toast.error(t('social.login'));
                            return;
                          }
                          window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId: profile.user_id } }));
                        }}
                        data-testid="message-btn"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> {t('social.message')}
                      </Button>
                    )}
                  </div>
                  {profile.seller_stats.featured_products?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{t('social.featuredProducts')}</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {profile.seller_stats.featured_products.map((product) => (
                          <Link key={product.product_id} to={`/products/${product.product_id}`} className="shrink-0 w-16">
                            <div className="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 hover:border-accent transition-colors">
                              {product.images?.[0] ? (
                                <img src={resolveUserImage(product.images[0])} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag className="w-5 h-5 text-stone-300 m-auto mt-5" />
                              )}
                            </div>
                            <p className="text-[10px] text-primary truncate mt-0.5">{product.name}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {profile?.role === 'influencer' && (
                <div className="mt-4 bg-purple-50/50 rounded-xl p-4 border border-purple-200/50" data-testid="influencer-public-card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">Influencer</span>
                    {profile.niche && <span className="text-xs text-text-muted">{profile.niche}</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <p className="text-lg font-bold text-primary">{followersCount}</p>
                      <p className="text-[10px] text-text-muted uppercase">Seguidores</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{profile.posts_count || 0}</p>
                      <p className="text-[10px] text-text-muted uppercase">Posts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{profile.social_followers || '-'}</p>
                      <p className="text-[10px] text-text-muted uppercase">Social</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {profile.instagram && (
                      <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full hover:bg-pink-100">
                        @{profile.instagram}
                      </a>
                    )}
                    {profile.tiktok && (
                      <a href={`https://tiktok.com/@${profile.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary bg-stone-100 px-2.5 py-1 rounded-full hover:bg-stone-200">
                        TikTok
                      </a>
                    )}
                    {profile.youtube && (
                      <a href={profile.youtube} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full hover:bg-red-100">
                        YouTube
                      </a>
                    )}
                  </div>
                  {!isOwnProfile && currentUser && (
                    <Button
                      variant="outline"
                      className="w-full mt-3 rounded-xl text-xs h-9"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId: profile.user_id } }))}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> {t('social.sendMessage')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <StoriesRow />
          </div>
        </div>
      )}

      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center">
            {isSeller && (
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-primary'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">PRODUCTOS</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-primary'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">{t('social.posts').toUpperCase()}</span>
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'liked' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-primary'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">{t('social.likes').toUpperCase()}</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-primary'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-medium">GUARDADOS</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'badges' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-primary'
              }`}
              data-testid="badges-tab"
            >
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">{t('badges.title', 'LOGROS').toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'products' && (
          <div>
            {sellerProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">{t('social.noProducts')}</h3>
                <p className="text-text-muted">Este perfil aun no tiene productos publicados</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sellerProducts.map((product) => (
                  <Link key={product.product_id} to={`/products/${product.product_id}`} className="group" data-testid={`seller-product-${product.product_id}`}>
                    <div className="aspect-square rounded-xl bg-stone-100 overflow-hidden border border-stone-200 group-hover:border-accent transition-colors">
                      {product.images?.[0] ? (
                        <img src={resolveUserImage(product.images[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary mt-2 truncate">{product.name}</p>
                    <p className="text-sm font-bold text-accent">{`${(product.display_price || product.price)?.toFixed(2)}\u20AC`}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' &&
          (posts.length === 0 ? (
            <div className="text-center py-16">
              <Grid3X3 className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                {isOwnProfile ? t('social.shareFirstPost') : t('social.noPosts')}
              </h3>
              <p className="text-text-muted">
                {isOwnProfile ? 'Comparte fotos de tus productos favoritos con la comunidad' : t('social.userNoPosts')}
              </p>
              {isOwnProfile && (
                <Button className="mt-4 bg-accent hover:bg-accent/90" onClick={() => setShowCreatePost(true)} data-testid="create-first-post-btn">
                  <Camera className="w-4 h-4 mr-2" />
                  Crear publicacion
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {posts.map((post) => (
                <div
                  key={post.post_id}
                  className="aspect-square relative group overflow-hidden rounded-md cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  <img src={resolveUserImage(post.image_url)} alt={post.caption || 'Post'} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <MessageCircle className="w-5 h-5 fill-white" />
                      <span className="font-semibold">{post.comments_count || 0}</span>
                    </div>
                  </div>
                  {post.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs line-clamp-2">{post.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

        {activeTab === 'badges' && (
          <div data-testid="badges-tab-content">
            {badges.length > 0 ? (
              <BadgeGrid badges={badges} />
            ) : (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">{t('badges.noBadges', 'Sin logros aun')}</h3>
                <p className="text-text-muted">{t('badges.noBadgesDesc', 'Completa acciones en Hispaloshop para ganar insignias')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreate={async ({ file, caption }) => {
            await createPost({ file, caption });
          }}
          creatingPost={creatingPost}
        />
      )}

      {selectedPost && (
        <PostViewer
          post={selectedPost}
          posts={posts}
          profile={profile}
          currentUser={currentUser}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
        />
      )}
    </div>
  );
}
