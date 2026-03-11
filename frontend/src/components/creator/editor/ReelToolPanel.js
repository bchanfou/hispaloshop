import React, { useEffect, useMemo, useState } from 'react';
import { Film, Volume2, VolumeX } from 'lucide-react';

function formatSeconds(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SpeedButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
      }`}
    >
      {label}
    </button>
  );
}

function ReelToolPanel({ editor }) {
  const currentVideo = editor.images[editor.currentImageIndex];
  const [frames, setFrames] = useState([]);
  const [loadingFrames, setLoadingFrames] = useState(false);

  const duration = editor.reelSettings.duration || 0;
  const trimStart = editor.reelSettings.trimStart || 0;
  const trimEnd = editor.reelSettings.trimEnd || duration || 0;
  const coverFrameSeconds = editor.reelSettings.coverFrameSeconds || 0;
  const visibleFrames = frames.length > 0 ? frames : [];
  const selectedCoverFrame = useMemo(() => {
    if (visibleFrames.length === 0) return null;
    return visibleFrames.reduce((closest, frame) => {
      if (!closest) return frame;
      return Math.abs(frame.time - coverFrameSeconds) < Math.abs(closest.time - coverFrameSeconds) ? frame : closest;
    }, null);
  }, [coverFrameSeconds, visibleFrames]);

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

    const captureFrame = (time) => new Promise((resolve) => {
      const handleSeeked = () => {
        if (cancelled) {
          resolve(null);
          return;
        }
        const width = video.videoWidth || 270;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, width, height);
        resolve({
          time,
          src: canvas.toDataURL('image/jpeg', 0.6),
        });
      };

      video.onseeked = handleSeeked;
      video.currentTime = Math.min(Math.max(time, 0), video.duration || time);
    });

    const buildFrames = async () => {
      setLoadingFrames(true);
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      if (cancelled) return;

      editor.setReelDuration(video.duration || 0);
      const sampleCount = 6;
      const sampleDuration = video.duration || 0;
      const nextFrames = [];

      for (let index = 0; index < sampleCount; index += 1) {
        const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
        const frameTime = sampleDuration * ratio;
        // eslint-disable-next-line no-await-in-loop
        const frame = await captureFrame(frameTime);
        if (frame) {
          nextFrames.push(frame);
        }
      }

      if (!cancelled) {
        setFrames(nextFrames);
        setLoadingFrames(false);
      }
    };

    buildFrames();

    return () => {
      cancelled = true;
      video.src = '';
    };
  }, [currentVideo?.src, currentVideo?.type, editor.currentImageIndex, editor.setReelDuration]);

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-950 shadow-sm ring-1 ring-stone-200">
            <Film className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-950">Video</h3>
            <p className="mt-1 text-sm leading-5 text-stone-500">Recorte, portada y ritmo.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-stone-100">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Duracion</span>
            <span>{formatSeconds(duration)}</span>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1">
            {loadingFrames ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[9/16] rounded-xl bg-stone-200 animate-pulse" />
              ))
            ) : (
              visibleFrames.map((frame) => (
                <button
                  key={frame.time}
                  type="button"
                  onClick={() => editor.updateReelSetting('coverFrameSeconds', frame.time)}
                  className={`min-h-12 overflow-hidden rounded-xl border ${
                    Math.abs(frame.time - coverFrameSeconds) < 0.2 ? 'border-stone-950' : 'border-transparent'
                  }`}
                  aria-label={`Elegir portada en ${formatSeconds(frame.time)}`}
                >
                  <img src={frame.src} alt="" className="aspect-[9/16] h-full w-full object-cover" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-[0.2em] text-stone-500">Trim</span>
          <span className="text-stone-500">
            {formatSeconds(trimStart)} - {formatSeconds(trimEnd)}
          </span>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
              <span>Inicio</span>
              <span>{formatSeconds(trimStart)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(duration, 0.1)}
              step="0.1"
              value={trimStart}
              onChange={(event) => editor.updateReelSetting('trimStart', parseFloat(event.target.value))}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
              <span>Fin</span>
              <span>{formatSeconds(trimEnd)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max={Math.max(duration, 0.1)}
              step="0.1"
              value={trimEnd}
              onChange={(event) => editor.updateReelSetting('trimEnd', parseFloat(event.target.value))}
              className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-[0.2em] text-stone-500">Portada</span>
          <span className="text-stone-500">{formatSeconds(coverFrameSeconds)}</span>
        </div>
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          {selectedCoverFrame ? (
            <img src={selectedCoverFrame.src} alt="" className="aspect-[9/16] w-full rounded-2xl object-cover" />
          ) : (
            <div className="aspect-[9/16] w-full rounded-2xl bg-stone-200" />
          )}
        </div>
        <input
          type="range"
          min="0"
          max={Math.max(duration, 0.1)}
          step="0.1"
          value={coverFrameSeconds}
          onChange={(event) => editor.updateReelSetting('coverFrameSeconds', parseFloat(event.target.value))}
          className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
        />
        <button
          type="button"
          onClick={() => editor.updateReelSetting('coverFrameSeconds', trimStart + Math.max((trimEnd - trimStart) * 0.2, 0))}
          className="mt-4 min-h-11 rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
        >
          Sugerir portada
        </button>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Velocidad</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0.5, 1, 1.5, 2].map((speed) => (
            <SpeedButton
              key={speed}
              label={`${speed}x`}
              active={editor.reelSettings.playbackRate === speed}
              onClick={() => editor.updateReelSetting('playbackRate', speed)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => editor.updateReelSetting('isMuted', !editor.reelSettings.isMuted)}
          className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            editor.reelSettings.isMuted ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          {editor.reelSettings.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {editor.reelSettings.isMuted ? 'Sin audio' : 'Audio'}
        </button>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Slow motion</p>
          <button
            type="button"
            onClick={() => editor.updateReelSetting('slowMotionEnabled', !editor.reelSettings.slowMotionEnabled)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              editor.reelSettings.slowMotionEnabled ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {editor.reelSettings.slowMotionEnabled ? 'Activo' : 'Desactivado'}
          </button>
        </div>

        {editor.reelSettings.slowMotionEnabled ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
                <span>Inicio</span>
                <span>{formatSeconds(editor.reelSettings.slowMotionStart)}</span>
              </div>
              <input
                type="range"
                min={trimStart}
                max={Math.max(trimEnd, trimStart + 0.1)}
                step="0.1"
                value={editor.reelSettings.slowMotionStart}
                onChange={(event) => editor.updateReelSetting('slowMotionStart', parseFloat(event.target.value))}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
                <span>Fin</span>
                <span>{formatSeconds(editor.reelSettings.slowMotionEnd || trimEnd)}</span>
              </div>
              <input
                type="range"
                min={trimStart}
                max={Math.max(trimEnd, trimStart + 0.1)}
                step="0.1"
                value={editor.reelSettings.slowMotionEnd || trimEnd}
                onChange={(event) => editor.updateReelSetting('slowMotionEnd', parseFloat(event.target.value))}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ReelToolPanel;
