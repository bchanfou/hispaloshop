// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const certifications = [
  {
    icon: '\u{1F33F}',
    name: 'Ecologico EU',
    description: 'Certificacion oficial de produccion ecologica de la Union Europea',
    criteria: [
      'Sin pesticidas sinteticos',
      'Sin organismos modificados geneticamente',
      'Rotacion de cultivos obligatoria',
    ],
  },
  {
    icon: '\u{1F3C6}',
    name: 'DOP (Denominacion de Origen Protegida)',
    description:
      'Garantiza que el producto se produce, transforma y elabora en una zona geografica determinada',
    criteria: [
      'Produccion en zona geografica especifica',
      'Metodos tradicionales de elaboracion',
      'Control de calidad regulado',
    ],
  },
  {
    icon: '\u{1F947}',
    name: 'IGP (Indicacion Geografica Protegida)',
    description:
      'Al menos una etapa de produccion se realiza en la zona geografica',
    criteria: [
      'Vinculo con el territorio',
      'Caracteristicas o reputacion atribuibles al origen',
      'Supervision por organismo de control',
    ],
  },
  {
    icon: '\u262A\uFE0F',
    name: 'Halal',
    description:
      'Certificacion de que el producto cumple con las normas alimentarias islamicas',
    criteria: [
      'Ingredientes permitidos (halal)',
      'Proceso de sacrificio conforme a la ley islamica',
      'Sin contaminacion cruzada con productos no halal',
    ],
  },
  {
    icon: '\u{1F33E}',
    name: 'Sin Gluten',
    description:
      'Producto apto para personas con enfermedad celiaca o sensibilidad al gluten',
    criteria: [
      'Contenido de gluten inferior a 20 ppm',
      'Produccion en lineas libres de contaminacion',
      'Analisis periodicos de laboratorio',
    ],
  },
  {
    icon: '\u{1F331}',
    name: 'Vegano',
    description:
      'No contiene ingredientes de origen animal ni ha sido testado en animales',
    criteria: [
      'Sin ingredientes animales',
      'Sin subproductos animales',
      'Sin pruebas en animales',
    ],
  },
];

export default function CertificationsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Sticky topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-stone-950"
          aria-label="Volver"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold m-0 text-stone-950">
          Certificaciones
        </h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-[720px] mx-auto">
        <p className="text-sm text-stone-500 mb-6">
          Certificaciones reconocidas en Hispaloshop
        </p>

        {/* Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="bg-white border border-stone-200 rounded-2xl p-5"
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="text-[32px] leading-none">
                  {cert.icon}
                </span>
                <span className="font-bold text-base text-stone-950 pt-1">
                  {cert.name}
                </span>
              </div>

              <p className="text-[13px] text-stone-500 mb-3 leading-relaxed">
                {cert.description}
              </p>

              <ul className="m-0 pl-[18px] list-disc">
                {cert.criteria.map((item) => (
                  <li
                    key={item}
                    className="text-[13px] text-stone-500 leading-[1.7]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
