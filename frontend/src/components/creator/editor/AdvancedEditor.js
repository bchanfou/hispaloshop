import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  Film,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  ImagePlus,
  LayoutTemplate,
  Layers3,
  MapPin,
  Palette,
  Redo2,
  RotateCw,
  ShoppingBag,
  Type,
  Undo2,
  Upload,
  X,
  Circle,
} from 'lucide-react';
import useImageEditor from '../hooks/useImageEditor';
import FilterPanel from './FilterPanel';
import CompositionToolPanel from './CompositionToolPanel';
import ReelToolPanel from './ReelToolPanel';
import TextTool from './TextTool';
import StickerTool from './StickerTool';
import ProductTagTool from './ProductTagTool';
import CanvasEditor from './CanvasEditor';
import { ASPECT_RATIOS } from '../types/editor.types';

const EDITOR_SESSION_DRAFT_KEY = 'hispaloshop_editor_session_draft';

const BASE_TOOLS = [
  { id: 'reel', icon: Film, label: 'Video', onlyFor: ['reel'], primary: true },
  { id: 'composition', icon: LayoutTemplate, label: 'Plantilla', primary: false },
  { id: 'filter', icon: Palette, label: 'Filtro', primary: true },
  { id: 'adjust', icon: Layers3, label: 'Luz', primary: false },
  { id: 'crop', icon: Crop, label: 'Recorte' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'sticker', icon: MapPin, label: 'Sello', primary: true },
  { id: 'product', icon: ShoppingBag, label: 'Productos' },
];

const CONTENT_LABELS = {
  post: 'Publicacion',
  reel: 'Reel',
  story: 'Historia',
};

const STAGE_ORDER = ['media', 'edit', 'compose'];
const STAGE_LABELS = {
  media: 'Media',
  edit: 'Editar',
  compose: 'Publicar',
};

const CONTENT_GUIDANCE = {
  post: {
    eyebrow: 'Post',
    title: 'Elige fotos',
    description: 'Foto o carrusel.',
    accept: 'image/*',
    allowMultiple: true,
    icon: ImageIcon,
    meta: 'Hasta 10.',
  },
  reel: {
    eyebrow: 'Reel',
    title: 'Elige un video',
    description: 'Vertical recomendado.',
    accept: 'video/*',
    allowMultiple: false,
    icon: Film,
    meta: '1 video.',
  },
  story: {
    eyebrow: 'Story',
    title: 'Elige una imagen',
    description: 'Rapida y vertical.',
    accept: 'image/*',
    allowMultiple: false,
    icon: ImageIcon,
    meta: '1 imagen.',
  },
};

function EditorSection({ title, description, children }) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function RangeField({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="text-stone-500">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event)}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
      />
    </div>
  );
}

function StageStepper({ currentStage, theme = 'dark' }) {
  const activeIndex = STAGE_ORDER.indexOf(currentStage);
  const activeBg = theme === 'dark' ? 'bg-white text-stone-950' : 'bg-stone-950 text-white';
  const idleBg = theme === 'dark' ? 'bg-white/10 text-white/60' : 'bg-stone-100 text-stone-500';

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {STAGE_ORDER.map((stage, index) => {
        const isActive = stage === currentStage;
        const isCompleted = activeIndex > index;

        return (
          <div key={stage} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                isActive ? activeBg : idleBg
              }`}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            {index < STAGE_ORDER.length - 1 ? (
              <ChevronRight className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-white/25' : 'text-stone-300'}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LayerSummary({ editor }) {
  const textCount = editor.textElements.length;
  const utilityStickers = editor.stickerElements.filter((item) => item.type !== 'product');
  const locationCount = utilityStickers.filter((item) => item.type === 'location').length;
  const stickerCount = utilityStickers.length - locationCount;
  const productCount = editor.stickerElements.filter((item) => item.type === 'product').length;

  const items = [
    { id: 'text', label: 'Texto', value: textCount },
    { id: 'sticker', label: 'Sellos', value: Math.max(stickerCount, 0) },
    { id: 'product', label: 'Producto', value: productCount },
    { id: 'location', label: 'Ubicacion', value: locationCount },
  ];

  return (
    <div className="border-b border-stone-100 px-4 py-4">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-full bg-stone-100 px-3 py-2.5 text-sm font-medium text-stone-700">
            {item.label} {item.value}
          </div>
        ))}
      </div>
      <div className="mt-3 inline-flex min-h-11 items-center rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white">
        {editor.compositionSettings?.templateId || 'free'}
      </div>
    </div>
  );
}

function MediaStage({ contentType, guidance, onClose, onPick, canRestoreDraft, onRestoreDraft }) {
  const GuidanceIcon = guidance.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
          aria-label="Cerrar editor"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 px-4">
          <StageStepper currentStage="media" theme="dark" />
        </div>
        <div className="h-11 w-11" />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-stone-950 shadow-lg">
            <GuidanceIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{guidance.title}</h1>
          <p className="mt-3 text-base text-white/72">{guidance.description}</p>

          <button
            type="button"
            onClick={onPick}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-stone-950 transition-colors hover:bg-stone-100"
          >
            <Upload className="h-4 w-4" />
            Elegir
          </button>

          {canRestoreDraft ? (
            <button
              type="button"
              onClick={onRestoreDraft}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Borrador
            </button>
          ) : null}

          <p className="mt-4 text-center text-sm leading-5 text-white/45">{guidance.meta}</p>
        </div>
      </div>
    </div>
  );
}

function ComposeStage({
  contentType,
  aspectRatio,
  editor,
  caption,
  location,
  setCaption,
  setLocation,
  taggedProductsCount,
  isPublishing,
  onBack,
  onPublish,
}) {
  const previewMeta = useMemo(() => {
    if (contentType === 'story') return 'story';
    if (contentType === 'reel') return 'reel';
    return 'post';
  }, [contentType]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
          aria-label="Volver al editor"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 px-4">
          <StageStepper currentStage="compose" theme="dark" />
        </div>
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPublishing ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex items-center justify-center overflow-hidden p-4">
          <div className="w-full max-w-[420px]">
            <CanvasEditor editor={editor} aspectRatio={aspectRatio} contentType={contentType} readOnly={true} />
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3 text-xs text-white/75">
              <span className="uppercase tracking-[0.2em]">{previewMeta}</span>
              <span>{editor.compositionSettings?.templateId || 'free'}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/20 p-4 md:border-l md:border-t-0">
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 text-stone-950 shadow-xl">
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
                  Texto {editor.textElements.length}
                </div>
                <div className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
                  Productos {taggedProductsCount}
                </div>
                {contentType === 'reel' ? (
                  <>
                    <div className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
                      {editor.reelSettings.trimStart.toFixed(1)}s - {editor.reelSettings.trimEnd.toFixed(1)}s
                    </div>
                    <div className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
                      {editor.reelSettings.playbackRate}x . {editor.reelSettings.isMuted ? 'Mute' : 'Audio'}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                <Circle className="h-2.5 w-2.5 fill-current" />
                Guardado
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 text-stone-950 shadow-xl">
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Texto"
                className="h-28 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base leading-6 text-stone-950 outline-none transition-colors focus:border-stone-950"
                maxLength={contentType === 'story' ? 180 : 2200}
              />

              <div className="mt-4">
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Ubicacion"
                  className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base text-stone-950 outline-none transition-colors focus:border-stone-950"
                />
              </div>

              <div className="mt-4 inline-flex min-h-11 items-center rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">
                {taggedProductsCount > 0
                  ? `${taggedProductsCount} producto(s)`
                  : '0 productos'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancedEditor({ contentType, files, onClose, onPublish }) {
  const [activeTool, setActiveTool] = useState(contentType === 'reel' ? 'reel' : 'filter');
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[contentType][0]);
  const [currentStage, setCurrentStage] = useState(files?.length ? 'edit' : 'media');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasRecoverableDraft, setHasRecoverableDraft] = useState(false);

  const editor = useImageEditor(contentType, aspectRatio);
  const fileInputRef = useRef(null);
  const hasLoadedInitialFilesRef = useRef(false);
  const contentLabel = CONTENT_LABELS[contentType] || 'Contenido';
  const guidance = CONTENT_GUIDANCE[contentType] || CONTENT_GUIDANCE.post;
  const tools = BASE_TOOLS.filter((tool) => !tool.onlyFor || tool.onlyFor.includes(contentType));
  const primaryTools = tools.filter((tool) => tool.primary !== false);
  const secondaryTools = tools.filter((tool) => tool.primary === false);

  React.useEffect(() => {
    if (files?.length && !hasLoadedInitialFilesRef.current) {
      hasLoadedInitialFilesRef.current = true;
      files.forEach((file) => editor.addImage(file));
    }
  }, [editor, files]);

  React.useEffect(() => {
    if (editor.images.length > 0 && currentStage === 'media') {
      setCurrentStage('edit');
    }
  }, [currentStage, editor.images.length]);

  React.useEffect(() => {
    const sessionDraft = localStorage.getItem(EDITOR_SESSION_DRAFT_KEY);
    if (!sessionDraft) {
      setHasRecoverableDraft(false);
      return;
    }

    try {
      const parsedDraft = JSON.parse(sessionDraft);
      setHasRecoverableDraft(parsedDraft.contentType === contentType && editor.hasSavedDraft());
    } catch (error) {
      console.warn('[creator] invalid session draft', error);
      setHasRecoverableDraft(false);
    }
  }, [contentType, editor]);

  React.useEffect(() => {
    if (editor.images.length === 0) {
      return undefined;
    }

    const sessionDraft = {
      contentType,
      aspectRatio,
      caption,
      location,
      currentStage,
      savedAt: Date.now(),
    };

    localStorage.setItem(EDITOR_SESSION_DRAFT_KEY, JSON.stringify(sessionDraft));
    editor.saveDraft();

    const handleBeforeUnload = () => {
      localStorage.setItem(EDITOR_SESSION_DRAFT_KEY, JSON.stringify(sessionDraft));
      editor.saveDraft();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [aspectRatio, caption, contentType, currentStage, editor, location]);

  const taggedProductsCount = editor.stickerElements.filter((item) => item.type === 'product').length;

  const clearSavedDraft = React.useCallback(() => {
    editor.clearDraft();
    localStorage.removeItem(EDITOR_SESSION_DRAFT_KEY);
    setHasRecoverableDraft(false);
  }, [editor]);

  const restoreDraft = React.useCallback(() => {
    const restoredDraft = editor.loadDraft();
    const sessionDraft = localStorage.getItem(EDITOR_SESSION_DRAFT_KEY);

    if (!restoredDraft || !sessionDraft) {
      setHasRecoverableDraft(false);
      return;
    }

    try {
      const parsedSession = JSON.parse(sessionDraft);
      if (parsedSession.contentType !== contentType) {
        return;
      }
      if (parsedSession.aspectRatio && ASPECT_RATIOS[contentType].includes(parsedSession.aspectRatio)) {
        setAspectRatio(parsedSession.aspectRatio);
      }
      setCaption(parsedSession.caption || '');
      setLocation(parsedSession.location || '');
      setCurrentStage(restoredDraft.images?.length ? (parsedSession.currentStage === 'compose' ? 'compose' : 'edit') : 'media');
      setHasRecoverableDraft(false);
    } catch (error) {
      console.warn('[creator] draft restore failed', error);
    }
  }, [contentType, editor]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const finalImage = contentType === 'reel' ? null : await editor.renderFinalCanvas();
      await onPublish({
        contentType,
        caption,
        location,
        aspectRatio,
        imageData: finalImage,
        sourceFile: editor.images[0]?.file || null,
        sourceFiles: editor.images.map((image) => image.file).filter(Boolean),
        reelSettings: editor.reelSettings,
        taggedProducts: editor.stickerElements.filter((item) => item.type === 'product'),
      });
      clearSavedDraft();
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddMore = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    incomingFiles.forEach((file) => editor.addImage(file));
    event.target.value = '';
  };

  const goToPreviousStage = () => {
    if (currentStage === 'compose') {
      setCurrentStage('edit');
      return;
    }
    if (currentStage === 'edit') {
      setCurrentStage('media');
      return;
    }
    onClose();
  };

  const handleClose = () => {
    if (editor.images.length > 0) {
      localStorage.setItem(
        EDITOR_SESSION_DRAFT_KEY,
        JSON.stringify({
          contentType,
          aspectRatio,
          caption,
          location,
          currentStage,
          savedAt: Date.now(),
        })
      );
      editor.saveDraft();
    }
    onClose();
  };

  const renderToolPanel = () => {
    switch (activeTool) {
      case 'reel':
        return <ReelToolPanel editor={editor} />;
      case 'composition':
        return (
          <CompositionToolPanel
            contentType={contentType}
            compositionSettings={editor.compositionSettings}
            onApplyTemplate={editor.applyCompositionTemplate}
          />
        );
      case 'filter':
        return (
          <FilterPanel
            settings={editor.filterSettings}
            appliedFilter={editor.appliedFilter}
            filterIntensity={editor.filterIntensity}
            onSettingChange={editor.updateFilterSetting}
            onFilterSelect={editor.applyPredefinedFilter}
            onFilterIntensityChange={editor.setFilterIntensity}
            onReset={editor.resetFilters}
          />
        );
      case 'adjust':
        return (
          <EditorSection
            title="Ajustes"
            description="Luz y color."
          >
            <div className="space-y-4 rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <RangeField
                label="Brillo"
                value={editor.filterSettings.brightness}
                min={-100}
                max={100}
                onChange={(event) => editor.updateFilterSetting('brightness', parseInt(event.target.value, 10))}
              />
              <RangeField
                label="Contraste"
                value={editor.filterSettings.contrast}
                min={-100}
                max={100}
                onChange={(event) => editor.updateFilterSetting('contrast', parseInt(event.target.value, 10))}
              />
              <RangeField
                label="Saturacion"
                value={editor.filterSettings.saturate}
                min={0}
                max={200}
                onChange={(event) => editor.updateFilterSetting('saturate', parseInt(event.target.value, 10))}
              />
              <RangeField
                label="Temperatura"
                value={editor.filterSettings.warmth}
                min={-100}
                max={100}
                onChange={(event) => editor.updateFilterSetting('warmth', parseInt(event.target.value, 10))}
              />
              <RangeField
                label="Exposicion"
                value={editor.filterSettings.exposure}
                min={-100}
                max={100}
                onChange={(event) => editor.updateFilterSetting('exposure', parseInt(event.target.value, 10))}
              />
              <RangeField
                label="Nitidez"
                value={editor.filterSettings.sharpness}
                min={0}
                max={100}
                onChange={(event) => editor.updateFilterSetting('sharpness', parseInt(event.target.value, 10))}
              />
            </div>
          </EditorSection>
        );
      case 'crop':
        return (
          <EditorSection
            title="Encuadre"
            description="Zoom, giro y formato."
          >
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={editor.rotateImage}
                className="min-h-12 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
              >
                <RotateCw className="mx-auto mb-2 h-4 w-4" />
                Rotar
              </button>
              <button
                type="button"
                onClick={editor.flipImageHorizontal}
                className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                  editor.flipHorizontal
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <FlipHorizontal className="mx-auto mb-2 h-4 w-4" />
                Espejo H
              </button>
              <button
                type="button"
                onClick={editor.flipImageVertical}
                className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                  editor.flipVertical
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <FlipVertical className="mx-auto mb-2 h-4 w-4" />
                Espejo V
              </button>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Proporcion</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ASPECT_RATIOS[contentType].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-stone-950 text-white'
                        : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <RangeField
                  label="Zoom"
                  value={editor.zoom.toFixed(1)}
                  min={0.5}
                  max={3}
                  step={0.1}
                  suffix="x"
                  onChange={(event) => editor.setZoomLevel(parseFloat(event.target.value))}
                />
              </div>
            </div>
          </EditorSection>
        );
      case 'text':
        return (
          <TextTool
            texts={editor.textElements}
            onAdd={editor.addText}
            onUpdate={editor.updateText}
            onRemove={editor.removeText}
          />
        );
      case 'sticker':
        return (
          <StickerTool
            stickers={editor.stickerElements}
            onAdd={editor.addSticker}
            onUpdate={editor.updateElement}
            onRemove={editor.removeElement}
          />
        );
      case 'product':
        return (
          <ProductTagTool
            tags={editor.stickerElements.filter((item) => item.type === 'product')}
            onAdd={editor.addProductTag}
            onUpdate={editor.updateElement}
            onRemove={editor.removeElement}
          />
        );
      default:
        return null;
    }
  };

  if (currentStage === 'media') {
    return (
      <>
        <MediaStage
          contentType={contentType}
          guidance={guidance}
          onClose={handleClose}
          onPick={handleAddMore}
          canRestoreDraft={hasRecoverableDraft}
          onRestoreDraft={restoreDraft}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={guidance.accept}
          multiple={guidance.allowMultiple}
          className="hidden"
          onChange={handleFileSelect}
        />
        <canvas ref={editor.canvasRef} className="hidden" />
      </>
    );
  }

  if (currentStage === 'compose') {
    return (
      <>
        <ComposeStage
          contentType={contentType}
          aspectRatio={aspectRatio}
          editor={editor}
          caption={caption}
          location={location}
          setCaption={setCaption}
          setLocation={setLocation}
          taggedProductsCount={taggedProductsCount}
          isPublishing={isPublishing}
          onBack={goToPreviousStage}
          onPublish={handlePublish}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={guidance.accept}
          multiple={guidance.allowMultiple}
          className="hidden"
          onChange={handleFileSelect}
        />
        <canvas ref={editor.canvasRef} className="hidden" />
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 text-white">
      <div className="flex h-full flex-col md:grid md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <button
              type="button"
              onClick={goToPreviousStage}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <StageStepper currentStage="edit" theme="dark" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={editor.undo}
                disabled={!editor.canUndo}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15 disabled:opacity-35"
                aria-label="Deshacer"
              >
                <Undo2 className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={editor.redo}
                disabled={!editor.canRedo}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15 disabled:opacity-35"
                aria-label="Rehacer"
              >
                <Redo2 className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentStage('compose')}
                className="hidden h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100 md:inline-flex"
              >
                Continuar
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
            {editor.images.length > 0 ? (
              <CanvasEditor
                editor={editor}
                aspectRatio={aspectRatio}
                activeTool={activeTool}
                contentType={contentType}
              />
            ) : (
              <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <ImagePlus className="h-7 w-7" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-white">Anade un archivo</h2>
                <p className="mt-2 text-sm text-white/60">Toca Elegir para empezar.</p>
                <button
                  type="button"
                  onClick={handleAddMore}
                  className="mt-6 inline-flex min-h-12 rounded-full bg-white px-6 py-3 text-base font-semibold text-stone-950 transition-colors hover:bg-stone-100"
                >
                  Elegir
                </button>
              </div>
            )}
          </div>

          {editor.images.length > 1 ? (
            <div className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-3">
                {editor.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => editor.setCurrentImage(index)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border ${
                      editor.currentImageIndex === index ? 'border-white' : 'border-transparent'
                    }`}
                  >
                    {image.type === 'video' ? (
                      <video src={image.src} className="h-full w-full object-cover" muted playsInline />
                    ) : (
                      <img src={image.src} alt="" className="h-full w-full object-cover" />
                    )}
                    {contentType === 'post' && editor.images.length > 1 ? (
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            editor.moveImage(index, index - 1);
                          }}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-35"
                          aria-label="Mover a la izquierda"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === editor.images.length - 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            editor.moveImage(index, index + 1);
                          }}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-35"
                          aria-label="Mover a la derecha"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        editor.removeImage(index);
                      }}
                      className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
                      aria-label="Eliminar archivo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </button>
                ))}

                {contentType === 'post' && editor.images.length < 10 ? (
                  <button
                    type="button"
                    onClick={handleAddMore}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/20 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                    aria-label="Anadir otro archivo"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="px-4 pb-4 md:hidden">
            <button
              type="button"
              onClick={() => setCurrentStage('compose')}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-semibold text-stone-950"
            >
              Continuar
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-t-3xl bg-white text-stone-950 md:rounded-none md:border-l md:border-stone-200">
          <LayerSummary editor={editor} />

          <div className="border-b border-stone-100 px-4 pt-3 md:pt-4">
            <div className="flex gap-2 overflow-x-auto pb-3">
              {primaryTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setActiveTool(tool.id);
                      setShowMoreTools(false);
                    }}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tool.label}
                  </button>
                );
              })}
              {secondaryTools.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowMoreTools((prev) => !prev)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                    showMoreTools ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Layers3 className="h-4 w-4" />
                  Mas
                </button>
              ) : null}
            </div>

            {showMoreTools ? (
              <div className="flex gap-2 overflow-x-auto pb-3">
                {secondaryTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        setActiveTool(tool.id);
                        setShowMoreTools(false);
                      }}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTool}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.16 }}
              >
                {renderToolPanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={guidance.accept}
        multiple={guidance.allowMultiple}
        className="hidden"
        onChange={handleFileSelect}
      />
      <canvas ref={editor.canvasRef} className="hidden" />
    </div>
  );
}

export default AdvancedEditor;
