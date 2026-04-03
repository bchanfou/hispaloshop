/**
 * Paso 3: Seguir Cuentas
 * Mínimo 3 productores recomendados
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const RECOMMENDED_PRODUCERS = [{
  id: 'prod_1',
  name: 'Cortijo Andaluz',
  category: 'Aceites',
  avatar: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=100',
  rating: 4.9,
  products: 23,
  location: "Córdoba"
}, {
  id: 'prod_2',
  name: "Quesería La Antigua",
  category: 'Quesos',
  avatar: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=100',
  rating: 4.8,
  products: 15,
  location: 'Valladolid'
}, {
  id: 'prod_3',
  name: 'Miel del Sur',
  category: 'Miel',
  avatar: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100',
  rating: 4.9,
  products: 12,
  location: 'Granada'
}, {
  id: 'prod_4',
  name: 'Embutidos Juan',
  category: 'Embutidos',
  avatar: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=100',
  rating: 4.7,
  products: 18,
  location: 'Salamanca'
}, {
  id: 'prod_5',
  name: "Panadería María",
  category: "Panadería",
  avatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100',
  rating: 4.8,
  products: 8,
  location: 'Madrid'
}, {
  id: 'prod_6',
  name: 'Conservas Premium',
  category: 'Conservas',
  avatar: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100',
  rating: 4.6,
  products: 34,
  location: 'Barcelona'
}];
export default function StepFollow({
  data,
  onUpdate,
  onNext,
  onBack
}) {
  const [following, setFollowing] = useState(data.following || []);
  const [producers, setProducers] = useState([]);
  useEffect(() => {
    setProducers(RECOMMENDED_PRODUCERS);
  }, []);
  const toggleFollow = producerId => {
    setFollowing(prev => {
      if (prev.includes(producerId)) {
        return prev.filter(id => id !== producerId);
      }
      return [...prev, producerId];
    });
  };
  const handleNext = () => {
    onUpdate({
      following
    });
    onNext();
  };
  const canProceed = following.length >= 3;
  return <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-950">{t('step_follow.descubreAQuienSeguir', 'Descubre a quién seguir')}</h2>
        <p className="text-stone-500 mt-2">
          Sigue al menos 3 productores para empezar
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full">
          <span className="text-sm font-medium text-stone-950">
            {following.length}/3 seleccionados
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {producers.map(producer => {
        const isFollowing = following.includes(producer.id);
        return <motion.div key={producer.id} layout className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isFollowing ? 'border-stone-950 bg-stone-50' : 'border-stone-200 hover:border-stone-200'}`} onClick={() => toggleFollow(producer.id)}>
              <img src={producer.avatar} alt={producer.name} className="w-14 h-14 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-950 truncate">
                  {producer.name}
                </h3>
                <p className="text-sm text-stone-500">
                  {producer.category} • {producer.location}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-stone-950 text-stone-950" />
                  <span className="text-sm font-medium">{producer.rating}</span>
                  <span className="text-sm text-stone-500">
                    ({producer.products} productos)
                  </span>
                </div>
              </div>
              <button type="button" onClick={event => {
            event.stopPropagation();
            toggleFollow(producer.id);
          }} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isFollowing ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-950 hover:bg-stone-200'}`}>
                {isFollowing ? <span className="flex items-center gap-1">
                    <Check className="w-4 h-4" /> Siguiendo
                  </span> : 'Seguir'}
              </button>
            </motion.div>;
      })}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="px-6 py-3 text-stone-500 hover:text-stone-950 font-medium">
          ← Anterior
        </button>
        <button onClick={handleNext} disabled={!canProceed} className="px-6 py-3 bg-stone-950 text-white rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors">
          {canProceed ? 'Comenzar' : `Selecciona ${3 - following.length} más`}
        </button>
      </div>
    </div>;
}