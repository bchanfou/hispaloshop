import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Globe2,
  PackageCheck,
  ShoppingBag,
  Sprout,
  Store,
  Tractor,
  TrendingUp,
  Users,
} from 'lucide-react';
import RoleCard from './RoleCard';

export const ROLE_OPTIONS = [
  {
    id: 'buyer',
    eyebrow: 'SOY COMPRADOR',
    headline: 'Descubre Lo Autentico',
    copy: 'Productos locales que el supermercado no tiene. Conoce quien lo hace, como y donde.',
    cta: 'Explorar Ahora',
    href: '/productos',
    icon: ShoppingBag,
    previewIcon: Sprout,
    previewTitle: 'Compra con contexto, no a ciegas',
    previewCopy: 'Empieza por productores cercanos y guarda tu zona para ver una home cada vez mas afin.',
    cardClassName: 'bg-gradient-to-br from-emerald-50 via-stone-50 to-white border-emerald-100',
    iconColor: 'text-emerald-700',
    previewColor: 'bg-emerald-50',
    seoTitle: 'Comprar producto local y autentico',
    seoDescription: 'Descubre productos artesanales de tu zona y delicatessen importadas con trazabilidad real y pago seguro.',
    canonical: 'https://www.hispaloshop.com/products',
  },
  {
    id: 'influencer',
    eyebrow: 'SOY INFLUENCER',
    headline: 'Monetiza Tu Voz Real',
    copy: 'Gana del 3% al 7% recomendando productos que si usarias. 1,240 personas ya generan ingresos extras.',
    cta: 'Ver Programa',
    href: '/influencers',
    icon: Users,
    previewIcon: TrendingUp,
    previewTitle: 'Contenido que convierte sin sonar a anuncio',
    previewCopy: 'Maria gano EUR 340 el mes pasado recomendando productos reales a una audiencia pequena pero fiel.',
    socialProof: 'Maria gano EUR 340 el mes pasado',
    cardClassName: 'bg-gradient-to-br from-fuchsia-50 via-violet-50 to-white border-violet-100',
    iconColor: 'text-violet-700',
    previewColor: 'bg-violet-50',
    seoTitle: 'Programa para influencers de producto real',
    seoDescription: 'Monetiza recomendaciones honestas y gana comisiones verificables con el programa de influencers de Hispaloshop.',
    canonical: 'https://www.hispaloshop.com/influencers',
  },
  {
    id: 'producer',
    eyebrow: 'SOY PRODUCTOR',
    headline: 'Vende Sin Que Te Roben',
    copy: 'El mismo producto, el doble de beneficio. Tu pones el precio, tu eliges como enviar.',
    cta: 'Empezar a Vender',
    href: '/productor',
    icon: Store,
    previewIcon: Tractor,
    previewTitle: 'Setup directo y sin friccion',
    previewCopy: 'Sube tu catalogo, define envio y empieza a recibir pedidos sin ceder el margen al intermediario.',
    badge: 'Mas solicitado',
    socialProof: 'Setup en 8 minutos, primera venta esta semana',
    cardClassName: 'bg-gradient-to-br from-orange-100 via-amber-50 to-white border-orange-200',
    iconColor: 'text-orange-700',
    previewColor: 'bg-orange-50',
    seoTitle: 'Vender como productor sin intermediarios',
    seoDescription: 'Vende producto artesanal con mas margen, trazabilidad y control total sobre precio y envio.',
    canonical: 'https://www.hispaloshop.com/productor',
  },
  {
    id: 'importer',
    eyebrow: 'SOY IMPORTADOR',
    headline: 'Tu Catalogo, Tu Negocio',
    copy: 'Opera como productor con alcance internacional. Certificados digitales, trazabilidad completa.',
    cta: 'Ver Ventajas',
    href: '/importador',
    icon: Globe2,
    previewIcon: PackageCheck,
    previewTitle: 'Importa con una narrativa de confianza',
    previewCopy: 'Activa certificados digitales, ficha completa y un escaparate listo para vender producto ya presente en el pais.',
    cardClassName: 'bg-gradient-to-br from-sky-50 via-cyan-50 to-white border-sky-100',
    iconColor: 'text-sky-700',
    previewColor: 'bg-sky-50',
    seoTitle: 'Marketplace para importadores con trazabilidad',
    seoDescription: 'Gestiona tu catalogo importado con pago seguro, certificados digitales y trazabilidad completa.',
    canonical: 'https://www.hispaloshop.com/importador',
  },
];

export default function RoleSelector({
  selectedRole,
  onSelectRole,
}) {
  const activeRole = ROLE_OPTIONS.find((role) => role.id === selectedRole) || ROLE_OPTIONS[0];

  return (
    <section className="pb-5 pt-2" data-testid="role-selector-section">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Elige tu rol</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-primary">
              Entra por el camino que mas te conviene hoy
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-stone-500">
            Guardamos tu preferencia para que la home futura empiece donde mas valor te da.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_OPTIONS.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={role.id === activeRole.id}
              onSelect={onSelectRole}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="mt-4 rounded-[1.5rem] border border-stone-200 bg-white/85 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Preferencia activa
            </p>
            <p className="mt-2 text-sm leading-6 text-[#3D3934]">
              {activeRole.id === 'buyer' && 'Te mostraremos primero producto autentico y cercania.'}
              {activeRole.id === 'influencer' && 'Priorizaremos oportunidades para monetizar recomendaciones reales.'}
              {activeRole.id === 'producer' && 'Priorizaremos herramientas para vender con mas margen y control.'}
              {activeRole.id === 'importer' && 'Priorizaremos trazabilidad, catalogo y credenciales comerciales.'}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
