import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Tag, Flame, Sparkles, Leaf, Wheat, MapPin, Hash, AtSign, MousePointer } from 'lucide-react';

const STICKER_TYPES = [
  { id: 'price', icon: Tag, label: 'Precio', color: 'bg-amber-500' },
  { id: 'new', icon: Sparkles, label: 'Nuevo', color: 'bg-green-500' },
  { id: 'offer', icon: Flame, label: 'Oferta', color: 'bg-red-500' },
  { id: 'vegan', icon: Leaf, label: 'Vegano', color: 'bg-green-600' },
  { id: 'organic', icon: Leaf, label: 'Orgánico', color: 'bg-emerald-500' },
  { id: 'gluten-free', icon: Wheat, label: 'Sin Gluten', color: 'bg-blue-500' },
  { id: 'local', icon: MapPin, label: 'Local', color: 'bg-orange-500' },
  { id: 'hashtag', icon: Hash, label: 'Hashtag', color: 'bg-accent' },
  { id: 'mention', icon: AtSign, label: 'Mención', color: 'bg-purple-500' },
];

function StickerTool({ stickers, onAdd, onUpdate, onRemove }) {
  const [selectedType, setSelectedType] = useState(null);
  const [content, setContent] = useState('');

  const handleAdd = () => {
    if (!selectedType) return;
    
    const options = { x: 100, y: 100 };
    if (['price', 'hashtag', 'mention'].includes(selectedType)) {
      options.content = content;
    }
    
    onAdd(selectedType, options);
    setSelectedType(null);
    setContent('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Grid de stickers */}
      <div>
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Añadir sticker
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {STICKER_TYPES.map((sticker) => {
            const Icon = sticker.icon;
            return (
              <motion.button
                key={sticker.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedType(selectedType === sticker.id ? null : sticker.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                  selectedType === sticker.id
                    ? 'bg-accent text-white'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${sticker.color} flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs">{sticker.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Input de contenido para stickers editables */}
      {selectedType && ['price', 'hashtag', 'mention'].includes(selectedType) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-stone-50 rounded-xl space-y-2"
        >
          <label className="text-xs text-stone-500">
            {selectedType === 'price' && 'Precio (€)'}
            {selectedType === 'hashtag' && 'Hashtag (sin #)'}
            {selectedType === 'mention' && 'Usuario (sin @)'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                selectedType === 'price' ? '12.90' :
                selectedType === 'hashtag' ? 'Hispaloshop' :
                'usuario'
              }
              className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-accent text-white text-sm rounded-lg"
            >
              Añadir
            </button>
          </div>
        </motion.div>
      )}

      {/* Añadir sticker simple */}
      {selectedType && !['price', 'hashtag', 'mention'].includes(selectedType) && (
        <button
          onClick={handleAdd}
          className="w-full py-3 bg-accent text-white rounded-xl text-sm font-medium"
        >
          Añadir {STICKER_TYPES.find(s => s.id === selectedType)?.label}
        </button>
      )}

      {/* Lista de stickers añadidos */}
      {stickers.filter(s => s.type !== 'product').length > 0 && (
        <div className="pt-4 border-t border-stone-200">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Stickers añadidos ({stickers.filter(s => s.type !== 'product').length})
          </h4>
          <div className="space-y-2">
            {stickers.filter(s => s.type !== 'product').map((sticker) => {
              const typeInfo = STICKER_TYPES.find(t => t.id === sticker.type);
              const Icon = typeInfo?.icon || Tag;
              return (
                <div
                  key={sticker.id}
                  className="flex items-center justify-between p-2 bg-stone-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${typeInfo?.color || 'bg-stone-400'} flex items-center justify-center text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-stone-600">
                      {typeInfo?.label}
                      {sticker.content && `: ${sticker.content}`}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemove(sticker.id)}
                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-400 text-center">
        Arrastra los stickers en la imagen para posicionarlos
      </p>
    </div>
  );
}

export default StickerTool;
