import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Type, Palette, Square } from 'lucide-react';
import { FONT_OPTIONS, HISPALO_COLORS } from '../types/editor.types';

function TextTool({ texts, onAdd, onUpdate, onRemove }) {
  const [newText, setNewText] = useState('');
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd(newText, {
      x: 100,
      y: 100,
      fontSize: 24,
      fontFamily: 'sans',
      color: '#FFFFFF',
      hasBackground: false,
      hasOutline: true,
    });
    setNewText('');
    setShowAddForm(false);
  };

  const selectedText = texts.find(t => t.id === selectedTextId);

  return (
    <div className="p-4 space-y-4">
      {/* Lista de textos */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence>
          {texts.map((text) => (
            <motion.div
              key={text.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => setSelectedTextId(text.id)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                selectedTextId === text.id ? 'bg-[#2D5A3D]/10 ring-1 ring-[#2D5A3D]' : 'bg-stone-50 hover:bg-stone-100'
              }`}
            >
              <span className="text-sm truncate flex-1" style={{ fontFamily: text.fontFamily }}>
                {text.text}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(text.id);
                  if (selectedTextId === text.id) setSelectedTextId(null);
                }}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Añadir nuevo texto */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 hover:border-[#2D5A3D] hover:text-[#2D5A3D] transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Añadir texto</span>
        </button>
      ) : (
        <div className="space-y-3 p-3 bg-stone-50 rounded-xl">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Escribe tu texto..."
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 text-sm text-stone-500 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="flex-1 py-2 bg-[#2D5A3D] text-white text-sm rounded-lg disabled:opacity-50"
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Editar texto seleccionado */}
      {selectedText && (
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider">Editar texto</h4>
          
          {/* Fuente */}
          <div className="space-y-2">
            <label className="text-xs text-stone-500 flex items-center gap-1">
              <Type className="w-3 h-3" /> Fuente
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onUpdate(selectedText.id, { fontFamily: font.id })}
                  className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    selectedText.fontFamily === font.id
                      ? 'bg-[#2D5A3D] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                  style={{ fontFamily: font.id }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño */}
          <div className="space-y-1">
            <label className="text-xs text-stone-500">Tamaño</label>
            <input
              type="range"
              min="12"
              max="72"
              value={selectedText.fontSize}
              onChange={(e) => onUpdate(selectedText.id, { fontSize: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs text-stone-500 flex items-center gap-1">
              <Palette className="w-3 h-3" /> Color
            </label>
            <div className="flex gap-2">
              {['#FFFFFF', '#000000', '#2D5A3D', '#E6A532', '#DC2626', '#2563EB'].map(color => (
                <button
                  key={color}
                  onClick={() => onUpdate(selectedText.id, { color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedText.color === color ? 'border-[#2D5A3D] scale-110' : 'border-stone-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Opciones */}
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(selectedText.id, { hasOutline: !selectedText.hasOutline })}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                selectedText.hasOutline ? 'bg-[#2D5A3D] text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Sombra
            </button>
            <button
              onClick={() => onUpdate(selectedText.id, { hasBackground: !selectedText.hasBackground })}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                selectedText.hasBackground ? 'bg-[#2D5A3D] text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              <Square className="w-3 h-3" /> Fondo
            </button>
          </div>

          {selectedText.hasBackground && (
            <div className="flex gap-2">
              {['rgba(0,0,0,0.5)', 'rgba(45,90,61,0.8)', 'rgba(230,165,50,0.8)', 'rgba(220,38,38,0.8)'].map(bg => (
                <button
                  key={bg}
                  onClick={() => onUpdate(selectedText.id, { backgroundColor: bg })}
                  className={`w-8 h-8 rounded-lg ${
                    selectedText.backgroundColor === bg ? 'ring-2 ring-[#2D5A3D]' : ''
                  }`}
                  style={{ backgroundColor: bg }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TextTool;
