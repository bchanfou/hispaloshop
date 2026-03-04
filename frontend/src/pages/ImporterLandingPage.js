import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileCheck2, Globe2, Package, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import SEO from '../components/SEO';

export default function ImporterLandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title="Ser Importador en Hispaloshop"
        description="Registra tu perfil importador para comprar al por mayor, solicitar cotizaciones y conectar con productores verificados."
        url="https://www.hispaloshop.com/importador"
      />
      <Header />
      <div className="max-w-4xl mx-auto px-4 pt-2"><BackButton /></div>

      <section className="pt-10 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-3">Canal B2B</p>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1C1C1C] mb-4">
              Ser Importador
            </h1>
            <p className="text-sm md:text-base text-[#555] max-w-2xl mx-auto">
              Accede al marketplace mayorista para importar productos certificados, negociar volúmenes
              y gestionar cotizaciones con productores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[
              { icon: Building2, title: 'Perfil empresa verificado', desc: 'Registro de empresa importadora con validación documental.' },
              { icon: Package, title: 'Catálogo B2B', desc: 'Consulta productos preparados para compra por volumen.' },
              { icon: FileCheck2, title: 'Cotizaciones y trazabilidad', desc: 'Solicita y compara propuestas con seguimiento de estado.' },
              { icon: Globe2, title: 'Operación internacional', desc: 'Flujo orientado a compras entre mercados y logística B2B.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-stone-200 p-5">
                <item.icon className="w-6 h-6 text-[#2D5A27] mb-2" />
                <h3 className="font-semibold text-[#1C1C1C] mb-1">{item.title}</h3>
                <p className="text-sm text-[#666]">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#1C1C1C] rounded-2xl p-6 text-center">
            <h2 className="font-heading text-2xl text-white mb-2">Empieza tu registro de importador</h2>
            <p className="text-sm text-stone-300 mb-5">
              Completa tu perfil y sube la documentación para activar tu cuenta B2B.
            </p>
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
