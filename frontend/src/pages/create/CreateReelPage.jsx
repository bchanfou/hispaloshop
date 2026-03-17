import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Play, Pause, Volume2, VolumeX, MapPin, Globe, Lock } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const FILTERS = [
  { name: 'Natural', emoji: '✨', value: 'none' },
  { name: 'Amanecer', emoji: '🌅', value: 'sepia(0.25) saturate(1.3) brightness(1.08)' },
  { name: 'Lonja', emoji: '🌊', value: 'hue-rotate(10deg) saturate(1.15) brightness(1.05) contrast(1.05)' },
  { name: 'Huerta', emoji: '🌿', value: 'saturate(1.35) contrast(1.05) brightness(1.03)' },
  { name: 'Miel', emoji: '🍯', value: 'sepia(0.2) saturate(1.2) brightness(1.1)' },
  { name: 'Trufa', emoji: '🌑', value: 'contrast(1.25) brightness(0.88) saturate(1.1)' },
  { name: 'Mate', emoji: '🪨', value: 'saturate(0.75) brightness(1.1) contrast(0.95)' },
  { name: 'Antiguo', emoji: '📜', value: 'sepia(0.45) saturate(0.8) brightness(1.05)' },
];

const SPEED_OPTIONS = [0.3, 0.5, 1, 2, 3];

const FONTS = ['Sans', 'Serif', 'Mono', 'Display'];
const TEXT_COLORS = ['#ffffff', '#0c0a09', '#78716c', '#d6d3d1', '#a8a29e'];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function CreateReelPage() {
  const navigate = useNavigate();
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
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState('public');

  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const playIconTimer = useRef(null);
  const dragRef = useRef(null);

  // Revoke blob URL on unmount to free memory
  useEffect(() => {
    return () => {
      clearTimeout(playIconTimer.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      // Clean up any lingering document drag listeners
      dragRef.current = null;
    };
  }, [videoUrl]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('El vídeo es demasiado grande (máx. 100 MB)');
      e.target.value = '';
      return;
    }
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setVideoFile(file);
    setScreen('edit');
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

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const addTextOverlay = useCallback(() => {
    if (!textDraft.trim() || textOverlays.length >= 3) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: textDraft,
        font: selectedFont,
        color: selectedColor,
        size: textSize,
        x: 50,
        y: 50,
      },
    ]);
    setTextDraft('');
    setShowTextInput(false);
  }, [textDraft, selectedFont, selectedColor, textSize, textOverlays.length]);

  const handleTextDrag = useCallback((id, e) => {
    const touch = e.touches?.[0] || e;
    const container = videoPreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setTextOverlays((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : t
      )
    );
  }, []);

  const startMouseDrag = useCallback((id) => {
    dragRef.current = id;
    const handleMove = (e) => {
      if (dragRef.current !== id) return;
      const container = videoPreviewRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setTextOverlays((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : t
        )
      );
    };
    const handleUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

  const removeTextOverlay = useCallback((id) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!videoFile) return;
    setPublishing(true);
    try {
      const fd = new FormData();
      fd.append('type', 'reel');
      fd.append('media', videoFile);
      fd.append('caption', caption);
      if (location.trim()) fd.append('location', location.trim());
      fd.append('audience', audience);
      fd.append(
        'metadata',
        JSON.stringify({
          filter: activeFilter,
          speed,
          textOverlays,
          thumbnailIndex,
        })
      );
      await apiClient.post('/posts', fd);
      toast.success('Reel publicado');
      navigate('/');
    } catch (err) {
      toast.error('Error al publicar el reel');
    } finally {
      setPublishing(false);
    }
  }, [videoFile, caption, activeFilter, speed, textOverlays, thumbnailIndex, navigate]);

  // ─── SCREEN 1: UPLOAD ─────────────────────────────────────────
  if (screen === 'upload') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* TopBar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="bg-transparent border-none cursor-pointer p-1"
            aria-label="Cerrar"
          >
            <X className="text-white w-5.5 h-5.5" />
          </button>
          <span className="text-white text-[15px] font-medium">Nuevo Reel</span>
          <div className="w-[30px]" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center px-4 pb-4 pt-2">
          {['subir', 'grabar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setUploadTab(tab)}
              className={`border-none rounded-full px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors min-h-[44px] ${
                uploadTab === tab
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white'
              }`}
            >
              {tab === 'subir' ? 'Subir' : 'Grabar'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <span className="text-[48px]" role="img" aria-hidden="true">
            {uploadTab === 'subir' ? '🎬' : '🎥'}
          </span>
          <span className="text-base text-white font-medium">
            {uploadTab === 'subir' ? 'Selecciona un video' : 'Graba un video'}
          </span>
          <span className="text-xs text-white/50">
            Máximo 60 segundos · MP4 o MOV
          </span>
          <button
            onClick={() =>
              uploadTab === 'subir' ? fileInputRef.current?.click() : cameraInputRef.current?.click()
            }
            className="bg-white text-black border-none text-sm font-semibold py-3 px-6 rounded-full cursor-pointer mt-2 transition-colors hover:bg-stone-100 active:bg-stone-200"
            aria-label={uploadTab === 'subir' ? 'Elegir video de la galería' : 'Abrir cámara para grabar'}
          >
            {uploadTab === 'subir' ? 'Elegir de la galería' : 'Abrir cámara'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // ─── SCREEN 2: EDIT ───────────────────────────────────────────
  if (screen === 'edit') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* TopBar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => {
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
            }}
            className="bg-transparent border-none cursor-pointer p-1"
            aria-label="Volver"
          >
            <X className="text-white w-5.5 h-5.5" />
          </button>
          <span className="text-white text-[15px] font-medium">Editar Reel</span>
          <button
            onClick={() => { videoRef.current?.pause(); setIsPlaying(false); setScreen('details'); }}
            className="bg-transparent border-none text-white text-sm font-semibold cursor-pointer"
          >
            Siguiente →
          </button>
        </div>

        {/* Video preview */}
        <div
          ref={videoPreviewRef}
          className="relative aspect-[9/16] max-h-[55vh] bg-black mx-auto w-auto overflow-hidden rounded-xl"
          onClick={togglePlay}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? 'Pausar vídeo' : 'Reproducir vídeo'}
          onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); togglePlay(); } }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            playsInline
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-cover"
            style={{
              filter: activeFilter === 'none' ? 'none' : activeFilter,
            }}
          />

          {/* Mute toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted((m) => !m); }}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 border-none cursor-pointer flex items-center justify-center"
            aria-label={isMuted ? 'Activar audio' : 'Silenciar audio'}
          >
            {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
          </button>

          {/* Text overlays */}
          {textOverlays.map((t) => (
            <div
              key={t.id}
              className="absolute font-bold select-none cursor-grab whitespace-nowrap group"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: t.size,
                color: t.color,
                fontFamily:
                  t.font === 'Serif'
                    ? 'Georgia, serif'
                    : t.font === 'Mono'
                    ? 'monospace'
                    : t.font === 'Display'
                    ? 'Impact, sans-serif'
                    : 'var(--font-sans)',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              }}
              onTouchMove={(e) => handleTextDrag(t.id, e)}
              onMouseDown={(e) => { e.stopPropagation(); startMouseDrag(t.id); }}
            >
              {t.text}
              <button
                className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                onClick={(e) => { e.stopPropagation(); removeTextOverlay(t.id); }}
                aria-label={`Eliminar texto "${t.text}"`}
              >
                ×
              </button>
            </div>
          ))}

          {/* Play/Pause icon */}
          {showPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none motion-reduce:hidden">
              <div className="bg-black/50 rounded-full p-4">
                {isPlaying ? (
                  <Pause className="text-white w-8 h-8" />
                ) : (
                  <Play className="text-white w-8 h-8" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Trim bar */}
        <div className="px-4 py-2">
          <div className="h-8 bg-white/10 rounded-lg relative flex items-center overflow-hidden">
            {/* Progress */}
            <div
              className="absolute left-0 top-0 bottom-0 w-full bg-white/15 origin-left"
              style={{ transform: `scaleX(${duration > 0 ? currentTime / duration : 0})` }}
            />
            {/* Left handle */}
            <div className="w-3 h-full bg-white rounded-l cursor-ew-resize shrink-0" />
            <div className="flex-1" />
            {/* Right handle */}
            <div className="w-3 h-full bg-white rounded-r cursor-ew-resize shrink-0" />
          </div>
          <div className="text-center text-white/50 text-xs mt-1">
            {fmt(currentTime)} / {fmt(duration)}
          </div>
        </div>

        {/* Tool tabs */}
        <div className="flex overflow-x-auto px-4 py-2 border-b border-white/10">
          {['velocidad', 'texto', 'filtros'].map((tab) => (
            <button
              key={tab}
              onClick={() => setEditTab(tab)}
              className={`bg-transparent border-none text-[13px] py-2 px-4 cursor-pointer whitespace-nowrap transition-colors border-b-2 ${
                editTab === tab
                  ? 'text-white font-semibold border-white'
                  : 'text-white/40 font-normal border-transparent'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {/* VELOCIDAD */}
          {editTab === 'velocidad' && (
            <div className="flex gap-2 justify-center flex-wrap">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-full px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors ${
                    speed === s
                      ? 'bg-white text-black border border-white'
                      : 'bg-stone-900 text-white border border-stone-700'
                  }`}
                  aria-label={`Velocidad ${s}x`}
                  aria-pressed={speed === s}
                >
                  {s}x{speed === s ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}

          {/* TEXTO */}
          {editTab === 'texto' && (
            <div className="flex flex-col gap-3">
              {!showTextInput ? (
                <button
                  onClick={() => setShowTextInput(true)}
                  disabled={textOverlays.length >= 3}
                  className={`bg-white/10 text-white border border-dashed border-white/30 rounded-xl py-3.5 text-sm cursor-pointer ${
                    textOverlays.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  aria-label="Añadir texto al vídeo"
                >
                  + Añadir texto {textOverlays.length > 0 && `(${textOverlays.length}/3)`}
                </button>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <input
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTextOverlay()}
                    placeholder="Escribe aquí..."
                    className="bg-white/10 text-white border border-white/20 rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-white/40"
                    autoFocus
                    aria-label="Texto para el overlay"
                  />
                  {/* Fonts */}
                  <div className="flex gap-1.5">
                    {FONTS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFont(f)}
                        className={`rounded-full px-3 py-2.5 text-xs font-medium cursor-pointer min-h-[44px] ${
                          selectedFont === f
                            ? 'bg-white text-black'
                            : 'bg-white/10 text-white'
                        }`}
                        aria-label={`Fuente ${f}`}
                        aria-pressed={selectedFont === f}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {/* Colors */}
                  <div className="flex gap-2 items-center">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`w-11 h-11 rounded-full cursor-pointer p-0 shrink-0 ${
                          selectedColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border-2 border-white/30'
                        }`}
                        style={{ background: c }}
                        aria-label={`Color ${c}`}
                        aria-pressed={selectedColor === c}
                      />
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
                      className="flex-1 accent-stone-50"
                      aria-label="Tamaño de texto"
                    />
                    <span className="text-white text-sm font-semibold">A</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTextInput(false)}
                      className="flex-1 bg-white/10 text-white border-none rounded-xl py-3 text-[13px] cursor-pointer min-h-[44px]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addTextOverlay}
                      className="flex-1 bg-white text-black border-none rounded-xl py-3 text-[13px] font-semibold cursor-pointer min-h-[44px]"
                    >
                      ✓ Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FILTROS */}
          {editTab === 'filtros' && (
            <div className="grid grid-cols-4 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFilter(f.value)}
                  className={`bg-white/[0.08] rounded-xl py-2.5 px-1 cursor-pointer flex flex-col items-center gap-1 border-2 ${
                    activeFilter === f.value ? 'border-white' : 'border-transparent'
                  }`}
                  aria-label={`Filtro ${f.name}`}
                  aria-pressed={activeFilter === f.value}
                >
                  <div
                    className="w-10 h-10 rounded-lg bg-stone-600"
                    style={{ filter: f.value === 'none' ? 'none' : f.value }}
                  />
                  <span className="text-[10px] text-white font-medium">{f.emoji} {f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── SCREEN 3: DETAILS ────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* TopBar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <button
          onClick={() => setScreen('edit')}
          className="bg-transparent border-none cursor-pointer p-1"
          aria-label="Volver al editor"
        >
          <ChevronLeft className="text-stone-950 w-5.5 h-5.5" />
        </button>
        <span className="text-stone-950 text-[15px] font-semibold">
          Detalles del Reel
        </span>
        <div className="w-[30px]" />
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-5">
        {/* Caption */}
        <div>
          <textarea
            value={caption}
            onChange={(e) => { if (e.target.value.length <= 2200) setCaption(e.target.value); }}
            placeholder="Describe tu reel..."
            rows={4}
            maxLength={2200}
            className="w-full bg-stone-50 text-stone-950 border border-stone-200 rounded-xl px-3.5 py-3 text-sm font-sans resize-none outline-none focus:border-stone-400 transition-colors box-border"
            aria-label="Descripción del reel"
          />
          <div className={`text-right text-xs mt-1 ${caption.length > 2000 ? 'text-stone-950' : 'text-stone-400'}`}>
            {caption.length}/2200
          </div>
        </div>

        {/* Thumbnail selector */}
        <div>
          <label className="text-[13px] font-semibold text-stone-950 mb-2 block">
            Portada
          </label>
          <div className="flex gap-2 overflow-x-auto">
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                key={i}
                onClick={() => setThumbnailIndex(i)}
                className={`w-14 h-20 rounded-xl bg-stone-100 shrink-0 flex items-end justify-center p-1 overflow-hidden relative border-2 cursor-pointer ${
                  thumbnailIndex === i ? 'border-stone-950' : 'border-stone-200'
                }`}
                aria-label={`Portada ${i + 1}`}
                aria-pressed={thumbnailIndex === i}
              >
                <span className="text-[10px] text-stone-950/60">
                  {duration > 0 ? fmt((duration / 5) * i) : `0:${String(i * 12).padStart(2, '0')}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
          <MapPin size={16} className="text-stone-400 shrink-0" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Añadir ubicación..."
            aria-label="Ubicación"
            className="flex-1 bg-transparent border-none outline-none text-[13px] font-sans text-stone-950 placeholder:text-stone-400"
          />
        </div>

        {/* Audience toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setAudience('public')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${
              audience === 'public'
                ? 'bg-stone-950 text-white border-2 border-stone-950'
                : 'bg-transparent text-stone-950 border-[1.5px] border-stone-200'
            }`}
          >
            <Globe size={14} /> Público
          </button>
          <button
            onClick={() => setAudience('followers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${
              audience === 'followers'
                ? 'bg-stone-950 text-white border-2 border-stone-950'
                : 'bg-transparent text-stone-950 border-[1.5px] border-stone-200'
            }`}
          >
            <Lock size={14} /> Solo seguidores
          </button>
        </div>

        {/* Video preview small */}
        <div className="aspect-[9/16] max-h-[200px] bg-black rounded-xl overflow-hidden self-center">
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            style={{
              filter: activeFilter === 'none' ? 'none' : activeFilter,
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Publish button */}
      <div className="px-4 pt-3 pb-6 border-t border-stone-200">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className={`w-full bg-stone-950 text-white border-none rounded-full py-3.5 text-[15px] font-semibold cursor-pointer transition-colors hover:bg-stone-800 ${
            publishing ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {publishing ? 'Publicando...' : 'Publicar ahora'}
        </button>
      </div>
    </div>
  );
}
