import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Globe, Search, MessageCircle, FileText, Ship, CheckCircle, Shield, FileCheck, Droplets, Milk, Beef, Wine, Fish, Quote } from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import StepProcess from '../../components/landings/StepProcess';

const STEPS = [
  { icon: Search, title: 'Buscar', description: 'Filtros por categoría, certificación, capacidad, precio...' },
  { icon: MessageCircle, title: 'Contactar', description: 'Chat directo con el productor' },
  { icon: FileText, title: 'Negociar', description: 'Contratos digitalizados con HI AI' },
  { icon: Ship, title: 'Importar', description: 'Logística integrada (FOB, CIF, DDP)' },
];

const CATEGORIES = [
  { icon: Droplets, name: 'Aceites', price: 'Desde €5.50/L', moq: 'MOQ: 500L' },
  { icon: Milk, name: 'Quesos', price: 'Desde €8.90/kg', moq: 'MOQ: 100kg' },
  { icon: Beef, name: 'Ibéricos', price: 'Desde €12.50/kg', moq: 'MOQ: 50kg' },
  { icon: Wine, name: 'Vinos', price: 'Desde €3.80/bot.', moq: 'MOQ: 300bot' },
  { icon: Fish, name: 'Conservas', price: 'Desde €2.10/u', moq: 'MOQ: 500u' },
];

const GUARANTEES = [
  { icon: CheckCircle, title: 'Verificado', desc: 'Cada productor auditado in situ' },
  { icon: Shield, title: 'Protegido', desc: 'Pagos escrow hasta entrega' },
  { icon: FileCheck, title: 'Documentado', desc: 'Toda la trazabilidad y certificación' },
];

const ImportadorLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Importa productos españoles al por mayor | Hispaloshop B2B"
        description="Catálogo B2B de productores artesanales verificados. Aceites, quesos, ibéricos para importación. Documentación y logística incluida."
        keywords="importar alimentos españa, distribución mayorista, proveedores alimentarios, exportación agroalimentaria"
      />
      
      <NavbarLanding variant="dark" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A3D2A] to-[#2D5A3D] pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm mb-6">
                <Globe className="w-4 h-4" />
                Marketplace B2B
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                El puente que faltaba
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                Accede a productores artesanales verificados de España y Latinoamérica. 
                Compra al por mayor con garantías de calidad.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/register/importer')}
                  className="flex items-center gap-2 px-6 py-3 bg-[#E6A532] text-white rounded-full font-medium hover:bg-[#d4952b] transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  Acceder al catálogo B2B
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="px-6 py-3 border-2 border-white text-white rounded-full font-medium hover:bg-white/10 transition-colors"
                >
                  Contactar equipo
                </button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <Quote className="w-8 h-8 text-[#E6A532] mb-4" />
              <p className="text-white/90 italic mb-4">
                "Reduje mi tiempo de sourcing en un 60%. Todo verificado desde el primer contacto"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://i.pravatar.cc/150?u=hans"
                  alt="Hans"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-white font-medium">Hans</p>
                  <p className="text-white/60 text-sm">Gourmet Imports, Alemania</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            El desafío del importador
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-[#DC2626] mb-4">Buscar proveedores tradicionalmente</h3>
              <ul className="space-y-3 text-[#6B7280]">
                <li>• 40+ emails para primer contacto</li>
                <li>• 3-6 meses en validar documentación</li>
                <li>• Viajes costosos sin garantías</li>
                <li>• Riesgo de incumplimiento de calidad</li>
              </ul>
            </div>
            <div className="bg-[#2D5A3D] rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-[#E6A532] mb-4">Hispaloshop B2B</h3>
              <ul className="space-y-3 text-white/80">
                <li>• Productores pre-verificados</li>
                <li>• Documentación digitalizada</li>
                <li>• Muestras gestionadas</li>
                <li>• Pagos escrow protegidos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Proceso simplificado
          </h2>
          <StepProcess steps={STEPS} layout="horizontal" />
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-4">
            Catálogo B2B destacado
          </h2>
          <p className="text-center text-[#6B7280] mb-12">
            Categorías disponibles al por mayor
          </p>
          <div className="grid md:grid-cols-5 gap-4">
            {CATEGORIES.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#F5F1E8] rounded-2xl p-6 text-center hover:shadow-md transition-shadow"
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-[#2D5A3D]" />
                  <h3 className="font-semibold text-[#1A1A1A]">{cat.name}</h3>
                  <p className="text-sm text-[#16A34A] font-medium">{cat.price}</p>
                  <p className="text-xs text-[#6B7280]">{cat.moq}</p>
                </motion.div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/register/importer')}
              className="text-[#2D5A3D] font-medium hover:underline"
            >
              Ver catálogo completo →
            </button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Tu suscripción B2B incluye
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Acceso ilimitado a catálogo verificado',
                'Perfiles detallados con certificaciones',
                'HI Import: análisis de mercado y matching',
                'Gestión de documentación aduanera',
                'Muestras coordinadas (hasta 5/año)',
                'Escrow de pagos hasta recepción',
                'Soporte legal internacional básico',
                'Manager de cuenta dedicado'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#16A34A] flex-shrink-0" />
                  <span className="text-[#1A1A1A]">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t text-center">
              <p className="text-3xl font-bold text-[#2D5A3D]">€199<span className="text-lg font-normal text-[#6B7280]">/mes</span></p>
              <p className="text-sm text-[#6B7280] mt-1">o €1,990/año (2 meses gratis)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">
            Requisitos y verificación
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              'Empresa registrada en UE o mercados aliados',
              'Licencia de importación de alimentos vigente',
              'Referencias comerciales verificables',
              'Volumen anual estimado >€50k'
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                <span className="text-[#1A1A1A]">{req}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[#6B7280] mt-6">
            Proceso: 48-72h para activación completa.
          </p>
        </div>
      </section>

      {/* Guarantees */}
      <section className="bg-[#2D5A3D] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Garantías Hispaloshop
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {GUARANTEES.map((g, i) => {
              const Icon = g.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/10 rounded-2xl p-6 text-center text-white"
                >
                  <Icon className="w-10 h-10 mx-auto mb-4 text-[#E6A532]" />
                  <h3 className="font-semibold mb-2">{g.title}</h3>
                  <p className="text-white/70 text-sm">{g.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F5F1E8] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-6">
            Conecta con productores que cumplen
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/register/importer')}
              className="px-8 py-4 bg-[#2D5A3D] text-white rounded-full font-semibold hover:bg-[#234a31] transition-colors"
            >
              Solicitar acceso B2B
            </button>
            <button
              onClick={() => navigate('/help')}
              className="px-8 py-4 border-2 border-[#2D5A3D] text-[#2D5A3D] rounded-full font-semibold hover:bg-[#2D5A3D] hover:text-white transition-colors"
            >
              Descargar brochure
            </button>
          </div>
        </div>
      </section>

      <FooterLanding />
    </div>
  );
};

export default ImportadorLanding;
