import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  MessageCircle,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

import { API } from '../utils/api';

const HOW_IT_WORKS = [
  {
    icon: Upload,
    title: 'Sube tu catalogo',
    timing: '10 min',
    description: 'Fotos con el movil, descripcion y precio. Lo justo para empezar a vender hoy.',
  },
  {
    icon: BellRing,
    title: 'Recibe pedidos',
    timing: 'Automatico',
    description: 'Aviso por email y WhatsApp. Tu confirmas stock y sigues con tu dia.',
  },
  {
    icon: Truck,
    title: 'Envia como quieras',
    timing: 'Tu control',
    description: 'Mensajeria local, recogida en finca o tu propia ruta. No te imponemos el metodo.',
  },
  {
    icon: ShieldCheck,
    title: 'Cobra seguro',
    timing: 'Garantizado',
    description: 'El dinero se reserva al comprar y se libera al entregar. Menos sustos, menos impagos.',
  },
];

const TOOLING = [
  { icon: QrCode, title: 'Certificado digital con QR', description: 'Trazabilidad por producto para reforzar confianza y origen.' },
  { icon: Store, title: 'Tienda personalizada', description: 'Tu marca en tudominio.hispaloshop.com con pagina lista para vender.' },
  { icon: Smartphone, title: 'Gestion simple desde movil', description: 'Pedidos, stock y seguimiento sin depender de un ordenador.' },
  { icon: BarChart3, title: 'Estadisticas claras', description: 'Ventas, recurrencia y clientes sin hojas Excel improvisadas.' },
  { icon: MessageCircle, title: 'Soporte por WhatsApp', description: 'Respuesta rapida para arrancar y resolver incidencias reales.' },
];
const PRODUCTOR_VIDEO_URL = process.env.REACT_APP_PRODUCER_VIDEO_URL || 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0';

const producerNames = ['Cooperativa La Huerta Viva', 'Bodega Sierra Azul', 'Mediterranean Import Hub'];

const formatEuro = (value) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

function scrollToVideo() {
  document.getElementById('video-productor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function MarginComparator() {
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimateBars(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="px-4 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d3f20]">Lo que ganas ahora vs lo que podrias ganar</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">El problema no es tu producto. Es todo lo que se queda por el camino.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
              Ejemplo orientativo para un producto artesanal comparable. Sin inflar numeros: misma pieza, distinto canal.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[28px] border border-[#d7c9b2] bg-[#fffaf2] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Canal tradicional</p>
                    <p className="mt-1 text-sm text-stone-600">Producto equivalente en distribucion larga</p>
                  </div>
                  <span className="rounded-full bg-[#eadcc5] px-3 py-1 text-xs font-semibold text-[#7d3f20]">Tu margen se diluye</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-stone-700">
                  <span className="rounded-full bg-white px-3 py-2">Producto: EUR 10</span>
                  <span className="text-stone-400">-&gt;</span>
                  <span className="rounded-full bg-white px-3 py-2">Mayorista: EUR 6</span>
                  <span className="text-stone-400">-&gt;</span>
                  <span className="rounded-full bg-white px-3 py-2">Retail: EUR 12</span>
                  <span className="text-stone-400">-&gt;</span>
                  <span className="rounded-full bg-[#1C1C1C] px-3 py-2 text-white">Cliente paga: EUR 20</span>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#d6dbc7] bg-[#f5f7ef] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Hispaloshop</p>
                    <p className="mt-1 text-sm text-stone-600">Venta directa con comision del 15%</p>
                  </div>
                  <span className="rounded-full bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-white">Tu decides precio y envio</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-stone-700">
                  <span className="rounded-full bg-white px-3 py-2">Producto: EUR 10</span>
                  <span className="text-stone-400">-&gt;</span>
                  <span className="rounded-full bg-white px-3 py-2">Tu vendes: EUR 18</span>
                  <span className="text-stone-400">-&gt;</span>
                  <span className="rounded-full bg-white px-3 py-2">Cliente paga: EUR 18</span>
                  <span className="text-stone-400">-&gt;</span>
                  <span className="rounded-full bg-[#2d5a27] px-3 py-2 text-white">Tu ganas: EUR 15.30</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_30px_100px_-60px_rgba(28,28,28,0.6)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Comparador visual</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-[#1C1C1C]">Cuanto se queda contigo</h3>
              </div>
              <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">Por unidad</span>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-stone-600">Canal tradicional</span>
                  <span className="font-semibold text-stone-900">EUR 6.00</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#d97706,#f59e0b)] transition-all duration-1000 ease-out" style={{ width: animateBars ? '33%' : 0 }} />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-stone-600">Hispaloshop 15%</span>
                  <span className="font-semibold text-stone-900">EUR 15.30</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#14532d,#2d5a27)] transition-all duration-1000 ease-out" style={{ width: animateBars ? '85%' : 0 }} />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-stone-600">Hispaloshop 10% con tu link</span>
                  <span className="font-semibold text-stone-900">EUR 16.20</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#111827,#1f2937)] transition-all duration-1000 ease-out" style={{ width: animateBars ? '90%' : 0 }} />
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-stone-500">
              Referencia usada: PVP directo EUR 18, comision Hispaloshop del 15% o 10%, y canal tradicional altamente intermediado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfitCalculator() {
  const [salePrice, setSalePrice] = useState(18);
  const [traditionalPayout, setTraditionalPayout] = useState(6);
  const [monthlyOrders, setMonthlyOrders] = useState(80);

  const summary = useMemo(() => {
    const current = traditionalPayout * monthlyOrders;
    const hispaloshop = salePrice * 0.85 * monthlyOrders;
    const ownLink = salePrice * 0.9 * monthlyOrders;
    return {
      current,
      hispaloshop,
      ownLink,
      delta: hispaloshop - current,
    };
  }, [monthlyOrders, salePrice, traditionalPayout]);

  return (
    <section className="bg-[#111111] px-4 py-14 text-white md:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Calculadora de ganancias</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Pon tus numeros. La diferencia sale sola.</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-300">
            Ajusta precio final, lo que te paga hoy el intermediario y tus ventas mensuales. Veras cuanto recuperas cuando vendes directo.
          </p>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <Label htmlFor="salePrice" className="text-sm text-stone-300">Precio final al cliente</Label>
              <Input id="salePrice" type="number" min="1" step="0.5" value={salePrice} onChange={(event) => setSalePrice(Number(event.target.value) || 0)} className="mt-2 h-12 rounded-2xl border-white/10 bg-white text-stone-900" />
            </div>
            <div>
              <Label htmlFor="traditionalPayout" className="text-sm text-stone-300">Lo que te paga hoy el canal</Label>
              <Input id="traditionalPayout" type="number" min="1" step="0.5" value={traditionalPayout} onChange={(event) => setTraditionalPayout(Number(event.target.value) || 0)} className="mt-2 h-12 rounded-2xl border-white/10 bg-white text-stone-900" />
            </div>
            <div>
              <Label htmlFor="monthlyOrders" className="text-sm text-stone-300">Ventas al mes</Label>
              <Input id="monthlyOrders" type="number" min="1" step="1" value={monthlyOrders} onChange={(event) => setMonthlyOrders(Number(event.target.value) || 0)} className="mt-2 h-12 rounded-2xl border-white/10 bg-white text-stone-900" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-[#1f1f1f] p-5">
              <p className="text-sm text-stone-400">Canal tradicional</p>
              <p className="mt-2 text-3xl font-semibold">{formatEuro(summary.current)}</p>
              <p className="mt-2 text-xs text-stone-500">Ingreso mensual estimado</p>
            </div>
            <div className="rounded-[24px] bg-[#20341f] p-5">
              <p className="text-sm text-stone-300">Hispaloshop 15%</p>
              <p className="mt-2 text-3xl font-semibold">{formatEuro(summary.hispaloshop)}</p>
              <p className="mt-2 text-xs text-stone-300">Cliente nuevo captado por la plataforma</p>
            </div>
            <div className="rounded-[24px] bg-[#2d2b21] p-5">
              <p className="text-sm text-stone-300">Hispaloshop 10%</p>
              <p className="mt-2 text-3xl font-semibold">{formatEuro(summary.ownLink)}</p>
              <p className="mt-2 text-xs text-stone-300">Cliente que traes con tu enlace</p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[#3f5f37] bg-[#172315] p-5">
            <p className="text-sm text-stone-300">Diferencia mensual estimada</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className="font-heading text-4xl font-semibold text-[#d7f5c0]">{formatEuro(summary.delta)}</span>
              <span className="pb-1 text-sm text-stone-400">mas para ti vendiendo directo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProducerLeadForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    products: '',
    location: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.products || !formData.location) {
      toast.error('Completa los 5 campos para que podamos contactarte.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/register/productor`, formData);
      toast.success(response.data?.message || 'Solicitud enviada correctamente.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        products: '',
        location: '',
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo enviar el formulario. Intentalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_30px_100px_-60px_rgba(28,28,28,0.55)] md:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Formulario corto</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-[#1C1C1C]">Tu primer producto puede estar online en 10 minutos</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">Te ayudamos a arrancar sin cuota y sin configuraciones eternas.</p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="products">Que produces</Label>
          <Input id="products" name="products" value={formData.products} onChange={handleChange} placeholder="Queso, aceite, miel, conservas..." className="mt-2 h-12 rounded-2xl" />
        </div>
      </div>

      <div className="mt-5">
        <Label htmlFor="location">Donde estas</Label>
        <Input id="location" name="location" value={formData.location} onChange={handleChange} placeholder="Municipio o comarca" className="mt-2 h-12 rounded-2xl" />
      </div>

      <Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-full bg-black text-white hover:bg-stone-800">
        {loading ? 'Enviando...' : 'Crear Mi Cuenta Gratis'}
      </Button>
    </form>
  );
}

export default function ProductorLandingPage() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Marketplace para productores locales',
    serviceType: 'Plataforma para vender productos artesanales online',
    provider: {
      '@type': 'Organization',
      name: 'Hispaloshop',
      url: 'https://www.hispaloshop.com',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Spain',
    },
    description: 'Marketplace para productores y agricultores que quieren vender queso online, vender productos artesanales online y hacer venta directa sin intermediarios.',
    url: 'https://www.hispaloshop.com/productor',
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Hispaloshop',
    url: 'https://www.hispaloshop.com/productor',
    description: 'Plataforma de venta directa para agricultores y productores artesanales.',
    areaServed: 'ES',
    priceRange: '0EUR-15%',
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f1ea] text-[#1C1C1C]">
      <SEO
        title="Vende Tus Productos Artesanales Online | Hispaloshop - 0EUR al mes"
        description="Marketplace para productores. Vende productos artesanales online, vende queso online y activa venta directa de agricultores con 0EUR al mes."
        url="https://www.hispaloshop.com/productor"
        structuredData={[serviceSchema, localBusinessSchema]}
      />

      <Header />

      <div className="mx-auto max-w-7xl px-4 pt-2">
        <BackButton />
      </div>

      <main>
        <section className="overflow-hidden px-4 pb-14 pt-8 md:pb-20 md:pt-12">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.98fr]">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#d8cab4] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7d3f20]">
                Vender productos artesanales online sin tragarte al intermediario
              </div>
              <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold leading-tight md:text-6xl">
                El Mismo Producto. El Doble de Beneficio.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600 md:text-xl">
                Vende directo. Tu pones el precio. Tu eliges como enviar. Nosotros traemos los clientes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full bg-black px-7 text-white hover:bg-stone-800">
                  <Link to="/registro/productor">
                    Empezar Mi Tienda Online <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={scrollToVideo} className="h-12 rounded-full border-stone-400 bg-transparent px-7 text-stone-900 hover:bg-white">
                  Ver Como Funciona
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">0 EUR</p>
                  <p className="mt-1 text-sm text-stone-500">al mes para empezar</p>
                </div>
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">15%</p>
                  <p className="mt-1 text-sm text-stone-500">solo cuando vendes</p>
                </div>
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">10 min</p>
                  <p className="mt-1 text-sm text-stone-500">para subir tu primer producto</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[34px] border border-[#d9c7b1] bg-[radial-gradient(circle_at_top,#fff8ef,#f0e0cc_58%,#e5d0b3)] p-5 shadow-[0_30px_110px_-60px_rgba(28,28,28,0.55)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d3f20]">Tu lado</p>
                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2d5a27] text-xl font-semibold text-white">J</div>
                    <div>
                      <p className="text-lg font-semibold text-stone-900">Productor local</p>
                      <p className="text-sm text-stone-600">Sonriendo porque decide precio y envio</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-[24px] bg-white p-4">
                    <img src="/images/demo/queso-curado.svg" alt="Queso artesanal" className="mx-auto h-28 w-28 object-contain" />
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f5f7ef] px-4 py-3 text-sm">
                      <span className="text-stone-600">Tu precio directo</span>
                      <span className="font-semibold text-[#2d5a27]">EUR 18</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[34px] border border-stone-200 bg-white p-5 shadow-[0_30px_110px_-60px_rgba(28,28,28,0.55)]">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Estanteria de supermercado</p>
                    <span className="rounded-full bg-[#8a1c1c] px-3 py-1 text-xs font-semibold text-white">Markup +50%</span>
                  </div>
                  <div className="mt-5 rounded-[24px] bg-[#f5f5f4] p-4">
                    <img src="/images/demo/queso-curado.svg" alt="Queso en supermercado" className="mx-auto h-28 w-28 object-contain opacity-85" />
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                        <span className="text-stone-600">Tu cobro</span>
                        <span className="font-semibold text-stone-900">EUR 6</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-[#1C1C1C] px-4 py-3 text-sm text-white">
                        <span>Cliente final</span>
                        <span className="font-semibold">EUR 20</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MarginComparator />
        <section className="bg-white px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Como funciona</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">Cuatro pasos. Nada de burocracia absurda.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {HOW_IT_WORKS.map((item, index) => (
                <div key={item.title} className="rounded-[28px] border border-stone-200 bg-[#f9f5ee] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <item.icon className="h-6 w-6 text-[#2d5a27]" />
                    <span className="text-sm font-semibold text-stone-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-2 text-sm font-medium text-[#7d3f20]">{item.timing}</p>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ProfitCalculator />
        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.96fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Herramientas incluidas</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">Todo lo necesario para vender sin montar un monstruo tecnico.</h2>
                <div className="mt-8 grid gap-4">
                  {TOOLING.map((item) => (
                    <div key={item.title} className="rounded-[28px] border border-stone-200 bg-white p-5">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[#f5f7ef] p-3">
                          <item.icon className="h-5 w-5 text-[#2d5a27]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-stone-900">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="video-productor" className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_30px_100px_-60px_rgba(28,28,28,0.55)]">
                <div className="flex items-center gap-3 text-[#7d3f20]">
                  <PlayCircle className="h-5 w-5" />
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">Video explicativo</p>
                </div>
                <h3 className="mt-3 font-heading text-2xl font-semibold text-[#1C1C1C]">Asi funciona la venta directa en Hispaloshop</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">Vision general del flujo de catalogo, cobro y entrega para productores locales.</p>

                <div className="mt-6 overflow-hidden rounded-[28px] border border-stone-200">
                  <div className="aspect-video">
                    <iframe
                      title="Video explicativo para productores Hispaloshop"
                      src={PRODUCTOR_VIDEO_URL}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] bg-[#f6f1ea] p-5">
                  <p className="text-sm font-semibold text-stone-900">Precio transparente</p>
                  <h4 className="mt-2 text-2xl font-semibold text-[#1C1C1C]">Gratis empezar. Solo pagas cuando vendes.</h4>
                  <div className="mt-5 grid gap-3">
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                      <span>Sin cuota mensual</span>
                      <span className="font-semibold">0 EUR</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                      <span>Comision por venta</span>
                      <span className="font-semibold">15%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                      <span>Si traes tu cliente</span>
                      <span className="font-semibold">10%</span>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Amazon</p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">Hasta 30%</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">Comision alta y menos control sobre la relacion con el cliente.</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Tienda propia</p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">Costes ocultos</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">Web, mantenimiento, pagos, trafico y soporte caen enteros sobre ti.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Productores que ya estan</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">No hace falta pedir permiso a la cadena para vender mejor.</h2>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {producerNames.map((name) => (
                    <div key={name} className="rounded-[22px] border border-stone-200 bg-[#f9f5ee] px-4 py-5 text-center text-sm font-semibold text-stone-700">
                      {name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-[#d7c9b2] bg-[#fff8ef] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d3f20]">Testimonio destacado</p>
                <blockquote className="mt-4 font-heading text-3xl font-semibold leading-tight text-[#1C1C1C]">
                  "Antes vendia al mercado a EUR 4/kg. Ahora vendo a EUR 9/kg y el cliente contento."
                </blockquote>
                <p className="mt-4 text-sm font-semibold text-stone-700">Jose, Quesos del Valle</p>

                <div className="mt-8 grid gap-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 text-sm text-stone-700">
                    <CheckCircle2 className="h-5 w-5 text-[#2d5a27]" />
                    Sin permanencia, cierra cuando quieras
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 text-sm text-stone-700">
                    <CheckCircle2 className="h-5 w-5 text-[#2d5a27]" />
                    Primeras 5 ventas sin comision
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 text-sm text-stone-700">
                    <CheckCircle2 className="h-5 w-5 text-[#2d5a27]" />
                    Soporte gratis para configurar tu catalogo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-6 md:pb-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] bg-[linear-gradient(135deg,#111111,#2d5a27)] p-7 text-white md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">CTA final</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Tu primer producto puede estar online en 10 minutos</h2>
              <p className="mt-4 text-base leading-7 text-stone-200">
                Si produces queso, aceite, miel, vino o cualquier producto artesanal con historia y margen, esta plataforma de venta directa para agricultores esta hecha para ti.
              </p>
              <div className="mt-8 grid gap-3">
                <div className="flex items-center gap-3 text-sm text-stone-200">
                  <CheckCircle2 className="h-5 w-5 text-[#d7f5c0]" />
                  Marketplace para productores con precio visible y comision clara
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-200">
                  <CheckCircle2 className="h-5 w-5 text-[#d7f5c0]" />
                  Flujo mobile primero y sin scroll horizontal
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-200">
                  <CheckCircle2 className="h-5 w-5 text-[#d7f5c0]" />
                  Alta corta ahora, cuenta completa cuando quieras activar tienda
                </div>
              </div>
            </div>

            <ProducerLeadForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
