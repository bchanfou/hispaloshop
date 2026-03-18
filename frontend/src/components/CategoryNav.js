import React, { useMemo } from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { Link } from 'react-router-dom';
import { Coffee, Droplets, Leaf, Milk, Package, Pill, Sparkles, Snowflake, Soup, Wine, Apple, Croissant, Cookie } from 'lucide-react';
import { CATEGORY_CONFIG, getProductsForCategory } from '../config/categories';

const isNewProduct = (product) => {
  if (!product?.created_at) return false;
  const createdAt = new Date(product.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt <= sevenDays;
};

const HOME_MINIMAL_CATEGORY_CONFIG = [
  { slug: 'aceites-vinagres', shortLabel: 'Aceites', label: 'Aceites', icon: Droplets, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Aceites y aliños con origen claro.', matchTerms: ['aceite', 'aove', 'oliva'] },
  { slug: 'lacteos', shortLabel: 'Lacteos', label: 'Lacteos', icon: Milk, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Mantequillas, yogures y elaboraciones lacteas.', matchTerms: ['leche', 'yogur', 'yogurt', 'mantequilla', 'lacteo'] },
  { slug: 'conservas-mermeladas', shortLabel: 'Conservas', label: 'Conservas', icon: Package, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Tarros, mermeladas y despensa artesana.', matchTerms: ['conserva', 'mermelada', 'tarro'] },
  { slug: 'snacks-frutos-secos', shortLabel: 'Snacks', label: 'Snacks', icon: Cookie, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Picoteo y frutos secos bien hechos.', matchTerms: ['snack', 'fruto seco', 'barrita'] },
  { slug: 'quesos', shortLabel: 'Quesos', label: 'Quesos', icon: Milk, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Curados, frescos y afinados con calma.', matchTerms: ['queso', 'manchego', 'curado', 'cabra'] },
  { slug: 'cafe-te', shortLabel: 'Cafe', label: 'Cafe', icon: Coffee, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Cafe, te e infusiones.', matchTerms: ['cafe', 'te', 'infusion'] },
  { slug: 'panadería-dulces', shortLabel: 'Panadería', label: 'Panadería', icon: Croissant, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Panes, galletas y obrador.', matchTerms: ['pan', 'galleta', 'bizcocho', 'obrador'] },
  { slug: 'frutas-verduras', shortLabel: 'Frutas', label: 'Frutas', icon: Apple, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Huerta y temporada.', matchTerms: ['fruta', 'verdura', 'huerta'] },
  { slug: 'vinos-bebidas', shortLabel: 'Bebidas', label: 'Bebidas', icon: Wine, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Vinos, kombuchas y bebidas de autor.', matchTerms: ['vino', 'bebida', 'kombucha', 'zumo'] },
  { slug: 'salsas', shortLabel: 'Salsas', label: 'Salsas', icon: Soup, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Salsas, pestos y condimentos.', matchTerms: ['salsa', 'alioli', 'pesto', 'condimento'] },
  { slug: 'congelados', shortLabel: 'Congelados', label: 'Congelados', icon: Snowflake, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Producto listo para frio y envio.', matchTerms: ['congelado'] },
  { slug: 'orgánico-eco', shortLabel: 'Orgánico', label: 'Orgánico', icon: Leaf, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Seleccion orgánica y eco.', matchTerms: ['eco', 'orgánico', 'ecologico'] },
  { slug: 'suplementos', shortLabel: 'Suplementos', label: 'Suplementos', icon: Pill, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Bienestar, proteinas y apoyo nutricional.', matchTerms: ['proteina', 'suplemento', 'colageno', 'vitamina'] },
];

export default function CategoryNav({
  products = [],
  activeCategory = '',
  getCategoryHref,
  onSelectCategory,
  title = 'Descubre por Categoria',
  variant = 'default',
}) {
  const sourceConfig = variant === 'home-minimal' ? HOME_MINIMAL_CATEGORY_CONFIG : CATEGORY_CONFIG;
  const isCatalog = variant === 'catalog';

  const categoryData = useMemo(
    () =>
      sourceConfig.map((category) => {
        const baseCategory =
          CATEGORY_CONFIG.find((item) => item.slug === category.slug) ||
          CATEGORY_CONFIG.find((item) => (item.aliases || []).includes(category.slug)) ||
          {};
        const matchingProducts =
          variant === 'home-minimal'
            ? products.filter((product) => {
                const haystack = `${product.name || ''} ${product.description || ''} ${product.category || ''}`.toLowerCase();
                return category.slug === product.category || (category.matchTerms || []).some((term) => haystack.includes(term));
              })
            : getProductsForCategory(products, category.slug);

        return {
          ...baseCategory,
          ...category,
          count: matchingProducts.length || baseCategory.fallbackCount || 0,
          hasNew: matchingProducts.some(isNewProduct),
          previewProducts: matchingProducts.slice(0, 3),
        };
      }),
    [products, sourceConfig, variant],
  );

  return (
    <section className="pb-4" data-testid="category-nav-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Categorías</p>
            <h2 className={`mt-2 font-semibold tracking-tight text-stone-950 ${isCatalog ? 'text-2xl' : 'text-3xl'}`}>{title}</h2>
          </div>
          {variant !== 'home-minimal' ? (
            <p className="hidden max-w-md text-sm leading-6 text-stone-500 md:block">
              {isCatalog
                ? 'Explora el catálogo desde categorías claras y sin ruido visual.'
                : 'Producto local e importado ya disponible en España, sin relatos inflados ni categorías de relleno.'}
            </p>
          ) : null}
        </div>

        <div className={`flex snap-x snap-mandatory overflow-x-auto pb-2 scrollbar-hide ${isCatalog ? 'gap-4' : 'gap-3'}`}>
          {categoryData.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.slug;
            const href = getCategoryHref ? getCategoryHref(category.slug) : `/products?category=${category.slug}`;

            const trigger = (
              <Link
                to={href}
                onClick={(event) => {
                  if (onSelectCategory) {
                    event.preventDefault();
                    onSelectCategory(category.slug);
                  }
                }}
                className={`group relative snap-start shrink-0 transition-all duration-150 ease-out ${
                  isCatalog
                    ? `w-[156px] rounded-2xl border bg-white p-4 hover:-translate-y-[1px] hover:border-stone-300 hover:shadow-sm ${
                        isActive ? 'border-stone-950 bg-stone-50 shadow-sm' : 'border-stone-100'
                      }`
                    : `rounded-[1.5rem] border bg-white/85 p-3 transition-all duration-200 hover:bg-white ${category.border} ${
                        isActive ? 'ring-1 ring-stone-950/20' : ''
                      } ${variant === 'home-minimal' ? 'w-[92px]' : 'w-[154px]'}`
                }`}
                data-testid={`category-nav-${category.slug}`}
              >
                <div className={`flex items-center justify-center rounded-full ${isCatalog ? 'h-11 w-11 bg-stone-100 text-stone-700' : `mx-auto h-14 w-14 ${category.bg}`}`}>
                  <Icon className={`h-5 w-5 ${isCatalog ? 'text-stone-700' : category.color}`} strokeWidth={1.7} />
                </div>
                <p
                  className={
                    isCatalog
                      ? 'mt-3 text-left text-sm font-medium text-stone-900'
                      : `mt-2 text-center text-xs font-medium leading-4 text-stone-950 transition-all duration-200 ${
                          variant === 'home-minimal' ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : ''
                        }`
                  }
                >
                  {isCatalog ? category.label : category.shortLabel}
                </p>
                {variant !== 'home-minimal' ? (
                  <p className={`${isCatalog ? 'mt-1 text-left text-xs text-stone-500' : 'mt-1 text-center text-xs text-stone-500'}`}>
                    {isCatalog ? `${category.count} productos` : `(${category.count})`}
                  </p>
                ) : null}
                {variant !== 'home-minimal' && category.hasNew && !isCatalog ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-stone-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    <Sparkles className="h-3 w-3" />
                    Novedad
                  </span>
                ) : null}
              </Link>
            );

            return (
              <HoverCard.Root key={category.slug} openDelay={120} closeDelay={70}>
                <HoverCard.Trigger asChild>{trigger}</HoverCard.Trigger>
                <HoverCard.Portal>
                  <HoverCard.Content
                    side="top"
                    align="start"
                    sideOffset={12}
                    className={`z-50 hidden rounded-[1.5rem] border border-stone-200 bg-white/95 p-4 shadow-[0_24px_60px_rgba(28,28,28,0.14)] backdrop-blur md:block ${variant === 'home-minimal' ? 'w-[240px]' : 'w-[320px]'}`}
                  >
                    <p className="text-sm font-semibold text-stone-950">{category.label}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{category.description}</p>
                    <div className="mt-3 space-y-2">
                      {category.previewProducts.length > 0 ? (
                        category.previewProducts.map((product) => (
                          <Link
                            key={product.product_id}
                            to={`/products/${product.product_id}`}
                            className="flex items-center gap-3 rounded-2xl border border-stone-100 p-2 transition-colors hover:bg-stone-50"
                          >
                            <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-stone-400">Real</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-stone-950">{product.name}</p>
                              <p className="truncate text-xs text-stone-500">{product.description}</p>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-stone-50 p-3 text-xs leading-5 text-stone-500">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </HoverCard.Content>
                </HoverCard.Portal>
              </HoverCard.Root>
            );
          })}
        </div>
      </div>
    </section>
  );
}
