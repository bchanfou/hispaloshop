import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { Camera, CameraOff, ChevronDown, FlipHorizontal, Images, Plus, Type, X } from 'lucide-react';

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'post',    label: 'Post',     accept: 'image/*',       multiple: true,  maxFiles: 10 },
  { id: 'reel',   label: 'Reel',     accept: 'video/*',       multiple: false, maxFiles: 1  },
  { id: 'story',  label: 'Historia', accept: 'image/*,video/*', multiple: false, maxFiles: 1  },
];

// ─── Single media thumbnail in the grid ─────────────────────────────────────
function FileThumb({ file, order, selected, onToggle }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative aspect-square overflow-hidden bg-stone-900 active:opacity-80"
    >
      {src ? (
        file.type.startsWith('video/') ? (
          <video src={src} className="h-full w-full object-cover" muted playsInline />
        ) : (
          <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        )
      ) : (
        <div className="h-full w-full animate-pulse bg-stone-800" />
      )}
      {selected && <div className="pointer-events-none absolute inset-0 bg-black/25" />}
      <div className={`absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold leading-none transition-all ${
        selected
          ? 'bg-white text-stone-950 shadow'
          : 'border-[1.5px] border-white/70 bg-transparent'
      }`}>
        {selected && order > 0 ? order : ''}
      </div>
    </button>
  );
}

// ─── Camera tile in the grid ─────────────────────────────────────────────────
function CameraTile({ videoRef, streaming, onCapture }) {
  return (
    <button
      type="button"
      onClick={onCapture}
      className="relative aspect-square overflow-hidden bg-stone-900 active:opacity-80"
      aria-label="Tomar foto"
    >
      {streaming ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-stone-800">
          <Camera className="h-6 w-6 text-white/50" strokeWidth={1.5} />
          <span className="text-[10px] text-white/40">Cámara</span>
        </div>
      )}
    </button>
  );
}

// ─── Large media preview at top ──────────────────────────────────────────────
function LargePreview({ file, streaming, cameraVideoRef }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!file) { setSrc(null); return undefined; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file && !streaming) {
    return (
      <div className="h-full w-full bg-gradient-to-b from-stone-900 to-stone-950 flex items-center justify-center">
        <div className="space-y-2 text-center">
          <Images className="mx-auto h-10 w-10 text-white/20" strokeWidth={1.3} />
          <p className="text-[12px] text-white/30">Elige o captura una imagen</p>
        </div>
      </div>
    );
  }

  if (!file && streaming) {
    return (
      <video
        ref={cameraVideoRef}
        autoPlay playsInline muted
        className="h-full w-full object-cover"
      />
    );
  }

  if (file?.type.startsWith('video/')) {
    return <video src={src} className="h-full w-full object-cover" muted playsInline controls={false} />;
  }

  return <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreatorEntry({ onClose, onProceed, initialTab = 'post' }) {
  const [activeTab,     setActiveTab]     = useState(initialTab);
  const [facingMode,    setFacingMode]    = useState('environment');
  const [cameraStream,  setCameraStream]  = useState(null);
  const [cameraError,   setCameraError]   = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [allFiles,      setAllFiles]      = useState([]);
  const [multiSelect,   setMultiSelect]   = useState(false);
  const [isRecording,   setIsRecording]   = useState(false);
  const [recordSeconds,  setRecordSeconds] = useState(0);

  const fileInputRef    = useRef(null);
  const cameraVideoRef  = useRef(null);          // used in grid tile
  const largeVideoRef   = useRef(null);          // used in large preview (when no selection)
  const cameraStreamRef = useRef(null);          // stable ref for cleanup
  const mediaRecorderRef = useRef(null);
  const recordChunksRef  = useRef([]);
  const recordTimerRef   = useRef(null);

  const tab       = TABS.find((t) => t.id === activeTab);
  const streaming = Boolean(cameraStream) && !cameraError;

  // ── Camera lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let localStream = null;

    const start = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1350 } },
          audio: false,
        });
        if (cancelled) { localStream.getTracks().forEach((t) => t.stop()); return; }
        cameraStreamRef.current = localStream;
        setCameraStream(localStream);
        setCameraError(false);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    };

    start();
    return () => {
      cancelled = true;
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  // Attach stream to video elements whenever stream or refs change
  useEffect(() => {
    if (!cameraStream) return;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = cameraStream;
    if (largeVideoRef.current)  largeVideoRef.current.srcObject  = cameraStream;
  }, [cameraStream]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Capture photo from camera ────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    const video = cameraVideoRef.current || largeVideoRef.current;
    if (!video || !cameraStream) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 1080;
    canvas.height = video.videoHeight || 1350;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setAllFiles((prev) => [file, ...prev]);
      setSelectedFiles([file]);
    }, 'image/jpeg', 0.92);
  }, [cameraStream]);

  // ── Video recording (long-press) ───────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!cameraStream || isRecording) return;

    // Get audio stream and combine with video
    let combinedStream = cameraStream;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = [...cameraStream.getVideoTracks(), ...audioStream.getAudioTracks()];
      combinedStream = new MediaStream(tracks);
    } catch {
      // No audio permission — record video only
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    recordChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      clearInterval(recordTimerRef.current);
      setRecordSeconds(0);
      const blob = new Blob(recordChunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `video-${Date.now()}.${ext}`, { type: mimeType });
      setAllFiles((prev) => [file, ...prev]);
      setSelectedFiles([file]);
      setIsRecording(false);
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  }, [cameraStream, isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Clean up recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      clearInterval(recordTimerRef.current);
    };
  }, []);

  // ── File picker ──────────────────────────────────────────────────────────
  const handleFileInput = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setAllFiles(files);
    const toSelect = multiSelect ? files.slice(0, tab.maxFiles) : [files[0]];
    setSelectedFiles(toSelect);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [multiSelect, tab.maxFiles]);

  // ── Toggle selection of a file ───────────────────────────────────────────
  const toggleFile = useCallback((file) => {
    if (!multiSelect || tab.maxFiles === 1) {
      setSelectedFiles([file]);
      return;
    }
    setSelectedFiles((prev) => {
      if (prev.includes(file)) return prev.filter((f) => f !== file);
      if (prev.length >= tab.maxFiles) return prev;
      return [...prev, file];
    });
  }, [multiSelect, tab.maxFiles]);

  // ── Tab change ───────────────────────────────────────────────────────────
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSelectedFiles([]);
    setAllFiles([]);
    setMultiSelect(false);
  }, []);

  // ── Proceed to editor ────────────────────────────────────────────────────
  const handleProceed = useCallback(() => {
    if (selectedFiles.length === 0) return;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onProceed({ contentType: activeTab, files: selectedFiles });
  }, [activeTab, onProceed, selectedFiles]);

  const handleClose = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onClose();
  }, [onClose]);

  const hasFiles = selectedFiles.length > 0;

  // ── Swipe-down-to-close gesture ──────────────────────────────────────────
  const controls = useAnimation();
  useEffect(() => {
    controls.start({ y: 0, opacity: 1 });
  }, [controls]);
  const bindClose = useGesture({
    onDrag: ({ direction: [, dy], movement: [, my], cancel, event }) => {
      if (my > 80 && dy > 0) {
        cancel();
        controls.start({ y: '100%', opacity: 0 }).then(handleClose);
      }
    },
  }, { drag: { axis: 'y', filterTaps: true, from: () => [0, 0] } });

  return (
    <motion.div
      {...bindClose()}
      initial={{ y: '100%', opacity: 0.8 }}
      animate={controls}
      exit={{ y: '100%', opacity: 0.8 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white touch-none"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity active:opacity-50"
          aria-label="Cerrar"
        >
          <X className="h-6 w-6 text-white" strokeWidth={2} />
        </button>
        <span className="text-[15px] font-semibold text-white">Nueva publicación</span>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!hasFiles}
          className="text-[14px] font-semibold transition-opacity disabled:opacity-30 active:opacity-60"
          style={{ color: hasFiles ? '#fff' : undefined }}
        >
          Siguiente
        </button>
      </div>

      {/* ── Large preview ─────────────────────────────────────────────────── */}
      <div className="relative shrink-0 overflow-hidden bg-stone-950" style={{ height: '42vh' }}>
        <LargePreview
          file={selectedFiles[0] ?? null}
          streaming={streaming && selectedFiles.length === 0}
          cameraVideoRef={largeVideoRef}
        />

        {/* Camera flip button (only when camera is the preview source) */}
        {streaming && selectedFiles.length === 0 && (
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white active:bg-black/70"
            aria-label="Cambiar cámara"
          >
            <FlipHorizontal className="h-5 w-5" strokeWidth={1.8} />
          </button>
        )}

        {/* Text-only story button */}
        {activeTab === 'story' && selectedFiles.length === 0 && (
          <button
            type="button"
            onClick={() => onProceed({ contentType: 'story', files: [], textOnly: true })}
            className="absolute left-3 bottom-4 flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-2 text-[13px] font-semibold text-white backdrop-blur-sm active:bg-white/30"
          >
            <Type className="h-4 w-4" />
            Crear texto
          </button>
        )}

        {/* Capture / Record button (centered bottom of preview) */}
        {streaming && selectedFiles.length === 0 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            {(activeTab === 'reel' || activeTab === 'story') ? (
              <button
                type="button"
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
                className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-[4px] border-white/80 transition-all active:scale-95"
              >
                <div className={`rounded-full transition-all duration-200 ${
                  isRecording ? 'h-7 w-7 rounded-[6px] bg-red-500' : 'h-14 w-14 bg-red-500'
                }`} />
                {isRecording && (
                  <div className="absolute -top-8 rounded-full bg-red-500 px-2.5 py-0.5 text-[12px] font-bold text-white">
                    {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
                  </div>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[4px] border-white/80 active:scale-95"
              >
                <div className="h-14 w-14 rounded-full bg-white" />
              </button>
            )}
          </div>
        )}

        {/* Slide indicator for multi-select */}
        {selectedFiles.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {selectedFiles.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Content type tabs ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-white/8 py-2.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === t.id
                ? 'bg-white/90 text-black'
                : 'text-white/55 active:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Gallery section ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Section header */}
        <div className="flex shrink-0 items-center justify-between px-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[13px] font-semibold text-white active:opacity-60"
          >
            Recientes
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-2">
            {tab.multiple && (
              <button
                type="button"
                onClick={() => { setMultiSelect((v) => !v); if (multiSelect) setSelectedFiles(selectedFiles.slice(0, 1)); }}
                className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${
                  multiSelect
                    ? 'bg-white text-black'
                    : 'border border-white/30 text-white/70 active:bg-white/10'
                }`}
              >
                Seleccionar varios
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
              aria-label="Abrir galería"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Media grid */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {allFiles.length > 0 ? (
            <div className="grid grid-cols-3 gap-px">
              {/* Camera tile (first position) */}
              {!cameraError && (
                <CameraTile
                  videoRef={cameraVideoRef}
                  streaming={streaming}
                  onCapture={handleCapture}
                />
              )}
              {allFiles.map((file) => (
                <FileThumb
                  key={`${file.name}-${file.lastModified}`}
                  file={file}
                  order={selectedFiles.indexOf(file) + 1}
                  selected={selectedFiles.includes(file)}
                  onToggle={() => toggleFile(file)}
                />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="grid grid-cols-3 gap-px">
              {/* Camera tile */}
              {!cameraError && (
                <CameraTile
                  videoRef={cameraVideoRef}
                  streaming={streaming}
                  onCapture={handleCapture}
                />
              )}
              {/* Placeholder tiles */}
              {Array.from({ length: cameraError ? 6 : 5 }).map((_, i) => (
                <div key={i} className="aspect-square bg-stone-900" />
              ))}
              {/* Full-width gallery button */}
              <div className="col-span-3 flex flex-col items-center gap-3 py-8">
                <Images className="h-8 w-8 text-white/20" strokeWidth={1.4} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-black active:opacity-80"
                >
                  Abrir galería
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom "Siguiente" bar (animated) ─────────────────────────────── */}
      <AnimatePresence>
        {hasFiles && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="shrink-0 px-4 pb-3 pt-2"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
          >
            <button
              type="button"
              onClick={handleProceed}
              className="flex w-full items-center justify-center rounded-full bg-white py-3 text-[15px] font-semibold text-black transition-opacity active:opacity-80"
            >
              Siguiente
              {selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hidden file input ─────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept={tab.accept}
        multiple={tab.multiple && multiSelect}
        className="hidden"
        onChange={handleFileInput}
      />
    </motion.div>
  );
}
