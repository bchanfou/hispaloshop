// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main
      role="main"
      aria-label="Página no encontrada"
      className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-6"
    >
      <div className="text-center max-w-[400px] w-full">
        {/* Animated icon */}
        <motion.div
          aria-hidden="true"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-stone-950 mb-8"
        >
          <Compass size={32} className="text-stone-50" strokeWidth={1.8} />
        </motion.div>

        {/* 404 */}
        <h1 className="text-[96px] font-black text-stone-950 m-0 mb-2 tracking-tighter leading-none">
          404
        </h1>

        <h2 className="text-xl font-semibold text-stone-950 m-0 mb-3">
          Esta página no existe
        </h2>

        <p className="text-[15px] text-stone-500 leading-relaxed m-0 mb-9">
          Parece que te has perdido. Vuelve al inicio y continúa explorando.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-2.5">
          <Link
            to="/"
            aria-label="Ir al inicio"
            className="flex items-center justify-center h-12 bg-stone-950 text-stone-50 rounded-full text-[15px] font-semibold no-underline"
          >
            Ir al inicio
          </Link>
          <Link
            to="/discover"
            aria-label="Explorar productos"
            className="flex items-center justify-center h-12 bg-transparent text-stone-950 border-[1.5px] border-stone-200 rounded-full text-[15px] font-semibold no-underline"
          >
            Explorar
          </Link>
        </div>
      </div>
    </main>
  );
}
