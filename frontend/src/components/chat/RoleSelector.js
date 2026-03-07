import React from 'react';
import { motion } from 'framer-motion';
import { User, TrendingUp, Globe, Sparkles } from 'lucide-react';

const ROLES = [
  { id: 'consumer', name: 'Nutrición', icon: User, color: '#2D5A3D', description: 'Tu nutricionista personal' },
  { id: 'producer', name: 'Ventas', icon: TrendingUp, color: '#E6A532', description: 'Asistente de ventas' },
  { id: 'importer', name: 'Import', icon: Globe, color: '#2563EB', description: 'Analista de mercado' },
  { id: 'influencer', name: 'Creator', icon: Sparkles, color: '#9333EA', description: 'Creativo de contenido' },
];

function RoleSelector({ activeRole, onSwitch, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6"
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">
          Cambiar modo HI
        </h2>
        <p className="text-sm text-[#6B7280] mb-6">
          Selecciona cómo quieres usar HI según lo que necesites ahora
        </p>

        <div className="space-y-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isActive = activeRole === role.id;

            return (
              <motion.button
                key={role.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onSwitch(role.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  isActive 
                    ? 'ring-2' 
                    : 'bg-stone-50 hover:bg-stone-100'
                }`}
                style={{
                  backgroundColor: isActive ? role.color + '10' : undefined,
                  ringColor: isActive ? role.color : undefined,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: role.color + '20' }}
                >
                  <Icon className="w-6 h-6" style={{ color: role.color }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[#1A1A1A]">{role.name}</p>
                  <p className="text-sm text-[#6B7280]">{role.description}</p>
                </div>
                {isActive && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: role.color }}
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 text-[#6B7280] font-medium"
        >
          Cancelar
        </button>
      </motion.div>
    </>
  );
}

export default RoleSelector;
