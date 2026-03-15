import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const Section = ({ dark, children, style = {} }) => (
  <section style={{
    background: dark ? '#0A0A0A' : 'var(--color-cream)',
    padding: '80px 16px',
    fontFamily: 'var(--font-sans)',
    ...style,
  }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</div>
  </section>
);

export default function ForImporters() {
  const navigate = useNavigate();
  useScrollReveal();

  return (
    <div>
      {/* ══════ SECCIÓN 1 — HERO (negro) ══════ */}
      <section style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'flex-start',
        padding: '120px 16px 80px',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ maxWidth: 820 }}>
            <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>
              PARA IMPORTADORES Y DISTRIBUIDORES
            </p>
            <h1 className="info-h1" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 24 }}>
              {'Los mercados de alimentación\nartesanal crecen un 24% al año.\n¿Ya estás dentro?'}
            </h1>
            <p className="info-lead" style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 620, marginBottom: 40 }}>
              Viajé 6 meses por Asia tocando puertas de importadoras
              con muestras de productores españoles. Me dijeron que no
              tenían tiempo, que eran demasiado pequeños, que los formatos
              no estaban adaptados. Tenían razón: no había una plataforma
              que lo facilitara. Ahora la hay.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/b2b/marketplace')} style={{
                height: 46, padding: '0 28px', borderRadius: 'var(--radius-full)',
                background: 'var(--color-green)', color: '#fff',
                fontSize: 'var(--text-sm)', fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                Acceder al catálogo B2B →
              </button>
              <button onClick={() => document.querySelector('#flujo-b2b')?.scrollIntoView({ behavior: 'smooth' })} style={{
                height: 46, padding: '0 28px', borderRadius: 'var(--radius-full)',
                background: 'transparent', color: '#fff',
                fontSize: 'var(--text-sm)', fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.25)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                Ver cómo funciona
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SECCIÓN 2 — EL PROBLEMA (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>EL PROBLEMA</p>
          <h2 className="info-h2" style={{ marginBottom: 16 }}>
            Encontrar buenos proveedores no debería ser tan difícil.
          </h2>
          <p className="info-body" style={{ color: 'var(--color-stone)', maxWidth: 680, marginBottom: 48 }}>
            La alimentación artesanal es el mercado de mayor crecimiento
            en la categoría de alimentos premium. Los consumidores pagan
            más por saber de dónde viene lo que comen. Y sin embargo,
            acceder a los mejores productores sigue siendo un proceso
            de emails, ferias, viajes y contratos en PDF.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              { emoji: '📂', title: 'Sin catálogo estructurado', body: 'Los productores están dispersos en ferias, directorios desactualizados y contactos de WhatsApp.' },
              { emoji: '📧', title: 'Procesos manuales', body: 'Cada pedido requiere decenas de emails, llamadas y documentos escaneados. Sin trazabilidad.' },
              { emoji: '⚠️', title: 'Sin garantías', body: 'Pagos por transferencia sin protección, contratos en PDF, sin mecanismo de resolución de disputas.' },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 32,
                transitionDelay: `${i * 100}ms`,
              }} className="reveal">
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>{card.emoji}</span>
                <h4 className="info-h4" style={{ marginBottom: 8 }}>{card.title}</h4>
                <p style={{ fontSize: 15, color: 'var(--color-stone)', margin: 0, lineHeight: 1.6 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 3 — FLUJO B2B (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal" id="flujo-b2b">
          <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>EL FLUJO B2B</p>
          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 48 }}>
            {'De la primera oferta al contenedor\nen tu almacén.'}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 32,
          }}>
            {[
              { num: 1, title: 'Descubre y filtra', body: 'Explora productores verificados por categoría, certificación, país de origen y capacidad de producción.' },
              { num: 2, title: 'Negocia en el chat', body: 'Contacta directamente con el productor. Negocia precios, volúmenes, Incoterms y condiciones de entrega.' },
              { num: 3, title: 'Firma el contrato', body: 'Genera un contrato digital con todos los términos acordados. Firma electrónica legalmente vinculante.' },
              { num: 4, title: 'Paga con seguridad', body: 'El pago queda retenido hasta confirmar la recepción. Protección total para ambas partes.' },
              { num: 5, title: 'Recibe y cierra', body: 'Tracking en tiempo real. Confirma la recepción, valora al productor. La operación queda registrada.' },
            ].map((step, i) => (
              <div key={i} style={{ transitionDelay: `${i * 100}ms` }} className="reveal">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--color-green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, color: '#fff',
                  marginBottom: 12,
                }}>
                  {step.num}
                </div>
                <h4 className="info-h4" style={{ color: '#fff', marginBottom: 8 }}>{step.title}</h4>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 4 — TIENDA B2C (crema) ══════ */}
      <Section dark={false}>
        <div className="reveal">
          <p className="uppercase-label" style={{ marginBottom: 16 }}>DOBLE CANAL</p>
          <h2 className="info-h2" style={{ marginBottom: 16 }}>
            Importas al por mayor. Vendes al detalle.
          </h2>
          <p className="info-body" style={{ color: 'var(--color-stone)', maxWidth: 600, marginBottom: 32 }}>
            Tu cuenta de importador incluye una tienda online en Hispaloshop.
            Los productos que importas se pueden vender directamente al
            consumidor final en el país destino.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Tu propia tienda dentro de Hispaloshop',
              'Misma plataforma para comprar y vender',
              'Social commerce incluido: reels, stories, recetas',
              'Influencers locales pueden promocionar tus productos',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Check size={18} color="var(--color-green)" strokeWidth={2.5} />
                <span style={{ fontSize: 15, color: 'var(--color-black)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 5 — IA ADUANERA (negro) ══════ */}
      <Section dark={true}>
        <div className="reveal">
          <p className="info-eyebrow" style={{ color: 'var(--color-stone)', marginBottom: 16 }}>HISPAL AI PARA B2B</p>
          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 16 }}>
            {'La burocracia aduanera,\nresuelta automáticamente.'}
          </h2>
          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.65)',
            maxWidth: 600, lineHeight: 1.7, marginBottom: 32,
          }}>
            Hispal AI genera la documentación aduanera necesaria para cada
            operación. Desde los certificados sanitarios hasta los formularios
            de importación. Revisados por nuestro equipo antes de cada envío.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}>
            {[
              { emoji: '📄', title: 'Documentación automática', body: 'Facturas proforma, packing lists y certificados de origen generados automáticamente.' },
              { emoji: '🏛️', title: 'Cumplimiento normativo', body: 'Validación de requisitos sanitarios y aduaneros por país de destino.' },
              { emoji: '🔍', title: 'Códigos arancelarios', body: 'Asignación automática de códigos HS para cada producto del catálogo.' },
              { emoji: '📊', title: 'Costes estimados', body: 'Cálculo de aranceles, IVA e impuestos antes de confirmar la operación.' },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-xl)',
                padding: 24,
                transitionDelay: `${i * 100}ms`,
              }} className="reveal">
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{card.emoji}</span>
                <h4 className="info-h4" style={{ color: '#fff', marginBottom: 8 }}>{card.title}</h4>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════ SECCIÓN 6 — CTA (negro) ══════ */}
      <Section dark={true} style={{ padding: '100px 16px' }}>
        <div style={{ textAlign: 'center' }} className="reveal">
          <h2 className="info-h2" style={{ color: '#fff', whiteSpace: 'pre-line', marginBottom: 16 }}>
            {'El catálogo mayorista de alimentación\nartesanal que no existía.'}
          </h2>
          <p className="info-lead" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 500, margin: '0 auto 32px' }}>
            Más de 1.200 productores verificados.
          </p>
          <button
            onClick={() => navigate('/b2b/marketplace')}
            style={{
              height: 56, padding: '0 40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-green)', color: '#fff',
              fontSize: 'var(--text-md)', fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Acceder al catálogo B2B →
          </button>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.35)',
            marginTop: 12,
          }}>
            Registro gratuito · Sin compromiso
          </p>
        </div>
      </Section>
    </div>
  );
}
