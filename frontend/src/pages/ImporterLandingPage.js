import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileCheck2, Globe2, Package, ArrowRight, QrCode, Store } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import SEO from '../components/SEO';

export default function ImporterLandingPage() {
  const features = [
    {
      icon: Building2,
      title: 'Perfil importador',
      desc: 'Alta de cuenta y operacion con el mismo alcance que Productor.',
    },
    {
      icon: Package,
      title: 'Catalogo y ventas',
      desc: 'Crear productos, publicar inventario y vender dentro del marketplace.',
    },
    {
      icon: FileCheck2,
      title: 'Certificado digital',
      desc: 'Se genera automaticamente al publicar el producto.',
    },
    {
      icon: QrCode,
      title: 'QR funcional',
      desc: 'Descargable para uso en embalaje o etiqueta de producto fisico.',
    },
    {
      icon: Globe2,
      title: 'Operacion internacional',
      desc: 'Gestion de pedidos, pagos y trazabilidad en flujo unificado.',
    },
    {
      icon: Store,
      title: 'Panel completo',
      desc: 'Pedidos, cobros, estado de catalogo y rendimiento en tiempo real.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Ser Importador en Hispaloshop"
        description="El perfil Importador tiene el mismo alcance que Productor: crear productos, vender y usar certificado digital con QR funcional por producto."
        url="https://www.hispaloshop.com/importador"
      />
      <Header />
      <div className="max-w-4xl mx-auto px-4 pt-2">
        <BackButton />
      </div>

      <section className="pt-10 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-3">Canal comercial</p>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1C1C1C] mb-4">Ser Importador</h1>
            <p className="text-sm md:text-base text-[#555] max-w-2xl mx-auto">
              Importador opera igual que Productor: puede crear productos, vender y trabajar con certificado digital y QR por producto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {features.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-stone-200 p-5">
                <item.icon className="w-6 h-6 text-[#2D5A27] mb-2" />
                <h3 className="font-semibold text-[#1C1C1C] mb-1">{item.title}</h3>
                <p className="text-sm text-[#666]">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#1C1C1C] rounded-2xl p-6 text-center">
            <h2 className="font-heading text-2xl text-white mb-2">Empieza tu registro de importador</h2>
            <p className="text-sm text-stone-300 mb-5">Completa tu perfil y activa tu operacion de catalogo y ventas.</p>
            <Link to="/importer/register">
              <Button className="bg-white text-[#1C1C1C] hover:bg-stone-100 rounded-full px-7 h-11 text-sm">
                Ir al registro <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
