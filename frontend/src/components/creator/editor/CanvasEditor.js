import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ASPECT_RATIO_DIMENSIONS } from '../types/editor.types';

function CanvasEditor({ editor, aspectRatio, activeTool, readOnly = false }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = editor.images[editor.currentImageIndex];

  // Calcular dimensiones manteniendo aspect ratio
  useEffect(() => {
    if (!containerRef.current) return;
    
    const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
    const container = containerRef.current.getBoundingClientRect();
    const containerAspect = container.width / container.height;
    const imageAspect = dims.width / dims.height;
    
    let width, height;
    if (containerAspect > imageAspect) {
      height = container.height * 0.9;
      width = height * imageAspect;
    } else {
      width = container.width * 0.9;
      height = width / imageAspect;
    }
    
    setContainerSize({ width, height });
  }, [aspectRatio, currentImage]);

  // Manejar inicio de drag
  const handleMouseDown = useCallback((e, type, id) => {
    if (readOnly) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragTarget({ type, id });
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [readOnly]);

  // Manejar movimiento de drag
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragTarget || readOnly) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Actualizar posición según tipo
    if (dragTarget.type === 'text') {
      const text = editor.textElements.find(t => t.id === dragTarget.id);
      if (text) {
        editor.updateText(dragTarget.id, {
          x: text.x + deltaX,
          y: text.y + deltaY,
        });
      }
    } else if (dragTarget.type === 'sticker' || dragTarget.type === 'product') {
      const sticker = editor.stickerElements.find(s => s.id === dragTarget.id);
      if (sticker) {
        editor.updateElement(dragTarget.id, {
          x: sticker.x + deltaX,
          y: sticker.y + deltaY,
        });
      }
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragTarget, dragStart, editor, readOnly]);

  // Manejar fin de drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
  }, []);

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!currentImage) return null;

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
    >
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: containerSize.width,
          height: containerSize.height,
        }}
      >
        {/* Imagen base con filtros */}
        {currentImage.type === 'video' ? (
          <video
            ref={imageRef}
            src={currentImage.src}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: editor.getFilterString(),
              transform: `
                rotate(${editor.rotation}deg) 
                scaleX(${editor.flipHorizontal ? -editor.zoom : editor.zoom}) 
                scaleY(${editor.flipVertical ? -editor.zoom : editor.zoom})
                translate(${editor.pan.x}px, ${editor.pan.y}px)
              `,
            }}
            controls={readOnly}
            loop
            muted
          />
        ) : (
          <img
            ref={imageRef}
            src={currentImage.src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: editor.getFilterString(),
              transform: `
                rotate(${editor.rotation}deg) 
                scaleX(${editor.flipHorizontal ? -editor.zoom : editor.zoom}) 
                scaleY(${editor.flipVertical ? -editor.zoom : editor.zoom})
                translate(${editor.pan.x}px, ${editor.pan.y}px)
              `,
            }}
            draggable={false}
          />
        )}

        {/* Canvas de dibujo */}
        {activeTool === 'draw' && !readOnly && (
          <DrawingCanvas
            width={containerSize.width}
            height={containerSize.height}
            onAddPath={editor.addDrawingPath}
            paths={editor.drawingPaths}
          />
        )}

        {/* Elementos de texto */}
        {editor.textElements.map((text) => (
          <motion.div
            key={text.id}
            className={`absolute cursor-move select-none ${readOnly ? '' : 'hover:ring-2 hover:ring-[#2D5A3D]/50'}`}
            style={{
              left: text.x,
              top: text.y,
              transform: `rotate(${text.rotation}deg) scale(${text.scale})`,
              transformOrigin: 'center',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'text', text.id)}
          >
            <span
              style={{
                fontSize: text.fontSize,
                fontFamily: text.fontFamily,
                color: text.color,
                backgroundColor: text.hasBackground ? text.backgroundColor : 'transparent',
                padding: text.hasBackground ? '4px 8px' : '0',
                borderRadius: '4px',
                textShadow: text.hasOutline ? '0 0 3px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.8)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {text.text}
            </span>
          </motion.div>
        ))}

        {/* Stickers */}
        {editor.stickerElements.map((sticker) => (
          <StickerElement
            key={sticker.id}
            sticker={sticker}
            onMouseDown={(e) => handleMouseDown(e, sticker.type, sticker.id)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

// Componente para dibujar
function DrawingCanvas({ width, height, onAddPath, paths }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [brushColor, setBrushColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    // Dibujar paths existentes
    paths.forEach(path => {
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
  }, [paths, width, height]);

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Dibujar en canvas
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentPath.length > 0) {
      const lastPoint = currentPath[currentPath.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      onAddPath({
        id: Date.now().toString(),
        points: currentPath,
        color: brushColor,
        size: brushSize,
      });
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-10 cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-3 bg-black/80 backdrop-blur-sm rounded-full p-2">
        {['#FFFFFF', '#E6A532', '#DC2626', '#16A34A', '#2563EB', '#000000'].map(color => (
          <button
            key={color}
            onClick={() => setBrushColor(color)}
            className={`w-6 h-6 rounded-full border-2 ${
              brushColor === color ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <div className="w-px h-6 bg-white/30 mx-1" />
        {[3, 8, 15, 25].map(size => (
          <button
            key={size}
            onClick={() => setBrushSize(size)}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${
              brushSize === size ? 'bg-white/20' : ''
            }`}
          >
            <div 
              className="rounded-full bg-white"
              style={{ width: size, height: size }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

// Componente para renderizar stickers
function StickerElement({ sticker, onMouseDown, readOnly }) {
  const renderStickerContent = () => {
    switch (sticker.type) {
      case 'price':
        return (
          <div className="bg-[#E6A532] text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg">
            €{sticker.content || '0.00'}
          </div>
        );
      case 'new':
        return (
          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
            NUEVO
          </div>
        );
      case 'offer':
        return (
          <div className="relative w-12 h-16">
            <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 85% 100%, 15% 100%, 0% 25%)' }} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px]">OFERTA</span>
          </div>
        );
      case 'vegan':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl shadow-lg">
            🌱
          </div>
        );
      case 'organic':
        return (
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl shadow-lg">
            🍃
          </div>
        );
      case 'gluten-free':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl shadow-lg">
            🌾
          </div>
        );
      case 'local':
        return (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl shadow-lg">
            📍
          </div>
        );
      case 'hashtag':
        return (
          <div className="bg-[#2D5A3D] text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
            #{sticker.content || 'Hispaloshop'}
          </div>
        );
      case 'mention':
        return (
          <div className="bg-white text-[#2D5A3D] px-3 py-1.5 rounded-full text-sm font-medium shadow-lg border border-[#2D5A3D]">
            @{sticker.content || 'usuario'}
          </div>
        );
      case 'location':
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-red-500 text-white px-3 py-1.5 flex items-center gap-1">
              <span>📍</span>
              <span className="text-sm font-medium">{sticker.content || 'Ubicación'}</span>
            </div>
          </div>
        );
      case 'product':
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden w-32">
            <div className="h-16 bg-stone-100 flex items-center justify-center">
              {sticker.productImage ? (
                <img src={sticker.productImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">📦</span>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-stone-800 truncate">{sticker.productName}</p>
              <p className="text-xs text-[#2D5A3D] font-bold">€{sticker.productPrice}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={`absolute cursor-move ${readOnly ? '' : 'hover:ring-2 hover:ring-[#2D5A3D]/50'}`}
      style={{
        left: sticker.x,
        top: sticker.y,
        transform: `rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
        transformOrigin: 'center',
      }}
      onMouseDown={onMouseDown}
    >
      {renderStickerContent()}
    </motion.div>
  );
}

export default CanvasEditor;
