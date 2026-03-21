// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Type, Tag, Check, Search, ShoppingBag, Pencil, Undo2, Redo2, MapPin, Link2, AtSign, HelpCircle, Trash2 } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const BG_OPTIONS = [
  { id: 'camera', label: '📷', type: 'action' },
  { id: 'gallery', label: '🖼️', type: 'action' },
  { id: 'black', label: '■', type: 'color', value: '#000000' },
  { id: 'white', label: '□', type: 'color', value: '#ffffff' },
  { id: 'crema', label: '■', type: 'color', value: '#fafaf9' },
  { id: 'oscuro', label: '■', type: 'color', value: '#1c1917' },
  { id: 'verde', label: '■', type: 'color', value: '#44403c' },
  { id: 'terracota', label: '■', type: 'color', value: '#78716c' },
];

const EMOJI_CATEGORIES = {
  Comida: ['🍕','🍔','🌮','🍣','🥗','🍝','🧁','🍰','🍩','🥐','🍎','🍊','🍋','🍇','🍓','🫐','🥑','🥕','🧀','🥚','🍯','🫒'],
  Bebidas: ['☕','🍵','🧃','🥤','🍺','🍷','🥂','🧋'],
  Utensilios: ['🍴','🥄','🔪','🫕','🥘','🍳'],
  Naturaleza: ['🌿','🌱','🌻','🌾','🌽','🫑'],
  Expresiones: ['❤️','🔥','⭐','😍','🤤','👨‍🍳','👩‍🍳','💯','✨','👏'],
  Símbolos: ['✅','❌','📦','🏷️','💰','🛒','🏪'],
};
const EMOJI_CATEGORY_KEYS = Object.keys(EMOJI_CATEGORIES);

const CERTIFICACIONES = [
  '🌿 Ecológico EU',
  '🏆 DOP',
  '🥇 IGP',
  '☪️ Halal',
  '🌾 Sin gluten',
  '🌱 Vegano',
];

const FRASES = [
  'Cosecha de temporada',
  'Artesanal desde siempre',
  'Sin conservantes',
  'Directo del productor',
];

const FONTS_MAP = {
  Sans: 'inherit',
  Serif: 'Georgia, serif',
  Mono: 'monospace',
  Display: 'Impact, sans-serif',
};

const COLOR_DOTS = ['#000000', '#ffffff', '#a8a29e', '#78716c', '#44403c'];

export default function CreateStoryPage() {
  const navigate = useNavigate();

  const [background, setBackground] = useState('black');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickerOverlays, setStickerOverlays] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [textDraft, setTextDraft] = useState('');
  const [selectedFont, setSelectedFont] = useState('Sans');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [textStyle, setTextStyle] = useState('clean');
  const [stickerTab, setStickerTab] = useState('emojis');
  const [emojiCategory, setEmojiCategory] = useState('Comida');
  const [publishing, setPublishing] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [mentionDraft, setMentionDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const [questionDraft, setQuestionDraft] = useState('');
  const [showTrashZone, setShowTrashZone] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawPaths, setDrawPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  /* --- auto-save draft --- */
  const [draftBanner, setDraftBanner] = useState(false);
  const draftDebounceRef = useRef(null);

  // ── Undo/Redo ──
  const historyRef = useRef([{ t: [], s: [], d: [] }]);
  const historyIdxRef = useRef(0);
  const pushHistory = useCallback(() => {
    const snap = JSON.parse(JSON.stringify({ t: textOverlays, s: stickerOverlays, d: drawPaths }));
    const idx = historyIdxRef.current + 1;
    historyRef.current = [...historyRef.current.slice(0, idx), snap].slice(-12);
    historyIdxRef.current = historyRef.current.length - 1;
  }, [textOverlays, stickerOverlays, drawPaths]);
  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const s = historyRef.current[historyIdxRef.current];
    setTextOverlays(s.t); setStickerOverlays(s.s); setDrawPaths(s.d);
  }, []);
  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const s = historyRef.current[historyIdxRef.current];
    setTextOverlays(s.t); setStickerOverlays(s.s); setDrawPaths(s.d);
  }, []);
  // Auto-push after overlay changes (debounced)
  const historyTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(pushHistory, 400);
    return () => clearTimeout(historyTimerRef.current);
  }, [textOverlays.length, stickerOverlays.length, drawPaths.length, pushHistory]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const canvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const dragRef = useRef({ type: null, id: null, active: false });
  const productSearchTimer = useRef(null);

  // Cleanup object URLs on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [imagePreviewUrl, videoPreviewUrl]);

  const selectedBg = BG_OPTIONS.find((b) => b.id === background);

  const getCanvasBg = () => {
    if (imagePreviewUrl) return { backgroundImage: `url(${imagePreviewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (selectedBg?.type === 'color') return { background: selectedBg.value };
    return { background: '#000' };
  };

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) {
      // Video story
      setVideoFile(file);
      setVideoPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
      setImageFile(null);
      setImagePreviewUrl(null);
    } else {
      // Image story
      setImageFile(file);
      setImagePreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
      setVideoFile(null);
      setVideoPreviewUrl(null);
    }
  }, []);

  const handleBgSelect = useCallback((bg) => {
    if (bg.id === 'camera') {
      cameraInputRef.current?.click();
      return;
    }
    if (bg.id === 'gallery') {
      fileInputRef.current?.click();
      return;
    }
    setBackground(bg.id);
    setImageFile(null);
    setImagePreviewUrl(null);
    setVideoFile(null);
    setVideoPreviewUrl(null);
  }, []);

  const addTextOverlay = useCallback(() => {
    if (!textDraft.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: textDraft,
        font: selectedFont,
        color: selectedColor,
        size: textSize,
        style: textStyle,
        x: 50,
        y: 50,
      },
    ]);
    setTextDraft('');
    setActivePanel(null);
  }, [textDraft, selectedFont, selectedColor, textSize, textStyle]);

  const addSticker = useCallback((content, type) => {
    setStickerOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        content,
        type,
        x: 50,
        y: 50,
      },
    ]);
  }, []);

  const rafRef = useRef(null);

  // Direct DOM drag — no state updates during move, sync on end
  const handleOverlayDragDOM = useCallback((el, e) => {
    const touch = e.touches?.[0] || e;
    const canvas = canvasRef.current;
    if (!canvas || !el) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((touch.clientY - rect.top) / rect.height) * 100));
    dragRef.current.lastX = x;
    dragRef.current.lastY = y;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.left = x + '%';
      el.style.top = y + '%';
    });
  }, []);

  // Product search with debounce
  useEffect(() => {
    if (activePanel !== 'product') return;
    clearTimeout(productSearchTimer.current);
    if (!productQuery.trim()) { setProductResults([]); return; }
    setProductSearching(true);
    productSearchTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/products/search?q=${encodeURIComponent(productQuery)}`);
        setProductResults(res?.results || res?.data?.results || res?.data || (Array.isArray(res) ? res : []));
      } catch {
        setProductResults([]);
      } finally {
        setProductSearching(false);
      }
    }, 350);
    return () => clearTimeout(productSearchTimer.current);
  }, [productQuery, activePanel]);

  // Render draw paths on canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allPaths = currentPath ? [...drawPaths, currentPath] : drawPaths;
    for (const path of allPaths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }
  }, [drawPaths, currentPath]);

  const addProductSticker = useCallback((product) => {
    setStickerOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: product.name || product.title,
        type: 'product',
        productId: product.id || product._id,
        productImage: product.image || product.thumbnail || product.image_url,
        productPrice: product.price,
        x: 50,
        y: 70,
      },
    ]);
    setActivePanel(null);
    setProductQuery('');
    setProductResults([]);
  }, []);

  // Global mouse listeners — direct DOM during drag, single state sync on end
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!dragRef.current.active) return;
      handleOverlayDragDOM(dragRef.current.el, e);
    };
    const handleGlobalMouseUp = () => {
      cancelAnimationFrame(rafRef.current);
      if (dragRef.current.active) {
        const { type, id, lastX, lastY, el } = dragRef.current;
        if (el) el.style.willChange = '';
        const setFn = type === 'text' ? setTextOverlays : setStickerOverlays;
        setFn((prev) => prev.map((item) => item.id === id ? { ...item, x: lastX, y: lastY } : item));
      }
      dragRef.current = { type: null, id: null, active: false, el: null, lastX: 50, lastY: 50 };
      setShowTrashZone(false);
      setOverTrash(false);
    };
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleOverlayDragDOM]);

  /* ── draft: check on mount ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('story_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      const age = Date.now() - (draft.savedAt || 0);
      if (age < 24 * 60 * 60 * 1000 && (draft.textOverlays?.length || draft.stickerOverlays?.length)) {
        setDraftBanner(true);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── draft: auto-save on overlay / background changes ── */
  useEffect(() => {
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      try {
        if (textOverlays.length || stickerOverlays.length) {
          localStorage.setItem('story_draft', JSON.stringify({
            textOverlays,
            selectedBg: background,
            stickerOverlays,
            privacy: 'public',
            savedAt: Date.now(),
          }));
        }
      } catch { /* quota exceeded or private mode */ }
    }, 500);
    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [textOverlays, stickerOverlays, background]);

  const [publishSuccess, setPublishSuccess] = useState(false);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      if (!imageFile && !videoFile && !textOverlays.length && !stickerOverlays.length) {
        toast.error('Añade contenido a tu historia');
        setPublishing(false);
        return;
      }

      const fd = new FormData();

      if (videoFile) {
        // Video story — send video file + overlays as JSON metadata
        fd.append('file', videoFile);
        if (textOverlays.length || stickerOverlays.length || drawPaths.length) {
          fd.append('overlays_json', JSON.stringify({
            texts: textOverlays,
            stickers: stickerOverlays,
            draws: drawPaths.length,
          }));
        }
      } else {
        // Image story — composite overlays into a single image via canvas
        const canvas = document.createElement('canvas');
        const canvasEl = canvasRef.current;
        if (!canvasEl) { setPublishing(false); return; }
        const rect = canvasEl.getBoundingClientRect();
        const scale = 2; // 2x resolution for quality
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        // Draw background
        if (imagePreviewUrl) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; img.src = imagePreviewUrl; });
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        } else {
          const bgColor = selectedBg?.value || '#000';
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, rect.width, rect.height);
        }

        // Draw draw paths
        for (const path of drawPaths) {
          if (path.points.length < 2) continue;
          ctx.beginPath();
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        }

        // Draw text overlays
        for (const t of textOverlays) {
          const x = (t.x / 100) * rect.width;
          const y = (t.y / 100) * rect.height;
          ctx.font = `bold ${t.size}px ${FONTS_MAP[t.font] || 'sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (t.style === 'box') {
            const measured = ctx.measureText(t.text);
            const pw = 10; const ph = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.beginPath();
            ctx.roundRect(x - measured.width / 2 - pw, y - t.size / 2 - ph, measured.width + pw * 2, t.size + ph * 2, 6);
            ctx.fill();
          }
          if (t.style === 'outline') {
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 2;
            ctx.strokeText(t.text, x, y);
          } else {
            ctx.fillStyle = t.color;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 1;
            ctx.fillText(t.text, x, y);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
          }
        }

        // Draw sticker overlays (text-based stickers)
        for (const s of stickerOverlays) {
          const x = (s.x / 100) * rect.width;
          const y = (s.y / 100) * rect.height;
          if (s.type === 'emoji') {
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.content, x, y);
          } else if (s.type === 'poll') {
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.roundRect(x - 90, y - 40, 180, 80, 16);
            ctx.fill();
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(s.content, x, y - 15);
            if (s.options) {
              s.options.forEach((opt, i) => {
                ctx.fillStyle = '#f5f5f4';
                ctx.beginPath();
                ctx.roundRect(x - 75, y + 5 + i * 22, 150, 18, 9);
                ctx.fill();
                ctx.fillStyle = '#0a0a0a';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText(opt, x, y + 16 + i * 22);
              });
            }
          } else if (s.type === 'question') {
            const w = 180, h = 70;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 16); ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Hazme una pregunta', x, y - 18);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(s.content, x, y);
            ctx.fillStyle = '#f5f5f4';
            ctx.beginPath(); ctx.roundRect(x - 70, y + 10, 140, 20, 10); ctx.fill();
            ctx.fillStyle = '#a8a29e';
            ctx.font = '11px sans-serif';
            ctx.fillText('Escribe tu respuesta...', x, y + 22);
          } else if (s.type === 'mention') {
            ctx.font = 'bold 14px sans-serif';
            const label = '@' + s.content;
            const measured = ctx.measureText(label);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath(); ctx.roundRect(x - measured.width/2 - 14, y - 13, measured.width + 28, 26, 13); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
          } else if (s.type === 'location') {
            ctx.font = 'bold 14px sans-serif';
            const measured = ctx.measureText(s.content);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath(); ctx.roundRect(x - measured.width/2 - 20, y - 13, measured.width + 40, 26, 13); ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('📍', x - measured.width/2 - 10, y);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(s.content, x + 5, y);
          } else if (s.type === 'link') {
            const label = s.content.replace(/^https?:\/\//, '');
            ctx.font = 'bold 12px sans-serif';
            const measured = ctx.measureText(label);
            const tw = Math.min(measured.width, 160);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath(); ctx.roundRect(x - tw/2 - 18, y - 13, tw + 36, 26, 13); ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('🔗', x - tw/2 - 8, y);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label.length > 22 ? label.slice(0,22) + '…' : label, x + 5, y);
          } else {
            // badge, phrase, product
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.font = '500 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const measured = ctx.measureText(s.content);
            ctx.beginPath();
            ctx.roundRect(x - measured.width / 2 - 12, y - 12, measured.width + 24, 24, 12);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(s.content, x, y);
          }
        }

        // Export canvas to blob
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        const compositeFile = new File([blob], 'story.jpg', { type: 'image/jpeg' });
        fd.append('file', compositeFile);
      }

      fd.append('caption', '');
      await apiClient.post('/stories', fd);
      if (navigator.vibrate) navigator.vibrate(50);
      try { localStorage.removeItem('story_draft'); } catch { /* ignore */ }
      setPublishSuccess(true);
      setTimeout(() => {
        toast.success('Historia publicada');
        navigate('/');
      }, 800);
    } catch (err) {
      toast.error('Error al publicar la historia');
      setPublishing(false);
    }
  }, [imageFile, videoFile, background, textOverlays, stickerOverlays, drawPaths, imagePreviewUrl, selectedBg, navigate]);

  return (
    <div className="fixed inset-0 z-50 bg-black font-sans flex flex-col lg:max-w-[480px] lg:mx-auto">
      {/* Publish success overlay */}
      {publishSuccess && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.3s_ease]">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <Check size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-white">¡Historia publicada!</span>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* TopBar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => {
            if (imageFile || videoFile || textOverlays.length > 0 || stickerOverlays.length > 0) {
              if (!window.confirm('¿Salir sin publicar? Se perderá el contenido.')) return;
            }
            navigate(-1);
          }}
          aria-label="Cerrar editor de historia"
          className="w-11 h-11 bg-transparent border-none cursor-pointer flex items-center justify-center"
        >
          <X size={22} className="text-white" />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={undo} className="w-9 h-9 bg-white/10 rounded-full border-none cursor-pointer flex items-center justify-center" aria-label="Deshacer">
            <Undo2 size={16} className="text-white/70" />
          </button>
          <button onClick={redo} className="w-9 h-9 bg-white/10 rounded-full border-none cursor-pointer flex items-center justify-center" aria-label="Rehacer">
            <Redo2 size={16} className="text-white/70" />
          </button>
        </div>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className={`bg-stone-950 text-white border-none text-[13px] font-semibold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 ${
            publishing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-stone-800'
          }`}
        >
          {publishing && (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {publishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      {/* draft banner */}
      {draftBanner && (
        <div className="absolute top-16 left-4 right-4 z-20 flex items-center justify-between gap-2 bg-stone-100 rounded-2xl p-3">
          <span className="text-[13px] text-stone-950 font-medium">
            Tienes un borrador de story
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                try {
                  const raw = localStorage.getItem('story_draft');
                  if (raw) {
                    const draft = JSON.parse(raw);
                    if (draft.textOverlays?.length) setTextOverlays(draft.textOverlays);
                    if (draft.stickerOverlays?.length) setStickerOverlays(draft.stickerOverlays);
                    if (draft.selectedBg) setBackground(draft.selectedBg);
                  }
                } catch { /* ignore */ }
                setDraftBanner(false);
              }}
              className="text-[13px] font-semibold text-stone-950 bg-transparent border-none cursor-pointer p-0"
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={() => {
                try { localStorage.removeItem('story_draft'); } catch { /* ignore */ }
                setDraftBanner(false);
              }}
              className="text-[13px] text-stone-500 bg-transparent border-none cursor-pointer p-0"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Background selector */}
      <div className="absolute top-[52px] left-0 right-0 z-10 flex gap-2 overflow-x-auto px-4 py-2 bg-black/60 backdrop-blur-lg">
        {BG_OPTIONS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => handleBgSelect(bg)}
            aria-label={`Fondo: ${bg.id}`}
            className={`w-11 h-11 rounded-hs-sm shrink-0 flex items-center justify-center p-0 cursor-pointer border-2 ${
              background === bg.id ? 'border-white' : 'border-transparent'
            } ${bg.type === 'action' ? 'text-xl' : 'text-base'} ${
              bg.id === 'white' || bg.id === 'crema' ? 'text-black' : 'text-white'
            }`}
            style={{
              background:
                bg.type === 'color' || bg.type === 'gradient'
                  ? bg.value
                  : 'rgba(255,255,255,0.1)',
            }}
          >
            {bg.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center pt-[104px] px-4 pb-4">
        <div
          data-canvas
          ref={canvasRef}
          className="relative aspect-[9/16] max-h-[80vh] w-auto h-full rounded-hs-xl overflow-hidden"
          style={getCanvasBg()}
        >
          {/* Video preview */}
          {videoPreviewUrl && (
            <video
              src={videoPreviewUrl}
              className="absolute inset-0 w-full h-full object-cover z-[1]"
              autoPlay
              loop
              muted
              playsInline
            />
          )}

          {/* Text overlays — positions must be inline (dynamic %) */}
          {textOverlays.map((t) => (
            <div
              key={t.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 font-bold cursor-grab select-none whitespace-nowrap z-[5] group"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                fontSize: t.size,
                color: t.style === 'outline' ? 'transparent' : t.color,
                fontFamily: FONTS_MAP[t.font] || 'inherit',
                textShadow: t.style === 'box' || t.style === 'outline' ? 'none' : '0 1px 4px rgba(0,0,0,0.5)',
                ...(t.style === 'box' ? { background: 'rgba(0,0,0,0.75)', padding: '4px 10px', borderRadius: 6 } : {}),
                ...(t.style === 'outline' ? { WebkitTextStroke: `2px ${t.color}` } : {}),
              }}
              onTouchStart={() => setShowTrashZone(true)}
              onTouchMove={(e) => {
                handleOverlayDragDOM(e.currentTarget, e);
                // Check if over trash zone (bottom 15% of screen)
                const touch = e.touches?.[0];
                if (touch) setOverTrash(touch.clientY > window.innerHeight * 0.85);
              }}
              onTouchEnd={() => {
                setShowTrashZone(false);
                if (overTrash && dragRef.current.active) {
                  setTextOverlays((prev) => prev.filter((item) => item.id !== t.id));
                  setOverTrash(false);
                } else if (dragRef.current.active) {
                  setTextOverlays((prev) => prev.map((item) => item.id === t.id ? { ...item, x: dragRef.current.lastX, y: dragRef.current.lastY } : item));
                }
                dragRef.current = { type: null, id: null, active: false, el: null, lastX: 50, lastY: 50 };
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.willChange = 'left, top';
                setShowTrashZone(true);
                dragRef.current = { type: 'text', id: t.id, active: true, el: e.currentTarget, lastX: t.x, lastY: t.y };
              }}
            >
              {t.text}
              <button
                onClick={(e) => { e.stopPropagation(); setTextOverlays((prev) => prev.filter((o) => o.id !== t.id)); }}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer p-0"
                aria-label={`Eliminar texto "${t.text}"`}
              >
                ×
              </button>
            </div>
          ))}

          {/* Sticker overlays — positions must be inline (dynamic %) */}
          {stickerOverlays.map((s) => (
            <div
              key={s.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none whitespace-nowrap z-[5] font-medium group ${
                s.type === 'product'
                  ? ''
                  : s.type === 'emoji'
                  ? 'text-4xl'
                  : 'bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm'
              }`}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
              }}
              onTouchStart={() => setShowTrashZone(true)}
              onTouchMove={(e) => {
                handleOverlayDragDOM(e.currentTarget, e);
                const touch = e.touches?.[0];
                if (touch) setOverTrash(touch.clientY > window.innerHeight * 0.85);
              }}
              onTouchEnd={() => {
                setShowTrashZone(false);
                if (overTrash && dragRef.current.active) {
                  setStickerOverlays((prev) => prev.filter((item) => item.id !== s.id));
                  setOverTrash(false);
                } else if (dragRef.current.active) {
                  setStickerOverlays((prev) => prev.map((item) => item.id === s.id ? { ...item, x: dragRef.current.lastX, y: dragRef.current.lastY } : item));
                }
                dragRef.current = { type: null, id: null, active: false, el: null, lastX: 50, lastY: 50 };
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.willChange = 'left, top';
                setShowTrashZone(true);
                dragRef.current = { type: 'sticker', id: s.id, active: true, el: e.currentTarget, lastX: s.x, lastY: s.y };
              }}
            >
              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); setStickerOverlays((prev) => prev.filter((o) => o.id !== s.id)); }}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer p-0 z-10"
                aria-label="Eliminar sticker"
              >
                ×
              </button>
              {s.type === 'poll' ? (
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[180px] text-center">
                  <p className="text-[12px] font-bold text-stone-950 mb-2">{s.content}</p>
                  <div className="flex flex-col gap-1.5">
                    {s.options?.map((opt, oi) => (
                      <div key={oi} className="bg-stone-100 rounded-full py-2 px-3 text-[11px] font-semibold text-stone-950">
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ) : s.type === 'product' ? (
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-2xl p-2 pr-3 shadow-lg max-w-[200px]">
                  {s.productImage ? (
                    <img src={s.productImage} alt={s.content || 'Producto'} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
                      <ShoppingBag size={14} className="text-stone-400" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold text-stone-950 truncate">{s.content}</span>
                    {s.productPrice != null && (
                      <span className="text-[10px] font-bold text-stone-950">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(s.productPrice)}
                      </span>
                    )}
                    <span className="text-[9px] text-stone-400 font-medium">Ver producto →</span>
                  </div>
                </div>
              ) : s.type === 'question' ? (
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[200px] text-center">
                  <p className="text-[10px] font-bold text-stone-950 mb-1.5">Hazme una pregunta</p>
                  <p className="text-[12px] font-bold text-stone-950 mb-2">{s.content}</p>
                  <div className="bg-stone-100 rounded-2xl py-2.5 px-3 text-[11px] text-stone-400">
                    Escribe tu respuesta...
                  </div>
                </div>
              ) : s.type === 'mention' ? (
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-full shadow-lg">
                  <AtSign size={14} className="text-white/80" />
                  <span className="font-semibold">{s.content}</span>
                </div>
              ) : s.type === 'link' ? (
                <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl text-stone-950 text-[11px] px-3 py-2 rounded-full shadow-lg max-w-[180px]">
                  <Link2 size={14} className="text-stone-950 shrink-0" />
                  <span className="font-semibold truncate">{s.content.replace(/^https?:\/\//, '')}</span>
                </div>
              ) : s.type === 'location' ? (
                <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl text-stone-950 text-sm px-3 py-2 rounded-full shadow-lg">
                  <MapPin size={14} className="text-stone-950" />
                  <span className="font-semibold">{s.content}</span>
                </div>
              ) : (
                s.content
              )}
            </div>
          ))}

          {/* Draw canvas overlay */}
          {drawMode && (
            <canvas
              ref={drawCanvasRef}
              className="absolute inset-0 z-[8] cursor-crosshair touch-none"
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                setCurrentPath({ points: [{ x, y }], color: drawColor, width: drawWidth });
              }}
              onPointerMove={(e) => {
                if (!currentPath) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                setCurrentPath(prev => ({ ...prev, points: [...prev.points, { x, y }] }));
              }}
              onPointerUp={() => {
                if (currentPath && currentPath.points.length > 1) {
                  setDrawPaths(prev => [...prev, currentPath]);
                }
                setCurrentPath(null);
              }}
            />
          )}

          {/* Committed draw paths (visible when not in draw mode) */}
          {!drawMode && drawPaths.length > 0 && (
            <canvas
              ref={drawCanvasRef}
              className="absolute inset-0 z-[8] pointer-events-none"
            />
          )}

          {/* Empty state */}
          {!imagePreviewUrl && !videoPreviewUrl && textOverlays.length === 0 && stickerOverlays.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/20 text-sm">
                Añade contenido a tu historia
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right toolbar */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">

      {/* Drag-to-trash zone */}
      {showTrashZone && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[15] flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-all duration-200 ${
          overTrash ? 'bg-red-500 scale-110' : 'bg-black/60 backdrop-blur-sm'
        }`}>
          <Trash2 size={20} className={overTrash ? 'text-white' : 'text-white/70'} />
          <span className={`text-sm font-medium ${overTrash ? 'text-white' : 'text-white/70'}`}>
            {overTrash ? 'Soltar para eliminar' : 'Arrastra aquí para eliminar'}
          </span>
        </div>
      )}
        {[
          { key: 'text', icon: <Type size={20} className="text-white" />, label: 'Añadir texto' },
          { key: 'sticker', icon: <span className="text-xl">🌿</span>, label: 'Añadir sticker' },
          { key: 'product', icon: <Tag size={20} className="text-white" />, label: 'Etiquetar producto' },
        ].map((tool) => (
          <button
            key={tool.key}
            onClick={() => setActivePanel(activePanel === tool.key ? null : tool.key)}
            aria-label={tool.label}
            aria-pressed={activePanel === tool.key}
            className={`w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center ${
              activePanel === tool.key ? 'bg-white/30' : 'bg-black/40'
            }`}
          >
            {tool.icon}
          </button>
        ))}
        <button
          onClick={() => { setDrawMode(m => !m); setActivePanel(null); }}
          aria-label="Dibujar"
          aria-pressed={drawMode}
          className={`w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center ${
            drawMode ? 'bg-white/30' : 'bg-black/40'
          }`}
        >
          <Pencil size={20} className="text-white" />
        </button>
      </div>

      {/* Text panel */}
      {activePanel === 'text' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 rounded-t-hs-xl z-20 flex flex-col gap-3">
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Escribe aquí..."
            rows={2}
            aria-label="Texto para la historia"
            className="bg-transparent text-white border-none text-lg outline-none resize-none font-sans w-full placeholder:text-white/30"
            autoFocus
          />

          {/* Font pills */}
          <div className="flex gap-1.5">
            {Object.keys(FONTS_MAP).map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFont(f)}
                aria-label={`Fuente ${f}`}
                aria-pressed={selectedFont === f}
                className={`border-none rounded-full px-3.5 py-2.5 text-xs font-medium cursor-pointer min-h-[44px] ${
                  selectedFont === f ? 'bg-white text-black' : 'bg-white/15 text-white'
                }`}
                style={{ fontFamily: FONTS_MAP[f] }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Color dots — background must be inline (dynamic hex) */}
          <div className="flex gap-1 items-center">
            {COLOR_DOTS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                aria-label={`Color ${c}`}
                className="w-11 h-11 rounded-full cursor-pointer p-0 shrink-0 flex items-center justify-center bg-transparent border-none"
              >
                <span
                  className={`w-7 h-7 rounded-full shrink-0 ${
                    selectedColor === c ? 'ring-[3px] ring-white ring-offset-2 ring-offset-black' : 'border-2 border-white/30'
                  }`}
                  style={{ background: c }}
                />
              </button>
            ))}
          </div>

          {/* Text style */}
          <div className="flex gap-1.5">
            {[
              { key: 'clean', label: 'Limpio' },
              { key: 'box', label: 'Caja' },
              { key: 'outline', label: 'Contorno' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setTextStyle(s.key)}
                className={`flex-1 rounded-full py-2 text-xs font-semibold cursor-pointer transition-colors ${
                  textStyle === s.key ? 'bg-white text-black' : 'bg-white/15 text-white'
                }`}
                aria-pressed={textStyle === s.key}
              >
                <span style={s.key === 'outline' ? { WebkitTextStroke: '1px white', color: 'transparent' } : s.key === 'box' ? { background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: 3 } : {}}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* Size slider */}
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-[11px]">A</span>
            <input
              type="range"
              min={14}
              max={48}
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="text-white text-base font-bold">A</span>
          </div>

          {/* Confirm button */}
          <button
            onClick={addTextOverlay}
            className="bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-stone-800 transition-colors"
          >
            <Check size={16} />
            Confirmar
          </button>
        </div>
      )}

      {/* Sticker panel */}
      {activePanel === 'sticker' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 rounded-t-hs-xl z-20 flex flex-col gap-3 max-h-[50vh] overflow-auto">
          {/* Tabs */}
          <div className="flex border-b border-white/15 overflow-x-auto" role="tablist" aria-label="Tipo de sticker">
            {[
              { key: 'emojis', label: 'Emojis' },
              { key: 'certificaciones', label: 'Certificaciones' },
              { key: 'frases', label: 'Frases' },
              { key: 'encuesta', label: 'Encuesta' },
              { key: 'mencion', label: '@Mención' },
              { key: 'enlace', label: 'Enlace' },
              { key: 'ubicacion', label: 'Ubicación' },
              { key: 'pregunta', label: 'Pregunta' },
            ].map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={stickerTab === tab.key}
                onClick={() => setStickerTab(tab.key)}
                className={`bg-transparent border-none text-[13px] px-3.5 py-2 cursor-pointer border-b-2 ${
                  stickerTab === tab.key
                    ? 'text-white font-semibold border-white'
                    : 'text-white/40 font-normal border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Emoji grid with categories */}
          {stickerTab === 'emojis' && (
            <div className="flex flex-col gap-2.5">
              {/* Category pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {EMOJI_CATEGORY_KEYS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEmojiCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap border-none transition-colors ${
                      emojiCategory === cat ? 'bg-white text-black' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {EMOJI_CATEGORIES[emojiCategory].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addSticker(emoji, 'emoji')}
                    className="bg-white/[0.08] border-none rounded-2xl py-2 text-[26px] cursor-pointer transition-colors hover:bg-white/15"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Certificaciones pills */}
          {stickerTab === 'certificaciones' && (
            <div className="flex flex-wrap gap-2">
              {CERTIFICACIONES.map((cert) => (
                <button
                  key={cert}
                  onClick={() => addSticker(cert, 'badge')}
                  className="bg-white/[0.12] text-white border border-white/20 rounded-full px-3.5 py-2 text-[13px] cursor-pointer whitespace-nowrap transition-colors hover:bg-white/20"
                >
                  {cert}
                </button>
              ))}
            </div>
          )}

          {/* Frases list */}
          {stickerTab === 'frases' && (
            <div className="flex flex-col gap-1.5">
              {FRASES.map((frase) => (
                <button
                  key={frase}
                  onClick={() => addSticker(frase, 'phrase')}
                  className="bg-white/[0.08] text-white border-none rounded-hs-md px-3.5 py-3 text-sm text-left cursor-pointer transition-colors hover:bg-white/15"
                >
                  "{frase}"
                </button>
              ))}
            </div>
          )}

          {/* Encuesta tab */}
          {stickerTab === 'encuesta' && (
            <div className="flex flex-col gap-2">
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value.slice(0, 80))}
                placeholder="¿Qué prefieres?"
                className="bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
              />
              <div className="flex gap-2">
                <input
                  value={pollOption1}
                  onChange={(e) => setPollOption1(e.target.value.slice(0, 30))}
                  placeholder="Opción 1"
                  className="flex-1 bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
                />
                <input
                  value={pollOption2}
                  onChange={(e) => setPollOption2(e.target.value.slice(0, 30))}
                  placeholder="Opción 2"
                  className="flex-1 bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
                />
              </div>
              <button
                onClick={() => {
                  if (!pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()) return;
                  setStickerOverlays(prev => [...prev, {
                    id: Date.now(),
                    content: pollQuestion,
                    type: 'poll',
                    options: [pollOption1, pollOption2],
                    x: 50,
                    y: 50,
                  }]);
                  setPollQuestion(''); setPollOption1(''); setPollOption2('');
                }}
                disabled={!pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()}
                className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${(!pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()) ? 'opacity-40' : ''}`}
              >
                Añadir encuesta
              </button>
            </div>
          )}

          {/* Mención tab */}
          {stickerTab === 'mencion' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
                <AtSign size={16} className="text-white/40 shrink-0" />
                <input
                  value={mentionDraft}
                  onChange={(e) => setMentionDraft(e.target.value.replace(/\s/g, '').slice(0, 30))}
                  placeholder="nombre_de_usuario"
                  className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
                />
              </div>
              <button
                onClick={() => {
                  if (!mentionDraft.trim()) return;
                  addSticker(`@${mentionDraft}`, 'mention');
                  setMentionDraft('');
                }}
                disabled={!mentionDraft.trim()}
                className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${!mentionDraft.trim() ? 'opacity-40' : ''}`}
              >
                Añadir mención
              </button>
            </div>
          )}

          {/* Enlace tab */}
          {stickerTab === 'enlace' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
                <Link2 size={16} className="text-white/40 shrink-0" />
                <input
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value.slice(0, 200))}
                  placeholder="https://..."
                  className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
                />
              </div>
              <button
                onClick={() => {
                  if (!linkDraft.trim()) return;
                  addSticker(linkDraft.startsWith('http') ? linkDraft : `https://${linkDraft}`, 'link');
                  setLinkDraft('');
                }}
                disabled={!linkDraft.trim()}
                className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${!linkDraft.trim() ? 'opacity-40' : ''}`}
              >
                Añadir enlace
              </button>
            </div>
          )}

          {/* Ubicación tab */}
          {stickerTab === 'ubicacion' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
                <MapPin size={16} className="text-white/40 shrink-0" />
                <input
                  value={locationDraft}
                  onChange={(e) => setLocationDraft(e.target.value.slice(0, 60))}
                  placeholder="Sevilla, España"
                  className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
                />
              </div>
              <button
                onClick={() => {
                  if (!locationDraft.trim()) return;
                  addSticker(locationDraft, 'location');
                  setLocationDraft('');
                }}
                disabled={!locationDraft.trim()}
                className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${!locationDraft.trim() ? 'opacity-40' : ''}`}
              >
                Añadir ubicación
              </button>
            </div>
          )}

          {/* Pregunta tab */}
          {stickerTab === 'pregunta' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
                <HelpCircle size={16} className="text-white/40 shrink-0" />
                <input
                  value={questionDraft}
                  onChange={(e) => setQuestionDraft(e.target.value.slice(0, 80))}
                  placeholder="Hazme una pregunta..."
                  className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
                />
              </div>
              <button
                onClick={() => {
                  if (!questionDraft.trim()) return;
                  setStickerOverlays(prev => [...prev, {
                    id: Date.now(),
                    content: questionDraft,
                    type: 'question',
                    x: 50,
                    y: 50,
                  }]);
                  setQuestionDraft('');
                }}
                disabled={!questionDraft.trim()}
                className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${!questionDraft.trim() ? 'opacity-40' : ''}`}
              >
                Añadir pregunta
              </button>
            </div>
          )}
        </div>
      )}
      {activePanel === 'product' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-hs-xl z-20 flex flex-col gap-3 max-h-[55vh]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-white/60 shrink-0" />
            <span className="text-sm font-semibold text-white">Etiquetar producto</span>
          </div>

          {/* Search input */}
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
            <Search size={16} className="text-white/40 shrink-0" />
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Buscar producto..."
              autoFocus
              aria-label="Buscar producto para etiquetar en la historia"
              className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
            />
            {productQuery && (
              <button
                onClick={() => { setProductQuery(''); setProductResults([]); }}
                className="bg-transparent border-none cursor-pointer p-0"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} className="text-white/40" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {productSearching && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {!productSearching && productQuery && productResults.length === 0 && (
              <p className="text-center text-white/40 text-sm py-4">Sin resultados</p>
            )}

            {productResults.map((product) => {
              const name = product.name || product.title;
              const img = product.image || product.thumbnail || product.image_url;
              const price = product.price;
              return (
                <button
                  key={product.id || product._id}
                  onClick={() => addProductSticker(product)}
                  className="flex items-center gap-3 w-full px-2 py-2.5 bg-transparent border-none cursor-pointer rounded-2xl hover:bg-white/10 transition-colors text-left"
                >
                  {img ? (
                    <img src={img} alt={name || 'Producto'} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                      <ShoppingBag size={16} className="text-white/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white font-medium block truncate">{name}</span>
                    {price != null && (
                      <span className="text-xs text-white/60 font-semibold">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price)}
                      </span>
                    )}
                  </div>
                  <Tag size={14} className="text-white/30 shrink-0" />
                </button>
              );
            })}

            {!productQuery && (
              <p className="text-center text-white/30 text-xs py-4">
                Busca un producto de tu catálogo para añadirlo como sticker interactivo
              </p>
            )}
          </div>
        </div>
      )}

      {/* Draw mode panel */}
      {drawMode && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-hs-xl z-20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Dibujar</span>
            <div className="flex gap-2">
              <button onClick={() => setDrawPaths(prev => prev.slice(0, -1))} className="text-white/60 text-xs bg-white/10 rounded-full px-3 py-1.5 border-none cursor-pointer">&#8617; Deshacer</button>
              <button onClick={() => setDrawMode(false)} className="text-black text-xs bg-white rounded-full px-3 py-1.5 border-none cursor-pointer font-semibold">Listo</button>
            </div>
          </div>
          {/* Colors */}
          <div className="flex gap-2">
            {['#0c0a09', '#ffffff', '#dc2626', '#2563eb', '#16a34a', '#eab308', '#f97316', '#ec4899'].map(c => (
              <button key={c} onClick={() => setDrawColor(c)} className={`w-8 h-8 rounded-full border-2 cursor-pointer p-0 shrink-0 ${drawColor === c ? 'border-white ring-2 ring-white/50' : 'border-white/30'}`} style={{ background: c }} aria-label={`Color ${c}`} />
            ))}
          </div>
          {/* Width */}
          <div className="flex gap-3 items-center">
            {[{ w: 2, label: 'Fino' }, { w: 4, label: 'Medio' }, { w: 8, label: 'Grueso' }].map(opt => (
              <button key={opt.w} onClick={() => setDrawWidth(opt.w)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs cursor-pointer border-none ${drawWidth === opt.w ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white'}`}>
                <span className="rounded-full bg-current" style={{ width: opt.w * 2, height: opt.w * 2 }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
