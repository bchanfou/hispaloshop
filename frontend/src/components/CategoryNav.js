import React, { useMemo } from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { CATEGORY_CONFIG, getProductsForCategory } from '../config/categories';

const isNewProduct = (product) => {
  if (!product?.created_at) return false;
  const createdAt = new Date(product.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt <= sevenDays;
};

export default function CategoryNav({
  products = [],
  activeCategory = '',
  getCategoryHref,
  onSelectCategory,
  title = 'Descubre por Categoria',
}) {
  const categoryData = useMemo(() => CATEGORY_CONFIG.map((category) => {
    const matchingProducts = getProductsForCategory(products, category.slug);
    return {
      ...category,
      count: matchingProducts.length || category.fallbackCount,
      hasNew: matchingProducts.some(isNewProduct),
      previewProducts: matchingProducts.slice(0, 3),
    };
  }), [products]);

  return (
    <section className="pb-4" data-testid="category-nav-section">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A7A7A]">Categorias reales</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#1C1C1C]">{title}</h2>
          </div>
          <p className="hidden max-w-md text-sm leading-6 text-[#5E5851] md:block">
            Producto local e importado ya disponible en Espana, sin relatos inflados ni categorias de relleno.
          </p>
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
                className={`group relative snap-start shrink-0 rounded-[1.5rem] border bg-white/85 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(28,28,28,0.10)] ${category.border} ${isActive ? 'ring-2 ring-[#1C1C1C]/10 shadow-[0_18px_38px_rgba(28,28,28,0.08)]' : ''} w-[154px]`}
                data-testid={`category-nav-${category.slug}`}
              >
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${category.bg}`}>
                  <Icon className={`h-7 w-7 ${category.color}`} strokeWidth={1.7} />
                </div>
                <p className="mt-3 text-center text-sm font-semibold leading-5 text-[#1C1C1C]">{category.shortLabel}</p>
                <p className="mt-1 text-center text-xs text-[#6C655E]">({category.count})</p>
                {category.hasNew && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#1C1C1C] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
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
                    className="z-50 hidden w-[320px] rounded-[1.5rem] border border-stone-200 bg-white/95 p-4 shadow-[0_24px_60px_rgba(28,28,28,0.14)] backdrop-blur md:block"
                  >
                    <p className="text-sm font-semibold text-[#1C1C1C]">{category.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#5E5851]">{category.description}</p>
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
                            <p className="truncate text-sm font-medium text-[#1C1C1C]">{product.name}</p>
                            <p className="truncate text-xs text-[#6C655E]">{product.description}</p>
                          </div>
                        </Link>
                      )) : (
                        <div className="rounded-2xl bg-stone-50 p-3 text-xs leading-5 text-[#6C655E]">
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
