import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageCircle, Plus, User, X, Image as ImageIcon, Loader2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '../utils/api';
import { getDefaultRoute } from '../lib/navigation';
import InternalChat from './InternalChat';
import ContentTypeSelector from './creator/ContentTypeSelector';
import AdvancedEditor from './creator/editor/AdvancedEditor';

const HIDDEN_ON_PATHS = [
  '/login', '/register', '/verify-email', '/forgot-password', '/reset-password',
  '/signup', '/vender/registro', '/vender/login', '/productor/registro', '/influencers/registro', '/influencers/login',
  '/influencer/aplicar', '/influencers/aplicar',
  '/seller/login', '/seller/register', '/influencer/login', '/influencer/register',
];
const HIDDEN_ON_PREFIXES = [
  '/admin',
  '/super-admin',
  '/dashboard',
  '/producer',
  '/importer',
  '/seller',
  '/customer',
  '/influencer/dashboard',
  '/influencer/profile',
  '/influencer/tiers',
  '/influencer/discount',
  '/influencer/payouts',
  '/influencer',
  '/influencers',
  '/productor',
  '/vender',
];

// Editor simple legacy para fallback rápido
function CreatePostPanel({ user, onClose, initialFile = null }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [file, setFile] = useState(initialFile);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (initialFile) {
      const r = new FileReader();
      r.onloadend = () => setPreview(r.result);
      r.readAsDataURL(initialFile);
    }
  }, [initialFile]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      toast.error('Solo imágenes o vídeos');
      return;
    }
    setFile(f);
    if (f.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(f));
      return;
    }
    const r = new FileReader();
    r.onloadend = () => setPreview(r.result);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!text.trim() && !file) return;
    setPosting(true);
    try {
      const fd = new FormData();
      if (file?.type?.startsWith('video/')) {
        fd.append('video', file);
        fd.append('content', text.trim());
        fd.append('cover_frame_seconds', '1');
        await axios.post(`${API}/reels`, fd, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        fd.append('caption', text.trim());
        if (file) fd.append('file', file);
        await axios.post(`${API}/posts`, fd, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success(t('social.published', 'Publicado'));
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al publicar');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-[82px] md:left-1/2 md:-translate-x-1/2 z-50" data-testid="create-post-panel">
      <div className="h-full md:h-auto md:max-h-[500px] md:w-[420px] bg-white md:rounded-2xl shadow-2xl flex flex-col md:border md:border-stone-200">
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full" data-testid="close-post-panel">
            <X className="w-5 h-5 text-stone-500" />
          </button>
            <h3 className="font-heading text-sm font-semibold text-primary">{t('social.newPost', 'Nueva publicación')}</h3>
          <button
            onClick={submit}
            disabled={posting || (!text.trim() && !file)}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:bg-stone-300 text-white text-xs font-semibold rounded-full transition-colors"
            data-testid="publish-post-btn"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('social.publish', 'Publicar')}
          </button>
        </div>

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
              className="flex-1 resize-none bg-transparent outline-none text-sm text-primary placeholder:text-text-muted leading-relaxed"
              autoFocus
              data-testid="post-text-input"
            />
          </div>

          {preview && (
            <div className="relative mt-3 rounded-xl overflow-hidden">
              {file?.type?.startsWith('video/') ? (
                <video src={preview} controls className="w-full max-h-60 object-cover rounded-xl" />
              ) : (
                <img src={preview} alt="" className="w-full max-h-60 object-cover rounded-xl" />
              )}
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-stone-100 flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-50 hover:text-accent transition-colors" data-testid="post-add-image">
            <ImageIcon className="w-4 h-4" />
            <span>Foto o video</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
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
  
  // Estados para el nuevo editor avanzado
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);

  const shouldHide =
    HIDDEN_ON_PATHS.some((path) => location.pathname.startsWith(path)) ||
    HIDDEN_ON_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    const handleOpenChat = (e) => {
      setInitialChatUserId(e.detail?.userId || null);
      setActivePanel('chat');
    };
    const handleToggleChat = () => {
      setActivePanel((prev) => (prev === 'chat' ? null : 'chat'));
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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Validar tipos
    const invalidFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
    if (invalidFiles.length > 0) {
      toast.error('Solo se permiten imágenes o vídeos');
      return;
    }
    
    setSelectedFiles(files);
    setShowContentTypeSelector(true);
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const handlePostButton = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (activePanel === 'post') {
      closePanel();
      return;
    }
    // Abrir selector directamente, sin pasar por el panel legacy
    setShowContentTypeSelector(true);
  };

  const handleContentTypeSelect = (contentType) => {
    setSelectedContentType(contentType.id);
    setShowContentTypeSelector(false);
    setShowAdvancedEditor(true);
  };

  const handleEditorClose = () => {
    setShowAdvancedEditor(false);
    setSelectedContentType(null);
    setSelectedFiles([]);
    closePanel();
  };

  const handlePublish = async (publishData) => {
    try {
      // Convertir base64 a blob
      const base64Response = await fetch(publishData.imageData);
      const blob = await base64Response.blob();
      const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });

      const fd = new FormData();
      
      if (publishData.contentType === 'reel') {
        // Para reels, necesitaríamos el video original
        // Por ahora, subimos como post
        fd.append('video', selectedFiles[0]);
        fd.append('content', publishData.caption);
        fd.append('cover_frame_seconds', '1');
        await axios.post(`${API}/reels`, fd, { 
          withCredentials: true, 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
      } else {
        fd.append('caption', publishData.caption);
        fd.append('file', file);
        await axios.post(`${API}/posts`, fd, { 
          withCredentials: true, 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
      }
      
      toast.success(t('social.published', '¡Publicado con éxito!'));
      handleEditorClose();
      
      // Recargar feed si estamos en home
      if (location.pathname === '/') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error publishing:', err);
      toast.error(err.response?.data?.detail || 'Error al publicar');
    }
  };

  const togglePanel = (panel) => {
    if (activePanel === panel) {
      closePanel();
    } else {
      setInitialChatUserId(null);
      setActivePanel(panel);
    }
  };

  const profileUrl = user ? `/user/${user.user_id}` : '/login';
  const dashboardUrl = user ? getDefaultRoute(user, user.onboarding_completed) : '/login';
  const profileImage = user?.profile_image;

  const navItems = [
    { id: 'home', icon: Home, label: t('bottomNav.home', 'Inicio'), link: '/' },
    { id: 'discover', icon: Compass, label: t('bottomNav.discover', 'Explorar'), link: '/discover?tab=feeds', match: (loc) => loc.pathname === '/discover' && (new URLSearchParams(loc.search).get('tab') !== 'reels') },
    { id: 'chat', icon: MessageCircle, label: t('bottomNav.chat', 'Chat'), action: () => user ? togglePanel('chat') : navigate('/login') },
    { id: 'profile', icon: User, label: t('bottomNav.profile', 'Yo'), link: profileUrl, dashboardLink: dashboardUrl, isProfile: true },
  ];

  return (
    <>
      {/* Content Type Selector */}
      <ContentTypeSelector
        isOpen={showContentTypeSelector}
        onClose={() => {
          setShowContentTypeSelector(false);
          setSelectedFiles([]);
        }}
        onSelect={handleContentTypeSelect}
      />

      {/* Advanced Editor */}
      {showAdvancedEditor && selectedContentType && (
        <AdvancedEditor
          contentType={selectedContentType}
          files={selectedFiles}
          onClose={handleEditorClose}
          onPublish={handlePublish}
        />
      )}

      {activePanel === 'chat' && (
        <div className="fixed inset-0 md:inset-auto md:bottom-[82px] md:right-4 z-50" data-testid="chat-panel">
          <div className="h-full md:h-[550px] md:w-[380px] bg-white md:rounded-2xl shadow-2xl flex flex-col md:border md:border-stone-200">
            <InternalChat isEmbedded={true} onClose={closePanel} initialChatUserId={initialChatUserId} />
          </div>
        </div>
      )}

      {activePanel === 'post' && user && !showAdvancedEditor && (
        <CreatePostPanel user={user} onClose={closePanel} initialFile={postFile} />
      )}

      <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleGallerySelect} data-testid="gallery-file-input" />

      <nav className="fixed bottom-2 left-0 right-0 z-40 pointer-events-none md:bottom-5" data-testid="bottom-nav-bar">
        <div className="mx-auto max-w-xl px-2 sm:px-3 pointer-events-auto">
          <div className="grid h-[76px] grid-cols-[1fr_1fr_auto_1fr_1fr] items-center rounded-[28px] border border-stone-200/90 bg-white/96 px-2 shadow-[0_16px_40px_rgba(15,15,15,0.12)] backdrop-blur-xl">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = item.match ? item.match(location) : location.pathname === item.link;
              if (item.link) {
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    aria-label={item.label}
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
                      isActive ? 'text-stone-950' : 'text-stone-500 hover:text-stone-950'
                    }`}
                    data-testid={`bottom-nav-${item.id}`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-stone-950 text-white' : 'bg-transparent text-current'
                    }`}>
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </div>
                    <span className="max-w-full truncate text-[11px] font-medium">{item.label}</span>
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  aria-label={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
                    isActive ? 'text-stone-950' : 'text-stone-500 hover:text-stone-950'
                  }`}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-stone-950 text-white' : 'bg-transparent text-current'
                  }`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </div>
                  <span className="max-w-full truncate text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={handlePostButton}
              aria-label={t('bottomNav.create', 'Crear')}
              className="mx-1.5 flex flex-col items-center justify-center gap-1"
              data-testid="bottom-nav-post"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_10px_25px_rgba(15,15,15,0.2)] transition-all active:scale-95 ${
                activePanel === 'post' || showAdvancedEditor ? 'bg-stone-700' : 'bg-stone-950 hover:bg-stone-800'
              }`}>
                {activePanel === 'post' || showAdvancedEditor ? (
                  <X className="h-5 w-5 text-white" strokeWidth={2.2} />
                ) : (
                  <Plus className="h-5 w-5 text-white" strokeWidth={2.2} />
                )}
              </div>
              <span className="text-[11px] font-medium text-stone-600">{t('bottomNav.create', 'Crear')}</span>
            </button>

            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              const isPathActive = item.match ? item.match(location) : item.link ? location.pathname.startsWith(item.link) : false;
              const isActive = item.id === 'chat' ? activePanel === 'chat' : isPathActive;

              if (item.isProfile) {
                const isOwnProfileRoute = item.link && location.pathname === item.link;
                const isDashboardRoute = item.dashboardLink
                  ? location.pathname === item.dashboardLink || location.pathname.startsWith(`${item.dashboardLink}/`)
                  : false;
                const showActiveProfile = isOwnProfileRoute || isDashboardRoute;

                return (
                  <div
                    key={item.id}
                    className="flex min-w-0 flex-col items-center justify-center gap-1 py-2"
                    data-testid={`bottom-nav-${item.id}`}
                  >
                    <div className={`flex items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors ${
                      showActiveProfile ? 'bg-stone-100' : 'bg-stone-50/90'
                    }`}>
                      <Link
                        to={item.link}
                        className="flex items-center justify-center"
                        aria-label={item.label}
                      >
                        {profileImage ? (
                          <div className={`h-8 w-8 overflow-hidden rounded-full border-2 ${
                            showActiveProfile ? 'border-stone-950' : 'border-stone-200'
                          }`}>
                            <img src={profileImage} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            showActiveProfile ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-500'
                          }`}>
                            <Icon className="h-4 w-4" strokeWidth={1.6} />
                          </div>
                        )}
                      </Link>
                      {user && (
                        <Link
                          to={item.dashboardLink}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            isDashboardRoute
                              ? 'border-stone-950 bg-stone-950 text-white'
                              : 'border-stone-200 bg-white text-stone-500 hover:text-stone-950'
                          }`}
                          aria-label={t('bottomNav.dashboard', 'Panel')}
                          data-testid="bottom-nav-dashboard"
                        >
                          <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                        </Link>
                      )}
                    </div>
                    <span className="max-w-full truncate text-[11px] font-medium text-stone-600">{item.label}</span>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  aria-label={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors ${
                    isActive ? 'text-stone-950' : 'text-stone-500 hover:text-stone-950'
                  }`}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-stone-950 text-white' : 'bg-transparent text-current'
                  }`}>
                    {isActive ? <X className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  </div>
                  <span className="max-w-full truncate text-[11px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="h-[78px] md:hidden" />
    </>
  );
}
