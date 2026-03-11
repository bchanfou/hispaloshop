import { useState, useCallback, useRef, useEffect } from 'react';
import { PREDEFINED_FILTERS, ASPECT_RATIO_DIMENSIONS } from '../types/editor.types';

const DEFAULT_FILTER_SETTINGS = {
  brightness: 0,
  contrast: 0,
  saturate: 100,
  warmth: 0,
  sharpness: 0,
  exposure: 0,
};

const MAX_HISTORY_STEPS = 10;

function getCanvasFontFamily(fontFamily) {
  if (fontFamily === 'serif') return 'Georgia, Cambria, "Times New Roman", serif';
  if (fontFamily === 'handwritten') return '"Brush Script MT", "Segoe Script", cursive';
  return 'Arial, Helvetica, sans-serif';
}

function mixFilterSettings(targetSettings, intensity) {
  const ratio = Math.max(0, Math.min(100, intensity)) / 100;
  return {
    brightness: Math.round(targetSettings.brightness * ratio),
    contrast: Math.round(targetSettings.contrast * ratio),
    saturate: Math.round(100 + (targetSettings.saturate - 100) * ratio),
    warmth: Math.round(targetSettings.warmth * ratio),
    sharpness: Math.round(targetSettings.sharpness * ratio),
    exposure: Math.round(targetSettings.exposure * ratio),
  };
}

export function useImageEditor(contentType, aspectRatio = '1:1') {
  const canvasRef = useRef(null);
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [filterSettings, setFilterSettings] = useState(DEFAULT_FILTER_SETTINGS);
  const [appliedFilter, setAppliedFilter] = useState(null);
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [textElements, setTextElements] = useState([]);
  const [stickerElements, setStickerElements] = useState([]);
  const [drawingPaths, setDrawingPaths] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Historial para undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Guardar estado en historial
  const saveToHistory = useCallback(() => {
    const state = {
      filterSettings,
      filterIntensity,
      rotation,
      flipHorizontal,
      flipVertical,
      zoom,
      pan,
      textElements,
      stickerElements,
      drawingPaths,
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      if (newHistory.length > MAX_HISTORY_STEPS) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_STEPS - 1));
  }, [filterSettings, rotation, flipHorizontal, flipVertical, zoom, pan, textElements, stickerElements, drawingPaths, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const state = history[historyIndex - 1];
      setFilterSettings(state.filterSettings);
      setRotation(state.rotation);
      setFlipHorizontal(state.flipHorizontal);
      setFlipVertical(state.flipVertical);
      setZoom(state.zoom);
      setPan(state.pan);
      setTextElements(state.textElements);
      setStickerElements(state.stickerElements);
      setDrawingPaths(state.drawingPaths);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const state = history[historyIndex + 1];
      setFilterSettings(state.filterSettings);
      setRotation(state.rotation);
      setFlipHorizontal(state.flipHorizontal);
      setFlipVertical(state.flipVertical);
      setZoom(state.zoom);
      setPan(state.pan);
      setTextElements(state.textElements);
      setStickerElements(state.stickerElements);
      setDrawingPaths(state.drawingPaths);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Añadir imagen
  const addImage = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = {
          id: Date.now().toString(),
          src: reader.result,
          file,
          type: file.type.startsWith('video/') ? 'video' : 'image',
        };
        setImages(prev => [...prev, newImage]);
        resolve(newImage);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Eliminar imagen
  const removeImage = useCallback((index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (currentImageIndex >= index && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  }, [currentImageIndex]);

  // Cambiar imagen actual
  const setCurrentImage = useCallback((index) => {
    setCurrentImageIndex(index);
  }, []);

  // Actualizar ajuste de filtro
  const updateFilterSetting = useCallback((key, value) => {
    setFilterSettings(prev => ({ ...prev, [key]: value }));
    setAppliedFilter(null);
    setFilterIntensity(100);
  }, []);

  // Aplicar filtro predefinido
  const applyPredefinedFilter = useCallback((filterId) => {
    const filter = PREDEFINED_FILTERS.find(f => f.id === filterId);
    if (filter) {
      setFilterSettings(filter.settings);
      setAppliedFilter(filterId);
      setFilterIntensity(100);
    }
  }, []);

  // Resetear filtros
  const resetFilters = useCallback(() => {
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
    setAppliedFilter(null);
    setFilterIntensity(100);
  }, []);

  // Rotar imagen
  const rotateImage = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
    saveToHistory();
  }, [saveToHistory]);

  // Voltear horizontal
  const flipImageHorizontal = useCallback(() => {
    setFlipHorizontal(prev => !prev);
    saveToHistory();
  }, [saveToHistory]);

  // Voltear vertical
  const flipImageVertical = useCallback(() => {
    setFlipVertical(prev => !prev);
    saveToHistory();
  }, [saveToHistory]);

  // Zoom
  const setZoomLevel = useCallback((level) => {
    setZoom(Math.max(0.5, Math.min(3, level)));
  }, []);

  // Pan
  const setPanPosition = useCallback((x, y) => {
    setPan({ x, y });
  }, []);

  // Añadir texto
  const addText = useCallback((text, options = {}) => {
    const newText = {
      id: Date.now().toString(),
      text,
      x: options.x || 100,
      y: options.y || 100,
      fontSize: options.fontSize || 34,
      fontFamily: options.fontFamily || 'sans',
      color: options.color || '#FFFFFF',
      backgroundColor: options.backgroundColor || 'rgba(28,25,23,0.42)',
      hasBackground: options.hasBackground || false,
      hasOutline: options.hasOutline || true,
      letterSpacing: options.letterSpacing || 0,
      fontWeight: options.fontWeight || 600,
      textAlign: options.textAlign || 'left',
      presetId: options.presetId || 'clean',
      rotation: 0,
      scale: 1,
      ...options,
    };
    setTextElements(prev => [...prev, newText]);
    saveToHistory();
  }, [saveToHistory]);

  // Actualizar texto
  const updateText = useCallback((id, updates) => {
    setTextElements(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  // Eliminar texto
  const removeText = useCallback((id) => {
    setTextElements(prev => prev.filter(t => t.id !== id));
    saveToHistory();
  }, [saveToHistory]);

  // Añadir sticker
  const addSticker = useCallback((type, options = {}) => {
    const newSticker = {
      id: Date.now().toString(),
      type,
      x: options.x || 100,
      y: options.y || 100,
      scale: 1,
      rotation: 0,
      content: options.content,
      ...options,
    };
    setStickerElements(prev => [...prev, newSticker]);
    saveToHistory();
  }, [saveToHistory]);

  // Añadir tag de producto
  const addProductTag = useCallback((product, x, y) => {
    const newTag = {
      id: Date.now().toString(),
      type: 'product',
      productId: product.id || product.product_id,
      productName: product.name,
      productPrice: product.price,
      productImage: product.image || product.images?.[0],
      x: x || 100,
      y: y || 100,
      scale: 1,
      rotation: 0,
    };
    setStickerElements(prev => [...prev, newTag]);
    saveToHistory();
  }, [saveToHistory]);

  // Actualizar elemento (sticker/tag)
  const updateElement = useCallback((id, updates) => {
    setStickerElements(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // Eliminar elemento
  const removeElement = useCallback((id) => {
    setStickerElements(prev => prev.filter(s => s.id !== id));
    saveToHistory();
  }, [saveToHistory]);

  // Añadir path de dibujo
  const addDrawingPath = useCallback((path) => {
    setDrawingPaths(prev => [...prev, path]);
  }, []);

  // Limpiar dibujos
  const clearDrawing = useCallback(() => {
    setDrawingPaths([]);
    saveToHistory();
  }, [saveToHistory]);

  // Generar CSS filter string
  const getFilterString = useCallback(() => {
    const baseSettings = appliedFilter ? mixFilterSettings(filterSettings, filterIntensity) : filterSettings;
    const { brightness, contrast, saturate, warmth, sharpness, exposure } = baseSettings;
    const filters = [
      `brightness(${100 + brightness + exposure}%)`,
      `contrast(${100 + contrast}%)`,
      `saturate(${saturate}%)`,
      `sepia(${Math.max(0, warmth / 2)}%)`,
      `hue-rotate(${warmth > 0 ? -10 : 0}deg)`,
    ];
    return filters.join(' ');
  }, [appliedFilter, filterIntensity, filterSettings]);

  // Renderizar canvas final
  const renderFinalCanvas = useCallback(async () => {
    if (!canvasRef.current || images.length === 0) return null;
    
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio];
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    const currentImage = images[currentImageIndex];
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Guardar contexto
        ctx.save();
        
        // Aplicar transformaciones
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(
          flipHorizontal ? -zoom : zoom,
          flipVertical ? -zoom : zoom
        );
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        
        // Aplicar filtros CSS
        ctx.filter = getFilterString();
        
        // Dibujar imagen
        const drawX = pan.x + (canvas.width - img.width * zoom) / 2;
        const drawY = pan.y + (canvas.height - img.height * zoom) / 2;
        ctx.drawImage(img, drawX, drawY, img.width * zoom, img.height * zoom);
        
        ctx.restore();
        
        // Dibujar paths (dibujos)
        drawingPaths.forEach(path => {
          ctx.beginPath();
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          if (path.points.length > 0) {
            ctx.moveTo(path.points[0].x, path.points[0].y);
            path.points.forEach(point => ctx.lineTo(point.x, point.y));
          }
          ctx.stroke();
        });
        
        // Dibujar textos
        textElements.forEach(text => {
          ctx.save();
          ctx.translate(text.x, text.y);
          ctx.rotate((text.rotation * Math.PI) / 180);
          ctx.scale(text.scale, text.scale);
          
          const fontSize = text.fontSize;
          const fontFamily = getCanvasFontFamily(text.fontFamily);
          const fontWeight = text.fontWeight || 600;
          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          const metrics = ctx.measureText(text.text);
          const textWidth = metrics.width;
          const textHeight = fontSize;
          const textAlign = text.textAlign || 'left';
          const anchorX = textAlign === 'center' ? textWidth / 2 : textAlign === 'right' ? textWidth : 0;
          ctx.textAlign = textAlign;
          
          // Fondo
          if (text.hasBackground) {
            ctx.fillStyle = text.backgroundColor || 'rgba(28,25,23,0.42)';
            ctx.beginPath();
            ctx.roundRect(-anchorX - 12, -textHeight - 8, textWidth + 24, textHeight + 16, 14);
            ctx.fill();
          }
          
          // Outline
          if (text.hasOutline) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 6;
            ctx.strokeText(text.text, 0, 0);
          }
          
          // Texto
          ctx.fillStyle = text.color;
          ctx.fillText(text.text, 0, 0);
          
          ctx.restore();
        });
        
        // Dibujar stickers
        stickerElements.forEach(sticker => {
          ctx.save();
          ctx.translate(sticker.x, sticker.y);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          ctx.scale(sticker.scale, sticker.scale);
          
          // Dibujar según tipo
          if (sticker.type === 'price') {
            ctx.fillStyle = '#0c0a09';
            ctx.beginPath();
            ctx.roundRect(-58, -18, 116, 36, 18);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '600 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sticker.content || '€0.00', 0, 5);
          } else if (sticker.type === 'new') {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(-52, -18, 104, 36, 18);
            ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '600 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Novedad', 0, 4);
          } else if (sticker.type === 'location') {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(-78, -18, 156, 36, 18);
            ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '500 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sticker.content || 'Ubicación', 0, 4);
          } else if (sticker.type === 'product') {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.roundRect(-90, -34, 180, 68, 18);
            ctx.fill();
            ctx.fillStyle = '#0c0a09';
            ctx.font = '600 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(sticker.productName || 'Producto', -72, -2);
            ctx.fillStyle = '#57534e';
            ctx.font = '500 12px sans-serif';
            ctx.fillText(`€${sticker.productPrice ?? ''}`, -72, 18);
          }
          
          ctx.restore();
        });
        
        setIsProcessing(false);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = currentImage.src;
    });
  }, [images, currentImageIndex, aspectRatio, rotation, flipHorizontal, flipVertical, zoom, pan, getFilterString, drawingPaths, textElements, stickerElements]);

  // Guardar borrador en localStorage
  const saveDraft = useCallback(() => {
    const draft = {
      images: images.map(img => ({ ...img, file: null })), // No guardar archivos
      filterSettings,
      textElements,
      stickerElements,
      drawingPaths,
      timestamp: Date.now(),
    };
    localStorage.setItem('hispaloshop_editor_draft', JSON.stringify(draft));
  }, [drawingPaths, filterIntensity, filterSettings, images, stickerElements, textElements]);

  // Cargar borrador
  const loadDraft = useCallback(() => {
    const draftStr = localStorage.getItem('hispaloshop_editor_draft');
    if (draftStr) {
      const draft = JSON.parse(draftStr);
      // No podemos restaurar archivos, solo la configuración
      setFilterSettings(draft.filterSettings || DEFAULT_FILTER_SETTINGS);
      setFilterIntensity(draft.filterIntensity || 100);
      setTextElements(draft.textElements || []);
      setStickerElements(draft.stickerElements || []);
      setDrawingPaths(draft.drawingPaths || []);
      return true;
    }
    return false;
  }, []);

  // Auto-guardar cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (images.length > 0) {
        saveDraft();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [images, saveDraft]);

  return {
    // Refs
    canvasRef,
    
    // State
    images,
    currentImageIndex,
    filterSettings,
    appliedFilter,
    filterIntensity,
    rotation,
    flipHorizontal,
    flipVertical,
    zoom,
    pan,
    textElements,
    stickerElements,
    drawingPaths,
    isProcessing,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    
    // Actions
    addImage,
    removeImage,
    setCurrentImage,
    updateFilterSetting,
    applyPredefinedFilter,
    resetFilters,
    setFilterIntensity,
    rotateImage,
    flipImageHorizontal,
    flipImageVertical,
    setZoomLevel,
    setPanPosition,
    addText,
    updateText,
    removeText,
    addSticker,
    addProductTag,
    updateElement,
    removeElement,
    addDrawingPath,
    clearDrawing,
    undo,
    redo,
    saveDraft,
    loadDraft,
    
    // Utils
    getFilterString,
    renderFinalCanvas,
  };
};

export default useImageEditor;
