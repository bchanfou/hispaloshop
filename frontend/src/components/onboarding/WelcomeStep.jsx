import React, { useState } from 'react';
import { ShoppingCart, Smartphone, Trophy } from 'lucide-react';
import { onboardingApi } from '../../lib/onboardingApi';
import { useTranslation } from 'react-i18next';

export default function WelcomeStep({ onComplete, onError }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onboardingApi.complete();
      onComplete();
    } catch (err) {
      onError?.(err.response?.data?.detail || 'Error al completar onboarding');
      // Still complete even if API fails
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-10 h-10 text-stone-900" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          ¡Todo listo!
        </h1>
        <p className="text-stone-600 max-w-md mx-auto">
          Tu perfil está configurado. Ahora puedes explorar productos locales, 
          seguir a tus marcas favoritas y descubrir contenido exclusivo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-stone-50 rounded-2xl">
          <div className="text-2xl mb-2"><ShoppingCart size={20} className="text-stone-950" /></div>
          <h3 className="font-medium text-stone-900 mb-1">Compra directo</h3>
          <p className="text-sm text-stone-600">
            Productos de productores locales e importadores
          </p>
        </div>
        
        <div className="p-4 bg-stone-50 rounded-2xl">
          <div className="text-2xl mb-2"><Smartphone size={20} className="text-stone-950" /></div>
          <h3 className="font-medium text-stone-900 mb-1">Red social</h3>
          <p className="text-sm text-stone-600">
            Posts, reels y contenido de marcas e influencers
          </p>
        </div>
        
        <div className="p-4 bg-stone-50 rounded-2xl">
          <div className="text-2xl mb-2"><Trophy size={20} className="text-stone-950" /></div>
          <h3 className="font-medium text-stone-900 mb-1">Recompensas</h3>
          <p className="text-sm text-stone-600">
            Hispalopoints y misiones exclusivas
          </p>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3 bg-stone-900 text-white rounded-2xl font-medium disabled:opacity-50 hover:bg-stone-800 transition-colors"
        >
          {loading ? 'Cargando...' : 'Empezar a explorar'}
        </button>
      </div>
    </div>
  );
}
