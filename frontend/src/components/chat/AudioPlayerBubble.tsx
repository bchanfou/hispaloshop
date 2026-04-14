// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AudioPlayerBubbleProps {
  audioUrl: string | null;
  duration: number; // seconds
  expiresAt?: string; // ISO date
  expired?: boolean;
  isOwn: boolean; // true = sent by current user (white text on dark bg)
}

function formatMmSs(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getDaysRemaining(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Generate 25 bar heights seeded from duration for consistency */
function generateBarHeights(duration: number): number[] {
  const bars: number[] = [];
  let seed = Math.floor(duration * 7 + 13);
  for (let i = 0; i < 25; i++) {
    seed = (seed * 16807 + 11) % 2147483647;
    const normalised = (seed % 100) / 100;
    // Heights between 6px and 24px
    bars.push(6 + Math.floor(normalised * 18));
  }
  return bars;
}

export default function AudioPlayerBubble({
  audioUrl,
  duration,
  expiresAt,
  expired = false,
  isOwn,
}: AudioPlayerBubbleProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1

  const barHeights = useMemo(() => generateBarHeights(duration), [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  const ensureAudio = useCallback((): HTMLAudioElement | null => {
    if (!audioUrl) return null;
    if (!audioRef.current) {
      const el = new Audio(audioUrl);
      el.preload = 'metadata';

      el.addEventListener('timeupdate', () => {
        if (el.duration && Number.isFinite(el.duration)) {
          setProgress(el.currentTime / el.duration);
        }
      });

      el.addEventListener('ended', () => {
        setPlaying(false);
        setProgress(0);
      });

      el.addEventListener('error', () => {
        setPlaying(false);
        toast.error(t('chat.audioError', 'No se pudo reproducir el audio'));
      });

      audioRef.current = el;
    }
    return audioRef.current;
  }, [audioUrl, t]);

  const togglePlay = useCallback(() => {
    const el = ensureAudio();
    if (!el) return;

    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {
        toast.error(t('chat.audioError', 'No se pudo reproducir el audio'));
      });
      setPlaying(true);
    }
  }, [playing, ensureAudio, t]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ensureAudio();
      if (!el) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.min(1, Math.max(0, x / rect.width));

      if (el.duration && Number.isFinite(el.duration)) {
        el.currentTime = ratio * el.duration;
        setProgress(ratio);
      }
    },
    [ensureAudio],
  );

  const daysRemaining = expiresAt ? getDaysRemaining(expiresAt) : null;
  const displayTime = formatMmSs(playing ? progress * duration : duration);

  // -- Colour tokens --
  const textColor = isOwn ? 'text-stone-50' : 'text-stone-900';
  const mutedText = isOwn ? 'text-stone-400' : 'text-stone-500';
  const btnBg = isOwn ? 'bg-stone-800' : 'bg-stone-200';
  const btnHover = isOwn ? 'hover:bg-stone-700' : 'hover:bg-stone-300';
  const iconColor = isOwn ? 'text-stone-50' : 'text-stone-900';
  const barActive = isOwn ? 'bg-stone-50' : 'bg-stone-950';
  const barInactive = isOwn ? 'bg-stone-700' : 'bg-stone-300';

  // -- Expired state --
  if (expired) {
    return (
      <div
        className={`flex items-center gap-2 rounded-[20px] px-4 py-3 ${
          isOwn ? 'bg-stone-950' : 'bg-stone-100'
        }`}
      >
        <Mic size={18} className={mutedText} />
        <span className={`text-sm ${mutedText}`}>
          {t('chat.audioExpired', 'Audio expirado')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 rounded-[20px] px-4 py-3 ${
        isOwn ? 'bg-stone-950' : 'bg-stone-100'
      }`}
      style={{ minWidth: 120, maxWidth: '90vw' }}
    >
      {/* Player row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${btnBg} ${btnHover} transition-colors`}
          aria-label={playing ? t('chat.pause', 'Pausar') : t('chat.play', 'Reproducir')}
        >
          {playing ? (
            <Pause size={16} className={iconColor} />
          ) : (
            <Play size={16} className={`${iconColor} ml-0.5`} />
          )}
        </button>

        {/* Waveform */}
        <div
          className="flex flex-1 cursor-pointer items-end gap-px"
          style={{ height: 28 }}
          onClick={handleSeek}
          role="slider"
          aria-label={t('chat.seekAudio', 'Buscar en el audio')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
        >
          {barHeights.map((h, i) => {
            const filled = progress > 0 && i / 25 < progress;
            return (
              <div
                key={i}
                className={`rounded-full transition-colors ${filled ? barActive : barInactive}`}
                style={{ width: 3, height: h, flexShrink: 0 }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <span className={`shrink-0 text-xs tabular-nums ${mutedText}`}>
          {displayTime}
        </span>
      </div>

      {/* Expiry indicator */}
      {daysRemaining !== null && daysRemaining > 0 && (
        <span className={`text-[10px] leading-tight ${mutedText} pl-11`}>
          {t('chat.audioExpires', 'Se elimina en {{days}}d', { days: daysRemaining })}
        </span>
      )}
    </div>
  );
}
