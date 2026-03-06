import BackButton from '../components/BackButton';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  User, MapPin, Calendar, Grid3X3, Heart, MessageCircle, 
  ShoppingBag, Star, Settings, Camera, Share2, UserPlus, UserMinus,
  X, Loader2, ImagePlus, Send, Package, CirclePlus, Trophy
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

import { API } from '../utils/api';
import PostViewer from '../components/PostViewer';
import { StoriesRow } from '../components/HispaloStories';
import BadgeGrid from '../components/BadgeGrid';
import { demoUsers, demoPosts, demoProducts } from '../data/demoData';
import { DEMO_MODE } from '../config/featureFlags';

function CreatePostModal({ onClose, onPostCreated }) {
  const { t } = useTranslation();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error(t('social.imagesOnly')); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error(t('social.maxSize10')); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!file) { toast.error(t('social.selectImage')); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);
      const res = await axios.post(`${API}/posts`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(t('social.published'));
      onPostCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('social.errorCreate'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl" data-testid="create-post-modal">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="font-semibold text-[#1C1C1C]">{t('social.newPost')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full max-h-80 object-cover rounded-xl" />
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#2D5A27] hover:bg-stone-50 transition-colors"
              data-testid="select-image-btn"
            >
              <ImagePlus className="w-10 h-10 text-stone-400" />
              <span className="text-sm text-[#7A7A7A]">{t('social.selectImage')}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('social.writeCaption')}
            className="w-full p-3 border border-stone-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/30 focus:border-[#2D5A27]"
            data-testid="post-caption-input"
          />
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="w-full bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-xl h-11"
            data-testid="submit-post-btn"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
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
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState(null); // null = auto-detect on load
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [savedPosts, setSavedPosts] = useState([]);
  const [badges, setBadges] = useState([]);
  const avatarInputRef = useRef(null);

  const isOwnProfile = currentUser?.user_id === userId;

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  // Auto-set default tab based on role
  useEffect(() => {
    if (profile && activeTab === null) {
      setActiveTab(profile.role === 'producer' || profile.role === 'importer' ? 'products' : 'posts');
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (activeTab === 'products' && (profile?.role === 'producer' || profile?.role === 'importer')) {
      axios.get(`${API}/products?seller_id=${userId}`, { withCredentials: true })
        .then(res => {
          const data = res.data?.products || res.data || [];
          if (Array.isArray(data) && data.length > 0) {
            setSellerProducts(data);
          } else {
            setSellerProducts(DEMO_MODE ? demoProducts.filter((p) => p.seller_id === userId) : []);
          }
        })
        .catch(() => {
          setSellerProducts(DEMO_MODE ? demoProducts.filter((p) => p.seller_id === userId) : []);
        });
    }
    if (activeTab === 'saved' && isOwnProfile && currentUser) {
      axios.get(`${API}/users/${userId}/posts?bookmarked=true`, { withCredentials: true })
        .then(res => { setSavedPosts(res.data || []); })
        .catch(() => setSavedPosts([]));
    }
  }, [activeTab, userId, profile]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/${userId}/profile`, { withCredentials: true });
      setProfile(res.data);
      setFollowersCount(res.data.followers_count || 0);
      setFollowingCount(res.data.following_count || 0);
      setIsFollowing(res.data.is_following || false);
      
      const postsRes = await axios.get(`${API}/users/${userId}/posts`);
      const remotePosts = postsRes.data || [];
      if (Array.isArray(remotePosts) && remotePosts.length > 0) {
        setPosts(remotePosts);
      } else {
        setPosts(DEMO_MODE ? demoPosts.filter((p) => p.user_id === userId) : []);
      }

      // Fetch badges
      const badgesRes = await axios.get(`${API}/users/${userId}/badges`);
      setBadges(badgesRes.data || []);

      // Auto-check badges for own profile
      if (currentUser?.user_id === userId) {
        axios.post(`${API}/users/${userId}/badges/check`, {}, { withCredentials: true }).catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const fallback = DEMO_MODE ? demoUsers.find((u) => u.user_id === userId || u.id === userId) : null;
      if (fallback) {
        setProfile(fallback);
        setFollowersCount(fallback.followers_count || 0);
        setFollowingCount(fallback.following_count || 0);
        setPosts(demoPosts.filter((p) => p.user_id === fallback.user_id));
      } else if (err.response?.status === 404) {
        setProfile({
          user_id: userId, name: 'Usuario', bio: '', followers_count: 0, following_count: 0, posts_count: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) { toast.error(t('social.loginToFollow')); return; }
    try {
      if (isFollowing) {
        await axios.delete(`${API}/users/${userId}/follow`, { withCredentials: true });
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success(t('social.unfollowed'));
      } else {
        await axios.post(`${API}/users/${userId}/follow`, {}, { withCredentials: true });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(t('social.nowFollowing'));
      }
    } catch (err) {
      toast.error(t('social.errorFollow'));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Perfil de ${profile?.name}`, url }); } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('social.linkCopied'));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(t('social.imagesOnly')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('social.maxSize5')); return; }
    
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/users/upload-avatar`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, profile_image: res.data.image_url }));
      toast.success(t('social.profileUpdated'));
    } catch (err) {
      toast.error(t('social.errorUpload'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API}${url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#7A7A7A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />

      {/* Profile Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {profile?.profile_image ? (
                  <img 
                    src={getImageUrl(profile.profile_image)} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
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
                    className="absolute bottom-2 right-2 bg-[#1C1C1C] text-white p-2 rounded-full hover:bg-[#2C2C2C] transition-colors"
                    data-testid="change-avatar-btn"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold text-[#1C1C1C]">{profile?.name}</h1>
                {profile?.username && (
                  <span className="text-sm text-text-muted">@{profile.username}</span>
                )}
                
                {/* Role badge */}
                {profile?.role && profile.role !== 'customer' && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    profile.role === 'influencer' ? 'bg-purple-100 text-purple-700' :
                    profile.role === 'producer' || profile.role === 'importer' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                  }`}>
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
                      className={`${
                        isFollowing 
                          ? 'bg-stone-200 text-[#1C1C1C] hover:bg-stone-300' 
                          : 'bg-[#2D5A27] text-white hover:bg-[#1F4A1A]'
                      }`}
                      data-testid="follow-btn"
                    >
                      {isFollowing ? (
                        <><UserMinus className="w-4 h-4 mr-2" />Siguiendo</>
                      ) : (
                        <><UserPlus className="w-4 h-4 mr-2" />{t('social.follow')}</>
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
                  <Button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white"
                    data-testid="create-post-btn"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {t('social.newPost')}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={handleShare}
                  className="text-[#7A7A7A] hover:text-[#1C1C1C]"
                  data-testid="share-profile-btn"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Stats */}
              <div className="flex justify-center md:justify-start gap-8 mb-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#1C1C1C]">{posts.length}</p>
                  <p className="text-sm text-[#7A7A7A]">{t('social.posts')}</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-70">
                  <p className="text-xl font-bold text-[#1C1C1C]">{followersCount}</p>
                  <p className="text-sm text-[#7A7A7A]">{t('social.followers')}</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-70">
                  <p className="text-xl font-bold text-[#1C1C1C]">{followingCount}</p>
                  <p className="text-sm text-[#7A7A7A]">{t('social.following')}</p>
                </div>
              </div>

              {profile?.bio && <p className="text-[#1C1C1C] max-w-md">{profile.bio}</p>}
              {profile?.location && (
                <div className="flex items-center gap-1 text-[#7A7A7A] mt-2">
                  <MapPin className="w-4 h-4" /><span className="text-sm">{profile.location}</span>
                </div>
              )}
              {profile?.created_at && (
                <div className="flex items-center gap-1 text-[#7A7A7A] mt-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Miembro desde {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}

              {/* Earned Badges (compact) */}
              {badges.length > 0 && (
                <div className="mt-3">
                  <BadgeGrid badges={badges} compact />
                </div>
              )}

              {/* Seller Stats Card */}
              {profile?.seller_stats && (
                <div className="mt-4 bg-[#FAF7F2] rounded-xl p-4 border border-stone-200" data-testid="seller-stats-card">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-lg font-bold text-[#1C1C1C]">{profile.seller_stats.avg_rating || '-'}</span>
                      </div>
                      <p className="text-[11px] text-[#7A7A7A] uppercase tracking-wider">{profile.seller_stats.review_count} Reviews</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1C1C1C]">{profile.seller_stats.total_products}</p>
                      <p className="text-[11px] text-[#7A7A7A] uppercase tracking-wider">Productos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1C1C1C]">{followersCount}</p>
                      <p className="text-[11px] text-[#7A7A7A] uppercase tracking-wider">Seguidores</p>
                    </div>
                  </div>
                  {profile.seller_stats.verified && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-[#2D5A27] font-medium">
                      <Star className="w-3.5 h-3.5" /> {t('social.verifiedSeller')}
                    </div>
                  )}
                  {/* Action buttons */}
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
                          if (!currentUser) { toast.error(t('social.login')); return; }
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
                      <p className="text-[10px] text-[#7A7A7A] uppercase tracking-wider mb-2">{t('social.featuredProducts')}</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {profile.seller_stats.featured_products.map(p => (
                          <Link key={p.product_id} to={`/products/${p.product_id}`} className="shrink-0 w-16">
                            <div className="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 hover:border-[#2D5A27] transition-colors">
                              {p.images?.[0] ? (
                                <img src={p.images[0].startsWith('http') ? p.images[0] : `${API}${p.images[0]}`} alt="" className="w-full h-full object-cover" />
                              ) : <ShoppingBag className="w-5 h-5 text-stone-300 m-auto mt-5" />}
                            </div>
                            <p className="text-[10px] text-[#1C1C1C] truncate mt-0.5">{p.name}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Influencer public info */}
              {profile?.role === 'influencer' && (
                <div className="mt-4 bg-purple-50/50 rounded-xl p-4 border border-purple-200/50" data-testid="influencer-public-card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                      Influencer
                    </span>
                    {profile.niche && (
                      <span className="text-xs text-text-muted">{profile.niche}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <p className="text-lg font-bold text-[#1C1C1C]">{followersCount}</p>
                      <p className="text-[10px] text-text-muted uppercase">Seguidores</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1C1C1C]">{profile.posts_count || 0}</p>
                      <p className="text-[10px] text-text-muted uppercase">Posts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1C1C1C]">{profile.social_followers || '-'}</p>
                      <p className="text-[10px] text-text-muted uppercase">Social</p>
                    </div>
                  </div>
                  {/* Social links */}
                  <div className="flex gap-2 flex-wrap">
                    {profile.instagram && (
                      <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full hover:bg-pink-100">@{profile.instagram}</a>
                    )}
                    {profile.tiktok && (
                      <a href={`https://tiktok.com/@${profile.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1C1C1C] bg-stone-100 px-2.5 py-1 rounded-full hover:bg-stone-200">TikTok</a>
                    )}
                    {profile.youtube && (
                      <a href={profile.youtube} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full hover:bg-red-100">YouTube</a>
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

      {/* Hispalostories */}
      {isOwnProfile && (
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <StoriesRow />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center">
            {/* Products tab for sellers */}
            {(profile?.role === 'producer' || profile?.role === 'importer') && (
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'products' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#7A7A7A] hover:text-[#1C1C1C]'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">PRODUCTOS</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'posts' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#7A7A7A] hover:text-[#1C1C1C]'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">{t('social.posts').toUpperCase()}</span>
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'liked' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#7A7A7A] hover:text-[#1C1C1C]'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">{t('social.likes').toUpperCase()}</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === 'saved' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#7A7A7A] hover:text-[#1C1C1C]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-medium">GUARDADOS</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'badges' ? 'border-[#1C1C1C] text-[#1C1C1C]' : 'border-transparent text-[#7A7A7A] hover:text-[#1C1C1C]'
              }`}
              data-testid="badges-tab"
            >
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">{t('badges.title', 'LOGROS').toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Products Tab (sellers only) */}
        {activeTab === 'products' && (
          <div>
            {sellerProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#1C1C1C] mb-2">{t('social.noProducts')}</h3>
                <p className="text-[#7A7A7A]">Este perfil aun no tiene productos publicados</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sellerProducts.map(p => (
                  <Link key={p.product_id} to={`/products/${p.product_id}`} className="group" data-testid={`seller-product-${p.product_id}`}>
                    <div className="aspect-square rounded-xl bg-stone-100 overflow-hidden border border-stone-200 group-hover:border-[#2D5A27] transition-colors">
                      {p.images?.[0] ? (
                        <img src={getImageUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300"><Package className="w-10 h-10" /></div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#1C1C1C] mt-2 truncate">{p.name}</p>
                    <p className="text-sm font-bold text-[#2D5A27]">{(p.display_price || p.price)?.toFixed(2)}€</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
        posts.length === 0 ? (
          <div className="text-center py-16">
            <Grid3X3 className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#1C1C1C] mb-2">
              {isOwnProfile ? t('social.shareFirstPost') : t('social.noPosts')}
            </h3>
            <p className="text-[#7A7A7A]">
              {isOwnProfile 
                ? 'Comparte fotos de tus productos favoritos con la comunidad'
                : t('social.userNoPosts')}
            </p>
            {isOwnProfile && (
              <Button 
                className="mt-4 bg-[#2D5A27] hover:bg-[#1F4A1A]"
                onClick={() => setShowCreatePost(true)}
                data-testid="create-first-post-btn"
              >
                <Camera className="w-4 h-4 mr-2" />
                Crear publicación
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
                <img 
                  src={getImageUrl(post.image_url)} 
                  alt={post.caption || 'Post'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
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
        )
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div data-testid="badges-tab-content">
            {badges.length > 0 ? (
              <BadgeGrid badges={badges} />
            ) : (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#1C1C1C] mb-2">{t('badges.noBadges', 'Sin logros aun')}</h3>
                <p className="text-[#7A7A7A]">{t('badges.noBadgesDesc', 'Completa acciones en Hispaloshop para ganar insignias')}</p>
              </div>
            )}
          </div>
        )}
      </div>
      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} onPostCreated={handlePostCreated} />
      )}

      {/* Fullscreen Post Viewer — Instagram style with like/comment/nav */}
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

