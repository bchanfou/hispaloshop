// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Play, Pause, Volume2, VolumeX, MapPin, Globe, Lock, Check, Video, Search } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
import { trackEvent } from '../../utils/analytics';
import { useUploadQueue } from '../../context/UploadQueueContext';
const FILTERS = [{
  name: 'Natural',
  value: 'none'
}, {
  name: 'Amanecer',
  value: 'sepia(0.25) saturate(1.3) brightness(1.08)'
}, {
  name: 'Lonja',
  value: 'hue-rotate(10deg) saturate(1.15) brightness(1.05) contrast(1.05)'
}, {
  name: 'Huerta',
  value: 'saturate(1.35) contrast(1.05) brightness(1.03)'
}, {
  name: 'Miel',
  value: 'sepia(0.2) saturate(1.2) brightness(1.1)'
}, {
  name: 'Trufa',
  value: 'contrast(1.25) brightness(0.88) saturate(1.1)'
}, {
  name: 'Mate',
  value: 'saturate(0.75) brightness(1.1) contrast(0.95)'
}, {
  name: 'Antiguo',
  value: 'sepia(0.45) saturate(0.8) brightness(1.05)'
}];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2];
const FONTS = ['Sans', 'Serif', 'Mono', 'Display'];
const TEXT_COLORS = ['#ffffff', '#0c0a09', '#78716c', '#d6d3d1', '#a8a29e'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
const fmt = s => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
export default function CreateReelPage() {
  const navigate = useNavigate();
  const { enqueueAndProcess } = useUploadQueue();
  const [screen, setScreen] = useState('upload');
  const [uploadTab, setUploadTab] = useState('subir');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [editTab, setEditTab] = useState('velocidad');
  const [speed, setSpeed] = useState(1);
  const [activeFilter, setActiveFilter] = useState('none');
  const [textOverlays, setTextOverlays] = useState([]);
  const [textDraft, setTextDraft] = useState('');
  const [selectedFont, setSelectedFont] = useState('Sans');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [showTextInput, setShowTextInput] = useState(false);
  const [caption, setCaption] = useState('');
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('public');
  const [taggedProducts, setTaggedProducts] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [coverFromGallery, setCoverFromGallery] = useState(null);
  const coverUrl = useMemo(() => coverFromGallery ? URL.createObjectURL(coverFromGallery) : null, [coverFromGallery]);
  useEffect(() => () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
  }, [coverUrl]);
  const coverInputRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0); // 0 = full duration
  const [textStyle, setTextStyle] = useState('clean'); // clean | box | outline
  const [filterThumb, setFilterThumb] = useState(null); // base64 frame for filter previews
  const [trimFrames, setTrimFrames] = useState([]); // array of base64 frames for trim timeline
  const [uploadProgress, setUploadProgress] = useState(0);

  /* --- auto-save draft --- */
  const [draftBanner, setDraftBanner] = useState(false);
  const draftDebounceRef = useRef(null);
  const videoRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const playIconTimer = useRef(null);
  const dragRef = useRef(null);
  const rafRef = useRef(null);

  // Revoke blob URL on unmount to free memory
  useEffect(() => {
    return () => {
      clearTimeout(playIconTimer.current);
      cancelAnimationFrame(rafRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      // Clean up any lingering document drag listeners
      dragRef.current = null;
    };
  }, [videoUrl]);
  const handleFileSelect = useCallback(e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !file.type.startsWith('video/')) {
      toast.error('Formato no soportado. Usa MP4, MOV o WebM.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(i18n.t('create_reel.elVideoEsDemasiadoGrandeMax100M', 'El vídeo es demasiado grande (máx. 100 MB)'));
      e.target.value = '';
      return;
    }
    setVideoUrl(URL.createObjectURL(file));
    setVideoFile(file);
    setScreen('edit');
    trackEvent('create_started', { type: 'reel' });
    e.target.value = '';
  }, []);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    clearTimeout(playIconTimer.current);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 600);
  }, []);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    // Loop within trim bounds
    const end = trimEnd || v.duration;
    if (v.currentTime >= end) {
      v.currentTime = trimStart;
    } else if (v.currentTime < trimStart) {
      v.currentTime = trimStart;
    }
  }, [trimStart, trimEnd]);
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration;
    if (dur > 60) {
      toast.error(i18n.t('create_reel.elVideoNoPuedeSuperarLos60Segundo', 'El vídeo no puede superar los 60 segundos. Recórtalo antes de subirlo.'));
    }
    setDuration(dur);
    setTrimEnd(Math.min(dur, 60));

    // Extract frames for filter thumbnail + trim timeline (non-blocking)
    const captureFrames = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Filter thumbnail from first frame
      try {
        ctx.drawImage(v, 0, 0, 80, 80);
        setFilterThumb(canvas.toDataURL('image/jpeg', 0.5));
      } catch {/* cross-origin or not ready */}

      // Trim timeline: extract 9 evenly-spaced frames
      const frameCount = 9;
      const frames = [];
      canvas.width = 60;
      canvas.height = 90;
      const prevTime = v.currentTime;
      const prevPaused = v.paused;
      v.pause();
      for (let i = 0; i < frameCount; i++) {
        const seekTime = dur / frameCount * i;
        v.currentTime = seekTime;
        await new Promise(resolve => {
          const onSeeked = () => {
            v.removeEventListener('seeked', onSeeked);
            resolve(undefined);
          };
          v.addEventListener('seeked', onSeeked);
          // Safety timeout — don't hang if seeked never fires; also clean up listener
          setTimeout(() => {
            v.removeEventListener('seeked', onSeeked);
            resolve(undefined);
          }, 300);
        });
        try {
          ctx.drawImage(v, 0, 0, 60, 90);
          frames.push(canvas.toDataURL('image/jpeg', 0.4));
        } catch {
          frames.push(null);
        }
      }
      setTrimFrames(frames);
      // Restore playback position
      v.currentTime = prevTime;
      if (!prevPaused) v.play().catch(() => {});
    };
    if (v.readyState >= 2) captureFrames();else v.addEventListener('canplay', () => captureFrames(), {
      once: true
    });
  }, []);
  const addTextOverlay = useCallback(() => {
    if (!textDraft.trim() || textOverlays.length >= 3) return;
    setTextOverlays(prev => [...prev, {
      id: Date.now(),
      text: textDraft,
      font: selectedFont,
      color: selectedColor,
      size: textSize,
      style: textStyle,
      x: 50,
      y: 50
    }]);
    setTextDraft('');
    setShowTextInput(false);
  }, [textDraft, selectedFont, selectedColor, textSize, textStyle, textOverlays.length]);

  // Direct DOM drag for text overlays — no state during move
  const handleTextDragDOM = useCallback((el, e) => {
    const touch = e.touches?.[0] || e;
    const container = videoPreviewRef.current;
    if (!container || !el) return;
    const rect = container.getBoundingClientRect();
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
  const startMouseDrag = useCallback((id, el) => {
    el.style.willChange = 'left, top';
    dragRef.current = {
      id,
      el,
      lastX: 50,
      lastY: 50
    };
    const handleMove = e => {
      if (!dragRef.current?.el) return;
      handleTextDragDOM(dragRef.current.el, e);
    };
    const handleUp = () => {
      cancelAnimationFrame(rafRef.current);
      if (dragRef.current?.el) {
        dragRef.current.el.style.willChange = '';
        const {
          id: dId,
          lastX,
          lastY
        } = dragRef.current;
        setTextOverlays(prev => prev.map(t => t.id === dId ? {
          ...t,
          x: lastX,
          y: lastY
        } : t));
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [handleTextDragDOM]);
  const removeTextOverlay = useCallback(id => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
  }, []);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Product search with debounce
  useEffect(() => {
    if (!showProductSearch || !productQuery.trim()) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/products?search=${encodeURIComponent(productQuery)}&limit=10`);
        setProductResults(Array.isArray(res) ? res : res?.products || []);
      } catch {
        setProductResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [productQuery, showProductSearch]);

  /* ── draft: check on mount ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('reel_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      const age = Date.now() - (draft.savedAt || 0);
      if (age < 24 * 60 * 60 * 1000 && (draft.caption || draft.textOverlays?.length)) {
        setDraftBanner(true);
      }
    } catch {/* ignore */}
  }, []);

  /* ── draft: auto-save on caption / filter / overlay changes ── */
  useEffect(() => {
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      try {
        if (caption || activeFilter !== 'none' || textOverlays.length) {
          localStorage.setItem('reel_draft', JSON.stringify({
            caption,
            activeFilter,
            speed,
            textOverlays,
            privacy: audience,
            savedAt: Date.now()
          }));
          trackEvent('create_draft_saved', { type: 'reel' });
        }
      } catch {/* quota exceeded or private mode */}
    }, 500);
    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [caption, activeFilter, textOverlays, speed, audience]);
  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPublishing(false);
    setUploadProgress(0);
    setPublishError(false);
    toast('Subida cancelada');
  }, []);
  const handlePublish = useCallback(async () => {
    if (!videoFile) {
      toast.error(i18n.t('create_reel.noHayVideoSeleccionado', 'No hay vídeo seleccionado'));
      return;
    }
    if (trimStart > 0 && trimEnd > 0 && trimStart >= trimEnd) {
      toast.error(i18n.t('create_reel.elPuntoDeInicioDelRecorteNoPuede', 'El punto de inicio del recorte no puede ser mayor o igual al de fin.'));
      return;
    }
    // Clear draft
    try { localStorage.removeItem('reel_draft'); } catch {/* ignore */}

    trackEvent('create_published', { type: 'reel', has_products: taggedProducts.length > 0, has_location: !!location.trim() });

    // Build publish data for the upload queue
    const publishPayload: Record<string, any> = {
      contentType: 'reel',
      caption,
      files: [videoFile],
      products: taggedProducts,
      location: location.trim(),
      playback_rate: String(speed),
      muted: String(isMuted),
      audience,
    };
    if (activeFilter !== 'none') publishPayload.filter = activeFilter;
    if (trimStart > 0) publishPayload.trim_start_seconds = String(trimStart.toFixed(2));
    if (trimEnd > 0 && trimEnd <= duration) publishPayload.trim_end_seconds = String(trimEnd.toFixed(2));
    if (thumbnailIndex > 0 && duration > 0) publishPayload.cover_frame_seconds = String(duration / 5 * thumbnailIndex);
    if (textOverlays.length > 0) publishPayload.text_overlays_json = JSON.stringify(textOverlays);
    if (coverFromGallery) publishPayload.cover_image = coverFromGallery;

    enqueueAndProcess(publishPayload);

    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    setPublishSuccess(true);
    setTimeout(() => navigate('/'), 600);
  }, [videoFile, caption, activeFilter, speed, textOverlays, thumbnailIndex, navigate, location, audience, isMuted, trimStart, trimEnd, duration, taggedProducts, coverFromGallery]);

  // ─── SCREEN 1: UPLOAD ─────────────────────────────────────────
  if (screen === 'upload') {
    return <div className="fixed inset-0 z-50 bg-black flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:max-w-[480px] lg:mx-auto">
        {/* TopBar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => { if (videoFile) trackEvent('create_abandoned', { type: 'reel', step: screen }); navigate(-1); }} className="bg-transparent border-none cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cerrar">
            <X className="text-white w-[22px] h-[22px]" />
          </button>
          <span className="text-white text-[15px] font-medium">Nuevo Reel</span>
          <div className="w-[30px]" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center px-4 pb-4 pt-2">
          {['subir', 'grabar'].map(tab => <button key={tab} onClick={() => setUploadTab(tab)} className={`border-none rounded-full px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors min-h-[44px] ${uploadTab === tab ? 'bg-white text-black' : 'bg-transparent text-white/60'}`}>
              {tab === 'subir' ? 'Subir' : 'Grabar'}
            </button>)}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <Video size={48} className="text-white/30" />
          <span className="text-base text-white font-medium">
            {uploadTab === 'subir' ? i18n.t('create_reel.seleccionaUnVideo', 'Selecciona un vídeo') : 'Graba un vídeo'}
          </span>
          <span className="text-xs text-white/50">
            Máximo 60 segundos · MP4 o MOV
          </span>
          <button onClick={() => uploadTab === 'subir' ? fileInputRef.current?.click() : cameraInputRef.current?.click()} className="bg-white text-black border-none text-sm font-semibold py-3 px-6 rounded-full cursor-pointer mt-2 transition-all hover:bg-white/90 active:scale-95 min-h-[44px]" aria-label={uploadTab === 'subir' ? i18n.t('create_reel.elegirVideoDeLaGaleria', 'Elegir video de la galería') : 'Abrir cámara para grabar'}>
            {uploadTab === 'subir' ? i18n.t('create_reel.elegirDeLaGaleria', 'Elegir de la galería') : 'Abrir cámara'}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
        <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      </div>;
  }

  // ─── SCREEN 2: EDIT ───────────────────────────────────────────
  if (screen === 'edit') {
    return <div className="fixed inset-0 z-50 bg-black flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* TopBar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => {
          videoRef.current?.pause();
          setScreen('upload');
          setVideoFile(null);
          setVideoUrl(null);
          setSpeed(1);
          setActiveFilter('none');
          setTextOverlays([]);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          setTrimStart(0);
          setTrimEnd(0);
          setIsMuted(true);
          setVolume(100);
        }} className="bg-transparent border-none cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Volver">
            <X className="text-white w-[22px] h-[22px]" />
          </button>
          <span className="text-white text-[15px] font-medium">Editar Reel</span>
          <button onClick={() => {
          videoRef.current?.pause();
          setIsPlaying(false);
          setScreen('details');
        }} className="bg-transparent border-none text-white text-sm font-semibold cursor-pointer min-h-[44px] px-2">
            Siguiente →
          </button>
        </div>

        {/* Video preview */}
        <div ref={videoPreviewRef} className="relative aspect-[9/16] max-h-[55vh] bg-black mx-auto w-auto overflow-hidden rounded-2xl" onClick={togglePlay} role="button" tabIndex={0} aria-label={isPlaying ? i18n.t('create_reel.pausarVideo', 'Pausar vídeo') : 'Reproducir vídeo'} onKeyDown={e => {
        if (e.key === ' ') {
          e.preventDefault();
          togglePlay();
        }
      }}>
          <video ref={videoRef} src={videoUrl} loop playsInline muted={isMuted} preload="metadata" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} className="w-full h-full object-cover" style={{
          filter: activeFilter === 'none' ? 'none' : activeFilter,
          transition: 'filter 0.2s'
        }} />

          {/* Mute toggle — bottom-left like Instagram */}
          <button onClick={e => {
          e.stopPropagation();
          setIsMuted(m => !m);
        }} className="absolute bottom-3 left-3 z-10 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm border-none cursor-pointer flex items-center justify-center" aria-label={isMuted ? 'Activar audio' : 'Silenciar audio'}>
            {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
          </button>

          {/* Text overlays */}
          {textOverlays.map(t => <div key={t.id} className="absolute font-bold select-none cursor-grab whitespace-nowrap group touch-none" style={{
          left: `${t.x}%`,
          top: `${t.y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: t.size,
          color: t.style === 'outline' ? 'transparent' : t.color,
          fontFamily: t.font === 'Serif' ? 'Georgia, serif' : t.font === 'Mono' ? 'monospace' : t.font === 'Display' ? 'Impact, sans-serif' : 'inherit',
          textShadow: t.style === 'box' ? 'none' : '0 1px 4px rgba(0,0,0,0.6)',
          ...(t.style === 'box' ? {
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 10px',
            borderRadius: 6
          } : {}),
          ...(t.style === 'outline' ? {
            WebkitTextStroke: `2px ${t.color}`,
            textShadow: 'none'
          } : {})
        }} onTouchStart={e => {
          e.stopPropagation();
          dragRef.current = {
            id: t.id,
            el: e.currentTarget,
            lastX: t.x,
            lastY: t.y
          };
          e.currentTarget.style.willChange = 'left, top';
        }} onTouchMove={e => handleTextDragDOM(e.currentTarget, e)} onTouchEnd={() => {
          if (dragRef.current) {
            const {
              id: dId,
              lastX,
              lastY,
              el
            } = dragRef.current;
            if (el) el.style.willChange = '';
            setTextOverlays(prev => prev.map(tt => tt.id === dId ? {
              ...tt,
              x: lastX,
              y: lastY
            } : tt));
            dragRef.current = null;
          }
        }} onMouseDown={e => {
          e.stopPropagation();
          startMouseDrag(t.id, e.currentTarget);
        }}>
              {t.text}
              <button className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer" onClick={e => {
            e.stopPropagation();
            removeTextOverlay(t.id);
          }} aria-label={`Eliminar texto "${t.text}"`}>
                ×
              </button>
            </div>)}

          {/* Play/Pause icon */}
          {showPlayIcon && <div className="absolute inset-0 flex items-center justify-center pointer-events-none motion-reduce:hidden">
              <div className="bg-black/50 rounded-full p-4">
                {isPlaying ? <Pause className="text-white w-8 h-8" /> : <Play className="text-white w-8 h-8" />}
              </div>
            </div>}
        </div>

        {/* Trim bar with real frame thumbnails */}
        <div className="px-4 py-2">
          <div className="h-14 rounded-2xl relative flex items-center overflow-hidden bg-white/[0.06]" onMouseDown={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const t = ratio * duration;
          if (videoRef.current) videoRef.current.currentTime = Math.max(trimStart, Math.min(trimEnd || duration, t));
        }}>
            {/* Frame thumbnails strip */}
            <div className="absolute inset-0 flex">
              {trimFrames.length > 0 ? trimFrames.map((frame, i) => <div key={i} className="flex-1 h-full overflow-hidden">
                  {frame ? <img src={frame} alt={`Fotograma ${i + 1}`} className="w-full h-full object-cover opacity-60" draggable={false} /> : <div className="w-full h-full bg-stone-800" />}
                </div>) : Array.from({
              length: 9
            }).map((_, i) => <div key={i} className="flex-1 h-full bg-stone-800 animate-pulse" />)}
            </div>

            {/* Dimmed regions outside trim */}
            <div className="absolute top-0 bottom-0 left-0 bg-black/60 z-[1]" style={{
            width: duration > 0 ? `${trimStart / duration * 100}%` : '0%'
          }} />
            <div className="absolute top-0 bottom-0 right-0 bg-black/60 z-[1]" style={{
            width: duration > 0 ? `${(1 - (trimEnd || duration) / duration) * 100}%` : '0%'
          }} />

            {/* Selected region border */}
            <div className="absolute top-0 bottom-0 border-2 border-white/90 rounded-2xl z-[2]" style={{
            left: duration > 0 ? `${trimStart / duration * 100}%` : '0%',
            right: duration > 0 ? `${(1 - (trimEnd || duration) / duration) * 100}%` : '0%'
          }} />

            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm shadow-black/50 z-[3]" style={{
            left: duration > 0 ? `${currentTime / duration * 100}%` : '0%'
          }} />
            {/* Left handle */}
            <div className="absolute top-0 bottom-0 w-4 bg-white rounded-l-xl cursor-ew-resize z-[3] flex items-center justify-center touch-none" style={{
            left: duration > 0 ? `calc(${trimStart / duration * 100}% - 8px)` : '0px'
          }} onMouseDown={e => {
            e.stopPropagation();
            const barRect = e.currentTarget.parentElement.getBoundingClientRect();
            const onMove = ev => {
              const ratio = Math.max(0, Math.min(1, (ev.clientX - barRect.left) / barRect.width));
              const t = ratio * duration;
              setTrimStart(Math.min(t, (trimEnd || duration) - 1));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }} onTouchStart={e => {
            e.stopPropagation();
            const barRect = e.currentTarget.parentElement.getBoundingClientRect();
            const onMove = ev => {
              const ratio = Math.max(0, Math.min(1, (ev.touches[0].clientX - barRect.left) / barRect.width));
              setTrimStart(Math.min(ratio * duration, (trimEnd || duration) - 1));
            };
            const onEnd = () => {
              document.removeEventListener('touchmove', onMove);
              document.removeEventListener('touchend', onEnd);
            };
            document.addEventListener('touchmove', onMove, {
              passive: true
            });
            document.addEventListener('touchend', onEnd);
          }}>
              <div className="w-1 h-4 bg-stone-950 rounded-full" />
            </div>
            {/* Right handle */}
            <div className="absolute top-0 bottom-0 w-4 bg-white rounded-r-xl cursor-ew-resize z-[3] flex items-center justify-center touch-none" style={{
            left: duration > 0 ? `calc(${(trimEnd || duration) / duration * 100}% - 8px)` : 'calc(100% - 8px)'
          }} onMouseDown={e => {
            e.stopPropagation();
            const barRect = e.currentTarget.parentElement.getBoundingClientRect();
            const onMove = ev => {
              const ratio = Math.max(0, Math.min(1, (ev.clientX - barRect.left) / barRect.width));
              const t = ratio * duration;
              setTrimEnd(Math.max(t, trimStart + 1));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }} onTouchStart={e => {
            e.stopPropagation();
            const barRect = e.currentTarget.parentElement.getBoundingClientRect();
            const onMove = ev => {
              const ratio = Math.max(0, Math.min(1, (ev.touches[0].clientX - barRect.left) / barRect.width));
              setTrimEnd(Math.max(ratio * duration, trimStart + 1));
            };
            const onEnd = () => {
              document.removeEventListener('touchmove', onMove);
              document.removeEventListener('touchend', onEnd);
            };
            document.addEventListener('touchmove', onMove, {
              passive: true
            });
            document.addEventListener('touchend', onEnd);
          }}>
              <div className="w-1 h-4 bg-stone-950 rounded-full" />
            </div>
          </div>
          <div className="flex justify-between text-white/50 text-xs mt-1 tabular-nums">
            <span>{fmt(trimStart)}</span>
            <span>{fmt(currentTime)}</span>
            <span>{fmt(trimEnd || duration)}</span>
          </div>
        </div>

        {/* Tool tabs */}
        <div className="flex overflow-x-auto px-4 py-2 border-b border-white/10">
          {['velocidad', 'audio', 'texto', 'filtros'].map(tab => <button key={tab} onClick={() => setEditTab(tab)} className={`bg-transparent border-none text-[13px] py-2 px-4 cursor-pointer whitespace-nowrap transition-colors border-b-2 ${editTab === tab ? 'text-white font-semibold border-white' : 'text-white/40 font-normal border-transparent'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>)}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {/* VELOCIDAD */}
          {editTab === 'velocidad' && <div className="flex gap-2 justify-center flex-wrap">
              {SPEED_OPTIONS.map(s => <button key={s} onClick={() => {
            setSpeed(s);
            if (navigator.vibrate) navigator.vibrate(10);
          }} className={`rounded-full px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors min-h-[44px] ${speed === s ? 'bg-white text-black border border-white' : 'bg-stone-900 text-white border border-stone-700'}`} aria-label={`Velocidad ${s}x`} aria-pressed={speed === s}>
                  {s}x{speed === s ? ' ✓' : ''}
                </button>)}
            </div>}

          {/* AUDIO */}
          {editTab === 'audio' && <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">Audio original</span>
                <button onClick={() => {
              setIsMuted(m => !m);
            }} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold cursor-pointer transition-colors ${isMuted ? 'bg-white/10 text-white/60 border border-white/20' : 'bg-white text-black border border-white'}`}>
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {isMuted ? 'Silenciado' : 'Activo'}
                </button>
              </div>
              {!isMuted && <div className="flex items-center gap-3">
                  <VolumeX size={14} className="text-white/40 shrink-0" />
                  <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} className="flex-1 accent-white" aria-label="Volumen del audio original" />
                  <Volume2 size={14} className="text-white/40 shrink-0" />
                  <span className="text-xs text-white/60 min-w-[32px] text-right tabular-nums">{volume}%</span>
                </div>}
              <p className="text-xs text-white/30">
                Controla el volumen del audio original del vídeo.
              </p>
            </div>}

          {/* TEXTO */}
          {editTab === 'texto' && <div className="flex flex-col gap-3">
              {!showTextInput ? <button onClick={() => setShowTextInput(true)} disabled={textOverlays.length >= 3} className={`bg-white/10 text-white border border-dashed border-white/30 rounded-2xl py-3.5 text-sm cursor-pointer ${textOverlays.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`} aria-label={i18n.t('create_reel.anadirTextoAlVideo', 'Añadir texto al vídeo')}>
                  + Añadir texto {textOverlays.length > 0 && `(${textOverlays.length}/3)`}
                </button> : <div className="flex flex-col gap-2.5">
                  <input value={textDraft} onChange={e => setTextDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTextOverlay()} placeholder={i18n.t('create_reel.escribeAqui', 'Escribe aquí...')} className="bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/40" autoFocus aria-label={i18n.t('create_reel.textoParaElOverlay', 'Texto para el overlay')} />
                  {/* Fonts */}
                  <div className="flex gap-1.5">
                    {FONTS.map(f => <button key={f} onClick={() => setSelectedFont(f)} className={`rounded-full px-3 py-2.5 text-xs font-medium cursor-pointer min-h-[44px] ${selectedFont === f ? 'bg-white text-black' : 'bg-white/10 text-white'}`} aria-label={`Fuente ${f}`} aria-pressed={selectedFont === f}>
                        {f}
                      </button>)}
                  </div>
                  {/* Colors */}
                  <div className="flex gap-2 items-center">
                    {TEXT_COLORS.map(c => <button key={c} onClick={() => setSelectedColor(c)} className={`w-11 h-11 rounded-full cursor-pointer p-0 shrink-0 ${selectedColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border-2 border-white/30'}`} style={{
                background: c
              }} aria-label={`Color ${c}`} aria-pressed={selectedColor === c} />)}
                  </div>
                  {/* Text style selector */}
                  <div className="flex gap-1.5">
                    {[{
                key: 'clean',
                label: 'Limpio',
                preview: 'text-white'
              }, {
                key: 'box',
                label: 'Caja',
                preview: 'text-white bg-black/75 px-1.5 rounded'
              }, {
                key: 'outline',
                label: 'Contorno',
                preview: 'text-transparent'
              }].map(s => <button key={s.key} onClick={() => setTextStyle(s.key)} className={`flex-1 rounded-2xl py-2 text-xs font-semibold cursor-pointer transition-colors ${textStyle === s.key ? 'bg-white text-black' : 'bg-white/10 text-white'}`} aria-pressed={textStyle === s.key}>
                        <span className={s.key === 'outline' ? 'font-bold' : ''} style={s.key === 'outline' ? {
                  WebkitTextStroke: '1px white',
                  color: 'transparent'
                } : {}}>
                          {s.label}
                        </span>
                      </button>)}
                  </div>
                  {/* Size slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-[11px]">A</span>
                    <input type="range" min={14} max={48} value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="flex-1 accent-white" aria-label={i18n.t('create_reel.tamanoDeTexto', 'Tamaño de texto')} />
                    <span className="text-white text-sm font-semibold">A</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowTextInput(false)} className="flex-1 bg-white/10 text-white border-none rounded-2xl py-3 text-[13px] cursor-pointer min-h-[44px]">
                      Cancelar
                    </button>
                    <button onClick={addTextOverlay} className="flex-1 bg-white text-black border-none rounded-2xl py-3 text-[13px] font-semibold cursor-pointer min-h-[44px]">
                      Confirmar
                    </button>
                  </div>
                </div>}
            </div>}

          {/* FILTROS — real frame previews */}
          {editTab === 'filtros' && <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {FILTERS.map(f => {
            const isActive = activeFilter === f.value;
            return <button key={f.name} onClick={() => {
              setActiveFilter(f.value);
              if (f.name !== 'Natural') trackEvent('create_filter_applied', { filter_name: f.name });
              if (navigator.vibrate) navigator.vibrate(10);
            }} className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start bg-transparent border-none cursor-pointer p-0" aria-label={`Filtro ${f.name}`} aria-pressed={isActive}>
                    <div className={`w-16 h-20 rounded-2xl overflow-hidden transition-all duration-150 ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105' : 'opacity-70 hover:opacity-100'}`}>
                      {filterThumb ? <img src={filterThumb} alt={f.name} className="w-full h-full object-cover" style={{
                  filter: f.value === 'none' ? 'none' : f.value
                }} draggable={false} /> : <div className="w-full h-full bg-stone-700" style={{
                  filter: f.value === 'none' ? 'none' : f.value
                }} />}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/50'}`}>
                      {f.name}
                    </span>
                  </button>;
          })}
            </div>}
        </div>
      </div>;
  }

  // ─── SCREEN 3: DETAILS ────────────────────────────────────────
  return <div className="fixed inset-0 z-50 bg-white flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:max-w-[480px] lg:mx-auto">
      {/* TopBar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <button onClick={() => setScreen('edit')} className="bg-transparent border-none cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Volver al editor">
          <ChevronLeft className="text-stone-950 w-[22px] h-[22px]" />
        </button>
        <span className="text-stone-950 text-[15px] font-semibold">
          Detalles del Reel
        </span>
        <div className="w-[30px]" />
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-5">
        {/* draft banner */}
        {draftBanner && <div className="flex items-center justify-between gap-2 bg-stone-100 rounded-2xl p-3 mx-0">
            <span className="text-[13px] text-stone-950 font-medium">
              Tienes un borrador de reel
            </span>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => {
            try {
              const raw = localStorage.getItem('reel_draft');
              if (raw) {
                const draft = JSON.parse(raw);
                if (draft.caption) setCaption(draft.caption);
                if (draft.activeFilter) setActiveFilter(draft.activeFilter);
                if (draft.speed) setSpeed(draft.speed);
                if (draft.textOverlays?.length) setTextOverlays(draft.textOverlays);
                if (draft.privacy) setAudience(draft.privacy);
              }
            } catch {/* ignore */}
            setDraftBanner(false);
          }} className="text-[13px] font-semibold text-stone-950 bg-transparent border-none cursor-pointer p-0">
                Restaurar
              </button>
              <button type="button" onClick={() => {
            try {
              localStorage.removeItem('reel_draft');
            } catch {/* ignore */}
            setDraftBanner(false);
          }} className="text-[13px] text-stone-500 bg-transparent border-none cursor-pointer p-0">
                Descartar
              </button>
            </div>
          </div>}

        {/* Caption with hashtag/mention highlighting */}
        <div className="relative">
          {/* Highlight backdrop */}
          <div aria-hidden="true" className="absolute top-0 left-0 right-0 px-3.5 py-3 text-sm font-sans leading-relaxed whitespace-pre-wrap break-words text-transparent pointer-events-none box-border border border-transparent">
            {caption.split(/(#\w+|@\w+)/g).map((part, i) => part.startsWith('#') ? <span key={i} className="text-stone-950 font-semibold">{part}</span> : part.startsWith('@') ? <span key={i} className="text-stone-600 font-semibold">{part}</span> : <span key={i}>{part}</span>)}
          </div>
          <textarea value={caption} onChange={e => {
          if (e.target.value.length <= 500) setCaption(e.target.value);
        }} placeholder="Describe tu reel..." rows={4} maxLength={500} className="w-full bg-transparent text-stone-950 border border-stone-200 rounded-2xl px-3.5 py-3 text-sm font-sans resize-none outline-none focus:border-stone-400 transition-colors box-border relative caret-stone-950" aria-label={i18n.t('create_reel.descripcionDelReel', 'Descripción del reel')} />
          <div className={`text-right text-xs mt-1 ${caption.length > 450 ? 'text-stone-950 font-semibold' : 'text-stone-400'}`}>
            {caption.length}/500
          </div>
        </div>

        {/* Product tagging */}
        <div>
          <button onClick={() => setShowProductSearch(true)} className="w-full bg-stone-50 text-stone-950 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-[13px] text-left cursor-pointer">
            🏷️ Etiquetar producto
          </button>
          {taggedProducts.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
              {taggedProducts.map(p => <span key={p.id} className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-1 text-xs flex items-center gap-1">
                  {p.name}
                  <button onClick={() => setTaggedProducts(prev => prev.filter(x => x.id !== p.id))} className="bg-transparent border-none cursor-pointer p-0" aria-label={`Quitar ${p.name}`}>
                    <X size={12} className="text-stone-400" />
                  </button>
                </span>)}
            </div>}
        </div>

        {/* Thumbnail selector + cover from gallery */}
        <div>
          <label className="text-[13px] font-semibold text-stone-950 mb-2 block">
            Portada
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {[0, 1, 2, 3, 4].map(i => <button key={i} onClick={() => setThumbnailIndex(i)} className={`w-14 h-20 rounded-2xl bg-stone-100 shrink-0 flex items-end justify-center p-1 overflow-hidden relative border-2 cursor-pointer ${thumbnailIndex === i ? 'border-stone-950' : 'border-stone-200'}`} aria-label={`Portada ${i + 1}`} aria-pressed={thumbnailIndex === i}>
                <span className="text-[10px] text-stone-950/60">
                  {duration > 0 ? fmt(duration / 5 * i) : `0:${String(i * 12).padStart(2, '0')}`}
                </span>
              </button>)}
            {/* Cover from gallery */}
            <button onClick={() => coverInputRef.current?.click()} className={`w-14 h-20 rounded-2xl bg-stone-100 shrink-0 flex flex-col items-center justify-center p-1 overflow-hidden border-2 cursor-pointer ${coverFromGallery ? 'border-stone-950' : 'border-dashed border-stone-200'}`} aria-label={i18n.t('create_reel.portadaDesdeGaleria', 'Portada desde galería')}>
              {coverFromGallery ? <img src={coverUrl} alt="Portada del reel" className="w-full h-full object-cover rounded-xl" /> : <>
                  <span className="text-stone-400 text-lg">+</span>
                  <span className="text-[8px] text-stone-400">{i18n.t('store.gallery', 'Galería')}</span>
                </>}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={e => {
            const f = e.target.files?.[0];
            if (f) setCoverFromGallery(f);
            e.target.value = '';
          }} className="hidden" />
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2.5">
          <MapPin size={16} className="text-stone-400 shrink-0" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder={i18n.t('create_reel.anadirUbicacion', 'Añadir ubicación...')} aria-label={i18n.t('store.location', 'Ubicación')} className="flex-1 bg-transparent border-none outline-none text-[13px] font-sans text-stone-950 placeholder:text-stone-400" />
        </div>

        {/* Audience toggle */}
        <div className="flex gap-2">
          <button onClick={() => setAudience('public')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${audience === 'public' ? 'bg-stone-950 text-white border-2 border-stone-950' : 'bg-transparent text-stone-950 border-[1.5px] border-stone-200'}`}>
            <Globe size={14} /> Público
          </button>
          <button onClick={() => setAudience('followers')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${audience === 'followers' ? 'bg-stone-950 text-white border-2 border-stone-950' : 'bg-transparent text-stone-950 border-[1.5px] border-stone-200'}`}>
            <Lock size={14} /> Solo seguidores
          </button>
        </div>

        {/* Video preview small */}
        <div className="aspect-[9/16] max-h-[200px] bg-black rounded-2xl overflow-hidden self-center shadow-lg">
          <video ref={el => {
          if (el) el.playbackRate = speed;
        }} src={videoUrl || undefined} className="w-full h-full object-cover" style={{
          filter: activeFilter === 'none' ? 'none' : activeFilter,
          transition: 'filter 0.2s'
        }} autoPlay loop muted playsInline aria-hidden="true" />
        </div>
      </div>

      {/* Publish success overlay */}
      {publishSuccess && <div className="fixed inset-0 z-[70] bg-white flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.3s_ease]">
          <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <Check size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-stone-950">{i18n.t('create_reel.reelPublicado', '¡Reel publicado!')}</span>
        </div>}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      {/* Publish button */}
      <div className="px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-stone-200">
        {/* Upload progress bar */}
        {publishing && uploadProgress > 0 && uploadProgress < 100 && <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-stone-950 rounded-full transition-[width] duration-300 ease-out" style={{
          width: `${uploadProgress}%`
        }} />
          </div>}
        {/* Cancel upload button */}
        {publishing && <button onClick={handleCancelUpload} className="w-full flex items-center justify-center gap-1.5 bg-transparent border border-stone-200 rounded-full py-2.5 text-sm text-stone-500 font-medium cursor-pointer mb-2 hover:bg-stone-50 transition-colors" aria-label="Cancelar subida">
            <X size={14} />
            Cancelar subida
          </button>}
        {/* Retry button on error */}
        {publishError && !publishing && <button onClick={handlePublish} className="w-full bg-stone-950 text-white border-none rounded-full py-3.5 text-[15px] font-semibold cursor-pointer transition-colors hover:bg-stone-800 flex items-center justify-center gap-2 min-h-[48px] mb-2">
            Reintentar
          </button>}
        {!publishError && <button onClick={handlePublish} disabled={publishing} className={`w-full bg-stone-950 text-white border-none rounded-full py-3.5 text-[15px] font-semibold cursor-pointer transition-colors hover:bg-stone-800 flex items-center justify-center gap-2 min-h-[48px] ${publishing ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {publishing && <span className="inline-block w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {publishing ? uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Procesando...' : 'Publicar ahora'}
          </button>}
      </div>

      {/* Product search modal */}
      {showProductSearch && <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => {
      setShowProductSearch(false);
      setProductQuery('');
      setProductResults([]);
    }}>
          <div className="bg-white w-full max-h-[70vh] rounded-t-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 py-3 border-b border-stone-200 gap-2">
              <Search size={18} className="text-stone-400" />
              <input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Buscar producto..." aria-label="Buscar producto para etiquetar" autoFocus className="flex-1 border-none outline-none text-sm font-sans" />
              <button onClick={() => {
            setShowProductSearch(false);
            setProductQuery('');
            setProductResults([]);
          }} className="bg-transparent border-none cursor-pointer" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {productResults.map(p => {
            const pid = p.product_id || p.id || p._id;
            return <button key={pid} onClick={() => {
              if (taggedProducts.length < 5 && !taggedProducts.find(t => t.id === pid)) {
                setTaggedProducts(prev => [...prev, {
                  id: pid,
                  name: p.name || p.title
                }]);
                trackEvent('create_product_tagged', { product_id: pid });
              }
              setShowProductSearch(false);
              setProductQuery('');
              setProductResults([]);
            }} className="flex items-center gap-2.5 w-full px-2 py-2.5 bg-transparent border-none border-b border-stone-100 cursor-pointer text-left text-[13px] hover:bg-stone-50 transition-colors">
                  {(p.image || p.thumbnail || p.images?.[0]) && <img src={p.image || p.thumbnail || p.images?.[0]} alt={p.name || p.title || 'Producto'} className="w-9 h-9 rounded-xl object-cover" />}
                  <span>{p.name || p.title}</span>
                </button>;
          })}
              {productQuery && productResults.length === 0 && <p className="text-center text-stone-400 text-sm py-5">Sin resultados</p>}
            </div>
          </div>
        </div>}
    </div>;
}