import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Eye, Loader2, Camera, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API } from '../utils/api';

/* ── Story Circles Row ── */
export function StoriesRow() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [storyGroups, setStoryGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const fetchStories = useCallback(() => {
    axios.get(`${API}/stories`, { withCredentials: true })
      .then(r => setStoryGroups(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" data-testid="stories-row">
        {/* Add story button */}
        {user && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex flex-col items-center gap-1 shrink-0"
            data-testid="add-story-btn"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50 hover:bg-stone-100 transition-colors">
              <Plus className="w-6 h-6 text-stone-400" />
            </div>
            <span className="text-[10px] text-stone-500 font-medium">{t('stories.addStory')}</span>
          </button>
        )}

        {/* Story circles */}
        {storyGroups.map((group) => (
          <button
            key={group.user_id}
            onClick={() => setActiveGroup(group)}
            className="flex flex-col items-center gap-1 shrink-0"
            data-testid={`story-circle-${group.user_id}`}
          >
            <div className={`w-16 h-16 rounded-full p-[2px] ${
              group.is_own ? 'bg-gradient-to-br from-[#2D5A27] to-emerald-400' : 'bg-gradient-to-br from-orange-400 to-pink-500'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                {group.profile_image ? (
                  <img src={group.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm font-semibold">
                    {(group.user_name || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-stone-600 font-medium max-w-16 truncate">
              {group.is_own ? t('stories.yourStory') : group.user_name?.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer */}
      {activeGroup && (
        <StoryViewer
          group={activeGroup}
          onClose={() => { setActiveGroup(null); fetchStories(); }}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <StoryUploadModal
          onClose={() => setShowUpload(false)}
          onPublished={() => { setShowUpload(false); fetchStories(); }}
        />
      )}
    </>
  );
}

/* ── Full-screen Story Viewer ── */
function StoryViewer({ group, onClose }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const stories = group.stories || [];
  const current = stories[currentIndex];

  const DURATION = 5000;

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    setProgress(0);
    if (current) {
      axios.post(`${API}/stories/${current.story_id}/view`, {}, { withCredentials: true }).catch(() => {});
    }
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / DURATION, 1));
      if (elapsed >= DURATION) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, current, goNext]);

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/stories/${current.story_id}`, { withCredentials: true });
      toast.success('Story deleted');
      if (stories.length <= 1) {
        onClose();
      } else {
        stories.splice(currentIndex, 1);
        if (currentIndex >= stories.length) setCurrentIndex(stories.length - 1);
      }
    } catch { toast.error('Error'); }
  };

  if (!current) return null;

  const timeLeft = () => {
    try {
      const exp = new Date(current.expires_at);
      const now = new Date();
      const hours = Math.max(0, Math.floor((exp - now) / 3600000));
      return `${hours}h`;
    } catch { return ''; }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" data-testid="story-viewer">
      {/* Progress bars */}
      <div className="absolute top-2 left-3 right-3 flex gap-1 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress * 100}%` : '0%',
                transition: i === currentIndex ? 'none' : 'width 0.2s'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-10">
        <Link to={`/user/${group.user_id}`} onClick={onClose} className="flex items-center gap-2">
          {group.profile_image ? (
            <img src={group.profile_image} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/50" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
              {(group.user_name || '?')[0]}
            </div>
          )}
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{group.user_name}</p>
            <p className="text-white/60 text-[10px]">{timeLeft()}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {user && group.is_own && (
            <button onClick={handleDelete} className="p-2 text-white/70 hover:text-white" data-testid="story-delete">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white" data-testid="story-close">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Image */}
      <img
        src={current.image_url}
        alt=""
        className="max-w-full max-h-full object-contain"
      />

      {/* Parsed overlays from caption */}
      {(() => {
        const cap = current.caption || '';
        const textMatch = cap.match(/\[text:(.+?)\]/);
        const stickerMatch = cap.match(/\[sticker:(.+?)\]/);
        const productMatch = cap.match(/\[product:(.+?):(.+?):(.+?)\]/);
        const cleanCaption = cap.replace(/\[text:.+?\]/g, '').replace(/\[sticker:.+?\]/g, '').replace(/\[product:.+?\]/g, '').trim();
        return (
          <>
            {textMatch && (
              <div className="absolute top-1/3 left-4 right-4 text-center pointer-events-none z-[3]">
                <p className="text-white text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/20 rounded-lg px-3 py-1.5 inline-block backdrop-blur-sm">{textMatch[1]}</p>
              </div>
            )}
            {stickerMatch && (
              <div className="absolute top-8 right-8 text-5xl drop-shadow-lg pointer-events-none z-[3]">{stickerMatch[1]}</div>
            )}
            {productMatch && (
              <Link to={`/products/${productMatch[1]}`} onClick={onClose} className="absolute bottom-20 left-4 right-4 z-[6]">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
                  <ShoppingBag className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">{productMatch[2]}</p>
                    <p className="text-xs text-[#2D5A27] font-bold">{productMatch[3]}€</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </Link>
            )}
            {cleanCaption && (
              <div className="absolute bottom-16 left-4 right-4 text-center z-[3]">
                <p className="text-white text-sm bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 inline-block max-w-md">{cleanCaption}</p>
              </div>
            )}
          </>
        );
      })()}

      {/* Tap zones */}
      <button
        className="absolute left-0 top-0 w-1/3 h-full z-[5]"
        onClick={goPrev}
        aria-label="Previous"
      />
      <button
        className="absolute right-0 top-0 w-2/3 h-full z-[5]"
        onClick={goNext}
        aria-label="Next"
      />
    </div>
  );
}

/* ── Upload Modal with Draggable Overlays, Stickers & Product Tags ── */
function DraggableOverlay({ children, x, y, onMove, onRemove }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (clientX, clientY) => {
    dragging.current = true;
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: clientX - rect.left, y: clientY - rect.top };
  };
  const onDrag = (clientX, clientY) => {
    if (!dragging.current || !ref.current?.parentElement) return;
    const parent = ref.current.parentElement.getBoundingClientRect();
    const nx = ((clientX - parent.left - offset.current.x) / parent.width) * 100;
    const ny = ((clientY - parent.top - offset.current.y) / parent.height) * 100;
    onMove(Math.max(0, Math.min(85, nx)), Math.max(0, Math.min(90, ny)));
  };
  const endDrag = () => { dragging.current = false; };

  useEffect(() => {
    const move = (e) => onDrag(e.clientX, e.clientY);
    const tmove = (e) => { if (e.touches[0]) onDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const up = () => endDrag();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', tmove, { passive: false });
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', tmove); window.removeEventListener('touchend', up); };
  });

  return (
    <div ref={ref} className="absolute z-10 cursor-grab active:cursor-grabbing select-none group" style={{ left: `${x}%`, top: `${y}%` }}
      onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
      onTouchStart={(e) => { if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY); }}>
      {children}
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -top-2 -right-2 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}

function StoryUploadModal({ onClose, onPublished }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [textOverlays, setTextOverlays] = useState([]);
  const [placedStickers, setPlacedStickers] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [taggedProduct, setTaggedProduct] = useState(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const fileRef = useRef(null);
  const searchTimerRef = useRef(null);

  const stickers = ['🍕', '🥑', '🍓', '🔥', '❤️', '⭐', '🎉', '🛒', '🌿', '😋', '👨‍🍳', '🍳'];

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error(t('stories.selectImage')); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const addTextOverlay = () => {
    if (!newText.trim()) return;
    setTextOverlays(prev => [...prev, { id: Date.now(), text: newText.trim(), x: 10, y: 30 }]);
    setNewText('');
    setShowTextInput(false);
  };

  const addSticker = (emoji) => {
    setPlacedStickers(prev => [...prev, { id: Date.now(), emoji, x: 50, y: 50 }]);
  };

  const moveText = (id, x, y) => setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
  const moveSticker = (id, x, y) => setPlacedStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  const removeText = (id) => setTextOverlays(prev => prev.filter(t => t.id !== id));
  const removeSticker = (id) => setPlacedStickers(prev => prev.filter(s => s.id !== id));

  const searchProducts = (q) => {
    setProductSearch(q);
    clearTimeout(searchTimerRef.current);
    if (!q || q.length < 2) { setProductResults([]); return; }
    searchTimerRef.current = setTimeout(() => {
      axios.get(`${API}/products?search=${encodeURIComponent(q)}&limit=5`)
        .then(r => { const d = r.data; setProductResults(Array.isArray(d) ? d.slice(0, 5) : (d?.products || []).slice(0, 5)); })
        .catch(() => setProductResults([]));
    }, 300);
  };

  const handleSubmit = async () => {
    if (!file) { toast.error(t('stories.selectImage')); return; }
    setUploading(true);
    try {
      const parts = [];
      textOverlays.forEach(t => parts.push(`[text:${t.text}:${Math.round(t.x)}:${Math.round(t.y)}]`));
      placedStickers.forEach(s => parts.push(`[sticker:${s.emoji}:${Math.round(s.x)}:${Math.round(s.y)}]`));
      if (taggedProduct) parts.push(`[product:${taggedProduct.product_id}:${taggedProduct.name}:${taggedProduct.price}]`);
      if (caption) parts.push(caption);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', parts.join(' '));
      await axios.post(`${API}/stories`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('stories.published'));
      onPublished();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" data-testid="story-upload-modal">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0">
          <h3 className="font-semibold text-stone-900">{t('stories.uploadStory')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full"><X className="w-5 h-5 text-stone-500" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Image preview with draggable overlays */}
          {preview ? (
            <div className="relative aspect-[9/16] max-h-[40vh] rounded-xl overflow-hidden bg-black mb-3 mx-auto" data-testid="story-preview">
              <img src={preview} alt="" className="w-full h-full object-contain" />
              {/* Draggable text overlays */}
              {textOverlays.map(t => (
                <DraggableOverlay key={t.id} x={t.x} y={t.y} onMove={(x, y) => moveText(t.id, x, y)} onRemove={() => removeText(t.id)}>
                  <p className="text-white text-base font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1 whitespace-nowrap">{t.text}</p>
                </DraggableOverlay>
              ))}
              {/* Draggable stickers */}
              {placedStickers.map(s => (
                <DraggableOverlay key={s.id} x={s.x} y={s.y} onMove={(x, y) => moveSticker(s.id, x, y)} onRemove={() => removeSticker(s.id)}>
                  <span className="text-4xl drop-shadow-lg">{s.emoji}</span>
                </DraggableOverlay>
              ))}
              {/* Tagged product badge */}
              {taggedProduct && (
                <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
                    <ShoppingBag className="w-4 h-4 text-[#1C1C1C] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-900 truncate">{taggedProduct.name}</p>
                      <p className="text-xs text-[#1C1C1C] font-bold">{taggedProduct.price?.toFixed(2)}€</p>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => { setFile(null); setPreview(null); setTextOverlays([]); setPlacedStickers([]); setTaggedProduct(null); }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white z-20">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[40vh] rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-3 bg-stone-50 hover:bg-stone-100 transition-colors mb-3"
              data-testid="story-upload-area">
              <Camera className="w-10 h-10 text-stone-400" />
              <span className="text-sm text-stone-500 font-medium">{t('stories.selectImage')}</span>
            </button>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {/* Tools: Text + Product tag */}
          {preview && (
            <div className="flex gap-2 mb-3">
              <button onClick={() => setShowTextInput(!showTextInput)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${showTextInput ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}
                data-testid="story-text-btn">
                Aa {t('stories.addText', 'Texto')}
              </button>
              <button onClick={() => setShowProductSearch(!showProductSearch)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${showProductSearch ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}
                data-testid="story-product-btn">
                <span className="inline-flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {t('stories.tagProduct', 'Producto')}</span>
              </button>
            </div>
          )}

          {/* Add text input */}
          {showTextInput && preview && (
            <div className="flex gap-2 mb-3">
              <input type="text" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTextOverlay()}
                placeholder={t('stories.textOverlay', 'Escribe y arrastra...')} className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400" maxLength={60} autoFocus data-testid="story-overlay-input" />
              <button onClick={addTextOverlay} disabled={!newText.trim()} className="px-3 py-2 bg-[#1C1C1C] text-white text-xs font-medium rounded-xl disabled:opacity-40">+</button>
            </div>
          )}

          {/* Stickers grid - click to place on image */}
          {preview && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {stickers.map(s => (
                <button key={s} onClick={() => addSticker(s)}
                  className="w-9 h-9 text-lg rounded-lg flex items-center justify-center bg-stone-50 hover:bg-stone-100 hover:scale-110 active:scale-95 transition-all">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Product search */}
          {showProductSearch && preview && (
            <div className="mb-3">
              <input type="text" value={productSearch} onChange={(e) => searchProducts(e.target.value)}
                placeholder={t('stories.searchProduct', 'Buscar producto...')} className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 mb-2" data-testid="story-product-search" />
              {productResults.map(p => (
                <button key={p.product_id} onClick={() => { setTaggedProduct(p); setShowProductSearch(false); setProductSearch(''); setProductResults([]); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 text-left">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />}
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{p.name}</p><p className="text-xs text-[#1C1C1C]">{p.price?.toFixed(2)}€</p></div>
                </button>
              ))}
              {taggedProduct && (
                <div className="flex items-center gap-2 p-2 bg-stone-100 rounded-lg mt-1">
                  <ShoppingBag className="w-4 h-4 text-[#1C1C1C]" />
                  <span className="text-xs font-medium flex-1 truncate">{taggedProduct.name}</span>
                  <button onClick={() => setTaggedProduct(null)} className="p-0.5"><X className="w-3 h-3 text-stone-400" /></button>
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)}
            placeholder={t('stories.storyCaption')} className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 mb-3" maxLength={200} data-testid="story-caption-input" />

          {/* Publish */}
          <button onClick={handleSubmit} disabled={!file || uploading}
            className="w-full py-3 bg-[#1C1C1C] text-white rounded-xl font-medium text-sm hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="story-publish-btn">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('stories.uploading')}</> : t('stories.uploadStory')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoriesRow;
