import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import HispalAIPanel from '../../components/creator/HispalAIPanel';

const BACKGROUNDS = [
  { id: 'black', bg: '#0A0A0A', textColor: '#FFFFFF' },
  { id: 'dark-green', bg: '#1a3a2a', textColor: '#FFFFFF' },
  { id: 'earth', bg: '#3d2b1f', textColor: '#FFFFFF' },
  { id: 'cream', bg: '#F7F6F2', textColor: '#0A0A0A' },
  { id: 'white', bg: '#FFFFFF', textColor: '#0A0A0A' },
  { id: 'grad-green', bg: 'linear-gradient(135deg, #0A0A0A, #2E7D52)', textColor: '#FFFFFF' },
  { id: 'grad-amber', bg: 'linear-gradient(135deg, #3d2b1f, #d4a574)', textColor: '#FFFFFF' },
  { id: 'grad-stone', bg: 'linear-gradient(135deg, #0A0A0A, #8A8881)', textColor: '#FFFFFF' },
];

const ALLOWED_SIZES = [14, 16, 18, 20, 24, 28, 32, 40];

function CreateTextPostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const textareaRef = useRef(null);

  const [selectedBg, setSelectedBg] = useState('black');
  const [text, setText] = useState('');
  const [sizeIndex, setSizeIndex] = useState(3); // 20px default
  const [isBold, setIsBold] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const currentFontSize = ALLOWED_SIZES[sizeIndex];

  const currentBg = BACKGROUNDS.find((b) => b.id === selectedBg) || BACKGROUNDS[0];
  const isGradient = currentBg.bg.startsWith('linear-gradient');

  const renderCanvas = useCallback(() => {
    return new Promise((resolve, reject) => {
      const size = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw background
      if (isGradient) {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        // Parse gradient colors from the bg string
        const colorMatch = currentBg.bg.match(/#[0-9A-Fa-f]{6}/g);
        if (colorMatch && colorMatch.length >= 2) {
          grad.addColorStop(0, colorMatch[0]);
          grad.addColorStop(1, colorMatch[1]);
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = currentBg.bg;
      }
      ctx.fillRect(0, 0, size, size);

      // Draw text
      const fontSize = currentFontSize * (size / 390); // Scale relative to mobile width
      ctx.fillStyle = currentBg.textColor;
      const weight = isBold ? '700' : '500';
      ctx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Word wrap
      const maxWidth = size * 0.8;
      const lineHeight = fontSize * 1.4;
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        // Handle explicit newlines
        const parts = word.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            lines.push(currentLine);
            currentLine = '';
          }
          const testLine = currentLine ? `${currentLine} ${parts[i]}` : parts[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = parts[i];
          } else {
            currentLine = testLine;
          }
        }
      }
      if (currentLine) lines.push(currentLine);

      const totalHeight = lines.length * lineHeight;
      const startY = (size - totalHeight) / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, startY + i * lineHeight);
      });

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image'));
        },
        'image/png',
        1
      );
    });
  }, [text, currentBg, isGradient, currentFontSize, isBold]);

  const handlePublish = async () => {
    if (!text.trim() || publishing) return;
    setPublishing(true);

    try {
      const blob = await renderCanvas();
      const formData = new FormData();
      formData.append('image', blob, 'text-post.png');
      formData.append('type', 'text_post');
      formData.append('caption', text);
      formData.append('background_id', selectedBg);

      await apiClient.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Publicado');
      navigate('/');
    } catch (err) {
      console.error('Publish error:', err);
      toast.error('Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  const previewBgStyle = isGradient
    ? { backgroundImage: currentBg.bg }
    : { backgroundColor: currentBg.bg };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-white, #FFFFFF)' }}>
      {/* Top Bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4"
        style={{
          background: 'var(--color-white, #FFFFFF)',
          borderBottom: '1px solid var(--color-border, #E5E2DA)',
          height: 48,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, color: 'var(--color-black, #0A0A0A)' }}
        >
          <ArrowLeft size={22} />
        </button>

        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-black, #0A0A0A)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Nuevo texto
        </span>

        <button
          onClick={handlePublish}
          disabled={!text.trim() || publishing}
          style={{
            fontSize: 13,
            fontWeight: 600,
            background: text.trim() && !publishing ? 'var(--color-black, #0A0A0A)' : 'var(--color-stone, #8A8881)',
            color: '#fff',
            borderRadius: 'var(--radius-full, 9999px)',
            padding: '6px 16px',
            border: 'none',
            cursor: text.trim() && !publishing ? 'pointer' : 'not-allowed',
            opacity: text.trim() && !publishing ? 1 : 0.6,
          }}
        >
          {publishing ? <Loader2 size={14} className="animate-spin" /> : 'Publicar'}
        </button>
      </div>

      {/* Background selector */}
      <div
        className="flex items-center overflow-x-auto no-scrollbar"
        style={{ padding: '12px 16px', gap: 8 }}
      >
        {BACKGROUNDS.map((bg) => {
          const active = selectedBg === bg.id;
          const isBgGradient = bg.bg.startsWith('linear-gradient');
          return (
            <button
              key={bg.id}
              onClick={() => setSelectedBg(bg.id)}
              className="flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md, 8px)',
                border: active
                  ? '2px solid var(--color-black, #0A0A0A)'
                  : '1px solid var(--color-border, #E5E2DA)',
                boxShadow: active ? '0 0 0 2px var(--color-white, #FFFFFF)' : 'none',
                ...(isBgGradient
                  ? { backgroundImage: bg.bg }
                  : { backgroundColor: bg.bg }),
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
      </div>

      {/* Preview area */}
      <div className="px-4">
        <div
          className="relative flex items-center justify-center"
          style={{
            aspectRatio: '1 / 1',
            borderRadius: 'var(--radius-lg, 16px)',
            overflow: 'hidden',
            ...previewBgStyle,
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué quieres compartir?"
            className="w-full h-full resize-none outline-none preview-textarea"
            style={{
              background: 'transparent',
              border: 'none',
              textAlign: 'center',
              fontSize: currentFontSize,
              fontWeight: isBold ? 700 : 400,
              color: currentBg.textColor,
              fontFamily: 'var(--font-sans)',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1.4,
              caretColor: currentBg.textColor,
            }}
          />
          {/* Placeholder opacity override via inline style won't work for pseudo-elements,
              so we use a style tag */}
          <style>{`
            .preview-textarea::placeholder {
              color: ${currentBg.textColor};
              opacity: 0.4;
            }
          `}</style>
        </div>
      </div>

      {/* Typographic controls */}
      <div className="flex items-center justify-center" style={{ margin: '12px 0', gap: 8 }}>
        {/* A- decrease */}
        <button
          onClick={() => setSizeIndex(i => Math.max(0, i - 1))}
          disabled={sizeIndex === 0}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            background: 'var(--color-surface, #F0EDE8)',
            color: 'var(--color-black, #0A0A0A)',
            fontSize: 13,
            fontWeight: 600,
            cursor: sizeIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: sizeIndex === 0 ? 0.4 : 1,
            fontFamily: 'var(--font-sans)',
          }}
        >
          A-
        </button>

        {/* A reset */}
        <button
          onClick={() => setSizeIndex(3)}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            background: sizeIndex === 3 ? 'var(--color-black, #0A0A0A)' : 'var(--color-surface, #F0EDE8)',
            color: sizeIndex === 3 ? '#fff' : 'var(--color-black, #0A0A0A)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          A
        </button>

        {/* A+ increase */}
        <button
          onClick={() => setSizeIndex(i => Math.min(ALLOWED_SIZES.length - 1, i + 1))}
          disabled={sizeIndex === ALLOWED_SIZES.length - 1}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            background: 'var(--color-surface, #F0EDE8)',
            color: 'var(--color-black, #0A0A0A)',
            fontSize: 13,
            fontWeight: 600,
            cursor: sizeIndex === ALLOWED_SIZES.length - 1 ? 'not-allowed' : 'pointer',
            opacity: sizeIndex === ALLOWED_SIZES.length - 1 ? 0.4 : 1,
            fontFamily: 'var(--font-sans)',
          }}
        >
          A+
        </button>

        {/* Separator */}
        <span style={{
          width: 1,
          height: 20,
          background: 'var(--color-border, #E5E2DA)',
          margin: '0 4px',
        }} />

        {/* Regular / Negrita toggle */}
        <button
          onClick={() => setIsBold(false)}
          className="flex items-center justify-center"
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            background: !isBold ? 'var(--color-black, #0A0A0A)' : 'var(--color-surface, #F0EDE8)',
            color: !isBold ? '#fff' : 'var(--color-black, #0A0A0A)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Regular
        </button>
        <button
          onClick={() => setIsBold(true)}
          className="flex items-center justify-center"
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            background: isBold ? 'var(--color-black, #0A0A0A)' : 'var(--color-surface, #F0EDE8)',
            color: isBold ? '#fff' : 'var(--color-black, #0A0A0A)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Negrita
        </button>

        {/* Separator */}
        <span style={{
          width: 1,
          height: 20,
          background: 'var(--color-border, #E5E2DA)',
          margin: '0 4px',
        }} />

        {/* AI button */}
        <button
          onClick={() => setShowAIPanel(true)}
          className="flex items-center justify-center"
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            background: 'var(--color-surface, #F0EDE8)',
            color: 'var(--color-black, #0A0A0A)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            gap: 4,
          }}
        >
          ✨ IA
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom publish button */}
      <div className="px-4 pb-6" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handlePublish}
          disabled={!text.trim() || publishing}
          className="w-full flex items-center justify-center"
          style={{
            background: text.trim() && !publishing ? 'var(--color-black, #0A0A0A)' : 'var(--color-stone, #8A8881)',
            color: '#fff',
            height: 52,
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            cursor: text.trim() && !publishing ? 'pointer' : 'not-allowed',
            opacity: text.trim() && !publishing ? 1 : 0.6,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {publishing ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Publicando...
            </>
          ) : (
            'Publicar'
          )}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <HispalAIPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        contentType="text_post"
        currentText={text}
        onUseCaption={(caption) => setText(caption)}
        onAddHashtags={(tags) => setText(prev => prev + '\n' + tags.map(t => `#${t}`).join(' '))}
      />
    </div>
  );
}

export default CreateTextPostPage;
