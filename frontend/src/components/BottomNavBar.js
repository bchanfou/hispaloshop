import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, TrendingUp, Sparkles, Plus, User, X, Image as ImageIcon, Tag, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '../utils/api';
import AIAssistant from './AIAssistant';
import SellerAIAssistant from './SellerAIAssistant';
import InfluencerAIAssistant from './InfluencerAIAssistant';
import InternalChat from './InternalChat';

const HIDDEN_ON_PATHS = [
  '/login', '/register', '/verify-email', '/forgot-password', '/reset-password',
  '/signup', '/vender/registro', '/vender/login', '/influencers/registro', '/influencers/login',
  '/seller/login', '/seller/register', '/influencer/login', '/influencer/register',
];

function getDashboardUrl(role) {
  switch (role) {
    case 'super_admin': return '/super-admin';
    case 'admin': return '/admin';
    case 'producer': return '/producer';
    case 'influencer': return '/influencer/dashboard';
    case 'customer':
    default: return '/dashboard/profile';
  }
}

/* AI stars icon — "two sparkles" */
function HiAIIcon({ active }) {
  return (
    <div className={`relative w-6 h-6 ${active ? 'text-[#2D5A27]' : 'text-stone-500'}`}>
      <Sparkles className="w-6 h-6" strokeWidth={1.5} />
    </div>
  );
}

/* Quick Post Creator Panel */
function CreatePostPanel({ user, onClose, initialFile = null }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [file, setFile] = useState(initialFile);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (initialFile) {
      const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(initialFile);
    }
  }, [initialFile]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    setFile(f);
    const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!text.trim() && !file) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('caption', text.trim());
      if (file) fd.append('file', file);
      await axios.post(`${API}/posts`, fd, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('social.published', 'Publicado'));
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al publicar'); }
    finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-[68px] md:left-1/2 md:-translate-x-1/2 z-50" data-testid="create-post-panel">
      <div className="h-full md:h-auto md:max-h-[500px] md:w-[420px] bg-white md:rounded-2xl shadow-2xl flex flex-col md:border md:border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full" data-testid="close-post-panel">
            <X className="w-5 h-5 text-stone-500" />
          </button>
          <h3 className="font-heading text-sm font-semibold text-[#1C1C1C]">{t('social.newPost', 'Nueva publicación')}</h3>
          <button
            onClick={submit}
            disabled={posting || (!text.trim() && !file)}
            className="px-4 py-1.5 bg-[#1C1C1C] hover:bg-[#2A2A2A] disabled:bg-stone-300 text-white text-xs font-semibold rounded-full transition-colors"
            data-testid="publish-post-btn"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('social.publish', 'Publicar')}
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden border border-stone-100 shrink-0">
              {user?.profile_image ? (
                <img src={user.profile_image.startsWith('http') ? user.profile_image : user.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-sm">{(user?.name || 'U')[0].toUpperCase()}</div>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('social.whatThinking', '¿Qué estás pensando?')}
              rows={4}
              className="flex-1 resize-none bg-transparent outline-none text-sm text-[#1C1C1C] placeholder:text-[#999] leading-relaxed"
              autoFocus
              data-testid="post-text-input"
            />
          </div>
          {preview && (
            <div className="relative mt-3 rounded-xl overflow-hidden">
              <img src={preview} alt="" className="w-full max-h-60 object-cover rounded-xl" />
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="p-3 border-t border-stone-100 flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-50 hover:text-[#2D5A27] transition-colors" data-testid="post-add-image">
            <ImageIcon className="w-4 h-4" />
            <span>{t('social.photo', 'Foto')}</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

export default function BottomNavBar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(null);
  const [initialChatUserId, setInitialChatUserId] = useState(null);
  const [postFile, setPostFile] = useState(null);
  const galleryRef = useRef(null);

  const shouldHide = HIDDEN_ON_PATHS.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const handleOpenChat = (e) => {
      setInitialChatUserId(e.detail?.userId || null);
      setActivePanel('chat');
    };
    const handleToggleChat = () => {
      setActivePanel(prev => prev === 'chat' ? null : 'chat');
    };
    window.addEventListener('open-chat-with-user', handleOpenChat);
    window.addEventListener('toggle-chat', handleToggleChat);
    return () => {
      window.removeEventListener('open-chat-with-user', handleOpenChat);
      window.removeEventListener('toggle-chat', handleToggleChat);
    };
  }, []);

  if (shouldHide) return null;

  const closePanel = () => {
    setActivePanel(null);
    setInitialChatUserId(null);
    setPostFile(null);
  };

  const handleGallerySelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    setPostFile(f);
    setActivePanel('post');
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const handlePostButton = () => {
    if (!user) { navigate('/login'); return; }
    if (activePanel === 'post') { closePanel(); return; }
    // Open gallery directly
    galleryRef.current?.click();
  };

  const togglePanel = (panel) => {
    if (activePanel === panel) {
      closePanel();
    } else {
      setInitialChatUserId(null);
      setActivePanel(panel);
    }
  };

  const role = user?.role || 'guest';
  const profileUrl = user ? `/user/${user.user_id}` : '/login';
  const profileImage = user?.profile_image;
  const leftItems = [];
  const rightItems = [];

  // Left side
  if (user) {
    leftItems.push({
      id: 'chat',
      icon: MessageCircle,
      label: t('bottomNav.chat', 'Chat'),
      action: () => togglePanel('chat'),
    });
  }

  leftItems.push({
    id: 'ai',
    isAI: true,
    label: 'Hi AI',
    action: () => togglePanel('ai'),
  });

  // Right side
  if (user && (role === 'producer' || role === 'admin')) {
    rightItems.push({
      id: 'sales',
      icon: TrendingUp,
      label: t('bottomNav.salesAI', 'Sales'),
      action: () => togglePanel('sales'),
    });
  } else if (user && role === 'influencer') {
    rightItems.push({
      id: 'creative',
      icon: Sparkles,
      label: t('bottomNav.creativeAI', 'Creative'),
      action: () => togglePanel('creative'),
    });
  }

  rightItems.push({
    id: 'profile',
    icon: User,
    label: t('bottomNav.profile', 'Profile'),
    link: profileUrl,
    isProfile: true,
  });

  return (
    <>
      {/* Panel overlays */}
      {activePanel === 'chat' && (
        <div className="fixed inset-0 md:inset-auto md:bottom-[68px] md:right-4 z-50" data-testid="chat-panel">
          <div className="h-full md:h-[550px] md:w-[380px] bg-white md:rounded-2xl shadow-2xl flex flex-col md:border md:border-stone-200">
            <InternalChat isEmbedded={true} onClose={closePanel} initialChatUserId={initialChatUserId} />
          </div>
        </div>
      )}
      {activePanel === 'ai' && (
        <AIAssistant forceOpen={true} onForceClose={closePanel} />
      )}
      {activePanel === 'sales' && (
        <div className="fixed inset-0 md:inset-auto md:bottom-[68px] md:right-4 z-50" data-testid="sales-ai-panel">
          <div className="h-full md:h-auto md:max-h-[550px] md:w-[380px] bg-white md:rounded-2xl shadow-2xl overflow-hidden md:border md:border-stone-200">
            <SellerAIAssistant isEmbedded={true} onClose={closePanel} />
          </div>
        </div>
      )}
      {activePanel === 'creative' && (
        <div className="fixed inset-0 md:inset-auto md:bottom-[68px] md:right-4 z-50" data-testid="creative-ai-panel">
          <div className="h-full md:h-auto md:max-h-[550px] md:w-[380px] bg-white md:rounded-2xl shadow-2xl overflow-hidden md:border md:border-stone-200">
            <InfluencerAIAssistant isEmbedded={true} onClose={closePanel} />
          </div>
        </div>
      )}
      {activePanel === 'post' && user && (
        <CreatePostPanel user={user} onClose={closePanel} initialFile={postFile} />
      )}

      {/* Hidden gallery input for + button */}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleGallerySelect} data-testid="gallery-file-input" />

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 safe-area-bottom"
        data-testid="bottom-nav-bar"
      >
        <div className="max-w-lg mx-auto grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center h-[60px] px-1">
          {/* Left items */}
          {leftItems.map((item) => {
            const isActive = activePanel === item.id;
            if (item.isAI) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 transition-colors"
                  data-testid={`bottom-nav-${item.id}`}
                >
                  {isActive ? (
                    <X className="w-6 h-6 text-[#2D5A27]" strokeWidth={1.5} />
                  ) : (
                    <HiAIIcon active={isActive} />
                  )}
                  <span className={`text-[10px] leading-none font-semibold ${isActive ? 'text-[#2D5A27]' : 'text-stone-500'}`}>{item.label}</span>
                </button>
              );
            }
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${isActive ? 'text-[#2D5A27]' : 'text-stone-500'}`}
                data-testid={`bottom-nav-${item.id}`}
              >
                {isActive ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Icon className="w-6 h-6" strokeWidth={1.5} />}
                <span className="text-[10px] leading-none">{item.label}</span>
              </button>
            );
          })}

          {/* Spacer if only 1 left item */}
          {leftItems.length < 2 && <div />}

          {/* Center + Post button - ALWAYS visible */}
          <button
            onClick={handlePostButton}
            className="flex flex-col items-center justify-center -mt-5 mx-2"
            data-testid="bottom-nav-post"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ring-4 ring-white ${activePanel === 'post' ? 'bg-stone-700 shadow-stone-500/25' : 'bg-[#1C1C1C] shadow-stone-900/25 hover:bg-[#2A2A2A]'}`}>
              {activePanel === 'post' ? <X className="w-7 h-7 text-white" strokeWidth={2.5} /> : <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />}
            </div>
          </button>

          {/* Spacer if only 1 right item */}
          {rightItems.length < 2 && <div />}

          {/* Right items */}
          {rightItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;

            if (item.isProfile) {
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className="flex flex-col items-center justify-center gap-0.5 py-1"
                  data-testid={`bottom-nav-${item.id}`}
                >
                  {profileImage ? (
                    <div className={`w-7 h-7 rounded-full overflow-hidden border-2 ${location.pathname.includes('dashboard') || location.pathname.includes('profile') ? 'border-[#2D5A27]' : 'border-stone-200'}`}>
                      <img src={profileImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${location.pathname.includes('dashboard') || location.pathname.includes('profile') ? 'bg-[#2D5A27] text-white' : 'bg-stone-100 text-stone-500'}`}>
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="text-[10px] text-stone-500 leading-none">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${isActive ? 'text-[#2D5A27]' : 'text-stone-500'}`}
                data-testid={`bottom-nav-${item.id}`}
              >
                {isActive ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Icon className="w-6 h-6" strokeWidth={1.5} />}
                <span className="text-[10px] leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for content below nav */}
      <div className="h-[60px]" />
    </>
  );
}
