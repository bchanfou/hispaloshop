import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Type, Smile, Image as ImageIcon, Sparkles, ChevronLeft,
} from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/api';
import { toast } from 'sonner';

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
  { id: 's1', emoji: '🔥' }, { id: 's2', emoji: '❤️' }, { id: 's3', emoji: '🌟' },
  { id: 's4', emoji: '🛒' }, { id: 's5', emoji: '🎉' }, { id: 's6', emoji: '🌿' },
  { id: 's7', emoji: '🍯' }, { id: 's8', emoji: '🧀' },
];

const TextItem = ({ text, onUpdate, onDelete, isSelected, onSelect }) => {
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
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelect(); }}
      initial={{ x: text.x, y: text.y }}
      style={{ position: 'absolute', left: text.x, top: text.y, cursor: 'move', zIndex: isSelected ? 10 : 1 }}
      className={`px-4 py-2 rounded-lg ${isSelected ? 'ring-2 ring-white' : ''}`}
    >
      <span style={{ fontSize: text.size, color: text.color, fontWeight: text.bold ? 'bold' : 'normal', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
        {text.content}
      </span>
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(STORY_FILTERS[0]);
  const [texts, setTexts] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [activeTab, setActiveTab] = useState('filters');
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAddText = () => { setShowTextInput(true); setNewTextContent(''); };

  const handleTextSubmit = () => {
    if (!newTextContent.trim()) return;
    setTexts([...texts, {
      id: Date.now().toString(), content: newTextContent,
      x: 50, y: 50, size: 24, color: '#FFFFFF', bold: true,
    }]);
    setShowTextInput(false);
    setNewTextContent('');
  };

  const handleAddSticker = (sticker) => {
    setTexts([...texts, {
      id: Date.now().toString(), content: sticker.emoji,
      x: Math.random() * 200 + 50, y: Math.random() * 300 + 100,
      size: 48, color: 'transparent', bold: false,
    }]);
  };

  const handlePublish = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('caption', caption.trim());
      await axios.post(`${API}/stories`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Historia publicada');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo publicar la historia');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
        <button onClick={() => navigate(-1)} className="p-2 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        {previewUrl && (
          <button
            aria-label="Publicar historia"
            onClick={handlePublish}
            disabled={isUploading}
            className="px-6 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-stone-800 transition-colors"
          >
            {isUploading ? 'Publicando...' : 'Publicar historia'}
          </button>
        )}
      </div>

      {!previewUrl ? (
        <div className="h-full flex flex-col items-center justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center cursor-pointer"
          >
            <ImageIcon className="w-12 h-12 text-white/60" />
          </div>
          <p className="text-white/60">Toca para seleccionar foto</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1 relative overflow-hidden" onClick={() => setSelectedTextId(null)}>
            <img src={previewUrl} alt="Vista previa de la historia" className="w-full h-full object-cover" style={selectedFilter.style} />
            {texts.map((text) => (
              <TextItem
                key={text.id}
                text={text}
                isSelected={selectedTextId === text.id}
                onSelect={() => setSelectedTextId(text.id)}
                onUpdate={(updates) => setTexts(texts.map((t) => (t.id === text.id ? { ...t, ...updates } : t)))}
                onDelete={() => { setTexts(texts.filter((t) => t.id !== text.id)); setSelectedTextId(null); }}
              />
            ))}
          </div>

          <div className="bg-black/80 backdrop-blur-xl p-4">
            {/* Caption input */}
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Añadir descripción..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm mb-3 focus:outline-none"
              maxLength={200}
            />

            <div className="flex justify-center gap-8 mb-4">
              {[
                { id: 'filters', icon: <Sparkles className="w-6 h-6" />, label: 'Filtros' },
                { id: 'text', icon: <Type className="w-6 h-6" />, label: 'Texto' },
                { id: 'stickers', icon: <Smile className="w-6 h-6" />, label: 'Stickers' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 ${activeTab === tab.id ? 'text-white' : 'text-white/50'}`}
                >
                  {tab.icon}
                  <span className="text-xs">{tab.label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'filters' && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {STORY_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter)}
                    className={`flex-shrink-0 w-16 flex flex-col items-center gap-1 ${selectedFilter.id === filter.id ? 'opacity-100' : 'opacity-60'}`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white" style={filter.style}>
                      <img src={previewUrl} alt={filter.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-white text-xs">{filter.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'text' && (
              <button onClick={handleAddText} className="w-full py-3 bg-white/10 rounded-xl text-white font-medium">
                Añadir texto
              </button>
            )}

            {activeTab === 'stickers' && (
              <div className="grid grid-cols-8 gap-2">
                {STICKERS.map((s) => (
                  <button key={s.id} onClick={() => handleAddSticker(s)} className="text-3xl hover:scale-110 transition-transform">
                    {s.emoji}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-30"
          >
            <div className="w-full max-w-sm p-4">
              <input
                type="text" value={newTextContent} onChange={(e) => setNewTextContent(e.target.value)}
                placeholder="Escribe algo..." autoFocus
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-xl"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowTextInput(false)} className="flex-1 py-3 bg-white/10 rounded-xl text-white">Cancelar</button>
                <button onClick={handleTextSubmit} className="flex-1 py-3 bg-stone-950 rounded-xl text-white font-semibold hover:bg-stone-800 transition-colors">Añadir</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryCreator;
