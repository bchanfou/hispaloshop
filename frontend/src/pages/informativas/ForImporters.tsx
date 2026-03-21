// @ts-nocheck
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SEO from '../../components/SEO';

const Section = ({ dark, children, className = '' }) => (
  <section className={`py-20 px-4 ${dark ? 'bg-stone-950' : 'bg-stone-50'} ${className}`}>
    <div className="max-w-[1200px] mx-auto">{children}</div>
  </section>
);

export default function ForImporters() {
  const navigate = useNavigate();
  useScrollReveal();
  usePageTitle();

  return (
    <div>
      <SEO title="Soy Importador \u2014 HispaloShop" description="Directorio verificado de productores artesanales espa\u00f1oles. Contratos digitales, certificaciones y trazabilidad B2B completa." />
      {/* SECTION 1 — HERO (dark) */}
      <section className="min-h-screen bg-stone-950 flex items-start pt-[120px] pb-20 px-4">
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="max-w-[820px]">
            <p className="info-eyebrow hero-animate-in text-stone-500 mb-4">
              PARA IMPORTADORES Y DISTRIBUIDORES
            </p>
            <h1 className="info-h1 hero-animate-in-delay-1 text-white whitespace-pre-line mb-6">
              {'Los mercados de alimentación\nartesanal crecen un 24% al año.\n¿Ya estás dentro?'}
            </h1>
            <p className="info-lead hero-animate-in-delay-2 text-white/65 max-w-[620px] mb-10">
              Viajé 6 meses por Asia tocando puertas de importadoras
              con muestras de productores españoles. Me dijeron que no
              tenían tiempo, que eran demasiado pequeños, que los formatos
              no estaban adaptados. Tenían razón: no había una plataforma
              que lo facilitara. Ahora la hay.
            </p>
            <div className="hero-animate-in-delay-3 flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/b2b/marketplace')}
                className="h-[46px] px-7 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer"
              >
                Acceder al catálogo B2B →
              </button>
              <button
                onClick={() => document.querySelector('#flujo-b2b')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-[46px] px-7 rounded-full bg-transparent text-white text-sm font-semibold border border-white/25 cursor-pointer"
              >
                Ver cómo funciona
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE PROBLEM (light) */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label mb-4">EL PROBLEMA</p>
          <h2 className="info-h2 mb-4">
            Encontrar buenos proveedores no debería ser tan difícil.
          </h2>
          <p className="info-body text-stone-500 max-w-[680px] mb-12">
            La alimentación artesanal es el mercado de mayor crecimiento
            en la categoría de alimentos premium. Los consumidores pagan
            más por saber de dónde viene lo que comen. Y sin embargo,
            acceder a los mejores productores sigue siendo un proceso
            de emails, ferias, viajes y contratos en PDF.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {[
              { emoji: '📂', title: 'Sin catálogo estructurado', body: 'Los mejores productores artesanales no tienen fuerza de ventas. Encontrarlos es labor de detective.' },
              { emoji: '📧', title: 'Procesos manuales', body: 'Negociar, redactar contratos, gestionar documentación aduanera. Horas que deberían dedicarse a vender.' },
              { emoji: '⚠️', title: 'Sin garantías', body: 'Un acuerdo de palabra con un productor pequeño es un riesgo. Si algo falla, no hay protocolo.' },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white shadow-sm rounded-2xl p-8 reveal"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="text-[32px] block mb-3">{card.emoji}</span>
                <h4 className="info-h4 mb-2">{card.title}</h4>
                <p className="text-[15px] text-stone-500 m-0 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SECTION 3 — B2B FLOW (dark) */}
      <Section dark={true}>
        <div className="reveal" id="flujo-b2b">
          <p className="info-eyebrow text-stone-500 mb-4">EL FLUJO B2B</p>
          <h2 className="info-h2 text-white whitespace-pre-line mb-12">
            {'De la primera oferta al contenedor\nen tu almacén.'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8">
            {[
              { num: 1, title: 'Descubre y filtra', body: 'Explora productores verificados por categoría, certificación, país de origen y capacidad de producción.' },
              { num: 2, title: 'Negocia en el chat', body: 'Contacta directamente con el productor. Negocia precios, volúmenes, Incoterms y condiciones de entrega.' },
              { num: 3, title: 'Firma el contrato', body: 'Genera un contrato digital con todos los términos acordados. Firma electrónica legalmente vinculante.' },
              { num: 4, title: 'Paga con seguridad', body: 'El pago queda retenido hasta confirmar la recepción. Protección total para ambas partes.' },
              { num: 5, title: 'Recibe y cierra', body: 'Tracking en tiempo real. Confirma la recepción, valora al productor. La operación queda registrada.' },
            ].map((step, i) => (
              <div key={i} className="reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-9 h-9 rounded-full bg-stone-950 flex items-center justify-center text-[15px] font-bold text-white mb-3">
                  {step.num}
                </div>
                <h4 className="info-h4 text-white mb-2">{step.title}</h4>
                <p className="text-sm text-white/65 m-0 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SECTION 3.5 — PRICING (light) */}
      <Section dark={false}>
        <div className="reveal">
          <div className="bg-stone-50 rounded-2xl p-6 shadow-sm">
            <p className="uppercase-label mb-6">PRICING B2B</p>
            <div className="flex flex-col gap-4">
              {[
                { text: 'Comisión B2B: 3% por operación cerrada' },
                { text: 'Sin cuota mensual para importadores' },
                { text: 'Pago seguro: fondos retenidos hasta confirmación de recepción' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={18} className="text-stone-950 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-[15px] text-stone-950 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* SECTION 4 — B2C STORE (light) */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label mb-4">DOBLE CANAL</p>
          <h2 className="info-h2 mb-4">
            Importas al por mayor. Vendes al detalle.
          </h2>
          <p className="info-body text-stone-500 max-w-[600px] mb-8">
            Tu cuenta de importador incluye una tienda online en Hispaloshop.
            Los productos que importas se pueden vender directamente al
            consumidor final en el país destino.
          </p>

          <div className="flex flex-col gap-4">
            {[
              'Tu propia tienda dentro de Hispaloshop',
              'Misma plataforma para comprar y vender',
              'Social commerce incluido: reels, stories, recetas',
              'Influencers locales pueden promocionar tus productos',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-stone-950" strokeWidth={2.5} />
                <span className="text-[15px] text-stone-950">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SECTION 5 — CUSTOMS AI (dark) */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow text-stone-500 mb-4">HISPAL AI PARA B2B</p>
          <h2 className="info-h2 text-white whitespace-pre-line mb-4">
            {'La burocracia aduanera,\nresuelta automáticamente.'}
          </h2>
          <p className="text-[15px] text-white/65 max-w-[600px] leading-[1.7] mb-8">
            Según el país de origen, el país de destino,
            el tipo de producto y el Incoterm,
            la IA de Hispaloshop genera automáticamente
            la lista de documentos necesarios para
            el despacho aduanero. Factura comercial,
            packing list, EUR.1, certificados DOP,
            fitosanitarios. Todo en una pantalla.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
            {[
              { emoji: '🤖', title: 'Lista de documentos por tráfico específico', body: 'Documentación personalizada según origen, destino, producto e Incoterm.' },
              { emoji: '⚠️', title: 'Alertas de caducidad de certificados', body: 'Notificaciones automáticas antes de que caduquen tus certificados vigentes.' },
              { emoji: '📄', title: 'Guía de procedimiento aduanero por país', body: 'Instrucciones paso a paso para cada país de destino.' },
              { emoji: '🔔', title: 'Notificación cuando la documentación está completa', body: 'Aviso instantáneo cuando todo está listo para el despacho.' },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 reveal"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="text-[28px] block mb-3">{card.emoji}</span>
                <h4 className="info-h4 text-white mb-2">{card.title}</h4>
                <p className="text-sm text-white/65 m-0 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SECTION 6 — CTA (dark) */}
      <Section dark={true} className="!py-[100px]">
        <div className="text-center reveal">
          <h2 className="info-h2 text-white whitespace-pre-line mb-4">
            {'El catálogo mayorista de alimentación\nartesanal que no existía.'}
          </h2>
          <p className="info-lead text-white/55 max-w-[500px] mx-auto mb-8">
            Más de 1.200 productores verificados.
          </p>
          <button
            onClick={() => navigate('/b2b/marketplace')}
            className="h-14 px-10 rounded-full bg-stone-950 text-white text-base font-semibold border-none cursor-pointer"
          >
            Acceder al catálogo B2B →
          </button>
          <p className="text-sm text-white/35 mt-3">
            Registro gratuito · Sin compromiso
          </p>
        </div>
      </Section>
    </div>
  );
}
