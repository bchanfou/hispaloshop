// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';

export default function ForProducers() {
  useScrollReveal();
  usePageTitle('Soy Productor - Hispaloshop');

  return (
    <div>
      <SEO title="Soy Productor — Hispaloshop" description=t('for_producers.conectaTuProduccionConImportadoresY', 'Conecta tu producción con importadores y clientes de todo el mundo. Expande tu alcance, digitaliza tu catálogo y accede a nuevas oportunidades comerciales.') />

      {/* HERO + CTA */}
      <section className="info-hero bg-[#0A0A0A] min-h-[60vh] flex items-center pt-[120px] pb-12 px-4">
        <div className="max-w-[900px] mx-auto w-full text-center">
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-6">¿Eres Productor? Haz crecer tu negocio con Hispaloshop</h1>
          <p className="text-white/80 text-lg md:text-xl mb-8">{t('for_producers.uneteALaPlataformaQueConectaProduc', 'Únete a la plataforma que conecta productores con importadores y clientes de todo el mundo. Digitaliza tu catálogo y accede a nuevas oportunidades comerciales.')}</p>
          <a className="cta-btn bg-stone-950 text-white px-8 py-3 rounded-full font-semibold text-lg" href="/registro">Crear cuenta de productor</a>
        </div>
      </section>

      {/* PASOS SIMPLIFICADOS */}
      <section className="info-steps bg-white py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">¿Cómo funciona?</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <li className="bg-stone-50 rounded-2xl p-6 text-center">
              <span className="block text-3xl mb-2">1</span>
              <b>{t('for_producers.registrateGratis', 'Regístrate gratis')}</b> y crea tu perfil de productor.
            </li>
            <li className="bg-stone-50 rounded-2xl p-6 text-center">
              <span className="block text-3xl mb-2">2</span>
              <b>{t('for_producers.publicaTuCatalogo', 'Publica tu catálogo')}</b> con fotos y descripciones.
            </li>
            <li className="bg-stone-50 rounded-2xl p-6 text-center">
              <span className="block text-3xl mb-2">3</span>
              <b>Conecta</b> con importadores y clientes interesados.
            </li>
          </ol>
        </div>
      </section>

      {/* BENEFICIOS REALES */}
      <section className="info-benefits bg-stone-50 py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Ventajas reales para productores</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg text-stone-700">
            <li>{t('for_producers.accesoInmediatoAUnaRedGlobalDeImp', 'Acceso inmediato a una red global de importadores verificados.')}</li>
            <li>{t('for_producers.herramientasParaDestacarTuMarcaYPr', 'Herramientas para destacar tu marca y productos.')}</li>
            <li>Visibilidad internacional y posicionamiento en buscadores.</li>
            <li>Soporte personalizado y recursos educativos.</li>
            <li>{t('for_producers.opcionesDePromocionPremiumSegunTuP', 'Opciones de promoción premium según tu plan.')}</li>
            <li>{t('for_producers.gestionEficienteDeContactosYOportun', 'Gestión eficiente de contactos y oportunidades.')}</li>
            <li>Certificado digital y QR funcional por producto.</li>
          </ul>
        </div>
      </section>

      {/* PLANES SIMPLIFICADOS */}
      <section className="info-plans bg-white py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Planes para cada etapa</h2>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <div className="bg-stone-50 rounded-2xl p-8 text-center flex-1">
              <p className="font-bold text-stone-950 mb-2 uppercase tracking-wider">Free</p>
              <p className="text-2xl font-bold text-stone-950 mb-2">0€/mes</p>
              <p className="text-stone-600 mb-2">20% comisión</p>
              <p className="text-stone-500 text-sm">Empieza sin compromiso</p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-8 text-center flex-1">
              <p className="font-bold text-stone-950 mb-2 uppercase tracking-wider">Pro</p>
              <p className="text-2xl font-bold text-stone-950 mb-2">79€/mes</p>
              <p className="text-stone-600 mb-2">18% comisión · Envío gratis desde 30€</p>
              <p className="text-stone-500 text-sm">{t('for_producers.paraProductoresEnCrecimiento', 'Para productores en crecimiento')}</p>
            </div>
            <div className="bg-stone-50 rounded-2xl p-8 text-center flex-1">
              <p className="font-bold text-stone-950 mb-2 uppercase tracking-wider">Elite</p>
              <p className="text-2xl font-bold text-stone-950 mb-2">249€/mes</p>
              <p className="text-stone-600 mb-2">15% comisión · Envío gratis desde 20€</p>
              <p className="text-stone-500 text-sm">{t('for_producers.maximaVisibilidadYVentajas', 'Máxima visibilidad y ventajas')}</p>
            </div>
          </div>
          <p className="text-center text-sm text-stone-500 mt-6">{t('for_producers.sinTarjetaDeCreditoParaEmpezar', 'Sin tarjeta de crédito para empezar')}</p>
        </div>
      </section>

      {/* FAQ AMPLIADO */}
      <section className="info-faq bg-stone-50 py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Preguntas frecuentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <details>
              <summary className="font-semibold text-stone-800 cursor-pointer">¿Cuánto cuesta registrarse?</summary>
              <p className="text-stone-600 mt-2">{t('for_producers.elRegistroEsGratuitoPuedesAcceder', 'El registro es gratuito. Puedes acceder a funciones avanzadas con planes premium.')}</p>
            </details>
            <details>
              <summary className="font-semibold text-stone-800 cursor-pointer">¿Qué tipo de productos puedo publicar?</summary>
              <p className="text-stone-600 mt-2">{t('for_producers.puedesPublicarCualquierProductoQueC', 'Puedes publicar cualquier producto que cumpla con nuestras políticas y estándares de calidad.')}</p>
            </details>
            <details>
              <summary className="font-semibold text-stone-800 cursor-pointer">¿Cómo contacto a los importadores?</summary>
              <p className="text-stone-600 mt-2">{t('for_producers.unaVezRegistradoPodrasContactarImp', 'Una vez registrado, podrás contactar importadores directamente desde la plataforma.')}</p>
            </details>
            <details>
              <summary className="font-semibold text-stone-800 cursor-pointer">¿Qué beneficios obtengo con un plan premium?</summary>
              <p className="text-stone-600 mt-2">{t('for_producers.mayorVisibilidadAccesoPrioritarioA', 'Mayor visibilidad, acceso prioritario a oportunidades y herramientas exclusivas para potenciar tu negocio.')}</p>
            </details>
            <details>
              <summary className="font-semibold text-stone-800 cursor-pointer">¿Puedo vender tanto a particulares como a empresas?</summary>
              <p className="text-stone-600 mt-2">{t('for_producers.siPuedesVenderTantoAConsumidoresF', 'Sí, puedes vender tanto a consumidores finales como a importadores y empresas.')}</p>
            </details>
            <details>
              <summary className="font-semibold text-stone-800 cursor-pointer">¿Qué soporte ofrece Hispaloshop?</summary>
              <p className="text-stone-600 mt-2">{t('for_producers.soportePersonalizadoRecursosEducativ', 'Soporte personalizado, recursos educativos y asesoría en comercio internacional.')}</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="info-cta bg-[#0A0A0A] py-16 px-4 text-center">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-white text-3xl font-bold mb-4">¿Listo para vender más lejos?</h2>
          <p className="text-white/70 text-lg mb-8">{t('for_producers.uneteACientosDeProductoresQueYaEs', 'Únete a cientos de productores que ya están creciendo con Hispaloshop.')}</p>
          <a className="cta-btn bg-stone-950 text-white px-10 py-4 rounded-full font-semibold text-lg" href="/registro">Crear cuenta de productor</a>
          <div className="mt-4">
            <Link to="/contacto" className="text-sm text-white/50 underline">Tengo preguntas · Contactar</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
