import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { ArrowRight, Globe, CreditCard, Users, CheckCircle, Clock, Store } from 'lucide-react';
import BackButton from '../components/BackButton';

const commissionTable = [
  { label: 'FREE', sale: 100, producer: 80, platform: 20 },
  { label: 'PRO', sale: 100, producer: 82, platform: 18 },
  { label: 'ELITE', sale: 100, producer: 83, platform: 17 },
];

export default function SellerLandingPage() {
  const benefits = [
    { icon: Globe, title: 'Alcance internacional', desc: 'Publica tu catálogo y vende en mercados activos desde una sola plataforma.' },
    { icon: CreditCard, title: 'Cobros y payouts', desc: 'Operativa con Stripe y conciliación clara de ventas y comisiones.' },
    { icon: Users, title: 'Canal social + afiliación', desc: 'Activa ventas con contenido, perfiles e influencers dentro de Hispaloshop.' },
  ];

  const tools = [
    'Gestión de productos, stock y pedidos',
    'Panel de ventas por país y rendimiento',
    'Integración con certificados y trazabilidad',
    'Políticas de envío configurables',
    'Soporte para pagos a cuenta conectada',
    'Canal de comunicación con compradores',
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Ser Productor en Hispaloshop"
        description="Publica tu catálogo, vende en el marketplace y gestiona pedidos con comisiones transparentes: FREE 20%, PRO 18%, ELITE 17%."
        url="https://www.hispaloshop.com/vender"
      />
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-2"><BackButton /></div>

      <section className="pt-10 pb-8 md:pt-16 md:pb-12" data-testid="seller-hero">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-3">Para productores</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1C1C1C] mb-4 leading-tight">
            Ser Productor en Hispaloshop
          </h1>
          <p className="text-base text-[#555] max-w-xl mx-auto mb-6">
            Crea tu tienda, publica tus productos y vende con una operación unificada de catálogo, pedidos y cobros.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/vender/registro">
              <Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-7 h-12 text-sm" data-testid="seller-cta-main">
                Registrarme como productor <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="rounded-full px-7 h-12 text-sm">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 text-center hover:shadow-md transition-all">
                <b.icon className="w-8 h-8 text-[#2D5A27] mx-auto mb-3" />
                <h3 className="font-semibold text-[#1C1C1C] text-sm mb-2">{b.title}</h3>
                <p className="text-xs text-[#666] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[#1C1C1C] mb-2">Cómo empezar</h2>
          <p className="text-sm text-[#666] mb-8"><Clock className="w-4 h-4 inline mr-1" />Alta inicial en minutos</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Registro', 'Subida de catálogo', 'Activación de pagos', 'Recepción de pedidos'].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#2D5A27] text-white flex items-center justify-center mx-auto text-lg font-bold mb-2">{i + 1}</div>
                <p className="text-xs text-[#444] font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">Comisiones reales</h2>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Plan</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">Venta (€)</th>
                  <th className="px-4 py-3 text-right text-emerald-600 font-medium">Productor (€)</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">Plataforma (€)</th>
                </tr>
              </thead>
              <tbody>
                {commissionTable.map((r) => (
                  <tr key={r.label} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium text-xs">{r.label}</td>
                    <td className="px-4 py-3 text-right">{r.sale}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{r.producer}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{r.platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-stone-50 text-[10px] text-text-muted">
              Sin suscripciones mensuales en esta página informativa. Comisión aplicada por operación según plan activo.
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">Herramientas incluidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tools.map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <CheckCircle className="w-4 h-4 text-[#2D5A27] shrink-0" />
                <span className="text-sm text-[#444]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#1C1C1C]" data-testid="seller-final-cta">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-3">Activa tu perfil de productor</h2>
          <p className="text-sm text-stone-400 mb-6">Empieza con tu catálogo y escala desde el panel de operaciones.</p>
          <Link to="/vender/registro">
            <Button className="bg-white text-[#1C1C1C] hover:bg-stone-100 rounded-full px-7 h-11 text-sm">
              <Store className="w-4 h-4 mr-1.5" /> Registrarme ahora <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
