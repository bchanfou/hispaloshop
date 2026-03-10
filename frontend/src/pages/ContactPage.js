import React from 'react';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';

const contactCards = [
  {
    title: 'Email',
    description: 'Consultas generales, colaboraciones y seguimiento manual de incidencias.',
    value: 'bil.chanfu@hispalotrade.com',
    href: 'mailto:bil.chanfu@hispalotrade.com',
    icon: Mail,
  },
  {
    title: 'Teléfono',
    description: 'Canal directo para soporte comercial y coordinacion operativa.',
    value: '+34 612 49 28 25',
    href: 'tel:+34612492825',
    icon: Phone,
  },
  {
    title: 'Centro de ayuda',
    description: 'Resumen rápido por rol para compradores, productores, importadores e influencers.',
    value: 'Ir al centro de ayuda',
    href: '/help',
    icon: MessageSquare,
    internal: true,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Contacto - Hispaloshop"
        description="Canales de contacto y soporte operativo de Hispaloshop."
        url="https://www.hispaloshop.com/contact"
      />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <BackButton />
        <section className="mt-3 rounded-[28px] border border-stone-200 bg-white p-6 md:p-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Contacto</p>
          <h1 className="mt-3 font-heading text-3xl md:text-4xl font-semibold text-primary">
            Habla con el equipo
          </h1>
          <p className="mt-4 max-w-3xl text-sm md:text-base leading-7 text-stone-600">
            Esta página centraliza los canales visibles del producto para que ninguna llamada a la accion termine
            en un vacio. Si necesitas soporte, prensa, colaboracion o seguimiento comercial, empieza aquí.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {contactCards.map((card) => {
              const Icon = card.icon;
              const content = (
                <article className="h-full rounded-3xl border border-stone-200 bg-stone-50 p-6 transition-colors hover:bg-white">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="mt-4 font-heading text-xl font-semibold text-primary">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{card.description}</p>
                  <p className="mt-4 text-sm font-medium text-primary">{card.value}</p>
                </article>
              );

              if (card.internal) {
                return (
                  <Link key={card.title} to={card.href}>
                    {content}
                  </Link>
                );
              }

              return (
                <a key={card.title} href={card.href}>
                  {content}
                </a>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/help">
              <Button className="h-11 rounded-full bg-primary px-6 text-white hover:bg-primary-hover">
                Abrir ayuda
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" className="h-11 rounded-full px-6">
                Ver plataforma
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
