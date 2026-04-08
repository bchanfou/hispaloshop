/**
 * Página de Comunidades - Placeholder temporal
 * Versión completa en desarrollo
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </button>
          <h1 className="text-lg font-semibold text-stone-950">
            Comunidades
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-100 mb-6">
            <Users className="w-10 h-10 text-stone-400" />
          </div>

          <h2 className="text-xl font-bold text-stone-950 mb-2">
            Comunidades
          </h2>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            En desarrollo
          </div>

          <p className="text-stone-500 mb-8">
            Pronto podrás unirte a comunidades de productores, importadores y foodies. 
            Comparte conocimientos, recetas y experiencias.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/discover')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-stone-950 text-white rounded-full font-semibold hover:bg-stone-800 transition-colors"
            >
              <Compass className="w-4 h-4" />
              Explorar contenido
            </button>

            <div>
              <button
                onClick={() => navigate('/communities/explore')}
                className="text-stone-500 hover:text-stone-950 text-sm transition-colors"
              >
                Ver comunidades existentes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
