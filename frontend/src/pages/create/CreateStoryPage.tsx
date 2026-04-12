// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Type, Tag, Check, Pencil, Undo2, Redo2, Trash2, ShoppingBag, AtSign, Link2, MapPin, Camera, Image as ImageIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import i18n from "../../locales/i18n";
import { trackEvent } from '../../utils/analytics';
import { useUploadQueue } from '../../context/UploadQueueContext';
import StoryFilterSwipe from '../../components/story-editor/StoryFilterSwipe';
import StoryTextTool from '../../components/story-editor/StoryTextTool';
import StoryStickerTool from '../../components/story-editor/StoryStickerTool';
import StoryDrawTool from '../../components/story-editor/StoryDrawTool';
import StoryProductTool from '../../components/story-editor/StoryProductTool';
import {
  STORY_FILTERS,
  STORY_BG_OPTIONS as BG_OPTIONS,
  STORY_FONTS_MAP as FONTS_MAP,
} from '../../utils/editor/constants';
export default function CreateStoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueAndProcess } = useUploadQueue();
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
  const [filterIndex, setFilterIndex] = useState(0);
  const [filterIntensity, setFilterIntensity] = useState(100);
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
  const overTrashRef = useRef(false); // sync ref so onTouchEnd reads the latest value (state is async)
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawWidth, setDrawWidth] = useState(4);
  const [drawPaths, setDrawPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const drawPointsRef = useRef([]); // B: RAF-based draw accumulator

  /* --- auto-save draft --- */
  const [draftBanner, setDraftBanner] = useState(false);
  const draftDebounceRef = useRef(null);
  const textDraftDebounceRef = useRef(null);
  const drawRafRef = useRef(null); // B: RAF for draw canvas moves

  // ── Undo/Redo ──
  const historyRef = useRef([{
    t: [],
    s: [],
    d: []
  }]);
  const historyIdxRef = useRef(0);
  const pushHistory = useCallback(() => {
    const snap = JSON.parse(JSON.stringify({
      t: textOverlays,
      s: stickerOverlays,
      d: drawPaths
    }));
    const idx = historyIdxRef.current + 1;
    historyRef.current = [...historyRef.current.slice(0, idx), snap].slice(-12);
    historyIdxRef.current = historyRef.current.length - 1;
  }, [textOverlays, stickerOverlays, drawPaths]);
  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const s = historyRef.current[historyIdxRef.current];
    setTextOverlays(s.t);
    setStickerOverlays(s.s);
    setDrawPaths(s.d);
  }, []);
  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const s = historyRef.current[historyIdxRef.current];
    setTextOverlays(s.t);
    setStickerOverlays(s.s);
    setDrawPaths(s.d);
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
  const dragRef = useRef({
    type: null,
    id: null,
    active: false
  });
  const productSearchTimer = useRef(null);
  const rafRef = useRef(null);

  // Cleanup object URLs, RAF timers, and debounces on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      cancelAnimationFrame(drawRafRef.current);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(textDraftDebounceRef.current);
    };
  }, [imagePreviewUrl, videoPreviewUrl]);
  const selectedBg = BG_OPTIONS.find(b => b.id === background);
  // Compute active CSS filter string from selected story filter + intensity
  const activeFilterCSS = filterIndex > 0 && STORY_FILTERS[filterIndex]
    ? STORY_FILTERS[filterIndex].css
    : 'none';

  const getCanvasBg = () => {
    const filterStyle = activeFilterCSS !== 'none' ? { filter: activeFilterCSS } : {};
    if (imagePreviewUrl) return {
      backgroundImage: `url(${imagePreviewUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      ...filterStyle
    };
    if (selectedBg?.type === 'color') return {
      background: selectedBg.value,
      ...filterStyle
    };
    return {
      background: '#000',
      ...filterStyle
    };
  };
  const handleFileSelect = useCallback(e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`El archivo supera el límite de ${maxSize / (1024 * 1024)} MB.`);
      e.target.value = '';
      return;
    }
    if (file.type.startsWith('video/')) {
      // Video story
      setVideoFile(file);
      setVideoPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setImageFile(null);
      setImagePreviewUrl(null);
    } else {
      // Image story
      setImageFile(file);
      setImagePreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setVideoFile(null);
      setVideoPreviewUrl(null);
    }
    trackEvent('create_started', { type: 'story' });
  }, []);
  const handleBgSelect = useCallback(bg => {
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
    setTextOverlays(prev => [...prev, {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: textDraft,
      font: selectedFont,
      color: selectedColor,
      size: textSize,
      style: textStyle,
      x: 50,
      y: 50
    }]);
    setTextDraft('');
    setActivePanel(null);
  }, [textDraft, selectedFont, selectedColor, textSize, textStyle]);
  const addSticker = useCallback((content, type) => {
    setStickerOverlays(prev => [...prev, {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content,
      type,
      x: 50,
      y: 50
    }]);
  }, []);

  // Direct DOM drag — no state updates during move, sync on end
  const handleOverlayDragDOM = useCallback((el, e) => {
    const touch = e.touches?.[0] || e;
    const canvas = canvasRef.current;
    if (!canvas || !el) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, (touch.clientX - rect.left) / rect.width * 100));
    const y = Math.max(5, Math.min(95, (touch.clientY - rect.top) / rect.height * 100));
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
    if (!productQuery.trim()) {
      setProductResults([]);
      return;
    }
    setProductSearching(true);
    productSearchTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/products/intelligence-search?q=${encodeURIComponent(productQuery)}`);
        setProductResults(res?.items || res?.results || res?.data?.results || res?.data || (Array.isArray(res) ? res : []));
      } catch {
        setProductResults([]);
      } finally {
        setProductSearching(false);
      }
    }, 350);
    return () => clearTimeout(productSearchTimer.current);
  }, [productQuery, activePanel]);

  // Render active draw path on canvas (committed paths use SVG overlay)
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !drawMode) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentPath && currentPath.points.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = currentPath.color;
      ctx.lineWidth = currentPath.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      for (let i = 1; i < currentPath.points.length; i++) {
        ctx.lineTo(currentPath.points[i].x, currentPath.points[i].y);
      }
      ctx.stroke();
    }
  }, [currentPath, drawMode]);
  const addProductSticker = useCallback(product => {
    setStickerOverlays(prev => [...prev, {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content: product.name || product.title,
      type: 'product',
      productId: product.id || product._id,
      productImage: product.image || product.thumbnail || product.image_url,
      productPrice: product.price,
      x: 50,
      y: 70
    }]);
    setActivePanel(null);
    setProductQuery('');
    setProductResults([]);
  }, []);

  // Global mouse listeners — direct DOM during drag, single state sync on end
  useEffect(() => {
    const handleGlobalMouseMove = e => {
      if (!dragRef.current.active) return;
      handleOverlayDragDOM(dragRef.current.el, e);
    };
    const handleGlobalMouseUp = () => {
      cancelAnimationFrame(rafRef.current);
      if (dragRef.current.active) {
        const {
          type,
          id,
          lastX,
          lastY,
          el
        } = dragRef.current;
        if (el) el.style.willChange = '';
        const setFn = type === 'text' ? setTextOverlays : setStickerOverlays;
        setFn(prev => prev.map(item => item.id === id ? {
          ...item,
          x: lastX,
          y: lastY
        } : item));
      }
      dragRef.current = {
        type: null,
        id: null,
        active: false,
        el: null,
        lastX: 50,
        lastY: 50
      };
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
    } catch {/* ignore */}
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
            savedAt: Date.now()
          }));
          trackEvent('create_draft_saved', { type: 'story' });
        }
      } catch {/* quota exceeded or private mode */}
    }, 500);
    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [textOverlays, stickerOverlays, background]);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      if (!imageFile && !videoFile && !textOverlays.length && !stickerOverlays.length && !drawPaths.length) {
        toast.error(i18n.t('create_story.anadeContenidoATuHistoria', 'Añade contenido a tu historia'));
        setPublishing(false);
        return;
      }
      const fd = new FormData();
      // Include filter CSS for both video and image stories
      const publishFilterCSS = filterIndex > 0 && STORY_FILTERS[filterIndex]
        ? STORY_FILTERS[filterIndex].css
        : '';
      if (publishFilterCSS) {
        fd.append('filter_css', publishFilterCSS);
      }

      if (videoFile) {
        // Video story — send video file + overlays as JSON metadata
        fd.append('file', videoFile);
        if (textOverlays.length || stickerOverlays.length || drawPaths.length) {
          // Normalize draw path coordinates from absolute pixels to percentages
          const containerEl = canvasRef.current;
          const cRect = containerEl?.getBoundingClientRect();
          const cw = cRect?.width || 1;
          const ch = cRect?.height || 1;
          fd.append('overlays_json', JSON.stringify({
            texts: textOverlays,
            // Product stickers go to products_json (interactive pills) — exclude from overlays to avoid double-render
            stickers: stickerOverlays.filter((s: any) => s.type !== 'product'),
            draws: drawPaths.map(p => ({
              color: p.color,
              width: p.width,
              points: p.points.map(pt => ({
                x: pt.x / cw * 100,
                y: pt.y / ch * 100
              }))
            }))
          }));
        }
      } else {
        // Image story — composite overlays into a single image via canvas
        const canvas = document.createElement('canvas');
        const canvasEl = canvasRef.current;
        if (!canvasEl) {
          setPublishing(false);
          return;
        }
        const rect = canvasEl.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          setPublishing(false);
          toast.error(i18n.t('create_story.errorAlExportarLaHistoria', 'Error al exportar la historia'));
          return;
        }
        const scale = 2; // 2x resolution for quality
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        // Apply story filter to the canvas before drawing background
        if (publishFilterCSS) {
          ctx.filter = publishFilterCSS;
        }

        // Draw background
        if (imagePreviewUrl) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = imagePreviewUrl;
          });
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        } else {
          const bgColor = selectedBg?.value || '#000';
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, rect.width, rect.height);
        }
        // Reset filter so overlays (text, stickers, draw) are not affected
        ctx.filter = 'none';

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
          const x = t.x / 100 * rect.width;
          const y = t.y / 100 * rect.height;
          ctx.font = `bold ${t.size}px ${FONTS_MAP[t.font] || 'sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (t.style === 'box') {
            const measured = ctx.measureText(t.text);
            const pw = 10;
            const ph = 4;
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
            // Only apply drop shadow for 'clean' style — 'box' has its own background,
            // so shadow bleeds through box edges and mismatches the CSS preview.
            if (t.style !== 'box') {
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetY = 1;
            }
            ctx.fillText(t.text, x, y);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
          }
        }

        // Draw sticker overlays (text-based stickers)
        for (const s of stickerOverlays) {
          const x = s.x / 100 * rect.width;
          const y = s.y / 100 * rect.height;
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
            const w = 180,
              h = 70;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h / 2, w, h, 16);
            ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Hazme una pregunta', x, y - 18);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(s.content, x, y);
            ctx.fillStyle = '#f5f5f4';
            ctx.beginPath();
            ctx.roundRect(x - 70, y + 10, 140, 20, 10);
            ctx.fill();
            ctx.fillStyle = '#a8a29e';
            ctx.font = '11px sans-serif';
            ctx.fillText('Escribe tu respuesta...', x, y + 22);
          } else if (s.type === 'mention') {
            ctx.font = 'bold 14px sans-serif';
            const label = s.content.startsWith('@') ? s.content : '@' + s.content;
            const measured = ctx.measureText(label);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect(x - measured.width / 2 - 14, y - 13, measured.width + 28, 26, 13);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
          } else if (s.type === 'location') {
            ctx.font = 'bold 14px sans-serif';
            const measured = ctx.measureText(s.content);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.roundRect(x - measured.width / 2 - 20, y - 13, measured.width + 40, 26, 13);
            ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('📍', x - measured.width / 2 - 10, y);
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
            ctx.beginPath();
            ctx.roundRect(x - tw / 2 - 18, y - 13, tw + 36, 26, 13);
            ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔗', x - tw / 2 - 8, y);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label.length > 22 ? label.slice(0, 22) + '…' : label, x + 5, y);
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
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) {
          setPublishing(false);
          toast.error(i18n.t('create_story.errorAlExportarLaHistoria', 'Error al exportar la historia'));
          return;
        }
        const compositeFile = new File([blob], 'story.jpg', {
          type: 'image/jpeg'
        });
        fd.append('file', compositeFile);
      }
      // Build the file to upload (already in fd as 'file')
      const fileEntry = fd.get('file') as File | null;
      if (!fileEntry) {
        setPublishing(false);
        toast.error(i18n.t('create_story.errorAlExportarLaHistoria', 'Error al exportar la historia'));
        return;
      }

      // Collect product sticker data
      const productStickers = stickerOverlays.filter(s => s.type === 'product' && s.productId);

      // Clear draft before navigating
      try { localStorage.removeItem('story_draft'); } catch {/* ignore */}

      trackEvent('create_published', { type: 'story', has_products: productStickers.length > 0, has_location: stickerOverlays.some((s: any) => s.type === 'location') });

      // Enqueue upload — banner handles progress + toast
      const publishPayload: Record<string, any> = {
        contentType: 'story',
        caption: '',
        files: [fileEntry],
      };
      if (publishFilterCSS) publishPayload.filter_css = publishFilterCSS;
      if (videoFile && (textOverlays.length || stickerOverlays.length || drawPaths.length)) {
        publishPayload.overlays_json = fd.get('overlays_json');
      }
      if (productStickers.length > 0) {
        publishPayload.products_json = JSON.stringify(productStickers.map(s => ({
          product_id: s.productId,
          product_name: s.content || '',
          product_image: s.productImage || '',
          product_price: s.productPrice || 0,
          position: { x: s.x, y: s.y }
        })));
      }

      enqueueAndProcess(publishPayload);

      queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories-mine'] });
      queryClient.invalidateQueries({ queryKey: ['user-stories'] });
      if (navigator.vibrate) navigator.vibrate(50);
      setPublishing(false);
      setPublishSuccess(true);
      setTimeout(() => navigate('/'), 600);
    } catch (err) {
      toast.error(i18n.t('create_story.errorAlPublicarLaHistoria', 'Error al publicar la historia'));
      setPublishing(false);
    }
  }, [imageFile, videoFile, background, textOverlays, stickerOverlays, drawPaths, imagePreviewUrl, selectedBg, navigate, queryClient]);
  return <div className="fixed inset-0 z-50 bg-black flex flex-col lg:max-w-[480px] lg:mx-auto">
      {/* Publish success overlay */}
      {publishSuccess && <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.3s_ease]">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <Check size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-white">{i18n.t('create_story.historiaPublicada', '¡Historia publicada!')}</span>
        </div>}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      {/* Hidden inputs — gallery + camera (separate for reliable capture) */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* TopBar — glass morphism */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,8px)+8px)] pb-2">
        <button onClick={() => {
        if (imageFile || videoFile || textOverlays.length > 0 || stickerOverlays.length > 0) {
          if (!window.confirm('¿Salir sin publicar? Se perderá el contenido.')) return;
          trackEvent('create_abandoned', { type: 'story', step: 'editor' });
        }
        navigate(-1);
      }} aria-label="Cerrar editor de historia" className="w-10 h-10 bg-black/30 backdrop-blur-xl rounded-xl border-none cursor-pointer flex items-center justify-center transition-colors hover:bg-black/50">
          <X size={20} className="text-white" />
        </button>
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur-xl rounded-xl p-1">
          <button onClick={undo} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer flex items-center justify-center hover:bg-white/10 transition-colors" aria-label="Deshacer">
            <Undo2 size={15} className="text-white/60" />
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={redo} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer flex items-center justify-center hover:bg-white/10 transition-colors" aria-label="Rehacer">
            <Redo2 size={15} className="text-white/60" />
          </button>
        </div>
        <button onClick={handlePublish} disabled={publishing} className={`bg-white text-stone-950 border-none text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 min-h-[40px] ${publishing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-stone-100 active:scale-95'}`}>
          {publishing && <span className="inline-block w-4 h-4 border-2 border-stone-300 border-t-stone-950 rounded-full animate-spin" />}
          {publishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      {/* draft banner */}
      {draftBanner && <div className="absolute top-16 left-4 right-4 z-20 flex items-center justify-between gap-2 bg-stone-100 rounded-2xl p-3">
          <span className="text-[13px] text-stone-950 font-medium">
            Tienes un borrador de story
          </span>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => {
          try {
            const raw = localStorage.getItem('story_draft');
            if (raw) {
              const draft = JSON.parse(raw);
              if (draft.textOverlays?.length) setTextOverlays(draft.textOverlays);
              if (draft.stickerOverlays?.length) setStickerOverlays(draft.stickerOverlays);
              if (draft.selectedBg) setBackground(draft.selectedBg);
            }
          } catch {/* ignore */}
          setDraftBanner(false);
        }} className="text-[13px] font-semibold text-stone-950 bg-transparent border-none cursor-pointer p-0">
              Restaurar
            </button>
            <button type="button" onClick={() => {
          try {
            localStorage.removeItem('story_draft');
          } catch {/* ignore */}
          setDraftBanner(false);
        }} className="text-[13px] text-stone-500 bg-transparent border-none cursor-pointer p-0">
              Descartar
            </button>
          </div>
        </div>}

      {/* Media selector / Background colors */}
      {imagePreviewUrl || videoPreviewUrl ? (
        /* When media is selected: floating change button only */
        <div className="absolute top-[56px] left-4 z-10 flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Cambiar foto o vídeo"
            className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-[12px] font-medium px-3 py-2 rounded-full border-none cursor-pointer hover:bg-black/60 transition-colors"
          >
            <ImageIcon size={14} />
            Cambiar
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            aria-label="Tomar foto"
            className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-[12px] font-medium px-3 py-2 rounded-full border-none cursor-pointer hover:bg-black/60 transition-colors"
          >
            <Camera size={14} />
          </button>
        </div>
      ) : (
        /* No media: show BG color options + camera/gallery */
        <div className="absolute top-[52px] left-0 right-0 z-10 flex gap-2 overflow-x-auto px-4 py-2">
          {BG_OPTIONS.map(bg => (
            <button
              key={bg.id}
              onClick={() => handleBgSelect(bg)}
              aria-label={bg.type === 'action' ? (bg.id === 'camera' ? 'Tomar foto' : 'Elegir de galería') : `Fondo: ${bg.id}`}
              className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center p-0 cursor-pointer border-2 transition-all ${
                background === bg.id ? 'border-white scale-110' : 'border-white/20'
              } ${bg.type === 'action' ? 'bg-white/10 text-white' : ''} ${
                bg.id === 'white' || bg.id === 'crema' ? 'text-black' : 'text-white'
              }`}
              style={bg.type === 'color' ? { background: bg.value } : undefined}
            >
              {bg.id === 'camera' ? <Camera size={16} /> : bg.id === 'gallery' ? <ImageIcon size={16} /> : null}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center pt-[104px] px-4 pb-4">
        <div data-canvas ref={canvasRef} className="relative aspect-[9/16] max-h-[80vh] w-auto h-full rounded-2xl overflow-hidden" style={getCanvasBg()}>
          {/* Video preview */}
          {videoPreviewUrl && <video src={videoPreviewUrl} className="absolute inset-0 w-full h-full object-cover z-[1]" autoPlay loop muted playsInline style={activeFilterCSS !== 'none' ? { filter: activeFilterCSS } : undefined} />}

          {/* Filter swipe overlay — only when media is selected, no tool panel, and not drawing */}
          {(imagePreviewUrl || videoPreviewUrl) && !activePanel && !drawMode && <StoryFilterSwipe filterIndex={filterIndex} intensity={filterIntensity} onFilterChange={setFilterIndex} onIntensityChange={setFilterIntensity} enabled={!activePanel && !drawMode} />}

          {/* Text overlays — positions must be inline (dynamic %) */}
          {textOverlays.map(t => <div key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 font-bold cursor-grab select-none whitespace-nowrap z-[5] group touch-none" style={{
          left: `${t.x}%`,
          top: `${t.y}%`,
          fontSize: t.size,
          color: t.style === 'outline' ? 'transparent' : t.color,
          fontFamily: FONTS_MAP[t.font] || 'inherit',
          textShadow: t.style === 'box' || t.style === 'outline' ? 'none' : '0 1px 4px rgba(0,0,0,0.5)',
          ...(t.style === 'box' ? {
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 10px',
            borderRadius: 6
          } : {}),
          ...(t.style === 'outline' ? {
            WebkitTextStroke: `2px ${t.color}`
          } : {})
        }} onTouchStart={e => {
          setShowTrashZone(true);
          dragRef.current = {
            type: 'text',
            id: t.id,
            active: true,
            el: e.currentTarget,
            lastX: t.x,
            lastY: t.y
          };
        }} onTouchMove={e => {
          handleOverlayDragDOM(e.currentTarget, e);
          // Check if over trash zone (bottom 15% of screen)
          const touch = e.touches?.[0];
          const isOver = touch ? touch.clientY > window.innerHeight * 0.85 : false;
          overTrashRef.current = isOver;
          setOverTrash(isOver);
        }} onTouchEnd={() => {
          setShowTrashZone(false);
          if (overTrashRef.current && dragRef.current.active) {
            setTextOverlays(prev => prev.filter(item => item.id !== t.id));
            overTrashRef.current = false;
            setOverTrash(false);
          } else if (dragRef.current.active) {
            setTextOverlays(prev => prev.map(item => item.id === t.id ? {
              ...item,
              x: dragRef.current.lastX,
              y: dragRef.current.lastY
            } : item));
          }
          dragRef.current = {
            type: null,
            id: null,
            active: false,
            el: null,
            lastX: 50,
            lastY: 50
          };
        }} onMouseDown={e => {
          e.currentTarget.style.willChange = 'left, top';
          setShowTrashZone(true);
          dragRef.current = {
            type: 'text',
            id: t.id,
            active: true,
            el: e.currentTarget,
            lastX: t.x,
            lastY: t.y
          };
        }}>
              {t.text}
              <button onClick={e => {
            e.stopPropagation();
            setTextOverlays(prev => prev.filter(o => o.id !== t.id));
          }} className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer p-0" aria-label={`Eliminar texto "${t.text}"`}>
                ×
              </button>
            </div>)}

          {/* Sticker overlays — positions must be inline (dynamic %) */}
          {stickerOverlays.map(s => <div key={s.id} className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none whitespace-nowrap z-[5] font-medium group touch-none ${s.type === 'product' ? '' : s.type === 'emoji' ? 'text-4xl' : 'bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm'}`} style={{
          left: `${s.x}%`,
          top: `${s.y}%`
        }} onTouchStart={e => {
          setShowTrashZone(true);
          dragRef.current = {
            type: 'sticker',
            id: s.id,
            active: true,
            el: e.currentTarget,
            lastX: s.x,
            lastY: s.y
          };
        }} onTouchMove={e => {
          handleOverlayDragDOM(e.currentTarget, e);
          const touch = e.touches?.[0];
          const isOver = touch ? touch.clientY > window.innerHeight * 0.85 : false;
          overTrashRef.current = isOver;
          setOverTrash(isOver);
        }} onTouchEnd={() => {
          setShowTrashZone(false);
          if (overTrashRef.current && dragRef.current.active) {
            setStickerOverlays(prev => prev.filter(item => item.id !== s.id));
            overTrashRef.current = false;
            setOverTrash(false);
          } else if (dragRef.current.active) {
            setStickerOverlays(prev => prev.map(item => item.id === s.id ? {
              ...item,
              x: dragRef.current.lastX,
              y: dragRef.current.lastY
            } : item));
          }
          dragRef.current = {
            type: null,
            id: null,
            active: false,
            el: null,
            lastX: 50,
            lastY: 50
          };
        }} onMouseDown={e => {
          e.currentTarget.style.willChange = 'left, top';
          setShowTrashZone(true);
          dragRef.current = {
            type: 'sticker',
            id: s.id,
            active: true,
            el: e.currentTarget,
            lastX: s.x,
            lastY: s.y
          };
        }}>
              {/* Remove button */}
              <button onClick={e => {
            e.stopPropagation();
            setStickerOverlays(prev => prev.filter(o => o.id !== s.id));
          }} className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer p-0 z-10" aria-label="Eliminar sticker">
                ×
              </button>
              {s.type === 'poll' ? <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[180px] text-center">
                  <p className="text-[12px] font-bold text-stone-950 mb-2">{s.content}</p>
                  <div className="flex flex-col gap-1.5">
                    {s.options?.map((opt, oi) => <div key={oi} className="bg-stone-100 rounded-full py-2 px-3 text-[11px] font-semibold text-stone-950">
                        {opt}
                      </div>)}
                  </div>
                </div> : s.type === 'product' ? <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-2xl p-2 pr-3 shadow-lg max-w-[200px]">
                  {s.productImage ? <img src={s.productImage} alt={s.content || 'Producto'} className="w-10 h-10 rounded-2xl object-cover shrink-0" /> : <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
                      <ShoppingBag size={14} className="text-stone-400" />
                    </div>}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold text-stone-950 truncate">{s.content}</span>
                    {s.productPrice != null && <span className="text-[10px] font-bold text-stone-950">
                        {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(s.productPrice)}
                      </span>}
                    <span className="text-[9px] text-stone-400 font-medium">Ver producto →</span>
                  </div>
                </div> : s.type === 'question' ? <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[200px] text-center">
                  <p className="text-[10px] font-bold text-stone-950 mb-1.5">Hazme una pregunta</p>
                  <p className="text-[12px] font-bold text-stone-950 mb-2">{s.content}</p>
                  <div className="bg-stone-100 rounded-2xl py-2.5 px-3 text-[11px] text-stone-400">
                    Escribe tu respuesta...
                  </div>
                </div> : s.type === 'mention' ? <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-full shadow-lg">
                  <AtSign size={14} className="text-white/80" />
                  <span className="font-semibold">{s.content}</span>
                </div> : s.type === 'link' ? <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl text-stone-950 text-[11px] px-3 py-2 rounded-full shadow-lg max-w-[180px]">
                  <Link2 size={14} className="text-stone-950 shrink-0" />
                  <span className="font-semibold truncate">{s.content.replace(/^https?:\/\//, '')}</span>
                </div> : s.type === 'location' ? <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl text-stone-950 text-sm px-3 py-2 rounded-full shadow-lg">
                  <MapPin size={14} className="text-stone-950" />
                  <span className="font-semibold">{s.content}</span>
                </div> : s.content}
            </div>)}

          {/* Draw canvas overlay — active when drawing */}
          {drawMode && <canvas ref={drawCanvasRef} className="absolute inset-0 z-[8] cursor-crosshair touch-none" style={{ touchAction: 'none' }} onPointerDown={e => {
          if (!e.isPrimary) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          // Size canvas to match container on first draw
          const canvas = e.currentTarget;
          const rect = canvas.getBoundingClientRect();
          if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
            canvas.width = Math.round(rect.width);
            canvas.height = Math.round(rect.height);
          }
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          drawPointsRef.current = [{ x, y }];
          setCurrentPath({ points: [{ x, y }], color: drawColor, width: drawWidth });
        }} onPointerMove={e => {
          if (!e.isPrimary || !currentPath) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
          drawPointsRef.current.push({ x, y });
          if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
          drawRafRef.current = requestAnimationFrame(() => {
            setCurrentPath(prev => prev ? { ...prev, points: [...drawPointsRef.current] } : prev);
          });
        }} onPointerUp={e => {
          if (!e.isPrimary) return;
          if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
          if (currentPath && drawPointsRef.current.length > 1) {
            setDrawPaths(prev => [...prev, { ...currentPath, points: [...drawPointsRef.current] }]);
          }
          drawPointsRef.current = [];
          setCurrentPath(null);
        }} />}

          {/* Committed draw paths — SVG overlay (visible always, non-interactive) */}
          {drawPaths.length > 0 && <svg className="absolute inset-0 w-full h-full z-[4] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            {drawPaths.map((path, pi) => {
              if (path.points.length < 2) return null;
              const d = path.points.map((pt, j) => `${j === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`).join(' ');
              return <path key={pi} d={d} stroke={path.color} strokeWidth={path.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
            })}
          </svg>}

          {/* Empty state */}
          {!imagePreviewUrl && !videoPreviewUrl && textOverlays.length === 0 && stickerOverlays.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/20 text-sm">
                Añade contenido a tu historia
              </span>
            </div>}
        </div>
      </div>

      {/* Drag-to-trash zone — at screen bottom, outside toolbar */}
      {showTrashZone && <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[15] flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-all duration-200 ${overTrash ? 'bg-stone-950 scale-110' : 'bg-black/60 backdrop-blur-sm'}`}>
          <Trash2 size={20} className={overTrash ? 'text-white' : 'text-white/70'} />
          <span className={`text-sm font-medium ${overTrash ? 'text-white' : 'text-white/70'}`}>
            {overTrash ? 'Soltar para eliminar' : i18n.t('create_story.arrastraAquiParaEliminar', 'Arrastra aquí para eliminar')}
          </span>
        </div>}

      {/* Right toolbar — minimal pill with glass effect */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-black/30 backdrop-blur-xl rounded-2xl p-1.5 z-10">
        {[
          { key: 'text', icon: <Type size={18} />, label: 'Texto' },
          { key: 'sticker', icon: <span className="text-base leading-none">🌿</span>, label: 'Sticker' },
          { key: 'product', icon: <Tag size={18} />, label: 'Producto' },
        ].map(tool => (
          <button
            key={tool.key}
            onClick={() => { setActivePanel(activePanel === tool.key ? null : tool.key); setDrawMode(false); }}
            aria-label={tool.label}
            aria-pressed={activePanel === tool.key}
            className={`w-10 h-10 rounded-xl border-none cursor-pointer flex items-center justify-center transition-all duration-200 ${
              activePanel === tool.key
                ? 'bg-white text-stone-950 scale-105'
                : 'bg-transparent text-white hover:bg-white/10'
            }`}
          >
            {tool.icon}
          </button>
        ))}
        <div className="h-px bg-white/10 mx-1.5" />
        <button
          onClick={() => { setDrawMode(m => !m); setActivePanel(null); }}
          aria-label="Dibujar"
          aria-pressed={drawMode}
          className={`w-10 h-10 rounded-xl border-none cursor-pointer flex items-center justify-center transition-all duration-200 ${
            drawMode
              ? 'bg-white text-stone-950 scale-105'
              : 'bg-transparent text-white hover:bg-white/10'
          }`}
        >
          <Pencil size={18} />
        </button>
      </div>

      {/* Text panel */}
      {activePanel === 'text' && <StoryTextTool onAddText={({ text, font, color, size, style }) => {
        setTextOverlays(prev => [...prev, {
          id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          text, font, color, size, style, x: 50, y: 50
        }]);
        setActivePanel(null);
        pushHistory();
      }} />}

      {/* Sticker panel */}
      {activePanel === 'sticker' && <StoryStickerTool
        onAddSticker={(content, type) => { addSticker(content, type); pushHistory(); }}
        onAddPoll={(question, options) => {
          setStickerOverlays(prev => [...prev, {
            id: `poll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            content: question, type: 'poll', options, x: 50, y: 50
          }]);
          pushHistory();
        }}
        onAddQuestion={(question) => {
          setStickerOverlays(prev => [...prev, {
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            content: question, type: 'question', x: 50, y: 50
          }]);
          pushHistory();
        }}
      />}

      {/* Product panel */}
      {activePanel === 'product' && <StoryProductTool
        productQuery={productQuery}
        productResults={productResults}
        productSearching={productSearching}
        onQueryChange={setProductQuery}
        onClear={() => { setProductQuery(''); setProductResults([]); }}
        onSelectProduct={addProductSticker}
      />}

      {/* Draw mode panel */}
      {drawMode && <StoryDrawTool
        drawColor={drawColor}
        drawWidth={drawWidth}
        onColorChange={setDrawColor}
        onWidthChange={setDrawWidth}
        onUndo={() => setDrawPaths(prev => prev.slice(0, -1))}
        onDone={() => setDrawMode(false)}
      />}
    </div>;
}