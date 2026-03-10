import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquareText, ShieldCheck, Store } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { FeedContainer, HIFloatingButton } from '../components/feed';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

const HOME_SIGNAL_ITEMS = [
  'Productores con identidad',
  'Compra más clara',
  'Conversación directa',
];

const TRUST_CARDS = [
  {
    icon: Store,
    title: 'Productores visibles',
    description: 'Marcas pequeñas y honestas con contexto suficiente para entender qué compras.',
  },
  {
    icon: ShieldCheck,
    title: 'Decisiones más claras',
    description: 'Menos ruido promocional y más señales útiles: origen, tienda, certificaciones y comunidad.',
  },
  {
    icon: MessageSquareText,
    title: 'Social commerce útil',
    description: 'Feed, chat y tienda dentro del mismo flujo para descubrir, preguntar y comprar mejor.',
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Hispaloshop',
        url: 'https://www.hispaloshop.com',
        description:
          'Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad.',
      },
    ],
    []
  );

  const handleOpenAI = () => {
    navigate(user ? '/chat' : '/login');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-stone-50">
      <SEO
        title="Hispaloshop - Productos reales y productores honestos"
        description="Social commerce alimentario para descubrir productores honestos, comprar con claridad y hablar con la comunidad."
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <Header />

      <main id="main-content" className="pb-8 pt-4 md:pt-6">
        <section className="mx-auto max-w-6xl px-4 md:px-6">
          <Card className="overflow-hidden rounded-[32px] border-stone-200 bg-white shadow-[0_18px_55px_rgba(15,15,15,0.07)]">
            <CardContent className="p-5 md:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Inicio
                  </p>
                  <h1 className="max-w-3xl font-body text-[2rem] font-semibold leading-tight tracking-tight text-stone-950 md:text-[3.25rem]">
                    Descubre comida real con el contexto suficiente para confiar.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600 md:text-base">
                    Hispaloshop une feed, tienda y conversación para que encontrar un producto se sienta claro desde el primer vistazo.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {HOME_SIGNAL_ITEMS.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => navigate('/discover')}
                      className="h-11 rounded-full bg-stone-950 px-6 text-sm text-white hover:bg-stone-800"
                    >
                      Explorar ahora
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/products')}
                      className="h-11 rounded-full border-stone-300 bg-white px-6 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Ver catálogo
                    </Button>
                  </div>
                </div>

                <div className="hidden gap-3 lg:grid">
                  {TRUST_CARDS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-4"
                      >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-950 shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h2 className="font-body text-base font-semibold text-stone-950">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-stone-600">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Feed
              </p>
              <h2 className="mt-1 font-body text-xl font-semibold text-stone-950">
                Publicaciones, historias y recomendaciones
              </h2>
            </div>
          </div>
          <div className="overflow-clip rounded-[32px] border border-stone-200 bg-white shadow-[0_14px_40px_rgba(15,15,15,0.05)]">
            <FeedContainer />
          </div>
        </section>
      </main>

      <HIFloatingButton onClick={handleOpenAI} />

      <Footer />
    </div>
  );
}
