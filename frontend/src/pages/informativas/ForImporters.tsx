// @ts-nocheck
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const Section = ({
  dark,
  children,
  className = ''
}) => <section className={`py-20 px-4 ${dark ? 'bg-stone-950' : 'bg-stone-50'} ${className}`}>
    <div className="max-w-[1200px] mx-auto">{children}</div>
  </section>;
export default function ForImporters() {
  const navigate = useNavigate();
  useScrollReveal();
  usePageTitle();
  return <div>
      <SEO title="Soy Importador — HispaloShop" description={i18n.t('for_importers.importaVendeYCreceAccesoDirectoA', 'Importa, vende y crece. Acceso directo a consumidores, influencers y productores globales. Descubre todas las ventajas para importadores en HispaloShop.')} />

      {/* HERO — ACCESO B2C Y GLOBAL */}
      <section className="min-h-screen bg-stone-950 flex items-start pt-[120px] pb-20 px-4">
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="max-w-[820px]">
            <p className="info-eyebrow hero-animate-in text-stone-500 mb-4">
              IMPORTA, VENDE Y CRECE
            </p>
            <h1 className="info-h1 hero-animate-in-delay-1 text-white whitespace-pre-line mb-6">
              {i18n.t('for_importers.tuTiendaB2cYB2bEnUnSoloLugar', 'Tu tienda B2C y B2B en un solo lugar.')}
            </h1>
            <p className="info-lead hero-animate-in-delay-2 text-white/65 max-w-[620px] mb-10">
              Accede a consumidores finales, conecta con influencers locales y compra directamente a productores de cualquier país. Todo desde una sola plataforma, sin intermediarios.
            </p>
            <div className="hero-animate-in-delay-3 flex gap-3 flex-wrap">
              <button onClick={() => navigate('/register/importer')} className="h-[46px] px-7 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer">
                Crear cuenta de importador
              </button>
              <button onClick={() => document.querySelector('#ventajas-importador')?.scrollIntoView({
              behavior: 'smooth'
            })} className="h-[46px] px-7 rounded-full bg-transparent text-white text-sm font-semibold border border-white/25 cursor-pointer">
                Ver ventajas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* VENTAJAS Y DIFERENCIAS POR PLAN */}
      <Section dark={false}>
        <div className="reveal" id="ventajas-importador">
          <p className="uppercase-label mb-4">¿POR QUÉ IMPORTAR CON HISPALOSHOP?</p>
          <h2 className="info-h2 mb-4">Ventajas reales para importadores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <div>
              <h4 className="font-bold mb-2">Acceso directo al consumidor final (B2C)</h4>
              <p className="text-stone-500 mb-4">{i18n.t('for_importers.vendeTusProductosImportadosDirectame', 'Vende tus productos importados directamente al consumidor en el país destino, sin intermediarios.')}</p>
              <h4 className="font-bold mb-2">Influencers locales</h4>
              <p className="text-stone-500 mb-4">{i18n.t('for_importers.conectaYColaboraConInfluencersLocal', 'Conecta y colabora con influencers locales para promocionar tus productos (Pro y Elite).')}</p>
              <h4 className="font-bold mb-2">Productores globales</h4>
              <p className="text-stone-500 mb-4">{i18n.t('for_importers.compraDirectamenteAProductoresDeCua', 'Compra directamente a productores de cualquier país, con contacto directo y sin intermediarios.')}</p>
              <h4 className="font-bold mb-2">{i18n.t('for_importers.panelDeGestionUnificado', 'Panel de gestión unificado')}</h4>
              <p className="text-stone-500 mb-4">{i18n.t('for_importers.gestionaPedidosPagosLogisticaCert', 'Gestiona pedidos, pagos, logística, certificados y comunicación desde un solo panel.')}</p>
              <h4 className="font-bold mb-2">Soporte real</h4>
              <p className="text-stone-500 mb-4">{i18n.t('for_importers.soportePorChatInternoConAdminLocal', 'Soporte por chat interno con admin local y por email en todos los planes.')}</p>
            </div>
            <div>
              <h4 className="font-bold mb-2">Diferencias por plan</h4>
              <ul className="text-stone-700 text-[15px] space-y-2">
                <li><b>Free:</b> {i18n.t('for_importers.todasLasFuncionesBasicasVenderB2c', 'Todas las funciones básicas, vender B2C, publicar productos, certificados QR, soporte estándar.')}</li>
                <li><b>Pro:</b> {i18n.t('for_importers.matchingConInfluencersDashboardAvan', 'Matching con influencers, dashboard avanzado, analítica de ventas, soporte prioritario.')}</li>
                <li><b>Elite:</b> {i18n.t('for_importers.todoLoAnteriorIaComercialAvanzada', 'Todo lo anterior + IA comercial avanzada, análisis de mercado internacional, generación automática de contratos, comisión más baja.')}</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3"><Check size={18} className="text-stone-950" strokeWidth={2.5} />Acceso a consumidores finales y productores globales</div>
            <div className="flex items-center gap-3"><Check size={18} className="text-stone-950" strokeWidth={2.5} />{i18n.t('for_importers.colaboracionConInfluencersLocalesPr', 'Colaboración con influencers locales (Pro y Elite)')}</div>
            <div className="flex items-center gap-3"><Check size={18} className="text-stone-950" strokeWidth={2.5} />{i18n.t('for_importers.panelDeGestionPagosYLogisticaUnif', 'Panel de gestión, pagos y logística unificados')}</div>
            <div className="flex items-center gap-3"><Check size={18} className="text-stone-950" strokeWidth={2.5} />Soporte por chat interno y email</div>
            <div className="flex items-center gap-3"><Check size={18} className="text-stone-950" strokeWidth={2.5} />{i18n.t('for_importers.iaComercialAvanzadaYGeneracionDeCo', 'IA comercial avanzada y generación de contratos (Elite)')}</div>
          </div>
        </div>
      </Section>

      {/* PASO A PASO Y FAQ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow text-stone-500 mb-4">¿CÓMO FUNCIONA?</p>
          <h2 className="info-h2 text-white mb-8">{i18n.t('for_importers.importarYVenderNuncaFueTanFacil', 'Importar y vender nunca fue tan fácil')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
            <div>
              <ol className="list-decimal list-inside text-white/80 space-y-2">
                <li>{i18n.t('for_importers.creaTuCuentaDeImportador', 'Crea tu cuenta de importador')}</li>
                <li>Publica tus productos importados</li>
                <li>Vende al consumidor final (B2C)</li>
                <li>Colabora con influencers (Pro y Elite)</li>
                <li>{i18n.t('for_importers.accedeAHerramientasDeIaYAnalitica', 'Accede a herramientas de IA y analítica avanzada (Pro y Elite)')}</li>
                <li>{i18n.t('for_importers.gestionaPagosLogisticaYCertificados', 'Gestiona pagos, logística y certificados desde un solo panel')}</li>
              </ol>
            </div>
            <div>
              <h4 className="text-white mb-2">Preguntas frecuentes</h4>
              <ul className="text-white/70 text-[15px] space-y-2">
                <li><b>¿Qué necesito para empezar?</b> {i18n.t('for_importers.soloCrearTuCuentaYSubirTusProduct', 'Solo crear tu cuenta y subir tus productos.')}</li>
                <li><b>¿Puedo vender tanto B2C como B2B?</b> {i18n.t('for_importers.siPuedesVenderAlConsumidorFinalY', 'Sí, puedes vender al consumidor final y también acceder a oportunidades B2B.')}</li>
                <li><b>¿Qué comisiones se aplican?</b> Depende del plan: Free (20%), Pro (18%), Elite (15%).</li>
                <li><b>¿Cómo es el soporte?</b> {i18n.t('for_importers.siemprePorChatInternoYEmailConPr', 'Siempre por chat interno y email, con prioridad en Pro y Elite.')}</li>
                <li><b>¿Qué ventajas tiene Elite?</b> IA comercial avanzada, generación automática de contratos y comisión más baja (15%).</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section dark={true} className="!py-[100px]">
        <div className="text-center reveal">
          <h2 className="info-h2 text-white whitespace-pre-line mb-4">
            {'¿Listo para importar y vender sin límites?'}
          </h2>
          <p className="info-lead text-white/55 max-w-[500px] mx-auto mb-8">
            Da el salto al canal digital y accede a consumidores, influencers y productores globales.
          </p>
          <button onClick={() => navigate('/register/importer')} className="h-14 px-10 rounded-full bg-stone-950 text-white text-base font-semibold border-none cursor-pointer">
            Crear cuenta de importador
          </button>
          <p className="text-sm text-white/35 mt-3">
            Registro gratuito · Sin compromiso
          </p>
        </div>
      </Section>
    </div>;
}