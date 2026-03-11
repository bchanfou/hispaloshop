import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Crop,
  FlipHorizontal,
  FlipVertical,
  ImagePlus,
  Layers3,
  Palette,
  ShoppingBag,
  Type,
  Undo2,
  Redo2,
  X,
  RotateCw,
  MapPin,
} from 'lucide-react';
import useImageEditor from '../hooks/useImageEditor';
import FilterPanel from './FilterPanel';
import TextTool from './TextTool';
import StickerTool from './StickerTool';
import ProductTagTool from './ProductTagTool';
import CanvasEditor from './CanvasEditor';
import { ASPECT_RATIOS } from '../types/editor.types';

const TOOLS = [
  { id: 'filter', icon: Palette, label: 'Filtros' },
  { id: 'adjust', icon: Layers3, label: 'Ajustes' },
  { id: 'crop', icon: Crop, label: 'Recorte' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'sticker', icon: MapPin, label: 'Sellos' },
  { id: 'product', icon: ShoppingBag, label: 'Productos' },
];

const CONTENT_LABELS = {
  post: 'Publicación',
  reel: 'Reel',
  story: 'Historia',
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

function RangeField({ label, value, min, max, step = 1, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="text-stone-500">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
      />
    </div>
  );
}

function AdvancedEditor({ contentType, files, onClose, onPublish }) {
  const [activeTool, setActiveTool] = useState('filter');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[contentType][0]);
  const [showPreview, setShowPreview] = useState(false);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const editor = useImageEditor(contentType, aspectRatio);
  const fileInputRef = useRef(null);
  const hasLoadedInitialFilesRef = useRef(false);
  const contentLabel = CONTENT_LABELS[contentType] || 'Contenido';

  React.useEffect(() => {
    if (files?.length && !hasLoadedInitialFilesRef.current) {
      hasLoadedInitialFilesRef.current = true;
      files.forEach((file) => editor.addImage(file));
    }
  }, [files]);

  const taggedProductsCount = editor.stickerElements.filter((item) => item.type === 'product').length;

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
        taggedProducts: editor.stickerElements.filter((item) => item.type === 'product'),
      });
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

  const renderToolPanel = () => {
    switch (activeTool) {
      case 'filter':
        return (
          <FilterPanel
            settings={editor.filterSettings}
            appliedFilter={editor.appliedFilter}
            onSettingChange={editor.updateFilterSetting}
            onFilterSelect={editor.applyPredefinedFilter}
            onReset={editor.resetFilters}
          />
        );
      case 'adjust':
        return (
          <EditorSection
            title="Ajustes finos"
            description="Haz cambios pequeños y medidos. El objetivo es limpiar la imagen, no sobreprocesarla."
          >
            <div className="space-y-4 rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <RangeField label="Brillo" value={editor.filterSettings.brightness} min={-100} max={100} onChange={(event) => editor.updateFilterSetting('brightness', parseInt(event.target.value, 10))} />
              <RangeField label="Contraste" value={editor.filterSettings.contrast} min={-100} max={100} onChange={(event) => editor.updateFilterSetting('contrast', parseInt(event.target.value, 10))} />
              <RangeField label="Saturación" value={editor.filterSettings.saturate} min={0} max={200} onChange={(event) => editor.updateFilterSetting('saturate', parseInt(event.target.value, 10))} />
              <RangeField label="Temperatura" value={editor.filterSettings.warmth} min={-100} max={100} onChange={(event) => editor.updateFilterSetting('warmth', parseInt(event.target.value, 10))} />
              <RangeField label="Exposición" value={editor.filterSettings.exposure} min={-100} max={100} onChange={(event) => editor.updateFilterSetting('exposure', parseInt(event.target.value, 10))} />
              <RangeField label="Nitidez" value={editor.filterSettings.sharpness} min={0} max={100} onChange={(event) => editor.updateFilterSetting('sharpness', parseInt(event.target.value, 10))} />
            </div>
          </EditorSection>
        );
      case 'crop':
        return (
          <EditorSection
            title="Encuadre"
            description="Mantén un marco limpio. Usa zoom y ratio con intención para dejar respirar el contenido."
          >
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={editor.rotateImage} className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100">
                <RotateCw className="mx-auto mb-2 h-4 w-4" />
                Rotar
              </button>
              <button type="button" onClick={editor.flipImageHorizontal} className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${editor.flipHorizontal ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}>
                <FlipHorizontal className="mx-auto mb-2 h-4 w-4" />
                Espejo H
              </button>
              <button type="button" onClick={editor.flipImageVertical} className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${editor.flipVertical ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}>
                <FlipVertical className="mx-auto mb-2 h-4 w-4" />
                Espejo V
              </button>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Proporción</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ASPECT_RATIOS[contentType].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      aspectRatio === ratio ? 'bg-stone-950 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <RangeField label="Zoom" value={editor.zoom.toFixed(1)} min={0.5} max={3} step={0.1} onChange={(event) => editor.setZoomLevel(parseFloat(event.target.value))} />
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

  const previewMeta = useMemo(() => {
    if (contentType === 'story') {
      return 'Publica una historia con texto libre y composición vertical.';
    }
    if (contentType === 'reel') {
      return 'Revisa portada, copy y etiquetas antes de publicar.';
    }
    return 'Confirma pie de foto, ubicación y la composición final.';
  }, [contentType]);

  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 backdrop-blur-sm">
          <button type="button" onClick={() => setShowPreview(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15" aria-label="Volver al editor">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Vista previa</p>
            <h2 className="mt-1 text-sm font-semibold text-white">{contentLabel}</h2>
          </div>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? 'Publicando...' : contentType === 'story' ? 'Publicar historia' : 'Publicar'}
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex items-center justify-center overflow-hidden p-4">
            <CanvasEditor editor={editor} aspectRatio={aspectRatio} readOnly={true} />
          </div>

          <div className="border-t border-white/10 bg-black/20 p-4 md:border-l md:border-t-0">
            <div className="rounded-3xl bg-white p-4 text-stone-950 shadow-xl">
              <h3 className="text-base font-semibold">Antes de publicar</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">{previewMeta}</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Texto principal</label>
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder={contentType === 'story' ? 'Añade contexto breve si lo necesitas.' : 'Escribe una descripción clara y natural.'}
                    className="mt-2 h-28 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition-colors focus:border-stone-950"
                    maxLength={contentType === 'story' ? 180 : 2200}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Ubicación</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Añadir ubicación"
                    className="mt-2 h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-950 outline-none transition-colors focus:border-stone-950"
                  />
                </div>

                {taggedProductsCount > 0 ? (
                  <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {taggedProductsCount} producto(s) etiquetado(s) en esta pieza.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 text-white">
      <div className="flex h-full flex-col md:grid md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15" aria-label="Cerrar editor">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">{contentLabel}</p>
              <h1 className="mt-1 text-sm font-semibold text-white">Editor de contenido</h1>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={editor.undo} disabled={!editor.canUndo} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15 disabled:opacity-35" aria-label="Deshacer">
                <Undo2 className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={editor.redo} disabled={!editor.canRedo} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15 disabled:opacity-35" aria-label="Rehacer">
                <Redo2 className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={() => setShowPreview(true)} className="hidden h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100 md:inline-flex">
                Continuar
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
            {editor.images.length > 0 ? (
              <CanvasEditor editor={editor} aspectRatio={aspectRatio} activeTool={activeTool} />
            ) : (
              <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <ImagePlus className="h-7 w-7" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-white">Añade tu primer archivo</h2>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Usa una imagen o vídeo y después ajusta texto, filtros, encuadre y etiquetas desde un solo sitio.
                </p>
                <button type="button" onClick={handleAddMore} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100">
                  Seleccionar archivo
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
                    <img src={image.src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        editor.removeImage(index);
                      }}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
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
                    aria-label="Añadir otro archivo"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="px-4 pb-4 md:hidden">
            <button type="button" onClick={() => setShowPreview(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-stone-950">
              Continuar
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-t-3xl bg-white text-stone-950 md:rounded-none md:border-l md:border-stone-200">
          <div className="border-b border-stone-100 px-4 pt-3 md:pt-4">
            <div className="flex gap-2 overflow-x-auto pb-3">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setActiveTool(tool.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tool.label}
                  </button>
                );
              })}
            </div>
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
        accept={contentType === 'reel' ? 'video/*' : 'image/*,video/*'}
        multiple={contentType === 'post'}
        className="hidden"
        onChange={handleFileSelect}
      />
      <canvas ref={editor.canvasRef} className="hidden" />
    </div>
  );
}

export default AdvancedEditor;
