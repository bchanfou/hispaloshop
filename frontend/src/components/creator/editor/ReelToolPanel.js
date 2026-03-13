import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const SPEED_OPTIONS = [0.3, 0.5, 1, 2, 3];
const FRAME_COUNT = 9;

function formatSeconds(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const tenths = Math.floor((safeValue % 1) * 10);
  return minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}.${tenths}`;
}

// ── Visual drag-handle timeline ────────────────────────────────────────────
function VideoTimeline({ frames, duration, trimStart, trimEnd, onTrimStart, onTrimEnd }) {
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // 'start' | 'end' | null

  const safeMax = Math.max(duration, 0.1);
  const startPct = (trimStart / safeMax) * 100;
  const endPct = (trimEnd / safeMax) * 100;

  const posFromEvent = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, x)) * safeMax;
  };

  const handlePointerDown = (e, handle) => {
    e.preventDefault();
    draggingRef.current = handle;
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    const t = posFromEvent(e);
    if (draggingRef.current === 'start') {
      onTrimStart(Math.max(0, Math.min(parseFloat(t.toFixed(2)), trimEnd - 0.5)));
    } else {
      onTrimEnd(Math.min(safeMax, Math.max(parseFloat(t.toFixed(2)), trimStart + 0.5)));
    }
  };

  const handlePointerUp = () => {
    draggingRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-14 select-none touch-none overflow-hidden rounded-xl"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Frame strip */}
      <div className="absolute inset-0 flex bg-stone-800">
        {frames.length > 0
          ? frames.map((frame, i) => (
              <img
                key={i}
                src={frame.src}
                draggable={false}
                className="h-full flex-1 object-cover"
                alt=""
              />
            ))
          : Array.from({ length: FRAME_COUNT }).map((_, i) => (
              <div key={i} className="h-full flex-1 bg-stone-700 animate-pulse" />
            ))}
      </div>

      {/* Dark overlay — before selection */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 bg-black/65"
        style={{ width: `${startPct}%` }}
      />
      {/* Dark overlay — after selection */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 bg-black/65"
        style={{ width: `${100 - endPct}%` }}
      />

      {/* Selection border */}
      <div
        className="pointer-events-none absolute inset-y-0 border-y-2 border-white"
        style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
      />

      {/* Left drag handle */}
      <div
        className="absolute inset-y-0 flex w-5 cursor-ew-resize items-center justify-center touch-none"
        style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
        onPointerDown={(e) => handlePointerDown(e, 'start')}
      >
        <div className="h-7 w-[3px] rounded-full bg-white shadow-sm" />
        <div
          className="pointer-events-none absolute bottom-full mb-1 rounded-md bg-stone-950/90 px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ opacity: draggingRef.current === 'start' ? 1 : 0 }}
        >
          {formatSeconds(trimStart)}
        </div>
      </div>

      {/* Right drag handle */}
      <div
        className="absolute inset-y-0 flex w-5 cursor-ew-resize items-center justify-center touch-none"
        style={{ left: `${endPct}%`, transform: 'translateX(-50%)' }}
        onPointerDown={(e) => handlePointerDown(e, 'end')}
      >
        <div className="h-7 w-[3px] rounded-full bg-white shadow-sm" />
        <div
          className="pointer-events-none absolute bottom-full mb-1 rounded-md bg-stone-950/90 px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ opacity: draggingRef.current === 'end' ? 1 : 0 }}
        >
          {formatSeconds(trimEnd)}
        </div>
      </div>
    </div>
  );
}

// ── Cover frame horizontal strip ───────────────────────────────────────────
function CoverStrip({ frames, coverFrameSeconds, onSelect }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
      {frames.length > 0
        ? frames.map((frame) => {
            const isActive = Math.abs(frame.time - coverFrameSeconds) < 0.3;
            return (
              <button
                key={frame.time}
                type="button"
                onClick={() => onSelect(frame.time)}
                className={`shrink-0 overflow-hidden rounded-lg transition-all ${
                  isActive ? 'ring-2 ring-stone-950 ring-offset-1' : ''
                }`}
              >
                <img
                  src={frame.src}
                  draggable={false}
                  className="h-14 w-11 object-cover"
                  alt={formatSeconds(frame.time)}
                />
              </button>
            );
          })
        : Array.from({ length: FRAME_COUNT }).map((_, i) => (
            <div key={i} className="h-14 w-11 shrink-0 rounded-lg bg-stone-200 animate-pulse" />
          ))}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
function ReelToolPanel({ editor }) {
  const currentVideo = editor.images[editor.currentImageIndex];
  const [frames, setFrames] = useState([]);

  const duration = editor.reelSettings.duration || 0;
  const trimStart = editor.reelSettings.trimStart || 0;
  const trimEnd = editor.reelSettings.trimEnd || duration || 0;
  const coverFrameSeconds = editor.reelSettings.coverFrameSeconds || 0;

  // Extract frames
  useEffect(() => {
    if (!currentVideo || currentVideo.type !== 'video') {
      setFrames([]);
      return undefined;
    }

    let cancelled = false;
    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.src = currentVideo.src;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const captureFrame = (time) =>
      new Promise((resolve) => {
        video.onseeked = () => {
          if (cancelled) { resolve(null); return; }
          const w = video.videoWidth || 270;
          const h = video.videoHeight || 480;
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(video, 0, 0, w, h);
          resolve({ time, src: canvas.toDataURL('image/jpeg', 0.55) });
        };
        video.currentTime = Math.max(0, Math.min(time, video.duration || time));
      });

    const build = async () => {
      await new Promise((resolve) => { video.onloadedmetadata = resolve; });
      if (cancelled) return;

      const dur = video.duration || 0;
      editor.setReelDuration(dur);

      const next = [];
      for (let i = 0; i < FRAME_COUNT; i += 1) {
        const ratio = FRAME_COUNT === 1 ? 0 : i / (FRAME_COUNT - 1);
        // eslint-disable-next-line no-await-in-loop
        const frame = await captureFrame(dur * ratio);
        if (frame) next.push(frame);
      }
      if (!cancelled) setFrames(next);
    };

    build();
    return () => { cancelled = true; video.src = ''; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.src, currentVideo?.type]);

  const clipLength = Math.max(0, trimEnd - trimStart).toFixed(1);

  return (
    <div className="space-y-4 p-4">

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-stone-500">Recorte</span>
          <span className="text-[12px] tabular-nums text-stone-600">
            {formatSeconds(trimStart)} – {formatSeconds(trimEnd)}
            <span className="ml-1.5 text-stone-400">({clipLength}s)</span>
          </span>
        </div>
        <VideoTimeline
          frames={frames}
          duration={duration}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onTrimStart={(v) => editor.updateReelSetting('trimStart', v)}
          onTrimEnd={(v) => editor.updateReelSetting('trimEnd', v)}
        />
        <p className="mt-1.5 text-[11px] text-stone-400">
          Arrastra los handles blancos para seleccionar el clip.
        </p>
      </div>

      {/* ── Speed ────────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[12px] font-medium text-stone-500">Velocidad</p>
        <div className="flex gap-2">
          {SPEED_OPTIONS.map((speed) => {
            const isActive = editor.reelSettings.playbackRate === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => editor.updateReelSetting('playbackRate', speed)}
                className={`flex-1 rounded-full py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                }`}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Audio ────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => editor.updateReelSetting('isMuted', !editor.reelSettings.isMuted)}
        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors ${
          editor.reelSettings.isMuted
            ? 'bg-stone-950 text-white'
            : 'bg-stone-100 text-stone-700 active:bg-stone-200'
        }`}
      >
        {editor.reelSettings.isMuted
          ? <VolumeX className="h-4 w-4" />
          : <Volume2 className="h-4 w-4" />}
        {editor.reelSettings.isMuted ? 'Sin audio' : 'Con audio'}
      </button>

      {/* ── Cover frame ──────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-stone-500">Portada</span>
          <span className="text-[12px] tabular-nums text-stone-400">
            {formatSeconds(coverFrameSeconds)}s
          </span>
        </div>
        <CoverStrip
          frames={frames}
          coverFrameSeconds={coverFrameSeconds}
          onSelect={(t) => editor.updateReelSetting('coverFrameSeconds', t)}
        />
      </div>

    </div>
  );
}

export default ReelToolPanel;
