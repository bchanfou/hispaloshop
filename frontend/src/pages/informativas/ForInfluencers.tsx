// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
export default function ForInfluencers() {
  useScrollReveal();
  usePageTitle('Soy Influencer - Hispaloshop');
  return <div>
      <SEO title="Soy Influencer — Hispaloshop" description={i18n.t('for_influencers.creaComunidadApoyaProductoresHonest', 'Crea comunidad, apoya productores honestos y monetiza tu esfuerzo de verdad. Comisiones recurrentes, libertad creativa y acompañamiento directo.')} />

      {/* HERO + CTA */}
      <section className="info-hero bg-[#0A0A0A] min-h-[60vh] flex items-center pt-[120px] pb-12 px-4">
        <div className="max-w-[900px] mx-auto w-full text-center">
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-6">¿Eres influencer? Aquí tu comunidad deja huella real</h1>
          <p className="text-white/80 text-lg md:text-xl mb-8">{i18n.t('for_influencers.estoNoVaDeVenderPorVenderVaDeD', 'Esto no va de vender por vender. Va de dar visibilidad a productores honestos, ofrecer alimentos saludables a tus seguidores y monetizar tu esfuerzo de forma recurrente. Aquí tienes libertad, comunidad y acompañamiento directo. Soy Bil Chanfou y he construido esto para ti.')}</p>
          <a className="cta-btn bg-stone-950 text-white px-8 py-3 rounded-full font-semibold text-lg" href="/influencer/aplicar">Crear cuenta de influencer</a>
        </div>
      </section>

      {/* PASOS SIMPLIFICADOS */}
      <section className="info-steps bg-white py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">¿Cómo funciona?</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <li className="bg-stone-50 rounded-2xl p-6 text-center">
              <span className="block text-3xl mb-2">1</span>
              <b>Solicita acceso</b> y conecta tus redes. Te confirmo personalmente.
            </li>
            <li className="bg-stone-50 rounded-2xl p-6 text-center">
              <span className="block text-3xl mb-2">2</span>
              <b>Elige productos</b> y genera tu link único. Comparte con tu comunidad.
            </li>
            <li className="bg-stone-50 rounded-2xl p-6 text-center">
              <span className="block text-3xl mb-2">3</span>
              <b>Monetiza</b> cada venta durante 18 meses. Sin exclusividades, sin presión.
            </li>
          </ol>
        </div>
      </section>

      {/* TIERS Y CALCULADORA */}
      <section className="info-tiers bg-stone-50 py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{i18n.t('for_influencers.ganaMasDejaHuella', 'Gana más, deja huella')}</h2>
          <div className="flex flex-col md:flex-row gap-6 justify-center mb-8">
            <div className="bg-stone-50 rounded-2xl p-8 text-center flex-1 border border-stone-200">
              <p className="font-bold text-stone-950 mb-2 uppercase tracking-wider">{i18n.t('for_influencers.hercules', 'Hércules')}</p>
              <p className="text-2xl font-bold text-stone-950 mb-2">3% comisión</p>
              <p className="text-stone-600 mb-2">Desde 1.000 seguidores</p>
              <p className="text-stone-500 text-sm">Empieza sin riesgo</p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-8 text-center flex-1 border-2 border-stone-950">
              <p className="font-bold text-stone-950 mb-2 uppercase tracking-wider">Atenea</p>
              <p className="text-2xl font-bold text-stone-950 mb-2">5% comisión</p>
              <p className="text-stone-600 mb-2">50 ventas en 90 días</p>
              <p className="text-stone-500 text-sm">{i18n.t('for_influencers.laMayoriaLlegaAqui', 'La mayoría llega aquí')}</p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-8 text-center flex-1 border border-stone-200">
              <p className="font-bold text-stone-950 mb-2 uppercase tracking-wider">Zeus</p>
              <p className="text-2xl font-bold text-stone-950 mb-2">7% comisión</p>
              <p className="text-stone-600 mb-2">200 ventas en 90 días</p>
              <p className="text-stone-500 text-sm">Top influencers</p>
            </div>
          </div>
          {/* Calculadora de ingresos */}
          <div className="bg-white rounded-2xl p-8 shadow-sm max-w-[700px] mx-auto mb-4">
            <h3 className="text-xl font-bold mb-2 text-center">¿Cuánto puedes ganar?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="font-bold text-stone-950 mb-1">{i18n.t('for_influencers.hercules', 'Hércules')}</p>
                <p className="text-stone-600 text-sm mb-1">3% comisión</p>
                <p className="text-stone-950 text-lg font-semibold">5 ventas/día = 112€/mes</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-stone-950 mb-1">Atenea</p>
                <p className="text-stone-600 text-sm mb-1">5% comisión</p>
                <p className="text-stone-950 text-lg font-semibold">5 ventas/día = 187€/mes</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-stone-950 mb-1">Zeus</p>
                <p className="text-stone-600 text-sm mb-1">7% comisión</p>
                <p className="text-stone-950 text-lg font-semibold">5 ventas/día = 262€/mes</p>
              </div>
            </div>
            <p className="text-center text-stone-500 text-sm mt-4">{i18n.t('for_influencers.comisionRecurrenteDurante18MesesPor', 'Comisión recurrente durante 18 meses por cada usuario referido.')}</p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="info-cta bg-[#0A0A0A] py-16 px-4 text-center">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-white text-3xl font-bold mb-4">¿Listo para dejar huella?</h2>
          <p className="text-white/70 text-lg mb-8">{i18n.t('for_influencers.creaComunidadApoyaProductoresHonest1', 'Crea comunidad, apoya productores honestos y monetiza tu esfuerzo de verdad. Aquí tienes libertad y acompañamiento directo. Si necesitas algo, háblame. Soy Bil Chanfou.')}</p>
          <a className="cta-btn bg-stone-950 text-white px-10 py-4 rounded-full font-semibold text-lg" href="/influencer/aplicar">Crear cuenta de influencer</a>
          <div className="mt-4">
            <Link to="/contacto" className="text-sm text-white/50 underline">Tengo preguntas · Contactar</Link>
          </div>
        </div>
      </section>
    </div>;
}