/**
 * Paso 4: Bienvenida
 * Pantalla final con opciones de navegación
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShoppingBag, User } from 'lucide-react';

export default function StepWelcome({ userName }) {
  const navigate = useNavigate();

  const options = [
    {
      icon: Sparkles,
      title: 'Ver mi feed',
      description: 'Descubre productos personalizados para ti',
      action: () => navigate('/'),
      color: 'bg-stone-200',
    },
    {
      icon: ShoppingBag,
      title: 'Explorar productos',
      description: 'Busca entre miles de productos artesanales',
      action: () => navigate('/products'),
      color: 'bg-stone-950',
    },
    {
      icon: User,
      title: 'Completar mi perfil',
      description: 'Añade más información sobre ti',
      action: () => navigate('/dashboard/profile'),
      color: 'bg-stone-700',
    },
  ];

  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-24 h-24 mx-auto bg-gradient-to-br from-stone-700 to-stone-950 rounded-full flex items-center justify-center"
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <h2 className="text-3xl font-bold text-stone-950">
          ¡Listo{userName ? `, ${userName}` : ''}!
        </h2>
        <p className="text-stone-500 mt-2">
          Tu feed personalizado está preparado
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <motion.button
            key={option.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={option.action}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-stone-200 hover:border-stone-950 transition-colors text-left"
          >
            <div className={`w-12 h-12 ${option.color} rounded-xl flex items-center justify-center`}>
              <option.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-950">{option.title}</h3>
              <p className="text-sm text-stone-500">{option.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        Puedes cambiar tus preferencias en cualquier momento desde tu perfil
      </p>
    </div>
  );
}
