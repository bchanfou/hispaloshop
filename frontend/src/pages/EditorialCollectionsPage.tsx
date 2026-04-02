// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import { useTranslation } from 'react-i18next';

/* ── Static editorial collections (Apple-style curated lists) ── */
const EDITORIAL_COLLECTIONS = [
  {
    id: 'aceite-oliva',
    title: t('editorial_collections.elMejorAceiteDeOliva', 'El mejor aceite de oliva'),
    subtitle: t('editorial_collections.seleccionDeProductoresAndaluces', 'Selección de productores andaluces'),
    tag: 'aceite',
    gradient: 'from-stone-900 to-stone-700',
  },
  {
    id: 'desayuno-saludable',
    title: 'Desayunos que nutren',
    subtitle: t('editorial_collections.empiezaElDiaConEnergiaReal', 'Empieza el día con energía real'),
    tag: 'desayuno',
    gradient: 'from-stone-800 to-stone-500',
  },
  {
    id: 'snacks-naturales',
    title: 'Snacks sin trampa',
    subtitle: 'Picoteo sin ingredientes ocultos',
    tag: 'snack',
    gradient: 'from-stone-950 to-stone-600',
  },
  {
    id: 'despensa-basica',
    title: t('editorial_collections.despensaBasicaPremium', 'Despensa básica premium'),
    subtitle: t('editorial_collections.losEsencialesQueMarcanLaDiferencia', 'Los esenciales que marcan la diferencia'),
    tag: 'despensa',
    gradient: 'from-stone-700 to-stone-400',
  },
  {
    id: 'regalo-gourmet',
    title: 'Para regalar',
    subtitle: 'Cestas y lotes gourmet con historia',
    tag: 'regalo',
    gradient: 'from-stone-950 to-stone-800',
  },
  {
    id: 'eco-certificado',
    title: t('editorial_collections.certificadoEcologico', 'Certificado ecológico'),
    subtitle: '100% productos con sello oficial',
    tag: 'ecologico',
    gradient: 'from-stone-600 to-stone-900',
  },
];

export default function EditorialCollectionsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-20">
      <SEO title="Colecciones — HispaloShop" description="Colecciones editoriales de productos artesanales y saludables" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="max-w-[975px] mx-auto flex items-center gap-3 px-4 py-3">
          <BackButton />
          <h1 className="text-lg font-bold text-stone-950">Colecciones</h1>
        </div>
      </div>

      <div className="max-w-[975px] mx-auto px-4 py-4">
        <p className="text-[13px] text-stone-500 mb-4">
          Selecciones editoriales de productos artesanales, saludables y con historia.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EDITORIAL_COLLECTIONS.map((col, idx) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
            >
              <Link
                to={`/products?search=${encodeURIComponent(col.tag)}`}
                className="block no-underline"
              >
                <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${col.gradient} p-5 h-[140px] flex flex-col justify-end`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{t('editorial_collections.coleccion', 'Colección')}</p>
                  <p className="text-[17px] font-bold text-white leading-tight">{col.title}</p>
                  <p className="text-[13px] text-white/70 mt-0.5">{col.subtitle}</p>
                  <ChevronRight size={20} className="absolute right-4 bottom-5 text-white/40" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
