import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Heart, MessageCircle, Share2, Send, Bookmark, BookmarkCheck,
  Loader2, Compass, UserPlus, X, Image as ImageIcon, Tag, ShoppingBag,
  ChevronRight, Search, Trash2, MoreHorizontal, Flame
} from 'lucide-react';
import { StoriesRow } from './HispaloStories';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

import { API } from '../utils/api';
import { sanitizeImageUrl } from '../utils/helpers';
import { demoPosts } from '../data/demoData';
import { DEMO_MODE } from '../config/featureFlags';

// Normalize image URLs — ensure /api prefix for local uploads
function getImgUrl(url) {
  return sanitizeImageUrl(url);
}

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/* =========== SELLER STORIES (Instagram-style circles) =========== */
function StoriesSection() {
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    axios.get(`${API}/feed/stories`, { withCredentials: true })
      .then(r => setStories(r.data || []))
      .catch(() => {});
  }, []);

  if (stories.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3 mb-4 scrollbar-hide" data-testid="stories-section">
        {stories.map(s => (
          <button
            key={s.user_id}
            onClick={() => setActiveStory(s)}
            className="flex flex-col items-center gap-1 shrink-0"
            data-testid={`story-${s.user_id}`}
          >
            <div className={`w-16 h-16 rounded-full p-[2px] ${s.is_recent ? 'bg-gradient-to-tr from-amber-500 via-red-500 to-purple-500' : 'bg-stone-300'}`}>
              <div className="w-full h-full rounded-full bg-white p-[2px]">
                <div className="w-full h-full rounded-full bg-stone-200 overflow-hidden">
                  {s.avatar ? (
                    <img src={getImgUrl(s.avatar)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm font-bold">{(s.name || 'S')[0]}</div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-text-muted w-16 truncate text-center">{s.name}</span>
          </button>
        ))}
      </div>

      {/* Story viewer modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="story-viewer">
          <div className="absolute inset-0 bg-black/80" onClick={() => setActiveStory(null)} />
          <div className="relative w-full max-w-sm mx-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 bg-black/40 rounded-t-2xl">
              <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden">
                {activeStory.avatar ? <img src={getImgUrl(activeStory.avatar)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">{(activeStory.name||'S')[0]}</div>}
              </div>
              <span className="text-white text-sm font-medium flex-1">{activeStory.name}</span>
              <button onClick={() => setActiveStory(null)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {/* Content */}
            <div className="bg-[#1C1C1C] rounded-b-2xl overflow-hidden">
              {activeStory.preview?.image && (
                <img src={getImgUrl(activeStory.preview.image)} alt="" className="w-full aspect-square object-cover" />
              )}
              <div className="p-4">
                <p className="text-white text-sm">{activeStory.preview?.text}</p>
                {activeStory.preview?.price && (
                  <p className="text-emerald-400 font-bold mt-1">{activeStory.preview.price.toFixed(2)}€</p>
                )}
                <Link
                  to={activeStory.preview?.type === 'product' ? `/products/${activeStory.preview?.product_id || ''}` : `/user/${activeStory.user_id}`}
                  onClick={() => setActiveStory(null)}
                  className="block mt-3 text-center bg-white text-[#1C1C1C] text-sm font-medium py-2.5 rounded-xl hover:bg-stone-100"
                >
                  {activeStory.preview?.type === 'product' ? 'Ver producto' : 'Ver perfil'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========== PRODUCT SELECTOR =========== */
function ProductSelector({ onSelect, onCancel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/post-products/search?q=${encodeURIComponent(query)}&limit=5`, { withCredentials: true });
        setResults(res.data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    (async () => {
      try { const res = await axios.get(`${API}/post-products/search?limit=5`, { withCredentials: true }); setResults(res.data || []); } catch { /* ignore */ }
    })();
  }, []);

  return (
    <div className="mt-2 border border-stone-200 rounded-xl bg-white overflow-hidden" data-testid="product-selector">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-100">
        <Search className="w-4 h-4 text-[#7A7A7A]" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." className="flex-1 text-sm outline-none placeholder:text-[#999]" autoFocus data-testid="product-search-input" />
        <button onClick={onCancel} className="text-[#7A7A7A] hover:text-[#1C1C1C]"><X className="w-4 h-4" /></button>
      </div>
      <div className="max-h-40 overflow-y-auto">
        {loading && <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[#7A7A7A]" /></div>}
        {!loading && results.length === 0 && <p className="p-3 text-xs text-[#7A7A7A] text-center">No results</p>}
        {results.map((p) => (
          <button key={p.product_id} onClick={() => onSelect(p)} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-stone-50 transition-colors text-left" data-testid={`product-option-${p.product_id}`}>
            <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0">
              {p.image ? <img src={getImgUrl(p.image)} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5 text-stone-300 m-auto mt-2.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1C1C1C] truncate">{p.name}</p>
              <p className="text-xs text-[#2D5A27] font-semibold">{p.price?.toFixed(2)} {p.currency}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========== QUICK BUY MODAL =========== */
function QuickBuyModal({ product, onClose }) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const imgUrl = getImgUrl(product.image);

  const trackEvt = (type) => {
    axios.post(`${API}/track/social-event`, { event_type: type, product_id: product.product_id }).catch(() => {});
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await axios.post(`${API}/cart/add`, { product_id: product.product_id, quantity }, { withCredentials: true });
      trackEvt('add_to_cart_from_post');
      toast.success('Agregado al carrito');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('social.errorAdd'));
    } finally { setAdding(false); }
  };

  const handleBuyNow = async () => {
    setBuying(true);
    try {
      const res = await axios.post(`${API}/checkout/buy-now`, { product_id: product.product_id, quantity }, { withCredentials: true });
      trackEvt('buy_from_post');
      if (res.data.checkout_url) window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || t('social.errorBuy'));
    } finally { setBuying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" data-testid="quick-buy-modal">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:rounded-2xl sm:max-w-sm shadow-2xl rounded-t-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-stone-100 rounded-full z-10">
          <X className="w-5 h-5 text-[#1C1C1C]" />
        </button>
        <div className="p-5">
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
              {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-8 h-8 text-stone-300 m-auto mt-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1C1C1C] line-clamp-2">{product.name}</p>
              <p className="text-lg font-bold text-[#2D5A27] mt-1">{product.price?.toFixed(2)}€</p>
              {product.avg_rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Heart className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-xs text-[#7A7A7A]">{product.avg_rating}/10 ({product.review_count})</span>
                </div>
              )}
              {product.in_stock === false && <p className="text-xs text-red-500 mt-1 font-medium">Agotado</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-[#7A7A7A]">Cantidad:</span>
            <div className="flex items-center border border-stone-200 rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-1.5 text-sm hover:bg-stone-50">-</button>
              <span className="px-3 py-1.5 text-sm font-medium border-x border-stone-200" data-testid="quantity-display">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-1.5 text-sm hover:bg-stone-50">+</button>
            </div>
            <span className="text-sm font-semibold text-[#1C1C1C] ml-auto">{(product.price * quantity).toFixed(2)}€</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddToCart}
              disabled={adding || product.in_stock === false}
              variant="outline"
              className="flex-1 rounded-xl h-11 text-sm"
              data-testid="modal-add-to-cart"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingBag className="w-4 h-4 mr-1.5" /> Carrito</>}
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={buying || product.in_stock === false}
              className="flex-1 rounded-xl h-11 text-sm bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white"
              data-testid="modal-buy-now"
            >
              {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Comprar ahora'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========== TAGGED PRODUCT CARD (enhanced with buy buttons) =========== */
function TaggedProductCard({ product }) {
  const [showModal, setShowModal] = useState(false);
  const imgUrl = getImgUrl(product?.image);
  
  if (!product) return null;

  const trackClick = () => {
    axios.post(`${API}/track/social-event`, { event_type: 'click_product_from_post', product_id: product.product_id }).catch(() => {});
  };

  return (
    <>
      <div
        className="mx-4 mb-3 p-2.5 sm:p-3 bg-[#FAF7F2] rounded-xl border border-stone-200/60 hover:border-[#2D5A27] transition-colors"
        data-testid={`tagged-product-${product.product_id}`}
      >
        <div className="flex items-center gap-3">
          <Link to={`/products/${product.product_id}`} onClick={trackClick} className="shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-stone-100 overflow-hidden border border-stone-200">
              {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-6 h-6 text-stone-300 m-auto mt-4" />}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/products/${product.product_id}`} onClick={trackClick}>
              <p className="text-xs sm:text-sm font-semibold text-[#1C1C1C] truncate hover:text-[#2D5A27]">{product.name}</p>
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-[#2D5A27]">{product.price?.toFixed(2)}€</span>
              {product.avg_rating > 0 && (
                <span className="text-[10px] text-[#7A7A7A] flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />{product.avg_rating}
                </span>
              )}
              {product.in_stock === false && <span className="text-[10px] text-red-500 font-medium">Agotado</span>}
              {product.stock > 0 && product.stock <= 5 && <span className="text-[10px] text-orange-500 font-medium">Quedan {product.stock}</span>}
            </div>
          </div>
          <button
            onClick={() => { trackClick(); setShowModal(true); }}
            className="shrink-0 bg-[#2D5A27] text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-[#1F4A1A] transition-colors"
            data-testid={`buy-btn-${product.product_id}`}
          >
            Comprar
          </button>
        </div>
      </div>
      {showModal && <QuickBuyModal product={product} onClose={() => setShowModal(false)} />}
    </>
  );
}

/* =========== INLINE POST CREATOR =========== */
function CreatePostInline({ user, onPostCreated }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [taggedProduct, setTaggedProduct] = useState(null);
  const fileRef = useRef(null);
  const canTagProducts = user?.role === 'producer' || user?.role === 'importer' || user?.role === 'influencer' || user?.role === 'admin' || user?.role === 'super_admin';

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Solo imagenes'); return; }
    setFile(f);
    const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(f);
  };
  const removeFile = () => { setFile(null); setPreview(null); };

  const submit = async () => {
    if (!text.trim() && !file) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('caption', text.trim());
      if (file) fd.append('file', file);
      if (taggedProduct) fd.append('product_id', taggedProduct.product_id);
      const res = await axios.post(`${API}/posts`, fd, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      setText(''); removeFile(); setTaggedProduct(null); setFocused(false); setShowProductSelector(false);
      toast.success('Publicado');
      if (onPostCreated) onPostCreated(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || t('social.errorPublish')); }
    finally { setPosting(false); }
  };

  const avatarUrl = getImgUrl(user?.profile_image);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3 sm:p-4 mb-5" data-testid="create-post-inline">
      <div className="flex gap-2.5 sm:gap-3">
        <Link to={`/user/${user?.user_id}`} className="shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200 overflow-hidden border border-stone-100">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-xs sm:text-sm">{(user?.name || 'U')[0].toUpperCase()}</div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <textarea value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocused(true)}
            placeholder="¿Qué estás pensando?" rows={focused ? 3 : 1}
            className="w-full resize-none bg-transparent outline-none text-sm text-[#1C1C1C] placeholder:text-[#999] leading-relaxed"
            data-testid="create-post-text" />
          {preview && (
            <div className="relative mt-2 rounded-xl overflow-hidden max-h-48 sm:max-h-60">
              <img src={preview} alt="Preview" className="w-full object-cover rounded-xl" />
              <button onClick={removeFile} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
            </div>
          )}
          {taggedProduct && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-[#FAF7F2] rounded-lg border border-stone-200">
              <Tag className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
              <span className="text-xs font-medium text-[#1C1C1C] truncate">{taggedProduct.name}</span>
              <span className="text-xs text-[#2D5A27] font-bold shrink-0">{taggedProduct.price?.toFixed(2)} {taggedProduct.currency}</span>
              <button onClick={() => setTaggedProduct(null)} className="ml-auto"><X className="w-3.5 h-3.5 text-[#7A7A7A]" /></button>
            </div>
          )}
          {showProductSelector && !taggedProduct && <ProductSelector onSelect={(p) => { setTaggedProduct(p); setShowProductSelector(false); }} onCancel={() => setShowProductSelector(false)} />}
          {(focused || text || file) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
              <div className="flex gap-0.5 sm:gap-1">
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#7A7A7A] hover:bg-stone-50 hover:text-[#2D5A27] transition-colors" data-testid="add-image-btn">
                  <ImageIcon className="w-4 h-4" /><span className="hidden sm:inline">Foto</span>
                </button>
                {canTagProducts && (
                  <button onClick={() => setShowProductSelector(!showProductSelector)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${taggedProduct ? 'text-[#2D5A27] bg-[#2D5A27]/5' : 'text-[#7A7A7A] hover:bg-stone-50 hover:text-[#2D5A27]'}`} data-testid="tag-product-btn">
                    <Tag className="w-4 h-4" /><span className="hidden sm:inline">Producto</span>
                  </button>
                )}
              </div>
              <Button onClick={submit} disabled={posting || (!text.trim() && !file)} size="sm" className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-4 sm:px-5 h-8 text-xs font-semibold disabled:opacity-40" data-testid="submit-post-btn">
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('social.publish')}
              </Button>
            </div>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* =========== COMMENT ITEM (with edit/delete) =========== */
function CommentItem({ comment, currentUser, postId, onUpdate, onDelete }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const isOwner = currentUser?.user_id === comment.user_id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canModify = isOwner || isAdmin;

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleEdit = async () => {
    if (!editText.trim()) return;
    try {
      await axios.put(`${API}/comments/${comment.comment_id}`, { text: editText.trim() }, { withCredentials: true });
      onUpdate({ comment_id: comment.comment_id, text: editText.trim(), edited_at: new Date().toISOString() });
      setEditing(false);
      toast.success(t('social.commentUpdated', 'Comentario actualizado'));
    } catch { toast.error('Error'); }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/comments/${comment.comment_id}`, { withCredentials: true });
      onDelete(comment.comment_id);
      toast.success(t('social.commentDeleted', 'Comentario eliminado'));
    } catch { toast.error('Error'); }
  };

  if (editing) {
    return (
      <div className="text-sm flex items-center gap-2" data-testid={`comment-edit-${comment.comment_id}`}>
        <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEdit()} className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 outline-none focus:border-stone-400" autoFocus />
        <button onClick={handleEdit} className="text-xs font-medium text-[#1C1C1C] hover:underline">{t('common.save', 'Guardar')}</button>
        <button onClick={() => { setEditing(false); setEditText(comment.text); }} className="text-xs text-stone-400 hover:underline">{t('common.cancel', 'Cancelar')}</button>
      </div>
    );
  }

  return (
    <div className="group text-sm flex items-start gap-1" data-testid={`comment-${comment.comment_id}`}>
      <div className="flex-1">
        <Link to={`/user/${comment.user_id}`} className="font-semibold text-[#1C1C1C] hover:underline mr-1.5">{comment.user_name}</Link>
        <span className="text-[#1C1C1C]">{comment.text}</span>
        <span className="text-[10px] text-[#7A7A7A] ml-2">{timeAgo(comment.created_at)}</span>
        {comment.edited_at && <span className="text-[10px] text-[#7A7A7A] ml-1">({t('social.edited', 'editado')})</span>}
      </div>
      {canModify && (
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 text-stone-400 hover:text-stone-600" data-testid={`comment-menu-${comment.comment_id}`}>
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
              {isOwner && (
                <button onClick={() => { setEditing(true); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-stone-50 text-stone-700" data-testid={`edit-comment-${comment.comment_id}`}>
                  {t('social.editComment', 'Editar')}
                </button>
              )}
              <button onClick={() => { handleDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600" data-testid={`delete-comment-${comment.comment_id}`}>
                {t('social.deleteComment', 'Eliminar')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========== POST CARD =========== */
const EMOJI_MAP = { heart: '❤️', laugh: '😂', wow: '😮', clap: '👏', fire: '🔥' };
const EMOJI_KEYS = Object.keys(EMOJI_MAP);

function PostCard({ post, currentUser, onDelete }) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.is_bookmarked || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactions, setReactions] = useState({});
  const [myReaction, setMyReaction] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const menuRef = useRef(null);

  const isOwner = currentUser?.user_id === post.user_id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canDelete = isOwner || isAdmin;

  const imgSrc = getImgUrl(post.image_url);
  const avatarSrc = getImgUrl(post.user_profile_image);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleLike = async () => {
    if (!currentUser) { toast.error(t('social.loginToLike')); return; }
    setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600);
    try {
      const res = await axios.post(`${API}/posts/${post.post_id}/like`, {}, { withCredentials: true });
      setLiked(res.data.liked); setLikesCount(prev => res.data.liked ? prev + 1 : prev - 1);
    } catch { toast.error('Error'); }
  };

  const handleDoubleTapLike = () => { if (!currentUser || liked) return; handleLike(); };

  const handleBookmark = async () => {
    if (!currentUser) { toast.error(t('social.loginToSave')); return; }
    try {
      const res = await axios.post(`${API}/posts/${post.post_id}/bookmark`, {}, { withCredentials: true });
      setSaved(res.data.bookmarked); toast.success(res.data.bookmarked ? t('social.saved') : t('social.unsaved'));
      if (res.data.bookmarked) axios.post(`${API}/track/social-event`, { event_type: 'save_post', post_id: post.post_id }).catch(() => {});
    } catch { toast.error('Error'); }
  };

  // Fetch reactions on mount
  useEffect(() => {
    axios.get(`${API}/posts/${post.post_id}/reactions`).then(r => {
      setReactions(r.data || {});
      if (currentUser) {
        for (const [emoji, data] of Object.entries(r.data || {})) {
          if (data.users?.includes(currentUser.name)) { setMyReaction(emoji); break; }
        }
      }
    }).catch(() => {});
  }, [post.post_id, currentUser]);

  const handleReact = async (emoji) => {
    if (!currentUser) { toast.error(t('social.loginToLike')); return; }
    try {
      const res = await axios.post(`${API}/posts/${post.post_id}/react`, { emoji }, { withCredentials: true });
      if (res.data.reacted) {
        setMyReaction(emoji);
        setReactions(prev => {
          const updated = { ...prev };
          // Remove from old emoji
          for (const k of EMOJI_KEYS) {
            if (updated[k]?.users?.includes(currentUser.name)) {
              updated[k] = { count: updated[k].count - 1, users: updated[k].users.filter(u => u !== currentUser.name) };
              if (updated[k].count <= 0) delete updated[k];
            }
          }
          // Add to new emoji
          if (!updated[emoji]) updated[emoji] = { count: 0, users: [] };
          updated[emoji] = { count: updated[emoji].count + 1, users: [...updated[emoji].users, currentUser.name] };
          return updated;
        });
      } else {
        setMyReaction(null);
        setReactions(prev => {
          const updated = { ...prev };
          if (updated[emoji]) {
            updated[emoji] = { count: updated[emoji].count - 1, users: updated[emoji].users.filter(u => u !== currentUser.name) };
            if (updated[emoji].count <= 0) delete updated[emoji];
          }
          return updated;
        });
      }
    } catch { toast.error('Error'); }
    setShowReactions(false);
  };

  const totalReactions = Object.values(reactions).reduce((sum, r) => sum + (r.count || 0), 0);

  const handleDelete = async () => {
    if (!window.confirm(t('social.deleteConfirm'))) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/posts/${post.post_id}`, { withCredentials: true });
      toast.success('Publicacion eliminada');
      if (onDelete) onDelete(post.post_id);
    } catch { toast.error(t('social.errorDelete')); }
    finally { setDeleting(false); setShowMenu(false); }
  };

  const handleShare = async () => {
    axios.post(`${API}/track/social-event`, { event_type: 'share_post', post_id: post.post_id }).catch(() => {});
    const url = `${window.location.origin}/user/${post.user_id}`;
    const text = post.caption ? `${post.caption.slice(0, 100)} - Hispaloshop` : 'Mira esto en Hispaloshop';
    
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* ignore */ }
    } else {
      // Desktop: show share options
      const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
      window.open(waUrl, '_blank');
    }
  };

  const shareToWhatsApp = () => {
    const url = `${window.location.origin}/user/${post.user_id}`;
    const text = post.tagged_product 
      ? `${post.tagged_product.name} - ${post.tagged_product.price?.toFixed(2)}€ en Hispaloshop`
      : post.caption?.slice(0, 100) || 'Mira esto en Hispaloshop';
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
  };

  const loadComments = async () => {
    try { const res = await axios.get(`${API}/posts/${post.post_id}/comments`); setComments(res.data || []); } catch { /* ignore */ }
  };
  const toggleComments = () => { if (!showComments) loadComments(); setShowComments(!showComments); };

  const submitComment = async () => {
    if (!currentUser) { toast.error(t('social.login')); return; }
    if (!commentText.trim()) return;
    setLoadingComment(true);
    try {
      const res = await axios.post(`${API}/posts/${post.post_id}/comments`, { text: commentText.trim() }, { withCredentials: true });
      setComments(prev => [res.data, ...prev]); setCommentText('');
    } catch { toast.error(t('social.errorComment')); }
    finally { setLoadingComment(false); }
  };

  const roleBadge = {
    influencer: { l: t('social.roleInfluencer'), c: 'bg-purple-100 text-purple-600' },
    producer: { l: t('social.roleSeller'), c: 'bg-emerald-100 text-emerald-600' },
    importer: { l: 'Importador', c: 'bg-emerald-100 text-emerald-600' },
    super_admin: { l: t('social.roleAdmin'), c: 'bg-amber-100 text-amber-600' },
    admin: { l: t('social.roleAdmin'), c: 'bg-amber-100 text-amber-600' }
  }[post.user_role];
  const isTextOnly = !post.image_url;

  return (
    <article className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden" data-testid={`post-${post.post_id}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3">
        <Link to={`/user/${post.user_id}`} className="shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200 overflow-hidden border border-stone-100">
            {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-xs sm:text-sm">{(post.user_name||'U')[0].toUpperCase()}</div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to={`/user/${post.user_id}`} className="font-semibold text-sm text-[#1C1C1C] hover:underline truncate">{post.user_name}</Link>
            {roleBadge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadge.c}`}>{roleBadge.l}</span>}
          </div>
          <span className="text-xs text-[#7A7A7A]">
            {post.user_country && <span className="mr-1">{post.user_country}</span>}
            {timeAgo(post.created_at)}
          </span>
        </div>
        {/* Menu */}
        {canDelete && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors" data-testid={`post-menu-${post.post_id}`}>
              <MoreHorizontal className="w-5 h-5 text-[#7A7A7A]" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
                <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors" data-testid={`delete-post-${post.post_id}`}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t('social.deletePost')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text-only body */}
      {isTextOnly && post.caption && (
        <div className="px-3 sm:px-4 pb-2">
          <p className="text-[15px] text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">{post.caption}</p>
        </div>
      )}

      {/* Image */}
      {imgSrc && (
        <div className="relative bg-stone-100 cursor-pointer" onDoubleClick={handleDoubleTapLike}>
          <img src={imgSrc} alt={post.caption || 'Post'} className="w-full max-h-[500px] object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          {likeAnim && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Heart className="w-20 h-20 fill-white text-white animate-ping opacity-80" /></div>}
        </div>
      )}

      {/* Tagged Product */}
      {post.tagged_product && <TaggedProductCard product={post.tagged_product} />}

      {/* Actions */}
      <div className="px-3 sm:px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-5 sm:gap-4">
            <button onClick={handleLike} className="group active:scale-125 transition-transform" data-testid={`like-btn-${post.post_id}`}>
              <Heart className={`w-6 h-6 sm:w-6 sm:h-6 transition-all duration-200 ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-[#1C1C1C] group-hover:text-red-400'}`} />
            </button>
            <button onClick={toggleComments} className="group active:scale-110 transition-transform" data-testid={`comment-btn-${post.post_id}`}>
              <MessageCircle className="w-6 h-6 text-[#1C1C1C] group-hover:text-[#2D5A27] transition-colors" />
            </button>
            <button onClick={handleShare} className="group active:scale-110 transition-transform">
              <Share2 className="w-5 h-5 text-[#1C1C1C] group-hover:text-[#2D5A27] transition-colors" />
            </button>
            {/* Reaction trigger */}
            <div className="relative">
              <button onClick={() => setShowReactions(!showReactions)} className="group active:scale-110 transition-transform" data-testid={`react-btn-${post.post_id}`}>
                {myReaction ? (
                  <span className="text-lg leading-none">{EMOJI_MAP[myReaction]}</span>
                ) : (
                  <Flame className="w-5 h-5 text-[#1C1C1C] group-hover:text-orange-400 transition-colors" />
                )}
              </button>
              {showReactions && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 bg-white border border-stone-200 rounded-full px-2 py-1.5 shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-200" data-testid={`reaction-picker-${post.post_id}`}>
                  {EMOJI_KEYS.map(k => (
                    <button key={k} onClick={() => handleReact(k)} className={`text-xl hover:scale-125 transition-transform px-1 ${myReaction === k ? 'scale-125 bg-stone-100 rounded-full' : ''}`} data-testid={`react-${k}-${post.post_id}`}>
                      {EMOJI_MAP[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={handleBookmark} className="group active:scale-110 transition-transform" data-testid={`save-btn-${post.post_id}`}>
            {saved ? <BookmarkCheck className="w-6 h-6 text-[#2D5A27] fill-[#2D5A27]" /> : <Bookmark className="w-6 h-6 text-[#1C1C1C] group-hover:text-[#2D5A27] transition-colors" />}
          </button>
        </div>
        {/* Reaction badges */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-1 mb-1" data-testid={`reactions-display-${post.post_id}`}>
            {EMOJI_KEYS.filter(k => reactions[k]?.count > 0).map(k => (
              <span key={k} className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${myReaction === k ? 'bg-stone-100 border-stone-300' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                <span>{EMOJI_MAP[k]}</span>
                <span className="text-[#7A7A7A] font-medium">{reactions[k].count}</span>
              </span>
            ))}
          </div>
        )}
        {likesCount > 0 && <p className="text-sm font-semibold text-[#1C1C1C] mb-1">{likesCount} me gusta</p>}
        {!isTextOnly && post.caption && (
          <p className="text-sm text-[#1C1C1C] mb-1"><Link to={`/user/${post.user_id}`} className="font-semibold hover:underline mr-1.5">{post.user_name}</Link>{post.caption}</p>
        )}
        {post.comments_count > 0 && !showComments && (
          <button onClick={toggleComments} className="text-xs text-[#7A7A7A] hover:text-[#1C1C1C] mb-1 block">Ver {post.comments_count} comentario{post.comments_count !== 1 ? 's' : ''}</button>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-3 sm:px-4 pb-1">
          <div className="max-h-48 overflow-y-auto space-y-2.5 mb-2">
            {comments.map((c) => (
              <CommentItem key={c.comment_id} comment={c} currentUser={currentUser} postId={post.post_id} onUpdate={(updated) => {
                setComments(prev => prev.map(cm => cm.comment_id === updated.comment_id ? { ...cm, text: updated.text, edited_at: updated.edited_at } : cm));
              }} onDelete={(id) => { setComments(prev => prev.filter(cm => cm.comment_id !== id)); }} />
            ))}
            {comments.length === 0 && <p className="text-xs text-[#7A7A7A] py-1">{t('social.noComments')}</p>}
          </div>
        </div>
      )}

      {/* Add comment */}
      {currentUser && (
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-stone-100 flex items-center gap-2">
          <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            placeholder="Escribe un comentario..." className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#999]" data-testid={`comment-input-${post.post_id}`} />
          <button onClick={submitComment} disabled={!commentText.trim() || loadingComment} className="text-[#2D5A27] font-semibold text-sm disabled:opacity-30 hover:text-[#1F4A1A] transition-colors p-1">
            {loadingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </article>
  );
}

/* =========== SOCIAL FEED =========== */
export default function SocialFeed() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 10;

  const fetchFeed = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const skip = reset ? 0 : page * LIMIT;
      const scope = user ? 'following' : 'hybrid';
      const res = await axios.get(`${API}/feed?skip=${skip}&limit=${LIMIT}&scope=${scope}`, { withCredentials: true });
      const items = res.data.posts || [];
      if (reset) {
        if (items.length > 0) {
          setPosts(items);
          setHasMore(res.data.has_more || false);
        } else {
          setPosts(DEMO_MODE ? demoPosts.map((p) => ({ ...p, is_liked: false, is_bookmarked: false })) : []);
          setHasMore(false);
        }
      } else {
        setPosts(prev => [...prev, ...items]);
        setHasMore(res.data.has_more || false);
      }
    } catch (err) {
      console.error('Feed error:', err);
      if (reset) {
        setPosts(DEMO_MODE ? demoPosts.map((p) => ({ ...p, is_liked: false, is_bookmarked: false })) : []);
        setHasMore(false);
      }
    }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { setPage(0); fetchFeed(true); }, [user]);
  useEffect(() => { if (page > 0) fetchFeed(false); }, [page]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [{ ...newPost, user_name: user?.name || 'Usuario', user_profile_image: user?.profile_image, user_role: user?.role || 'customer', is_liked: false, is_bookmarked: false }, ...prev]);
  };

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p.post_id !== postId));
  };

  // Infinite scroll
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage(prev => prev + 1); },
      { rootMargin: '200px' }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div data-testid="social-feed">
      {/* Hispalostories */}
      <div className="mb-4">
        <StoriesRow />
      </div>

      {/* Post creator */}
      {user && <CreatePostInline user={user} onPostCreated={handlePostCreated} />}

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#7A7A7A]" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center"><Compass className="w-10 h-10 text-stone-300" /></div>
          <h3 className="text-lg font-semibold text-[#1C1C1C] mb-2">{t('social.emptyFeed')}</h3>
          <p className="text-sm text-[#7A7A7A] mb-4 max-w-xs mx-auto">{t('social.emptyFeedDesc')}</p>
          <Link to="/discover"><Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-xl" data-testid="discover-from-feed"><UserPlus className="w-4 h-4 mr-2" />{t('social.discoverProfiles')}</Button></Link>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {posts.map((post) => <PostCard key={post.post_id} post={post} currentUser={user} onDelete={handleDelete} />)}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#7A7A7A]" /></div>}
        </div>
      )}
    </div>
  );
}
