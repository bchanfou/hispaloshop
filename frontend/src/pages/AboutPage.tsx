// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { useTranslation } from 'react-i18next';
import { Shield, Sparkles, Globe, CreditCard, Users, Heart, ArrowRight, Truck, ShoppingBag, CheckCircle, ChefHat, TrendingUp, Layers, Smartphone, Languages } from 'lucide-react';
import i18n from "../locales/i18n";
export default function AboutPage() {
  const [founderAvatarError, setFounderAvatarError] = useState(false);
  const stats = [{
    value: '✓',
    label: 'Productores verificados'
  }, {
    value: '✓',
    label: 'Venta directa'
  }, {
    value: '✓',
    label: i18n.t('about.envioGestionadoPorProductor', 'Envío gestionado por productor')
  }, {
    value: '✓',
    label: 'Trazabilidad completa'
  }];
  const features = [{
    icon: Shield,
    title: 'Calidad y trazabilidad',
    desc: i18n.t('about.productosConInformacionVerificableY', 'Productos con información verificable y certificado digital.'),
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: Globe,
    title: i18n.t('about.operacionInternacional', 'Operación internacional'),
    desc: 'Catálogo único para compra y venta en varios mercados.',
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: Heart,
    title: 'Commerce + social',
    desc: i18n.t('about.feedPostsYReelsConectadosConConve', 'Feed, posts y reels conectados con conversión real.'),
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: CreditCard,
    title: 'Pagos centralizados',
    desc: i18n.t('about.checkoutSeguroComisionesYConciliaci', 'Checkout seguro, comisiones y conciliación por operación.'),
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: ChefHat,
    title: i18n.t('about.contenidoUtil', 'Contenido útil'),
    desc: 'Recetas, descubrimiento y comunidad alrededor del producto.',
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: Users,
    title: 'Ecosistema completo',
    desc: i18n.t('about.clientesProductoresImportadoresEIn', 'Clientes, productores, importadores e influencers en un solo flujo.'),
    color: 'bg-stone-100 text-stone-700'
  }];
  const audience = [{
    icon: ShoppingBag,
    title: 'Para compradores',
    points: ['Descubrir productos y tiendas verificadas', 'Comprar con checkout seguro', 'Seguir perfiles, posts y reels', 'Ver certificado digital y QR de producto'],
    cta: 'Explorar productos',
    to: '/products',
    border: 'border-stone-200 bg-stone-50/30'
  }, {
    icon: Globe,
    title: 'Para productores',
    points: ['Publicar productos y vender en marketplace', i18n.t('about.gestionarPedidosYOperacionDiaria', 'Gestionar pedidos y operación diaria'), 'Certificado digital y QR funcional por producto', i18n.t('about.configurarEnvioYCatalogoInternaciona', 'Configurar envío y catálogo internacional')],
    cta: 'Ser Productor',
    to: '/productor/registro',
    border: 'border-stone-200 bg-stone-50/30'
  }, {
    icon: Sparkles,
    title: 'Para influencers',
    points: ['Tiers activos: Hercules, Atenea, Zeus', 'Comisiones del 3% al 7% según GMV', i18n.t('about.trackingDeConversionYRendimiento', 'Tracking de conversión y rendimiento'), i18n.t('about.monetizacionEnPostsYReels', 'Monetización en posts y reels')],
    cta: 'Ser Influencer',
    to: '/influencer/aplicar',
    border: 'border-stone-200 bg-stone-50/30'
  }, {
    icon: TrendingUp,
    title: 'Para importadores',
    points: ['Mismas capacidades que Productor para vender', i18n.t('about.altaDeProductosYCatalogoPropio', 'Alta de productos y catálogo propio'), 'Certificado digital y QR funcional por producto', i18n.t('about.panelDePedidosPagosYOperacion', 'Panel de pedidos, pagos y operación')],
    cta: 'Ser Importador',
    to: '/importer/onboarding',
    border: 'border-stone-200 bg-stone-50/30'
  }];
  const newFeatures = [{
    icon: Layers,
    title: i18n.t('about.catalogoLimpio', 'Catálogo limpio'),
    desc: 'Navegación por categorías con foco en conversión.',
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: ChefHat,
    title: 'Recetas conectadas',
    desc: i18n.t('about.contenidoUtilEnlazadoAProductosReal', 'Contenido útil enlazado a productos reales.'),
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: Smartphone,
    title: 'Feed social',
    desc: 'Publicaciones y reels para descubrimiento diario.',
    color: 'bg-stone-100 text-stone-700'
  }, {
    icon: Languages,
    title: 'Contexto local',
    desc: 'Idioma y moneda aplicados por preferencia.',
    color: 'bg-stone-100 text-stone-700'
  }];
  return <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />

        <section className="text-center mb-12" data-testid="about-hero">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">{i18n.t('about.queEsHispaloshop', 'Qué es Hispaloshop')}</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-950 mb-4">
            Marketplace social para producto real
          </h1>
          <p className="text-sm text-stone-600 max-w-xl mx-auto mb-6">
            Unimos compra, venta, influencia y trazabilidad en una plataforma operativa.
          </p>
          <div className="flex justify-center gap-5 sm:gap-8 mb-6">
            {stats.map((s, i) => <div key={i} className="text-center">
                <p className="text-2xl font-bold text-stone-950">{s.value}</p>
                <p className="text-xs text-stone-500 uppercase">{s.label}</p>
              </div>)}
          </div>
          <div className="flex justify-center gap-3">
            <Link to="/products" className="inline-flex h-11 items-center gap-1 rounded-full bg-stone-950 px-6 text-[14px] font-medium text-white transition-colors hover:bg-stone-800" data-testid="about-explore-btn">
              Explorar productos <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/signup" className="inline-flex h-11 items-center rounded-full border border-stone-200 bg-white px-6 text-[14px] font-medium text-stone-700 transition-colors hover:bg-stone-50" data-testid="about-signup-btn">
              Crear cuenta gratis
            </Link>
          </div>
        </section>

        <section className="mb-12" data-testid="about-whats-new">
          <h2 className="text-2xl font-semibold text-stone-950 text-center mb-2">{i18n.t('about.loQueYaEstaActivo', 'Lo que ya está activo')}</h2>
          <p className="text-sm text-stone-500 text-center mb-8">{i18n.t('about.funcionalidadRealDeProductoEnEstaV', 'Funcionalidad real de producto en esta versión.')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {newFeatures.map((nf, i) => <div key={i} className="bg-white rounded-2xl shadow-sm p-4 text-center hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-2xl ${nf.color} flex items-center justify-center mx-auto mb-2`}>
                  <nf.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-stone-950 text-sm mb-1">{nf.title}</h3>
                <p className="text-[11px] text-stone-500 leading-relaxed">{nf.desc}</p>
              </div>)}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-stone-950 text-center mb-8">{i18n.t('about.porQueLaPlataformaFunciona', 'Por qué la plataforma funciona')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => <div key={i} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all" data-testid={`about-feature-${i}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-stone-950 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
              </div>)}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-stone-950 text-center mb-8">{i18n.t('about.paraQuienEstaHecho', 'Para quién está hecho')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {audience.map((a, i) => <div key={i} className={`rounded-2xl border p-5 ${a.border}`} data-testid={`about-audience-${i}`}>
                <a.icon className="w-7 h-7 text-stone-950 mb-3" />
                <h3 className="text-lg font-semibold text-stone-950 mb-3">{a.title}</h3>
                <ul className="space-y-2 mb-4">
                  {a.points.map((p, j) => <li key={j} className="flex items-start gap-2 text-xs text-stone-950">
                      <CheckCircle className="w-3.5 h-3.5 text-stone-500 mt-0.5 shrink-0" />
                      {p}
                    </li>)}
                </ul>
                <Link to={a.to} className="inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-950 hover:text-white">
                  {a.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>)}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-stone-950 text-center mb-2">{i18n.t('about.porQueExisteHispaloshop', 'Por qué existe Hispaloshop')}</h2>
          <p className="text-sm text-stone-500 text-center mb-8">{i18n.t('about.laHistoriaRealDetrasDelProyecto', 'La historia real detrás del proyecto.')}</p>
          <div className="bg-stone-950 rounded-2xl p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                {!founderAvatarError ? <img src="/images/bil-founder.jpg" alt="Bil Chanfou - fundador de Hispaloshop" loading="lazy" className="h-full w-full object-cover" onError={() => setFounderAvatarError(true)} /> : null}
                {founderAvatarError ? <div className="flex h-full w-full items-center justify-center bg-white text-sm font-bold text-stone-950">BC</div> : null}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Bil Chanfou</p>
                <a href="https://instagram.com/bchanfuah" target="_blank" rel="noopener noreferrer" className="text-xs text-white/70 hover:text-white transition-colors" aria-label="Seguir a Bil Chanfou en Instagram">@bchanfuah</a>
              </div>
              <span className="ml-auto text-xs text-stone-400 uppercase tracking-wide">Fundador</span>
            </div>
            <div className="space-y-4 text-sm leading-7 text-white/80">
              <p>
                Tenía 22 años cuando estaba en Seúl haciendo de extra en videoclips de K-pop. Conocí a <strong className="text-white">Alberto</strong> —300.000 seguidores en Instagram— destruido: vendiendo productos que no usaba solo para pagar el piso. Y a <strong className="text-white">Rebeca</strong>, con apenas 2.000 seguidores y una dedicación brutal, soñando con vivir de crear contenido dignamente. El sistema no estaba hecho para ninguno de los dos.
              </p>
              <p>
                A los 24 años recorrí España de fábrica en fábrica: la Cooperativa La Carrera en Úbeda, Anaconda Foods en Madrid, Carolina Honest en Reus. Volé a Seúl con 20 kg de muestras. Luego a Japón. Un año de rechazo sistemático: nadie valoró el alma que había en esos productos.
              </p>
              <p>
                A los 25 perdí 15.000€ en un container de palomitas que se pudrió en Incheon. Lloré en un parque de Seúl. A los 26, volví a la habitación de mis padres en Reus. Son las 6 de la mañana y llevo dos meses sin dormir más de 5 horas construyendo esto.
              </p>
              <p className="text-white font-medium">
                Lo hice para que ningún productor honesto vuelva a sentirse invisible. Para que ningún influencer tenga que elegir entre su integridad y su pan.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12 text-center">
          <h2 className="text-2xl font-semibold text-stone-950 mb-8">{i18n.t('becomeInfluencer.howItWorksTitle', 'Cómo funciona')}</h2>
          <div className="grid grid-cols-3 gap-4">
            {[{
            icon: Sparkles,
            title: 'Descubre',
            desc: i18n.t('about.exploraCatalogoTiendasYContenido', 'Explora catálogo, tiendas y contenido.')
          }, {
            icon: ShoppingBag,
            title: 'Compra',
            desc: i18n.t('about.checkoutCentralizadoEnUnSoloFlujo', 'Checkout centralizado en un solo flujo.')
          }, {
            icon: Truck,
            title: 'Recibe',
            desc: 'Seguimiento operativo y entrega.'
          }].map((s, i) => <div key={i}>
                <div className="w-12 h-12 rounded-2xl bg-stone-950 text-white flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-stone-500">{s.desc}</p>
              </div>)}
          </div>
        </section>

        <section className="bg-stone-950 rounded-2xl p-8 text-center" data-testid="about-cta">
          <h2 className="text-2xl font-semibold text-white mb-3">Empieza hoy</h2>
          <p className="mb-6 text-sm text-white/80">Entra como comprador, productor, influencer o importador.</p>
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="inline-flex h-11 items-center gap-1 rounded-full bg-white px-7 text-[14px] font-medium text-stone-950 transition-colors hover:bg-stone-100">
              Crear cuenta gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/products" className="inline-flex h-11 items-center rounded-full border border-white/20 px-7 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              Solo explorar
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>;
}