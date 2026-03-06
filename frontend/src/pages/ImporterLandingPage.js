import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileBadge2,
  FileSpreadsheet,
  Globe2,
  MapPinned,
  PackageCheck,
  QrCode,
  Scale,
  Store,
  Truck,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import API from '../utils/api';

const HERO_POINTS = [
  'Certificados digitales y QR de origen por lote',
  'B2C y B2B desde un solo panel',
  'Cobros automatizados y stock multi-almacen',
];

const WHO_IS_IT_FOR = [
  'Vender B2C sin montar tienda online',
  'Vender B2B a otros comercios',
  'Gestionar todo desde un panel unico',
  'Trazabilidad completa por lote conforme a normativa EU',
];

const ADVANTAGES = [
  { icon: PackageCheck, title: 'Gestion de lotes y caducidades', description: 'Control operativo para mercancia importada con historial claro por lote.' },
  { icon: QrCode, title: 'Certificados de origen digitales', description: 'Documentacion accesible mediante QR para auditoria, cliente o comercio.' },
  { icon: FileBadge2, title: 'Etiquetado normativo automatico', description: 'Base preparada para requisitos de informacion y consistencia comercial.' },
  { icon: Warehouse, title: 'Multi-almacen', description: 'Stock repartido por ciudad sin perder vision central del catalogo.' },
  { icon: FileSpreadsheet, title: 'Facturacion automatica B2B', description: 'Menos gestion manual y mejor control de cobro para cuentas profesionales.' },
];

const FLOW = [
  { step: 'Alta de importacion', detail: 'Validamos documentacion operativa en 24h.' },
  { step: 'Carga tu stock', detail: 'Subes lotes, caducidades y trazabilidad.' },
  { step: 'Define canales', detail: 'Activas B2C, B2B o ambos segun tu operativa.' },
  { step: 'Opera', detail: 'Pedidos, envios y cobros automatizados desde el panel.' },
];

const REQUIREMENTS = [
  'Empresa constituida',
  'Licencias de importacion vigentes',
  'Stock fisico en Espana (no dropshipping internacional)',
  'Compromiso de calidad y trazabilidad',
];

const COMPARISON = [
  {
    title: 'vs. Tienda propia',
    accent: 'Sin inversion en web',
    details: 'Sin desarrollo, sin mantenimiento y con marketing incluido desde el primer dia.',
    score: 'Mas velocidad',
  },
  {
    title: 'vs. Amazon',
    accent: 'Mejores margenes',
    details: 'Relacion mas directa con el cliente y menos dependencia del canal.',
    score: 'Mas control',
  },
  {
    title: 'vs. Distribucion tradicional',
    accent: 'Sin intermediarios',
    details: 'Cash flow mas corto y visibilidad real de tu operacion.',
    score: 'Mas liquidez',
  },
];

const INITIAL_FORM = {
  company: '',
  cif: '',
  email: '',
  phone: '',
  product_types: '',
  estimated_monthly_volume: '',
  has_online_store: '',
  stock_in_spain: false,
  import_licenses_confirmed: false,
  quality_traceability_commitment: false,
};

function scrollToId(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function MapVisual() {
  const nodes = [
    { city: 'Barcelona', top: '20%', left: '71%' },
    { city: 'Valencia', top: '44%', left: '70%' },
    { city: 'Madrid', top: '38%', left: '48%' },
    { city: 'Sevilla', top: '73%', left: '35%' },
    { city: 'Bilbao', top: '16%', left: '35%' },
  ];

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-[#d8cab4] bg-[linear-gradient(160deg,#fffdf8_0%,#f1e4d1_46%,#e5d5bb_100%)] p-6 shadow-[0_35px_100px_-60px_rgba(28,28,28,0.65)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,90,39,0.14),transparent_32%),radial-gradient(circle_at_left,rgba(125,63,32,0.15),transparent_28%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d3f20]">Distribucion nacional</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-[#1C1C1C]">Opera como local, piensa en global</h3>
          </div>
          <Globe2 className="h-8 w-8 text-[#2d5a27]" />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[300px] rounded-[28px] border border-white/60 bg-[#f7efe4] p-4">
            <div className="absolute inset-4 rounded-[24px] border border-dashed border-[#d0baa0]" />
            <div className="absolute left-[12%] top-[20%] h-[58%] w-[66%] rounded-[44%_52%_50%_42%] border-2 border-[#b99367] bg-[linear-gradient(135deg,#f1dfc6,#ead3b4)] opacity-95" />
            {nodes.map((node) => (
              <div key={node.city} className="absolute" style={{ top: node.top, left: node.left }}>
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1C1C1C] ring-4 ring-white/70">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <span className="mt-2 block rounded-full bg-white/85 px-2 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
                  {node.city}
                </span>
              </div>
            ))}
            <div className="absolute bottom-5 left-5 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Trazabilidad</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">Lote ES-BCN-2048</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[26px] border border-stone-200 bg-white/90 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Catalogo internacional</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {['Salsas coreanas', 'Pasta premium', 'Snacks japoneses'].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-stone-200 bg-[#faf6f0] px-3 py-4 text-center">
                    <div className={`mx-auto h-12 w-12 rounded-2xl ${index === 0 ? 'bg-[#2d5a27]' : index === 1 ? 'bg-[#7d3f20]' : 'bg-[#1C1C1C]'}`} />
                    <p className="mt-3 text-xs font-semibold text-stone-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] bg-[#1C1C1C] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Canales activos</p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-stone-200">Retail B2C</span>
                  <span className="rounded-full bg-[#d7f5c0] px-3 py-1 text-xs font-semibold text-[#21401e]">Activo</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-stone-200">Mayorista B2B</span>
                  <span className="rounded-full bg-[#f5debf] px-3 py-1 text-xs font-semibold text-[#7d3f20]">3 cuentas nuevas</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-stone-200">Cobros automatizados</span>
                  <span className="text-sm font-semibold">EUR 18.400</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoPanel() {
  return (
    <section id="demo-panel" className="bg-white px-4 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.94fr_1.06fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Vista del panel</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">Un panel pensado para operar, no para decorar.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
              La demo muestra como se unifican trazabilidad, canales de venta, stock multi-almacen y facturacion B2B sin anadir capas burocraticas.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                'Panel unico para B2B y B2C',
                'Lotes, origen y documentacion accesibles',
                'Control de almacenes y disponibilidad por ciudad',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-[#f8f4ee] px-4 py-4 text-sm text-stone-700">
                  <CheckCircle2 className="h-5 w-5 text-[#2d5a27]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-stone-200 bg-[#f7f2eb] p-5 shadow-[0_30px_100px_-60px_rgba(28,28,28,0.55)]">
            <div className="rounded-[24px] bg-[#1C1C1C] p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Dashboard</p>
                  <h3 className="mt-2 text-xl font-semibold">Canal importador</h3>
                </div>
                <BadgeCheck className="h-7 w-7 text-[#d7f5c0]" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 px-4 py-4">
                  <p className="text-xs text-stone-400">Lotes activos</p>
                  <p className="mt-2 text-2xl font-semibold">128</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-4">
                  <p className="text-xs text-stone-400">Almacenes</p>
                  <p className="mt-2 text-2xl font-semibold">4</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-4">
                  <p className="text-xs text-stone-400">B2B abierto</p>
                  <p className="mt-2 text-2xl font-semibold">23</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[24px] border border-stone-200 bg-white p-5">
                <div className="flex items-center gap-2 text-[#7d3f20]">
                  <MapPinned className="h-5 w-5" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Stock distribuido</p>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ['Madrid', '6.400 uds', 'Entrega 24h'],
                    ['Barcelona', '3.120 uds', 'Retail + horeca'],
                    ['Valencia', '1.980 uds', 'Refuerzo Levante'],
                  ].map(([city, stock, note]) => (
                    <div key={city} className="flex items-center justify-between rounded-2xl bg-[#f8f4ee] px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-stone-900">{city}</p>
                        <p className="text-stone-500">{note}</p>
                      </div>
                      <p className="font-semibold text-[#2d5a27]">{stock}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-stone-200 bg-white p-5">
                <div className="flex items-center gap-2 text-[#2d5a27]">
                  <Scale className="h-5 w-5" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Trazabilidad</p>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ['Origen validado', 'Corea del Sur'],
                    ['Lote', 'KR-FOOD-7781'],
                    ['Etiquetado', 'Listo para ES'],
                    ['Certificado', 'QR activo'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between border-b border-stone-100 pb-3 text-sm last:border-b-0 last:pb-0">
                      <span className="text-stone-500">{label}</span>
                      <span className="font-semibold text-stone-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImporterApplicationForm() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [statusTag, setStatusTag] = useState(null);

  const canSubmit = useMemo(() => (
    formData.company.trim()
    && formData.cif.trim()
    && formData.email.trim()
    && formData.phone.trim()
    && formData.product_types.trim()
    && formData.estimated_monthly_volume.trim()
    && formData.has_online_store !== ''
    && formData.stock_in_spain
    && formData.import_licenses_confirmed
    && formData.quality_traceability_commitment
  ), [formData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const cifClean = formData.cif.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const phoneClean = formData.phone.replace(/\s+/g, ' ').trim();

    if (formData.company.trim().length < 2) return 'Indica la empresa solicitante.';
    if (cifClean.length < 8) return 'Indica un CIF o VAT valido.';
    if (!/^[A-Z0-9]+$/.test(cifClean)) return 'El CIF o VAT contiene caracteres no validos.';
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return 'Indica un email profesional valido.';
    if (!/^\+?[0-9 ()-]{7,30}$/.test(phoneClean)) return 'Indica un telefono profesional valido.';
    if (formData.product_types.trim().length < 10) return 'Describe mejor el tipo de productos importados.';
    if (formData.estimated_monthly_volume.trim().length < 2) return 'Indica el volumen mensual estimado.';
    if (formData.has_online_store === '') return 'Indica si ya tienes tienda online.';
    if (!formData.stock_in_spain) return 'Solo trabajamos con stock fisico en Espana.';
    if (!formData.import_licenses_confirmed) return 'Confirma que tienes licencias de importacion vigentes.';
    if (!formData.quality_traceability_commitment) return 'Debes aceptar el compromiso de calidad y trazabilidad.';
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        cif: formData.cif.replace(/[^a-z0-9]/gi, '').toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\s+/g, ' ').trim(),
        has_online_store: formData.has_online_store === 'yes',
      };

      const response = await axios.post(`${API}/register/importador`, payload);
      setStatusTag(response.data?.status || 'pending');
      toast.success(response.data?.message || 'Solicitud enviada correctamente.');
      setFormData(INITIAL_FORM);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo enviar la solicitud. Intentalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="solicitud-importador" onSubmit={handleSubmit} className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_30px_100px_-60px_rgba(28,28,28,0.55)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Formulario de aplicacion</p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-[#1C1C1C]">Solicitar evaluacion</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Revisamos tu aplicacion en 24-48h. Buscamos calidad, no cantidad.
          </p>
        </div>
        {statusTag && (
          <span className="rounded-full bg-[#f5debf] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7d3f20]">
            {statusTag}
          </span>
        )}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" name="company" value={formData.company} onChange={handleChange} className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="cif">CIF</Label>
          <Input id="cif" name="cif" value={formData.cif} onChange={handleChange} placeholder="B12345678" className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="compras@empresa.com" className="mt-2 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+34 600 000 000" className="mt-2 h-12 rounded-2xl" />
        </div>
      </div>

      <div className="mt-5">
        <Label htmlFor="product_types">Tipo de productos que importas</Label>
        <Textarea
          id="product_types"
          name="product_types"
          value={formData.product_types}
          onChange={handleChange}
          placeholder="Categorias, procedencia, rango de productos, requisitos especiales..."
          className="mt-2 min-h-[120px] rounded-[24px]"
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="estimated_monthly_volume">Volumen estimado mensual</Label>
          <Input
            id="estimated_monthly_volume"
            name="estimated_monthly_volume"
            value={formData.estimated_monthly_volume}
            onChange={handleChange}
            placeholder="EUR 25.000 o 8.000 unidades"
            className="mt-2 h-12 rounded-2xl"
          />
        </div>
        <div>
          <Label htmlFor="has_online_store">Ya tienes tienda online?</Label>
          <select
            id="has_online_store"
            name="has_online_store"
            value={formData.has_online_store}
            onChange={handleChange}
            className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecciona una opcion</option>
            <option value="yes">Si</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-[#faf6f0] px-4 py-4 text-sm text-stone-700">
          <input type="checkbox" name="stock_in_spain" checked={formData.stock_in_spain} onChange={handleChange} className="mt-1" />
          Confirmo que tengo stock fisico en Espana y que no opero con dropshipping internacional.
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-[#faf6f0] px-4 py-4 text-sm text-stone-700">
          <input type="checkbox" name="import_licenses_confirmed" checked={formData.import_licenses_confirmed} onChange={handleChange} className="mt-1" />
          Confirmo que dispongo de licencias de importacion vigentes.
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-[#faf6f0] px-4 py-4 text-sm text-stone-700">
          <input type="checkbox" name="quality_traceability_commitment" checked={formData.quality_traceability_commitment} onChange={handleChange} className="mt-1" />
          Acepto el compromiso de calidad, trazabilidad por lote y documentacion verificable.
        </label>
      </div>

      <Button type="submit" disabled={loading || !canSubmit} className="mt-6 h-12 w-full rounded-full bg-black text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Enviando...' : 'Solicitar Evaluacion'}
      </Button>
    </form>
  );
}

export default function ImporterLandingPage() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Plataforma para importadores y distribuidores',
    serviceType: 'Servicio para importar y vender online en Espana',
    provider: {
      '@type': 'Organization',
      name: 'Hispaloshop',
      url: 'https://www.hispaloshop.com',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Spain',
    },
    description: 'Plataforma para importadores y distribuidores que quieren vender productos importados en Espana en B2B y B2C con trazabilidad y control operativo.',
    url: 'https://www.hispaloshop.com/importador',
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hispaloshop',
    url: 'https://www.hispaloshop.com/importador',
    description: 'Marketplace para importadores, distribuidores y marcas con stock fisico en Espana.',
    areaServed: 'ES',
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f1ea] text-[#1C1C1C]">
      <SEO
        title="Vende Productos Importados en Espana | Hispaloshop B2B y B2C"
        description="Plataforma para importadores y distribuidores que quieren importar y vender online, operar en B2B y B2C y vender productos importados en Espana con trazabilidad."
        url="https://www.hispaloshop.com/importador"
        structuredData={[serviceSchema, organizationSchema]}
      />

      <Header />

      <div className="mx-auto max-w-7xl px-4 pt-2">
        <BackButton />
      </div>

      <main>
        <section className="overflow-hidden px-4 pb-14 pt-8 md:pb-20 md:pt-12">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.02fr]">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#d8cab4] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7d3f20]">
                Plataforma importadores | distribuidor marketplace | vender productos importados Espana
              </div>
              <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold leading-tight md:text-6xl">
                Tu Importacion, Tu Catalogo, Tu Negocio
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600 md:text-xl">
                Opera con el mismo alcance que un productor local. Certificados digitales, trazabilidad completa, pagos automatizados.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => scrollToId('solicitud-importador')} className="h-12 rounded-full bg-black px-7 text-white hover:bg-stone-800">
                  Activar Mi Canal de Importador <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => scrollToId('demo-panel')} className="h-12 rounded-full border-stone-400 bg-transparent px-7 text-stone-900 hover:bg-white">
                  Ver Demo del Panel
                </Button>
              </div>

              <div className="mt-8 grid gap-3">
                {HERO_POINTS.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-stone-700">
                    <CheckCircle2 className="h-5 w-5 text-[#2d5a27]" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">24h</p>
                  <p className="mt-1 text-sm text-stone-500">validacion documental inicial</p>
                </div>
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">B2B + B2C</p>
                  <p className="mt-1 text-sm text-stone-500">canales en el mismo panel</p>
                </div>
                <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
                  <p className="text-3xl font-semibold">0 dropshipping</p>
                  <p className="mt-1 text-sm text-stone-500">solo stock fisico en Espana</p>
                </div>
              </div>
            </div>

            <MapVisual />
          </div>
        </section>

        <section className="bg-white px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Para quien es</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">
                  Para importadores y distribuidores que quieren:
                </h2>
              </div>
              <div className="grid gap-3">
                {WHO_IS_IT_FOR.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[24px] border border-stone-200 bg-[#f8f4ee] px-5 py-4 text-sm text-stone-700">
                    <Building2 className="h-5 w-5 text-[#7d3f20]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Ventajas especificas</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C] md:text-4xl">Lo mismo que productor, con capa importador.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {ADVANTAGES.map((item) => (
                <div key={item.title} className="rounded-[28px] border border-stone-200 bg-white p-6">
                  <div className="inline-flex rounded-2xl bg-[#f5f7ef] p-3">
                    <item.icon className="h-5 w-5 text-[#2d5a27]" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-[32px] border border-stone-200 bg-[#f9f5ee] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Requisitos transparentes</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold text-[#1C1C1C]">Necesitas:</h2>
                <div className="mt-8 grid gap-3">
                  {REQUIREMENTS.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 text-sm text-stone-700">
                      <CheckCircle2 className="h-5 w-5 text-[#2d5a27]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] bg-[linear-gradient(135deg,#111111,#2d5a27)] p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">Precio</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold">Estructura flexible</h2>
                <div className="mt-8 grid gap-4">
                  <div className="rounded-[26px] bg-white/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-300">Opcion A</p>
                    <h3 className="mt-2 text-2xl font-semibold">15% comision por venta</h3>
                    <p className="mt-2 text-sm text-stone-200">Sin fijo. Para validar canal y velocidad comercial.</p>
                  </div>
                  <div className="rounded-[26px] bg-white/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-300">Opcion B</p>
                    <h3 className="mt-2 text-2xl font-semibold">EUR 99/mes + 8% comision</h3>
                    <p className="mt-2 text-sm text-stone-200">Para operacion con mayor volumen y prevision recurrente.</p>
                  </div>
                </div>
                <p className="mt-6 text-sm leading-6 text-stone-200">
                  El canal se aprueba caso a caso. No prometemos activacion automatica ni operativas incompatibles con la trazabilidad requerida.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-6 md:pb-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] bg-[linear-gradient(135deg,#7d3f20,#1c1c1c)] p-7 text-white md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">Filtro de calidad</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold md:text-4xl">Buscamos operadores solidos, no volumen vacio.</h2>
              <p className="mt-4 text-base leading-7 text-stone-200">
                Si importas con documentacion clara, stock real en Espana y ambicion comercial en marketplace, este canal esta disenado para ti.
              </p>
              <div className="mt-8 grid gap-3">
                <div className="flex items-center gap-3 text-sm text-stone-200">
                  <CheckCircle2 className="h-5 w-5 text-[#f5debf]" />
                  Revision operativa y documental en 24-48h
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-200">
                  <CheckCircle2 className="h-5 w-5 text-[#f5debf]" />
                  Sin promesas de dropshipping ni atajos regulatorios
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-200">
                  <CheckCircle2 className="h-5 w-5 text-[#f5debf]" />
                  Activacion orientada a margen, trazabilidad y continuidad
                </div>
              </div>
              <div className="mt-8">
                <Button asChild variant="outline" className="h-12 rounded-full border-white/40 bg-transparent px-7 text-white hover:bg-white hover:text-[#1C1C1C]">
                  <Link to="/register?role=importer">Crear cuenta importador</Link>
                </Button>
              </div>
            </div>

            <ImporterApplicationForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
