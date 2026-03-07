import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, ArrowLeft, Type, Sticker, Palette, 
  Crop, RotateCw, FlipHorizontal, FlipVertical, 
  ZoomIn, Undo, Redo, Download, Layers, ShoppingBag,
  Pencil, Eraser, XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useImageEditor from '../hooks/useImageEditor';
import FilterPanel from './FilterPanel';
import TextTool from './TextTool';
import StickerTool from './StickerTool';
import DrawTool from './DrawTool';
import ProductTagTool from './ProductTagTool';
import CanvasEditor from './CanvasEditor';
import { PREDEFINED_FILTERS, ASPECT_RATIOS, HISPALO_COLORS } from '../types/editor.types';

const TOOLS = [
  { id: 'filter', icon: Palette, label: 'Filtros' },
  { id: 'adjust', icon: Layers, label: 'Ajustes' },
  { id: 'crop', icon: Crop, label: 'Recorte' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'sticker', icon: Sticker, label: 'Stickers' },
  { id: 'draw', icon: Pencil, label: 'Dibujo' },
  { id: 'product', icon: ShoppingBag, label: 'Productos' },
];

function AdvancedEditor({ contentType, files, onClose, onPublish }) {
  const { t } = useTranslation();
  const [activeTool, setActiveTool] = useState('filter');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[contentType][0]);
  const [showPreview, setShowPreview] = useState(false);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const editor = useImageEditor(contentType, aspectRatio);
  const fileInputRef = useRef(null);

  // Cargar imágenes iniciales
  React.useEffect(() => {
    if (files && files.length > 0) {
      files.forEach(file => editor.addImage(file));
    }
  }, [files]);

  // Manejar publicación
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // Generar canvas final
      const finalImage = await editor.renderFinalCanvas();
      
      // Simular progreso de subida
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(r => setTimeout(r, 200));
      }
      
      // Preparar datos
      const publishData = {
        contentType,
        caption,
        location,
        aspectRatio,
        imageData: finalImage,
        taggedProducts: editor.stickerElements.filter(s => s.type === 'product'),
      };
      
      onPublish(publishData);
    } catch (error) {
      console.error('Error publishing:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Añadir más archivos
  const handleAddMore = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    newFiles.forEach(file => editor.addImage(file));
    e.target.value = '';
  };

  // Renderizar herramienta activa
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
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-stone-700">Ajustes manuales</h3>
            {[
              { key: 'brightness', label: 'Brillo', min: -100, max: 100 },
              { key: 'contrast', label: 'Contraste', min: -100, max: 100 },
              { key: 'saturate', label: 'Saturación', min: 0, max: 200 },
              { key: 'warmth', label: 'Temperatura', min: -100, max: 100 },
              { key: 'sharpness', label: 'Nitidez', min: 0, max: 100 },
              { key: 'exposure', label: 'Exposición', min: -100, max: 100 },
            ].map(({ key, label, min, max }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>{label}</span>
                  <span>{editor.filterSettings[key]}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={editor.filterSettings[key]}
                  onChange={(e) => editor.updateFilterSetting(key, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
                />
              </div>
            ))}
          </div>
        );
      case 'crop':
        return (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-stone-700">Recorte y transformación</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={editor.rotateImage}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <RotateCw className="w-5 h-5 text-stone-600" />
                <span className="text-xs text-stone-500">Rotar</span>
              </button>
              <button
                onClick={editor.flipImageHorizontal}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                  editor.flipHorizontal ? 'bg-[#2D5A3D] text-white' : 'bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <FlipHorizontal className="w-5 h-5" />
                <span className="text-xs">Voltear H</span>
              </button>
              <button
                onClick={editor.flipImageVertical}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                  editor.flipVertical ? 'bg-[#2D5A3D] text-white' : 'bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <FlipVertical className="w-5 h-5" />
                <span className="text-xs">Voltear V</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-stone-500">Ratio de aspecto</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS[contentType].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-[#2D5A3D] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-stone-500">Zoom</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={editor.zoom}
                onChange={(e) => editor.setZoomLevel(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
              />
            </div>
          </div>
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
      case 'draw':
        return (
          <DrawTool
            paths={editor.drawingPaths}
            onAddPath={editor.addDrawingPath}
            onClear={editor.clearDrawing}
          />
        );
      case 'product':
        return (
          <ProductTagTool
            tags={editor.stickerElements.filter(s => s.type === 'product')}
            onAdd={editor.addProductTag}
            onUpdate={editor.updateElement}
            onRemove={editor.removeElement}
          />
        );
      default:
        return null;
    }
  };

  // Vista previa final
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
          <button onClick={() => setShowPreview(false)} className="p-2 text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white font-semibold">Vista previa</h2>
          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-4 py-2 bg-[#2D5A3D] text-white rounded-full text-sm font-medium disabled:opacity-50"
          >
            {isPublishing ? `${uploadProgress}%` : 'Publicar'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 bg-stone-900">
          <div className="relative max-h-full max-w-full">
            <CanvasEditor
              editor={editor}
              aspectRatio={aspectRatio}
              readOnly={true}
            />
          </div>
        </div>

        <div className="p-4 bg-black/80 backdrop-blur-sm space-y-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escribe una descripción..."
            className="w-full bg-stone-800 text-white rounded-xl p-3 text-sm resize-none h-20 outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            maxLength={contentType === 'story' ? 150 : 2200}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Añadir ubicación"
              className="flex-1 bg-stone-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            />
          </div>
          {editor.stickerElements.filter(s => s.type === 'product').length > 0 && (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <ShoppingBag className="w-4 h-4" />
              <span>{editor.stickerElements.filter(s => s.type === 'product').length} producto(s) etiquetado(s)</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col md:flex-row">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col bg-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
          <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={editor.undo}
              disabled={!editor.canUndo}
              className="p-2 text-white disabled:opacity-30 hover:bg-white/10 rounded-full"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={editor.redo}
              disabled={!editor.canRedo}
              className="p-2 text-white disabled:opacity-30 hover:bg-white/10 rounded-full"
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setShowPreview(true)}
            className="p-2 text-white hover:bg-white/10 rounded-full"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {editor.images.length > 0 ? (
            <CanvasEditor
              editor={editor}
              aspectRatio={aspectRatio}
              activeTool={activeTool}
            />
          ) : (
            <div className="text-center text-stone-500">
              <p>No hay imágenes</p>
              <button
                onClick={handleAddMore}
                className="mt-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-full text-sm"
              >
                Añadir imagen
              </button>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {editor.images.length > 1 && (
          <div className="p-4 bg-black/80 backdrop-blur-sm">
            <div className="flex gap-2 overflow-x-auto">
              {editor.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => editor.setCurrentImage(idx)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${
                    editor.currentImageIndex === idx ? 'ring-2 ring-[#2D5A3D]' : ''
                  }`}
                >
                  <img src={img.src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.removeImage(idx);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full"
                  >
                    <XCircle className="w-3 h-3 text-white" />
                  </button>
                </button>
              ))}
              {contentType === 'post' && editor.images.length < 10 && (
                <button
                  onClick={handleAddMore}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-600 flex items-center justify-center text-stone-500 hover:border-[#2D5A3D] hover:text-[#2D5A3D]"
                >
                  <span className="text-2xl">+</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tools Panel */}
      <div className="w-full md:w-80 bg-white flex flex-col h-1/3 md:h-full">
        {/* Tool Tabs */}
        <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-stone-200">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-3 px-4 py-3 md:py-4 whitespace-nowrap transition-colors ${
                  activeTool === tool.id
                    ? 'text-[#2D5A3D] bg-[#2D5A3D]/10 border-b-2 md:border-b-0 md:border-r-2 border-[#2D5A3D]'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tool Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderToolPanel()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={contentType === 'reel' ? 'video/*' : 'image/*,video/*'}
        multiple={contentType === 'post'}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Hidden canvas for export */}
      <canvas ref={editor.canvasRef} className="hidden" />
    </div>
  );
}

export default AdvancedEditor;
