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
  { slug: 'aceites-vinagres', shortLabel: 'Aceites', label: 'Aceites', icon: Droplets, bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-100', description: 'Aceites y aliños con origen claro.', matchTerms: ['aceite', 'aove', 'oliva'] },
  { slug: 'lacteos', shortLabel: 'Lacteos', label: 'Lacteos', icon: Milk, bg: 'bg-sky-50', color: 'text-sky-700', border: 'border-sky-100', description: 'Mantequillas, yogures y elaboraciones lacteas.', matchTerms: ['leche', 'yogur', 'yogurt', 'mantequilla', 'lacteo'] },
  { slug: 'conservas-mermeladas', shortLabel: 'Conservas', label: 'Conservas', icon: Package, bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-100', description: 'Tarros, mermeladas y despensa artesana.', matchTerms: ['conserva', 'mermelada', 'tarro'] },
  { slug: 'snacks-frutos-secos', shortLabel: 'Snacks', label: 'Snacks', icon: Cookie, bg: 'bg-orange-50', color: 'text-orange-700', border: 'border-orange-100', description: 'Picoteo y frutos secos bien hechos.', matchTerms: ['snack', 'fruto seco', 'barrita'] },
  { slug: 'quesos', shortLabel: 'Quesos', label: 'Quesos', icon: Milk, bg: 'bg-yellow-50', color: 'text-yellow-700', border: 'border-yellow-100', description: 'Curados, frescos y afinados con calma.', matchTerms: ['queso', 'manchego', 'curado', 'cabra'] },
  { slug: 'cafe-te', shortLabel: 'Cafe', label: 'Cafe', icon: Coffee, bg: 'bg-stone-100', color: 'text-stone-700', border: 'border-stone-200', description: 'Cafe, te e infusiones.', matchTerms: ['cafe', 'te', 'infusion'] },
  { slug: 'panaderia-dulces', shortLabel: 'Panaderia', label: 'Panaderia', icon: Croissant, bg: 'bg-orange-50', color: 'text-orange-700', border: 'border-orange-100', description: 'Panes, galletas y obrador.', matchTerms: ['pan', 'galleta', 'bizcocho', 'obrador'] },
  { slug: 'frutas-verduras', shortLabel: 'Frutas', label: 'Frutas', icon: Apple, bg: 'bg-lime-50', color: 'text-lime-700', border: 'border-lime-100', description: 'Huerta y temporada.', matchTerms: ['fruta', 'verdura', 'huerta'] },
  { slug: 'vinos-bebidas', shortLabel: 'Bebidas', label: 'Bebidas', icon: Wine, bg: 'bg-fuchsia-50', color: 'text-fuchsia-700', border: 'border-fuchsia-100', description: 'Vinos, kombuchas y bebidas de autor.', matchTerms: ['vino', 'bebida', 'kombucha', 'zumo'] },
  { slug: 'salsas', shortLabel: 'Salsas', label: 'Salsas', icon: Soup, bg: 'bg-red-50', color: 'text-red-700', border: 'border-red-100', description: 'Salsas, pestos y condimentos.', matchTerms: ['salsa', 'alioli', 'pesto', 'condimento'] },
  { slug: 'congelados', shortLabel: 'Congelados', label: 'Congelados', icon: Snowflake, bg: 'bg-cyan-50', color: 'text-cyan-700', border: 'border-cyan-100', description: 'Producto listo para frio y envio.', matchTerms: ['congelado'] },
  { slug: 'organico-eco', shortLabel: 'Organico', label: 'Organico', icon: Leaf, bg: 'bg-green-50', color: 'text-green-700', border: 'border-green-100', description: 'Seleccion organica y eco.', matchTerms: ['eco', 'organico', 'ecologico'] },
  { slug: 'suplementos', shortLabel: 'Suplementos', label: 'Suplementos', icon: Pill, bg: 'bg-violet-50', color: 'text-violet-700', border: 'border-violet-100', description: 'Bienestar, proteinas y apoyo nutricional.', matchTerms: ['proteina', 'suplemento', 'colageno', 'vitamina'] },
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
  const categoryData = useMemo(() => sourceConfig.map((category) => {
    const baseCategory = CATEGORY_CONFIG.find((item) => item.slug === category.slug)
      || CATEGORY_CONFIG.find((item) => item.aliases.includes(category.slug))
      || {};
    const matchingProducts = variant === 'home-minimal'
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
  }), [products, sourceConfig, variant]);

  return (
    <section className="pb-4" data-testid="category-nav-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Categorias reales</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-primary">{title}</h2>
          </div>
          {variant !== 'home-minimal' && (
            <p className="hidden max-w-md text-sm leading-6 text-stone-500 md:block">
              Producto local e importado ya disponible en Espana, sin relatos inflados ni categorias de relleno.
            </p>
          )}
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide">
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
                className={`group relative snap-start shrink-0 rounded-[1.5rem] border bg-white/85 p-3 transition-all duration-200 hover:bg-white ${category.border} ${isActive ? 'ring-1 ring-primary/20' : ''} ${variant === 'home-minimal' ? 'w-[92px]' : 'w-[154px]'}`}
                data-testid={`category-nav-${category.slug}`}
              >
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${category.bg}`}>
                  <Icon className={`h-6 w-6 ${category.color}`} strokeWidth={1.7} />
                </div>
                <p className={`mt-2 text-center text-xs font-medium leading-4 text-primary transition-all duration-200 ${variant === 'home-minimal' ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : ''}`}>
                  {category.shortLabel}
                </p>
                {variant !== 'home-minimal' && <p className="mt-1 text-center text-xs text-stone-500">({category.count})</p>}
                {variant !== 'home-minimal' && category.hasNew && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    <Sparkles className="h-3 w-3" />
                    Novedad
                  </span>
                )}
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
                    <p className="text-sm font-semibold text-primary">{category.label}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{category.description}</p>
                    <div className="mt-3 space-y-2">
                      {category.previewProducts.length > 0 ? category.previewProducts.map((product) => (
                        <Link
                          key={product.product_id}
                          to={`/products/${product.product_id}`}
                          className="flex items-center gap-3 rounded-2xl border border-stone-100 p-2 transition-colors hover:bg-stone-50"
                        >
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-stone-400">Real</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary">{product.name}</p>
                            <p className="truncate text-xs text-stone-500">{product.description}</p>
                          </div>
                        </Link>
                      )) : (
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
