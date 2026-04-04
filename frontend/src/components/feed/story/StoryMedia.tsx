// @ts-nocheck
import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, ExternalLink } from 'lucide-react';
import i18n from '../../../locales/i18n';

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

function isInternalUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return (
      u.hostname === window.location.hostname ||
      u.hostname.endsWith('hispaloshop.com')
    );
  } catch {
    return false;
  }
}

interface StoryMediaProps {
  currentItem: any;
  muted: boolean;
  onMuteToggle: () => void;
  onVideoLoaded: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  paused: boolean;
  onClose: () => void;
}

export default function StoryMedia({
  currentItem,
  muted,
  onMuteToggle,
  onVideoLoaded,
  videoRef,
  paused,
  onClose,
}: StoryMediaProps) {
  const navigate = useNavigate();

  // Sync video play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused, videoRef]);

  // Merge products from image stories and video story overlay stickers
  const overlayProductStickers = (
    currentItem?.overlays?.stickers || []
  )
    .filter((s: any) => s.type === 'product')
    .map((s: any) => ({
      product_id: s.productId,
      product_name: s.content,
      product_image: s.productImage,
      product_price: s.productPrice,
    }));

  const mergedProducts = [
    ...(currentItem?.products || []),
    ...overlayProductStickers,
  ];
  const seenProductIds = new Set<string>();
  const effectiveProducts = mergedProducts.filter((p) => {
    const pid = p.product_id || p.id;
    if (!pid || seenProductIds.has(pid)) return false;
    seenProductIds.add(pid);
    return true;
  });

  const handleProductClick = (product: any) => {
    onClose();
    const pid =
      product?.product_id ||
      product?.id ||
      product?.slug ||
      product?.productId;
    if (pid) navigate(`/products/${pid}`);
  };

  const handleLinkClick = (link: any) => {
    if (!link?.url) return;
    if (isInternalUrl(link.url)) {
      onClose();
      try {
        const u = new URL(link.url, window.location.origin);
        navigate(u.pathname + u.search);
      } catch {
        navigate(link.url);
      }
    } else {
      window.open(link.url, '_blank', 'noopener');
    }
  };

  // ── Render sticker overlays ────────────────────────────────
  const renderStickerOverlay = (s: any, i: number) => {
    const pos = {
      position: 'absolute' as const,
      left: `${s.x}%`,
      top: `${s.y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 3,
      pointerEvents: 'none' as const,
    };

    if (s.type === 'emoji') {
      return (
        <div key={i} className="text-4xl" style={pos}>
          {s.content}
        </div>
      );
    }
    if (s.type === 'poll') {
      return (
        <div key={i} style={pos}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[180px] text-center">
            <p className="text-[9px] font-bold text-stone-950 mb-1">
              ENCUESTA
            </p>
            <p className="text-[11px] font-bold text-stone-950 mb-2 leading-tight">
              {s.content}
            </p>
            <div className="flex gap-1">
              {(s.options || []).map((opt: string, oi: number) => (
                <div
                  key={oi}
                  className="flex-1 bg-stone-100 rounded-full py-1 px-1.5 text-[10px] font-semibold text-stone-950 text-center truncate"
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (s.type === 'question') {
      return (
        <div key={i} style={pos}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[180px] text-center">
            <p className="text-[9px] font-bold text-stone-950 mb-1">
              PREGUNTA
            </p>
            <p className="text-[11px] font-bold text-stone-950 mb-2 leading-tight">
              {s.content}
            </p>
            <div className="bg-stone-100 rounded-xl py-1.5 px-2 text-[10px] text-stone-400">
              Escribe tu respuesta...
            </div>
          </div>
        </div>
      );
    }
    if (s.type === 'mention') {
      const label = s.content.startsWith('@') ? s.content : `@${s.content}`;
      return (
        <div key={i} style={pos}>
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            <span className="text-white/70 text-[11px]">@</span>
            {label.replace(/^@/, '')}
          </div>
        </div>
      );
    }
    if (s.type === 'link') {
      const display = s.content
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .slice(0, 28);
      return (
        <div key={i} style={pos}>
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl text-stone-950 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis">
            🔗 {display}
          </div>
        </div>
      );
    }
    if (s.type === 'location') {
      return (
        <div key={i} style={pos}>
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl text-stone-950 text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            📍 {s.content}
          </div>
        </div>
      );
    }
    // fallback
    return (
      <div key={i} style={pos}>
        <div className="bg-black/60 text-white text-[12px] font-semibold px-3 py-1.5 rounded-full">
          {s.content}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Video or image */}
      {currentItem?.video_url ? (
        <>
          <video
            ref={videoRef}
            key={currentItem.video_url}
            src={currentItem.video_url}
            autoPlay
            muted={muted}
            playsInline
            onLoadedMetadata={onVideoLoaded}
            className="w-full h-full object-cover"
            style={currentItem.filter_css ? { filter: currentItem.filter_css } : undefined}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMuteToggle();
            }}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            className="absolute top-16 right-4 z-10 w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
          >
            {muted ? (
              <VolumeX size={16} className="text-white" />
            ) : (
              <Volume2 size={16} className="text-white" />
            )}
          </button>
          {/* Text overlays */}
          {currentItem?.overlays?.texts?.map((t: any, i: number) => (
            <div
              key={i}
              className="absolute pointer-events-none z-[3]"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: 'translate(-50%, -50%)',
                color: t.color || '#fff',
                fontSize: `${t.size || 20}px`,
                fontFamily: t.font || 'sans-serif',
                fontWeight: 'bold',
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                textShadow:
                  t.style !== 'box' ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
                WebkitTextStroke:
                  t.style === 'outline'
                    ? `1px ${t.color || '#fff'}`
                    : undefined,
                background:
                  t.style === 'box' ? 'rgba(0,0,0,0.75)' : 'transparent',
                padding: t.style === 'box' ? '4px 10px' : undefined,
                borderRadius: t.style === 'box' ? 6 : undefined,
              }}
            >
              {t.text}
            </div>
          ))}
          {/* Draw paths */}
          {Array.isArray(currentItem?.overlays?.draws) &&
            currentItem.overlays.draws.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full z-[2] pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {currentItem.overlays.draws.map((path: any, pi: number) => {
                  if (!path.points?.length || path.points.length < 2)
                    return null;
                  const d = path.points
                    .map(
                      (pt: any, j: number) =>
                        `${j === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`,
                    )
                    .join(' ');
                  return (
                    <path
                      key={pi}
                      d={d}
                      stroke={path.color || '#fff'}
                      strokeWidth={path.width || 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            )}
          {/* Non-product sticker overlays */}
          {(currentItem?.overlays?.stickers || [])
            .filter((s: any) => s.type !== 'product')
            .map(renderStickerOverlay)}
        </>
      ) : (
        <img
          key={currentItem?.image_url}
          src={currentItem?.image_url}
          alt={
            currentItem?.caption ||
            i18n.t(
              'story_viewer.contenidoDeLaHistoria',
              'Contenido de la historia',
            )
          }
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Product stickers + Link stickers */}
      {(effectiveProducts.length > 0 || currentItem?.links?.length > 0) && (
        <div className="absolute bottom-16 left-4 right-4 z-[2] flex flex-col gap-2">
          {effectiveProducts.map((product: any, idx: number) => (
            <div
              key={product.id || product.product_id || idx}
              onClick={(e) => {
                e.stopPropagation();
                handleProductClick(product);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleProductClick(product);
                }
              }}
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-full bg-white/15 backdrop-blur-xl cursor-pointer"
              role="link"
              tabIndex={0}
              aria-label={`Ver producto: ${product?.name}`}
            >
              {(product?.thumbnail ||
                product?.image ||
                product?.product_image) && (
                <img
                  src={
                    product.thumbnail ||
                    product.image ||
                    product.product_image
                  }
                  alt=""
                  className="w-8 h-8 rounded-2xl object-cover shrink-0"
                />
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[13px] text-white font-sans font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                  {product?.name || product?.product_name}
                </span>
                {(product?.price ?? product?.product_price) != null && (
                  <span className="text-[11px] text-white/70 font-semibold font-sans">
                    {priceFormatter.format(
                      product.price ?? product.product_price,
                    )}
                  </span>
                )}
                <span className="text-[10px] text-white/50 font-sans">
                  Ver producto
                </span>
              </div>
              <span className="text-[12px] text-white font-semibold font-sans shrink-0 bg-white/20 rounded-full px-2.5 py-1">
                Ver &rarr;
              </span>
            </div>
          ))}
          {currentItem?.links?.map((link: any, idx: number) => (
            <div
              key={link.url || idx}
              onClick={(e) => {
                e.stopPropagation();
                handleLinkClick(link);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLinkClick(link);
                }
              }}
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-full bg-white/15 backdrop-blur-xl cursor-pointer"
              role="link"
              tabIndex={0}
              aria-label={link.label || link.url}
            >
              <ExternalLink size={16} className="text-white shrink-0" />
              <span className="text-[13px] text-white font-sans font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                {link.label || link.title || link.url}
              </span>
              <span className="text-[12px] text-white font-semibold font-sans shrink-0 bg-white/20 rounded-full px-2.5 py-1">
                Abrir &rarr;
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
