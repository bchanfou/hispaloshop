import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import {
  Shield,
  Sparkles,
  Globe,
  CreditCard,
  Users,
  Heart,
  ArrowRight,
  Truck,
  ShoppingBag,
  CheckCircle,
  ChefHat,
  TrendingUp,
  Layers,
  Smartphone,
  Languages,
} from 'lucide-react';

export default function AboutPage() {
  const stats = [
    { value: '65+', label: 'Paises activos' },
    { value: '100%', label: 'Productos verificados' },
    { value: '24-48h', label: 'Ventana de entrega' },
    { value: '80+', label: 'Categorias' },
  ];

  const features = [
    { icon: Shield, title: 'Calidad y trazabilidad', desc: 'Productos con informacion verificable y certificado digital.', color: 'bg-emerald-50 text-emerald-600' },
    { icon: Globe, title: 'Operacion internacional', desc: 'Catalogo unico para compra y venta en varios mercados.', color: 'bg-blue-50 text-blue-600' },
    { icon: Heart, title: 'Commerce + social', desc: 'Feed, posts y reels conectados con conversion real.', color: 'bg-rose-50 text-rose-600' },
    { icon: CreditCard, title: 'Pagos centralizados', desc: 'Checkout seguro, comisiones y conciliacion por operacion.', color: 'bg-amber-50 text-amber-600' },
    { icon: ChefHat, title: 'Contenido util', desc: 'Recetas, descubrimiento y comunidad alrededor del producto.', color: 'bg-orange-50 text-orange-600' },
    { icon: Users, title: 'Ecosistema completo', desc: 'Clientes, productores, importadores e influencers en un solo flujo.', color: 'bg-stone-100 text-stone-600' },
  ];

  const audience = [
    {
      icon: ShoppingBag,
      title: 'Para compradores',
      points: [
        'Descubrir productos y tiendas verificadas',
        'Comprar con checkout seguro',
        'Seguir perfiles, posts y reels',
        'Ver certificado digital y QR de producto',
      ],
      cta: 'Explorar productos',
      to: '/products',
      border: 'border-emerald-200 bg-emerald-50/30',
    },
    {
      icon: Globe,
      title: 'Para productores',
      points: [
        'Publicar productos y vender en marketplace',
        'Gestionar pedidos y operacion diaria',
        'Certificado digital y QR funcional por producto',
        'Configurar envio y catalogo internacional',
      ],
      cta: 'Ser Productor',
      to: '/productor/registro',
      border: 'border-blue-200 bg-blue-50/30',
    },
    {
      icon: Sparkles,
      title: 'Para influencers',
      points: [
        'Tiers activos: Hercules, Atenea, Zeus',
        'Comisiones del 3% al 7% segun GMV',
        'Tracking de conversion y rendimiento',
        'Monetizacion en posts y reels',
      ],
      cta: 'Ser Influencer',
      to: '/influencer/aplicar',
      border: 'border-purple-200 bg-purple-50/30',
    },
    {
      icon: TrendingUp,
      title: 'Para importadores',
      points: [
        'Mismas capacidades que Productor para vender',
        'Alta de productos y catalogo propio',
        'Certificado digital y QR funcional por producto',
        'Panel de pedidos, pagos y operacion',
      ],
      cta: 'Ser Importador',
      to: '/importer/onboarding',
      border: 'border-amber-200 bg-amber-50/30',
    },
  ];

  const newFeatures = [
    { icon: Layers, title: 'Catalogo limpio', desc: 'Navegacion por categorias con foco en conversion.', color: 'bg-yellow-50 text-yellow-700' },
    { icon: ChefHat, title: 'Recetas conectadas', desc: 'Contenido util enlazado a productos reales.', color: 'bg-orange-50 text-orange-700' },
    { icon: Smartphone, title: 'Feed social', desc: 'Publicaciones y reels para descubrimiento diario.', color: 'bg-rose-50 text-rose-700' },
    { icon: Languages, title: 'Contexto local', desc: 'Idioma y moneda aplicados por preferencia.', color: 'bg-blue-50 text-blue-700' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />

        <section className="text-center mb-12" data-testid="about-hero">
          <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-3">Qué es Hispaloshop</p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1C1C1C] mb-4">
            Marketplace social para producto real
          </h1>
          <p className="text-sm text-[#555] max-w-xl mx-auto mb-6">
            Unimos compra, venta, influencia y trazabilidad en una plataforma operativa.
          </p>
          <div className="flex justify-center gap-5 sm:gap-8 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-[#2D5A27]">{s.value}</p>
                <p className="text-xs text-[#7A7A7A] uppercase">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <Link to="/products">
              <Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-6 h-11" data-testid="about-explore-btn">
                Explorar productos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" className="rounded-full px-6 h-11" data-testid="about-signup-btn">
                Crear cuenta gratis
              </Button>
            </Link>
          </div>
        </section>

        <section className="mb-12" data-testid="about-whats-new">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-2">Lo que ya esta activo</h2>
          <p className="text-sm text-[#666] text-center mb-8">Funcionalidad real de producto en esta version.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {newFeatures.map((nf, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${nf.color} flex items-center justify-center mx-auto mb-2`}>
                  <nf.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[#1C1C1C] text-sm mb-1">{nf.title}</h3>
                <p className="text-[11px] text-[#666] leading-relaxed">{nf.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-8">Por que la plataforma funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition-all" data-testid={`about-feature-${i}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-[#1C1C1C] text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-[#666] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-8">Para quien esta hecho</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {audience.map((a, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${a.border}`} data-testid={`about-audience-${i}`}>
                <a.icon className="w-7 h-7 text-[#1C1C1C] mb-3" />
                <h3 className="font-heading text-lg font-semibold text-[#1C1C1C] mb-3">{a.title}</h3>
                <ul className="space-y-2 mb-4">
                  {a.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-[#444]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27] mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link to={a.to}>
                  <Button variant="outline" size="sm" className="w-full rounded-xl hover:bg-[#1C1C1C] hover:text-white">
                    {a.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-2">Por qué existe Hispaloshop</h2>
          <p className="text-sm text-[#666] text-center mb-8">La historia real detrás del proyecto.</p>
          <div className="bg-[#1C1C1C] rounded-2xl p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#2D5A27] flex items-center justify-center text-white font-bold text-sm shrink-0">BC</div>
              <div>
                <p className="font-semibold text-white text-sm">Bil Chanfou</p>
                <a href="https://instagram.com/bchanfuah" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-white transition-colors">@bchanfuah</a>
              </div>
              <span className="ml-auto text-xs text-stone-500 uppercase tracking-widest">Fundador</span>
            </div>
            <div className="space-y-4 text-sm leading-7 text-stone-300">
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
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-8">Cómo funciona</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Sparkles, title: 'Descubre', desc: 'Explora catalogo, tiendas y contenido.' },
              { icon: ShoppingBag, title: 'Compra', desc: 'Checkout centralizado en un solo flujo.' },
              { icon: Truck, title: 'Recibe', desc: 'Seguimiento operativo y entrega.' },
            ].map((s, i) => (
              <div key={i}>
                <div className="w-12 h-12 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-[#666]">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#1C1C1C] rounded-2xl p-8 text-center" data-testid="about-cta">
          <h2 className="font-heading text-2xl font-semibold text-white mb-3">Empieza hoy</h2>
          <p className="text-sm text-stone-400 mb-6">Entra como comprador, productor, influencer o importador.</p>
          <div className="flex justify-center gap-3">
            <Link to="/signup">
              <Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-7 h-11">
                Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" className="rounded-full px-7 h-11 border-stone-600 text-stone-300 hover:bg-stone-800">
                Solo explorar
              </Button>
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
