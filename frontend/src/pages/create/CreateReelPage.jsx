import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, Play, Pause, Search } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const FILTERS = [
  { name: 'Normal', value: 'none' },
  { name: 'Clarendon', value: 'contrast(1.2) saturate(1.35)' },
  { name: 'Gingham', value: 'brightness(1.05) sepia(0.12)' },
  { name: 'Moon', value: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', value: 'contrast(0.9) brightness(1.15) saturate(1.2)' },
  { name: 'Reyes', value: 'sepia(0.22) brightness(1.1) contrast(0.85)' },
  { name: 'Juno', value: 'contrast(1.15) saturate(1.4) brightness(1.05)' },
  { name: 'Ludwig', value: 'contrast(1.05) saturate(0.9) sepia(0.08)' },
];

const SPEED_OPTIONS = [0.3, 0.5, 1, 2, 3];

const FONTS = ['Sans', 'Serif', 'Mono', 'Display'];
const TEXT_COLORS = ['#000000', '#ffffff', '#facc15', '#22c55e', '#ef4444'];

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

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const playIconTimer = useRef(null);
  const dragRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous video blob URL to free memory (video blobs are large)
    setVideoUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setVideoFile(file);
    setScreen('edit');
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
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

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

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
    const container = e.currentTarget.parentElement;
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

  const handlePublish = useCallback(async () => {
    if (!videoFile) return;
    setPublishing(true);
    try {
      const fd = new FormData();
      fd.append('type', 'reel');
      fd.append('media', videoFile);
      fd.append('caption', caption);
      fd.append(
        'metadata',
        JSON.stringify({
          filter: activeFilter,
          speed,
          textOverlays,
          thumbnailIndex,
        })
      );
      await apiClient.post('/api/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* TopBar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X style={{ color: '#fff', width: 22, height: 22 }} />
          </button>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>Nuevo Reel</span>
          <div style={{ width: 30 }} />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            padding: '8px 16px 16px',
          }}
        >
          {['subir', 'grabar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setUploadTab(tab)}
              style={{
                background: uploadTab === tab ? '#fff' : 'transparent',
                color: uploadTab === tab ? '#000' : '#fff',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              {tab === 'subir' ? 'Subir' : 'Grabar'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '0 32px',
          }}
        >
          <span style={{ fontSize: 48 }}>{uploadTab === 'subir' ? '🎬' : '🎥'}</span>
          <span style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>
            {uploadTab === 'subir' ? 'Selecciona un video' : 'Graba un video'}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Máximo 60 segundos · MP4 o MOV
          </span>
          <button
            onClick={() =>
              uploadTab === 'subir' ? fileInputRef.current?.click() : cameraInputRef.current?.click()
            }
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              marginTop: 8,
              transition: 'var(--transition-fast)',
            }}
          >
            {uploadTab === 'subir' ? 'Elegir de la galería' : 'Abrir cámara'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  // ─── SCREEN 2: EDIT ───────────────────────────────────────────
  if (screen === 'edit') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* TopBar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
          }}
        >
          <button
            onClick={() => { setScreen('upload'); setVideoFile(null); setVideoUrl(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X style={{ color: '#fff', width: 22, height: 22 }} />
          </button>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>Editar Reel</span>
          <button
            onClick={() => setScreen('details')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-green)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Siguiente →
          </button>
        </div>

        {/* Video preview */}
        <div
          style={{
            position: 'relative',
            aspectRatio: '9/16',
            maxHeight: '55vh',
            background: '#000',
            margin: '0 auto',
            width: 'auto',
            overflow: 'hidden',
            borderRadius: 'var(--radius-lg)',
          }}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: activeFilter === 'none' ? 'none' : activeFilter,
            }}
          />

          {/* Text overlays */}
          {textOverlays.map((t) => (
            <div
              key={t.id}
              style={{
                position: 'absolute',
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
                fontWeight: 700,
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                cursor: 'grab',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
              onTouchMove={(e) => handleTextDrag(t.id, e)}
              onMouseDown={() => (dragRef.current = t.id)}
              onMouseMove={(e) => dragRef.current === t.id && handleTextDrag(t.id, e)}
              onMouseUp={() => (dragRef.current = null)}
            >
              {t.text}
            </div>
          ))}

          {/* Play/Pause icon */}
          {showPlayIcon && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '50%',
                  padding: 16,
                }}
              >
                {isPlaying ? (
                  <Pause style={{ color: '#fff', width: 32, height: 32 }} />
                ) : (
                  <Play style={{ color: '#fff', width: 32, height: 32 }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Trim bar */}
        <div style={{ padding: '8px 16px' }}>
          <div
            style={{
              height: 32,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Progress */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                background: 'rgba(255,255,255,0.15)',
              }}
            />
            {/* Left handle */}
            <div
              style={{
                width: 12,
                height: '100%',
                background: 'var(--color-white)',
                borderRadius: '4px 0 0 4px',
                cursor: 'ew-resize',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }} />
            {/* Right handle */}
            <div
              style={{
                width: 12,
                height: '100%',
                background: 'var(--color-white)',
                borderRadius: '0 4px 4px 0',
                cursor: 'ew-resize',
                flexShrink: 0,
              }}
            />
          </div>
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {fmt(currentTime)} / {fmt(duration)}
          </div>
        </div>

        {/* Tool tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            overflowX: 'auto',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {['velocidad', 'texto', 'filtros'].map((tab) => (
            <button
              key={tab}
              onClick={() => setEditTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                color: editTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: editTab === tab ? 600 : 400,
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom: editTab === tab ? '2px solid #fff' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'var(--transition-fast)',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          {/* VELOCIDAD */}
          {editTab === 'velocidad' && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    background: speed === s ? 'var(--color-black)' : 'var(--color-surface)',
                    color: speed === s ? 'var(--color-white)' : 'var(--color-black)',
                    border: speed === s ? '1px solid var(--color-white)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {s}x{speed === s ? ' ✓' : ''}
                </button>
              ))}
            </div>
          )}

          {/* TEXTO */}
          {editTab === 'texto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!showTextInput ? (
                <button
                  onClick={() => setShowTextInput(true)}
                  disabled={textOverlays.length >= 3}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px dashed rgba(255,255,255,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    fontSize: 14,
                    cursor: textOverlays.length >= 3 ? 'not-allowed' : 'pointer',
                    opacity: textOverlays.length >= 3 ? 0.4 : 1,
                  }}
                >
                  + Añadir texto {textOverlays.length > 0 && `(${textOverlays.length}/3)`}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    placeholder="Escribe aquí..."
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      fontSize: 14,
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  {/* Fonts */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {FONTS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFont(f)}
                        style={{
                          background: selectedFont === f ? '#fff' : 'rgba(255,255,255,0.1)',
                          color: selectedFont === f ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {/* Colors */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: c,
                          border: selectedColor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  {/* Size slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>A</span>
                    <input
                      type="range"
                      min={14}
                      max={48}
                      value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#fff' }}
                    />
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>A</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setShowTextInput(false)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addTextOverlay}
                      style={{
                        flex: 1,
                        background: '#fff',
                        color: '#000',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              {FILTERS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFilter(f.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border:
                      activeFilter === f.value
                        ? '2px solid #fff'
                        : '2px solid transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      background: '#444',
                      filter: f.value === 'none' ? 'none' : f.value,
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>{f.name}</span>
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--color-white)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* TopBar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setScreen('edit')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <ChevronLeft style={{ color: 'var(--color-black)', width: 22, height: 22 }} />
        </button>
        <span style={{ color: 'var(--color-black)', fontSize: 15, fontWeight: 600 }}>
          Detalles del Reel
        </span>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Caption */}
        <div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe tu reel... 🎬"
            rows={4}
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              color: 'var(--color-black)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Thumbnail selector */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-black)',
              marginBottom: 8,
              display: 'block',
            }}
          >
            Portada
          </label>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                key={i}
                onClick={() => setThumbnailIndex(i)}
                style={{
                  width: 56,
                  height: 80,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-stone)',
                  border:
                    thumbnailIndex === i
                      ? '2px solid var(--color-black)'
                      : '2px solid var(--color-border)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  padding: 4,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--color-black)', opacity: 0.6 }}>
                  {duration > 0 ? fmt((duration / 5) * i) : `0:${String(i * 12).padStart(2, '0')}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Video preview small */}
        <div
          style={{
            aspectRatio: '9/16',
            maxHeight: 200,
            background: '#000',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            alignSelf: 'center',
          }}
        >
          <video
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: activeFilter === 'none' ? 'none' : activeFilter,
            }}
          />
        </div>
      </div>

      {/* Publish button */}
      <div style={{ padding: '12px 16px 24px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            width: '100%',
            background: 'var(--color-black)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '14px',
            fontSize: 15,
            fontWeight: 600,
            cursor: publishing ? 'not-allowed' : 'pointer',
            opacity: publishing ? 0.6 : 1,
            transition: 'var(--transition-fast)',
          }}
        >
          {publishing ? 'Publicando...' : 'Publicar ahora'}
        </button>
      </div>
    </div>
  );
}
