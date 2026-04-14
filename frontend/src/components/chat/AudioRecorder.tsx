// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import i18n from '../../locales/i18n';

interface AudioRecorderProps {
  onSend: (blob: Blob, durationSeconds: number) => void;
  onClose: () => void;
}

const MAX_DURATION = 120; // 2 minutes hard cap
const BAR_COUNT = 30;

function generateBarHeights(): number[] {
  return Array.from({ length: BAR_COUNT }, () => 20 + Math.random() * 80);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'audio/webm';
}

export default function AudioRecorder({ onSend, onClose }: AudioRecorderProps) {
  const [phase, setPhase] = useState<'requesting' | 'recording' | 'preview'>('requesting');
  const [elapsed, setElapsed] = useState(0);
  const [barHeights] = useState<number[]>(generateBarHeights);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const durationRef = useRef(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Request mic and start recording on mount
  useEffect(() => {
    let cancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mimeType = getSupportedMimeType();
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          audioBlobRef.current = blob;
          durationRef.current = elapsed;

          // Stop stream tracks
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          if (!cancelled) {
            setPhase('preview');
          }
        };

        recorder.start(250);
        setPhase('recording');

        // Start countdown timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
          const sec = Math.floor((Date.now() - startTime) / 1000);
          if (sec >= MAX_DURATION) {
            // Auto-stop at 2 minutes
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
          setElapsed(Math.min(sec, MAX_DURATION));
        }, 250);
      } catch (err) {
        if (!cancelled) {
          toast.error(i18n.t?.('chat.mic_denied') || 'No se pudo acceder al microfono. Revisa los permisos.');
          onClose();
        }
      }
    }

    startRecording();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update durationRef as elapsed changes (for onstop capture)
  useEffect(() => {
    durationRef.current = elapsed;
  }, [elapsed]);

  // Stop recording
  const handleStop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cancel / delete
  const handleDelete = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Send
  const handleSend = useCallback(() => {
    if (audioBlobRef.current) {
      onSend(audioBlobRef.current, durationRef.current);
    }
    cleanup();
  }, [onSend, cleanup]);

  // Play/pause preview
  const togglePlayback = useCallback(() => {
    if (!audioBlobRef.current) return;

    if (isPlaying && audioElRef.current) {
      audioElRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioElRef.current) {
      const url = URL.createObjectURL(audioBlobRef.current);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioElRef.current = audio;
      audio.onended = () => setIsPlaying(false);
    }

    audioElRef.current.play();
    setIsPlaying(true);
  }, [isPlaying]);

  const remaining = MAX_DURATION - elapsed;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-stone-50 border border-stone-200 p-4 w-full max-w-[100vw] sm:max-w-[400px]"
      >
        {/* Requesting permission */}
        {phase === 'requesting' && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Mic size={20} className="text-stone-400 animate-pulse" />
            <span className="text-sm text-stone-500">
              {i18n.t?.('chat.mic_requesting') || 'Solicitando acceso al microfono...'}
            </span>
          </div>
        )}

        {/* Recording */}
        {phase === 'recording' && (
          <div className="flex flex-col gap-3">
            {/* Timer + stop button row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-950 animate-pulse" />
                <span className="text-sm font-medium text-stone-950 tabular-nums">
                  {formatTime(elapsed)}
                </span>
                <span className="text-xs text-stone-400">
                  / {formatTime(MAX_DURATION)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStop}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-950 text-stone-50 hover:bg-stone-800 transition-colors"
                aria-label="Detener grabacion"
              >
                <Square size={16} />
              </button>
            </div>

            {/* Waveform bars */}
            <div className="flex items-end gap-[3px] h-10">
              {barHeights.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-full bg-stone-950"
                  animate={{
                    height: [`${h}%`, `${20 + Math.random() * 80}%`, `${h}%`],
                  }}
                  transition={{
                    duration: 0.6 + Math.random() * 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.03,
                  }}
                  style={{ minWidth: 3 }}
                />
              ))}
            </div>

            {/* Cancel hint */}
            <p className="text-xs text-stone-400 text-center">
              {i18n.t?.('chat.slide_cancel') || 'Desliza para cancelar'}
            </p>

            {/* Warning when close to limit */}
            {remaining <= 10 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-stone-500 text-center font-medium"
              >
                {formatTime(remaining)}
              </motion.p>
            )}
          </div>
        )}

        {/* Preview */}
        {phase === 'preview' && (
          <div className="flex flex-col gap-3">
            {/* Playback row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-950 text-stone-50 hover:bg-stone-800 transition-colors flex-shrink-0"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              {/* Static waveform */}
              <div className="flex items-end gap-[3px] h-8 flex-1">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-stone-400"
                    style={{ height: `${h}%`, minWidth: 3 }}
                  />
                ))}
              </div>

              <span className="text-xs text-stone-500 tabular-nums flex-shrink-0">
                {formatTime(durationRef.current)}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-200 text-stone-600 hover:bg-stone-300 transition-colors"
                aria-label="Eliminar grabacion"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-950 text-stone-50 hover:bg-stone-800 transition-colors"
                aria-label="Enviar audio"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
