// @ts-nocheck
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const Section = ({ dark, children, className = '' }: { dark: boolean; children: React.ReactNode; className?: string }) => (
  <section className={`${dark ? 'bg-[#0A0A0A]' : 'bg-stone-50'} py-20 px-4 ${className}`}>
    <div className="max-w-[1200px] mx-auto">{children}</div>
  </section>
);

export default function ForProducers() {
  const navigate = useNavigate();
  useScrollReveal();
  usePageTitle();

  return (
    <div>
      {/* ══════ SECCIÓN 1 — HERO ══════ */}
      <section className="min-h-screen bg-[#0A0A0A] flex items-start pt-[120px] pb-20 px-4">
        <div className="max-w-[1200px] mx-auto w-full">
          <div className="max-w-[820px]">
            <p className="info-eyebrow hero-animate-in text-stone-500 mb-4">
              PARA PRODUCTORES ARTESANALES
            </p>

            <h1 className="info-h1 hero-animate-in-delay-1 text-white whitespace-pre-line mb-6">
              {'Tienes un producto increíble.\nYa es hora de que\nel país lo sepa.'}
            </h1>

            <p className="info-lead hero-animate-in-delay-2 text-white/65 max-w-[620px] mb-10">
              He recorrido España de pueblo en pueblo buscando productores
              como tú. Os he visto trabajar con una dedicación que ninguna
              multinacional puede replicar. El problema nunca fue vuestro
              producto. El problema era que no había una plataforma
              a vuestra medida.
            </p>

            <div className="hero-animate-in-delay-3 flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/registro')}
                className="h-[46px] px-7 rounded-full bg-stone-950 text-white text-sm font-semibold border-none cursor-pointer"
              >
                Empezar gratis →
              </button>
              <button
                onClick={() => document.querySelector('#como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-[46px] px-7 rounded-full bg-transparent text-white text-sm font-semibold border border-white/25 cursor-pointer"
              >
                Ver cómo funciona
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECCIÓN 2 — EL PROBLEMA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label mb-4">EL PROBLEMA</p>
          <h2 className="info-h2 whitespace-pre-line mb-4">
            {'Te han cobrado demasiado\ndurante demasiado tiempo.'}
          </h2>
          <p className="info-lead text-stone-500 max-w-[600px] mb-12">
            Amazon cobra entre el 15% y el 40%. Las marketplaces
            genéricas no entienden tu producto. Las redes sociales te
            dan visibilidad pero no ventas. Y los importadores te dicen
            que eres demasiado pequeño.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {[
              { emoji: '💸', title: 'Comisiones abusivas', body: 'Pagar el 30% de cada venta a una plataforma que no conoce tu historia ni tu producto.' },
              { emoji: '👻', title: 'Invisibilidad', body: 'Tu aceite gana premios internacionales y apenas lo conocen fuera de tu provincia.' },
              { emoji: '🔗', title: 'Dependencia', body: 'Si mañana Amazon decide cambiar sus algoritmos, tus ventas desaparecen de un día para otro.' },
            ].map((card, i) => (
              <div
                key={i}
                className={`bg-white border border-stone-200 rounded-2xl p-8 transition-[transform,box-shadow] duration-200 reveal [transition-delay:${i * 100}ms]`}
              >
                <span className="text-[32px] block mb-3">{card.emoji}</span>
                <h4 className="info-h4 mb-2">{card.title}</h4>
                <p className="text-[15px] text-stone-500 m-0 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-stone-200 my-12" />

          <h3 className="info-h3 mb-4">En Hispaloshop, tú tienes el control.</h3>
          <p className="info-body text-stone-500 max-w-[600px]">
            Sin exclusividades. Sin letra pequeña. Sin comisiones que
            se coman tu margen. Solo tu producto, tu historia y tus clientes.
          </p>
        </div>
      </Section>

      {/* ══════ SECCIÓN 3 — CÓMO FUNCIONA (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal" id="como-funciona">
          <p className="info-eyebrow text-stone-500 mb-4">CÓMO FUNCIONA</p>
          <h2 className="info-h2 text-white whitespace-pre-line mb-12">
            {'Publicar tu primer producto\ntarda menos de 60 segundos.'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
            {[
              { num: 1, day: 'Día 1', title: 'Regístrate y verifica tu cuenta', body: 'Sube tu CIF, una foto de tu instalación y tus certificados. La IA lo revisa en minutos.' },
              { num: 2, day: 'Día 1', title: 'Publica tus productos', body: 'Añade fotos, descripción, precio y stock. O graba un reel directo desde tu obrador.' },
              { num: 3, day: 'Cuando llegan pedidos', title: 'Gestiona y envía', body: 'Recibes el pedido, preparas el envío, confirmas el tracking. Todo desde tu móvil.' },
              { num: 4, day: 'Cada 15 días', title: 'Cobras sin condiciones', body: 'Transferencia directa a tu cuenta. Sin esperar 60 días. Sin sorpresas.' },
            ].map((step, i) => (
              <div key={i} className={`reveal [transition-delay:${i * 100}ms]`}>
                <div className="w-9 h-9 rounded-full bg-stone-950 flex items-center justify-center text-[15px] font-bold text-white mb-3">
                  {step.num}
                </div>
                <p className="info-eyebrow text-white/50 mb-2">
                  {step.day}
                </p>
                <h4 className="info-h4 text-white mb-2">{step.title}</h4>
                <p className="text-[15px] text-white/65 m-0 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 4 — PLANES (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label mb-4">LO QUE CUESTA</p>
          <h2 className="info-h2 mb-12">Empieza gratis. Crece cuando quieras.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
            {[
              { name: 'Free', price: '0€/mes', desc: '20% comisión' },
              { name: 'Pro', price: '79€/mes', desc: '18% comisión · Envío gratis desde 30€' },
              { name: 'Elite', price: '249€/mes', desc: '15% comisión · Envío gratis desde 20€' },
            ].map((plan, i) => (
              <div
                key={i}
                className={`bg-white border border-stone-200 rounded-2xl p-8 text-center reveal [transition-delay:${i * 100}ms]`}
              >
                <p className="text-sm font-bold text-stone-950 mb-2 uppercase tracking-wider">
                  {plan.name}
                </p>
                <p className="text-2xl font-bold text-stone-950 mb-2">
                  {plan.price}
                </p>
                <p className="text-sm text-stone-500 m-0">
                  {plan.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="info-body text-stone-500 mt-6 mb-3">
            ¿Por qué cobramos comisión? Porque solo ganamos cuando
            tú ganas. Si no vendes, no pagamos nada. Si vendes mucho,
            pagamos menos.
          </p>

          <Link to="/productor" className="text-sm font-semibold text-stone-950 no-underline">
            Ver comparativa completa →
          </Link>
        </div>
      </Section>

      {/* ══════ SECCIÓN 5 — B2B (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow text-stone-500 mb-4">MÁS QUE B2C</p>
          <h2 className="info-h2 text-white whitespace-pre-line mb-4">
            {'Vende también a importadores\nde todo el mundo.'}
          </h2>
          <p className="text-[15px] text-white/65 max-w-[600px] leading-[1.7] mb-8">
            He tocado puertas de importadoras en Corea, Japón y China.
            Sé exactamente qué buscan y qué les frena. En Hispaloshop,
            los importadores llegan a ti. Tú pones las condiciones.
          </p>

          <div className="flex flex-col gap-4">
            {[
              'Ofertas formales con Incoterms integrados',
              'Contratos digitales con firma electrónica',
              'Documentación aduanera generada por IA',
              'Pagos seguros con retención de fondos',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-white/80" strokeWidth={2.5} />
                <span className="text-[15px] text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 6 — CTA (negro) ══════ */}
      <Section dark={true} className="!py-[100px]">
        <div className="text-center reveal">
          <h2 className="info-h2 text-white mb-4">
            Tu producto merece llegar más lejos.
          </h2>
          <p className="info-lead text-white/55 max-w-[500px] mx-auto mb-8">
            Únete a más de 1.200 productores que ya venden.
          </p>
          <button
            onClick={() => navigate('/registro')}
            className="h-14 px-10 rounded-full bg-stone-950 text-white text-base font-semibold border-none cursor-pointer"
          >
            Publicar mis primeros productos →
          </button>
          <div className="mt-4">
            <Link to="/contacto" className="text-sm text-white/35 no-underline">
              Tengo preguntas · Contactar
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
