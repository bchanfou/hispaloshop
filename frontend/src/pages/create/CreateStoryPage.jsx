import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Type, Tag, Check } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const BG_OPTIONS = [
  { id: 'camera', label: '📷', type: 'action' },
  { id: 'gallery', label: '🖼️', type: 'action' },
  { id: 'black', label: '■', type: 'color', value: '#000000' },
  { id: 'white', label: '□', type: 'color', value: '#ffffff' },
  { id: 'crema', label: '■', type: 'color', value: '#faf5f0' },
  { id: 'verde', label: '■', type: 'color', value: '#1a2e1a' },
  { id: 'grad-green', label: '∇', type: 'gradient', value: 'linear-gradient(135deg, #1a2e1a, #2d5a2d)' },
  { id: 'grad-tierra', label: '∇', type: 'gradient', value: 'linear-gradient(135deg, #78716c, #d6d3d1)' },
];

const EMOJIS_CULINARIOS = ['🫒', '🍯', '🧀', '🥘', '🌿', '🍅', '👨‍🍳', '🥩', '🫙', '🍋', '🧅', '🫚'];

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
  Sans: 'var(--font-sans)',
  Serif: 'Georgia, serif',
  Mono: 'monospace',
  Display: 'Impact, sans-serif',
};

const COLOR_DOTS = ['#000000', '#ffffff', '#facc15', '#22c55e', '#ef4444'];

export default function CreateStoryPage() {
  const navigate = useNavigate();

  const [background, setBackground] = useState('black');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickerOverlays, setStickerOverlays] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  const [textDraft, setTextDraft] = useState('');
  const [selectedFont, setSelectedFont] = useState('Sans');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [stickerTab, setStickerTab] = useState('culinarios');
  const [publishing, setPublishing] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dragRef = useRef({ type: null, id: null, active: false });

  const selectedBg = BG_OPTIONS.find((b) => b.id === background);

  const getCanvasBg = () => {
    if (imagePreviewUrl) return { backgroundImage: `url(${imagePreviewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (selectedBg?.type === 'gradient') return { background: selectedBg.value };
    if (selectedBg?.type === 'color') return { background: selectedBg.value };
    return { background: '#000' };
  };

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
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
        x: 50,
        y: 50,
      },
    ]);
    setTextDraft('');
    setActivePanel(null);
  }, [textDraft, selectedFont, selectedColor, textSize]);

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

  const handleOverlayDrag = useCallback((collection, setCollection, id, e) => {
    const touch = e.touches?.[0] || e;
    const canvas = e.currentTarget.closest('[data-canvas]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setCollection((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
          : item
      )
    );
  }, []);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const fd = new FormData();
      fd.append('type', 'story');
      if (imageFile) {
        fd.append('media', imageFile);
      }
      fd.append(
        'metadata',
        JSON.stringify({
          background,
          textOverlays,
          stickerOverlays,
        })
      );
      await apiClient.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Historia publicada');
      navigate('/');
    } catch (err) {
      toast.error('Error al publicar la historia');
    } finally {
      setPublishing(false);
    }
  }, [imageFile, background, textOverlays, stickerOverlays, navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#000',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* TopBar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
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
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Story · 24h</span>
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            background: 'var(--color-green)',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            cursor: publishing ? 'not-allowed' : 'pointer',
            opacity: publishing ? 0.6 : 1,
            transition: 'var(--transition-fast)',
          }}
        >
          {publishing ? '...' : 'Publicar'}
        </button>
      </div>

      {/* Background selector */}
      <div
        style={{
          position: 'absolute',
          top: 52,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {BG_OPTIONS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => handleBgSelect(bg)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              border: background === bg.id ? '2px solid #fff' : '2px solid transparent',
              background:
                bg.type === 'color'
                  ? bg.value
                  : bg.type === 'gradient'
                  ? bg.value
                  : 'rgba(255,255,255,0.1)',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: bg.type === 'action' ? 20 : 16,
              color: bg.id === 'white' || bg.id === 'crema' ? '#000' : '#fff',
              padding: 0,
            }}
          >
            {bg.type === 'action' ? bg.label : bg.type !== 'gradient' ? bg.label : bg.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '104px 16px 16px',
        }}
      >
        <div
          data-canvas
          style={{
            position: 'relative',
            aspectRatio: '9/16',
            maxHeight: '80vh',
            width: 'auto',
            height: '100%',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            ...getCanvasBg(),
          }}
        >
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
                fontFamily: FONTS_MAP[t.font] || 'var(--font-sans)',
                fontWeight: 700,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                cursor: 'grab',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                zIndex: 5,
              }}
              onTouchMove={(e) => handleOverlayDrag(textOverlays, setTextOverlays, t.id, e)}
              onMouseDown={() => {
                dragRef.current = { type: 'text', id: t.id, active: true };
              }}
              onMouseMove={(e) => {
                if (dragRef.current.active && dragRef.current.id === t.id) {
                  handleOverlayDrag(textOverlays, setTextOverlays, t.id, e);
                }
              }}
              onMouseUp={() => {
                dragRef.current = { type: null, id: null, active: false };
              }}
            >
              {t.text}
            </div>
          ))}

          {/* Sticker overlays */}
          {stickerOverlays.map((s) => (
            <div
              key={s.id}
              style={{
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: s.type === 'emoji' ? 36 : 14,
                background: s.type !== 'emoji' ? 'rgba(0,0,0,0.6)' : 'transparent',
                color: '#fff',
                padding: s.type !== 'emoji' ? '6px 12px' : 0,
                borderRadius: s.type !== 'emoji' ? 'var(--radius-full)' : 0,
                cursor: 'grab',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                zIndex: 5,
                fontWeight: 500,
                backdropFilter: s.type !== 'emoji' ? 'blur(4px)' : 'none',
              }}
              onTouchMove={(e) => handleOverlayDrag(stickerOverlays, setStickerOverlays, s.id, e)}
              onMouseDown={() => {
                dragRef.current = { type: 'sticker', id: s.id, active: true };
              }}
              onMouseMove={(e) => {
                if (dragRef.current.active && dragRef.current.id === s.id) {
                  handleOverlayDrag(stickerOverlays, setStickerOverlays, s.id, e);
                }
              }}
              onMouseUp={() => {
                dragRef.current = { type: null, id: null, active: false };
              }}
            >
              {s.content}
            </div>
          ))}

          {/* Empty state */}
          {!imagePreviewUrl && textOverlays.length === 0 && stickerOverlays.length === 0 && (
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
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                Añade contenido a tu historia
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right toolbar */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setActivePanel(activePanel === 'text' ? null : 'text')}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: activePanel === 'text' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Type style={{ color: '#fff', width: 20, height: 20 }} />
        </button>
        <button
          onClick={() => setActivePanel(activePanel === 'sticker' ? null : 'sticker')}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: activePanel === 'sticker' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          🌿
        </button>
        <button
          onClick={() => setActivePanel(activePanel === 'product' ? null : 'product')}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: activePanel === 'product' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tag style={{ color: '#fff', width: 20, height: 20 }} />
        </button>
      </div>

      {/* Text panel */}
      {activePanel === 'text' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            padding: 16,
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <textarea
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Escribe aquí..."
            rows={2}
            style={{
              background: 'transparent',
              color: '#fff',
              border: 'none',
              fontSize: 18,
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
              width: '100%',
            }}
            autoFocus
          />

          {/* Font pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(FONTS_MAP).map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFont(f)}
                style={{
                  background: selectedFont === f ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: selectedFont === f ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: FONTS_MAP[f],
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Color dots */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {COLOR_DOTS.map((c) => (
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
                  flexShrink: 0,
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
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>A</span>
          </div>

          {/* Confirm button */}
          <button
            onClick={addTextOverlay}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Check style={{ width: 16, height: 16 }} />
            Confirmar
          </button>
        </div>
      )}

      {/* Sticker panel */}
      {activePanel === 'sticker' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            padding: 16,
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '50vh',
            overflow: 'auto',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            {[
              { key: 'culinarios', label: 'Culinarios' },
              { key: 'certificaciones', label: 'Certificaciones' },
              { key: 'frases', label: 'Frases' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStickerTab(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: stickerTab === tab.key ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: 13,
                  fontWeight: stickerTab === tab.key ? 600 : 400,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  borderBottom: stickerTab === tab.key ? '2px solid #fff' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Culinarios grid */}
          {stickerTab === 'culinarios' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
              }}
            >
              {EMOJIS_CULINARIOS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji, 'emoji')}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 0',
                    fontSize: 28,
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Certificaciones pills */}
          {stickerTab === 'certificaciones' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CERTIFICACIONES.map((cert) => (
                <button
                  key={cert}
                  onClick={() => addSticker(cert, 'badge')}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 14px',
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {cert}
                </button>
              ))}
            </div>
          )}

          {/* Frases list */}
          {stickerTab === 'frases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FRASES.map((frase) => (
                <button
                  key={frase}
                  onClick={() => addSticker(frase, 'phrase')}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    fontSize: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  "{frase}"
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product panel (placeholder) */}
      {activePanel === 'product' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            padding: 16,
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Tag style={{ color: 'rgba(255,255,255,0.4)', width: 32, height: 32 }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Etiqueta un producto de tu tienda
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Próximamente
          </span>
        </div>
      )}
    </div>
  );
}
