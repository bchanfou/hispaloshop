import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Smile, Sticker, Pen, Image as ImageIcon, Sparkles, ChevronLeft, Download, Share2 } from 'lucide-react';
import StoriesCarousel from './StoriesCarousel';

const STORY_FILTERS = [
  { id: 'normal', name: 'Normal', style: {} },
  { id: 'vivid', name: 'Vivid', style: { filter: 'saturate(1.5) contrast(1.1)' } },
  { id: 'warm', name: 'Warm', style: { filter: 'sepia(0.3) saturate(1.2) brightness(1.1)' } },
  { id: 'cool', name: 'Cool', style: { filter: 'hue-rotate(180deg) saturate(0.8)' } },
  { id: 'bw', name: 'B&W', style: { filter: 'grayscale(100%)' } },
  { id: 'vintage', name: 'Vintage', style: { filter: 'sepia(0.6) contrast(1.2) brightness(0.9)' } },
  { id: 'clarendon', name: 'Clarendon', style: { filter: 'contrast(1.2) brightness(1.1) saturate(1.3)' } },
  { id: 'gingham', name: 'Gingham', style: { filter: 'brightness(1.05) hue-rotate(350deg)' } },
];

const STICKERS = [
  { id: 's1', emoji: '🔥', name: 'Fuego' },
  { id: 's2', emoji: '❤️', name: 'Corazón' },
  { id: 's3', emoji: '🌟', name: 'Estrella' },
  { id: 's4', emoji: '🛒', name: 'Carrito' },
  { id: 's5', emoji: '🎉', name: 'Fiesta' },
  { id: 's6', emoji: '🌿', name: 'Natural' },
  { id: 's7', emoji: '🍯', name: 'Miel' },
  { id: 's8', emoji: '🧀', name: 'Queso' },
];

const TextItem = ({ text, position, onUpdate, onDelete, isSelected, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        onUpdate({ ...text, x: info.point.x, y: info.point.y });
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onSelect();
      }}
      initial={{ x: text.x, y: text.y }}
      style={{
        position: 'absolute',
        left: text.x,
        top: text.y,
        cursor: 'move',
        zIndex: isSelected ? 10 : 1
      }}
      className={`px-4 py-2 rounded-lg ${isSelected ? 'ring-2 ring-white' : ''}`}
    >
      <span style={{ 
        fontSize: text.size, 
        color: text.color,
        fontWeight: text.bold ? 'bold' : 'normal',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
      }}>
        {text.content}
      </span>
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </motion.div>
  );
};

const StoryCreator = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(STORY_FILTERS[0]);
  const [texts, setTexts] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const handleAddText = () => {
    setShowTextInput(true);
    setNewTextContent('');
  };

  const handleTextSubmit = () => {
    if (!newTextContent.trim()) return;
    
    const newText = {
      id: Date.now().toString(),
      content: newTextContent,
      x: 50,
      y: 50,
      size: 24,
      color: '#FFFFFF',
      bold: true
    };
    
    setTexts([...texts, newText]);
    setShowTextInput(false);
    setNewTextContent('');
  };

  const handleUpdateText = (id, updates) => {
    setTexts(texts.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteText = (id) => {
    setTexts(texts.filter(t => t.id !== id));
    setSelectedTextId(null);
  };

  const handleAddSticker = (sticker) => {
    const newSticker = {
      id: Date.now().toString(),
      content: sticker.emoji,
      x: Math.random() * 200 + 50,
      y: Math.random() * 300 + 100,
      size: 48,
      color: 'transparent',
      bold: false
    };
    setTexts([...texts, newSticker]);
    setShowStickers(false);
  };

  const handlePublish = async () => {
    setIsUploading(true);
    // Simulate upload
    await new Promise(r => setTimeout(r, 1500));
    setIsUploading(false);
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <button onClick={() => navigate(-1)} className="p-2 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-3">
          {selectedImage && (
            <button 
              onClick={handlePublish}
              disabled={isUploading}
              className="px-6 py-2 bg-[#2D5A3D] text-white rounded-full font-semibold disabled:opacity-50"
            >
              {isUploading ? 'Publicando...' : 'Tu historia'}
            </button>
          )}
        </div>
      </div>

      {!selectedImage ? (
        // Image selection view
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <ImageIcon className="w-12 h-12 text-white/60" />
              </div>
              <p className="text-white/60">Toca para seleccionar foto</p>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        // Editor view
        <div className="h-full flex flex-col">
          {/* Canvas area */}
          <div 
            className="flex-1 relative overflow-hidden"
            onClick={() => setSelectedTextId(null)}
          >
            <img
              src={selectedImage}
              alt="Story"
              className="w-full h-full object-contain"
              style={selectedFilter.style}
            />
            
            {/* Text overlays */}
            {texts.map(text => (
              <TextItem
                key={text.id}
                text={text}
                isSelected={selectedTextId === text.id}
                onSelect={() => setSelectedTextId(text.id)}
                onUpdate={(updates) => handleUpdateText(text.id, updates)}
                onDelete={() => handleDeleteText(text.id)}
              />
            ))}
          </div>

          {/* Bottom toolbar */}
          <div className="bg-black/80 backdrop-blur-xl p-4">
            {/* Tabs */}
            <div className="flex justify-center gap-8 mb-4">
              <button
                onClick={() => setActiveTab('filters')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'filters' ? 'text-white' : 'text-white/50'}`}
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-xs">Filtros</span>
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'text' ? 'text-white' : 'text-white/50'}`}
              >
                <Type className="w-6 h-6" />
                <span className="text-xs">Texto</span>
              </button>
              <button
                onClick={() => setActiveTab('stickers')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'stickers' ? 'text-white' : 'text-white/50'}`}
              >
                <Sticker className="w-6 h-6" />
                <span className="text-xs">Stickers</span>
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'filters' && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {STORY_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter)}
                    className={`flex-shrink-0 w-16 flex flex-col items-center gap-1 ${
                      selectedFilter.id === filter.id ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <div 
                      className="w-14 h-14 rounded-full overflow-hidden border-2 border-white"
                      style={filter.style}
                    >
                      <img
                        src={selectedImage}
                        alt={filter.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-white text-xs">{filter.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleAddText}
                  className="flex-1 py-3 bg-white/10 rounded-xl text-white font-medium"
                >
                  Añadir texto
                </button>
              </div>
            )}

            {activeTab === 'stickers' && (
              <div className="grid grid-cols-8 gap-2">
                {STICKERS.map(sticker => (
                  <button
                    key={sticker.id}
                    onClick={() => handleAddSticker(sticker)}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text input modal */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-30"
          >
            <div className="w-full max-w-sm p-4">
              <input
                type="text"
                value={newTextContent}
                onChange={(e) => setNewTextContent(e.target.value)}
                placeholder="Escribe algo..."
                autoFocus
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-xl"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowTextInput(false)}
                  className="flex-1 py-3 bg-white/10 rounded-xl text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTextSubmit}
                  className="flex-1 py-3 bg-[#2D5A3D] rounded-xl text-white font-semibold"
                >
                  Añadir
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryCreator;
