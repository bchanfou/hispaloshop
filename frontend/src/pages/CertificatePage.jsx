import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Award, ChevronRight, FileCheck, MapPin, Shield } from 'lucide-react';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { useProductDetail } from '../features/products/hooks/useProductDetail';

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-[28px] border border-stone-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-stone-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeIngredientOrigins(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    return Object.entries(value).map(([ingredient, origin]) => ({ ingredient, origin }));
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [ingredient, origin] = line.split(':');
        return {
          ingredient: ingredient?.trim(),
          origin: origin?.trim(),
        };
      })
      .filter((item) => item.ingredient && item.origin);
  }
  return [];
}

export default function CertificatePage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product, certificate, storeInfo, isLoading } = useProductDetail(productId);

  const productImage = product?.images?.[0] || product?.image_url || null;
  const nutrition = certificate?.data?.nutritional_info || certificate?.data?.nutrition_info || null;
  const ingredients = useMemo(() => normalizeList(product?.ingredients), [product?.ingredients]);
  const allergens = useMemo(() => normalizeList(product?.allergens || certificate?.data?.allergens), [certificate?.data?.allergens, product?.allergens]);
  const ingredientOrigins = useMemo(() => normalizeIngredientOrigins(certificate?.data?.ingredient_origins), [certificate?.data?.ingredient_origins]);
  const certifications = Array.isArray(product?.certifications)
    ? product.certifications
    : normalizeList(product?.certifications || certificate?.certificate_type);
  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const canBuyFromStore = Boolean(storeSlug);

  const handleBuy = () => {
    if (!canBuyFromStore) {
      navigate(`/products/${productId}`);
      return;
    }

    navigate(`/store/${storeSlug}?product=${productId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="flex items-center justify-center py-24" data-testid="certificate-loading">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-stone-950" />
            <p className="text-sm text-stone-500">Cargando certificado...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!certificate || !product) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center" data-testid="certificate-not-found">
          <div className="rounded-[32px] border border-stone-100 bg-white p-10 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
              <FileCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-stone-950">Certificado no encontrado</h1>
            <p className="mt-2 text-sm text-stone-500">
              No hemos encontrado la ficha de confianza de este producto.
            </p>
            <Link to="/certificates" className="mt-6 inline-flex">
              <Button className="rounded-full bg-stone-950 text-white hover:bg-stone-800">
                Volver a certificados
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" data-testid="certificate-page">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <BackButton />
        <Breadcrumbs />

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-[28px] bg-stone-50 p-6 sm:p-10">
              <div className="flex min-h-[320px] items-center justify-center">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={product.name}
                    loading="lazy"
                    className="max-h-[360px] w-full object-contain"
                    data-testid="certificate-product-image"
                  />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white text-stone-500">
                    <FileCheck className="h-10 w-10" />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700">
              <Shield className="h-4 w-4" />
              Producto verificado
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-stone-950" data-testid="certificate-title">
              {product.name}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-stone-700">
              {product.short_description || product.description || 'Ficha de confianza y trazabilidad del producto.'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Productor</p>
                <p className="mt-2 text-sm font-medium text-stone-950">{storeInfo?.name || product.producer_name || 'Hispaloshop'}</p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Origen</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-stone-950">
                  <MapPin className="h-4 w-4 text-stone-500" />
                  {product.country_origin || 'Origen no especificado'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {certifications.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700"
                >
                  <Award className="h-4 w-4" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <Link to="/certificates" className="inline-flex">
                <Button type="button" variant="outline" className="rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50">
                  Ver más certificados
                </Button>
              </Link>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Valores nutricionales" subtitle="Lectura clara por cada 100 g o 100 ml cuando aplica.">
            {nutrition && typeof nutrition === 'object' && Object.keys(nutrition).length > 0 ? (
              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-100">
                {Object.entries(nutrition).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="capitalize text-stone-500">{String(key).replace(/_/g, ' ')}</span>
                    <span className="font-medium text-stone-950">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No hay valores nutricionales visibles en este momento.</p>
            )}
          </SectionCard>

          <SectionCard title="Ingredientes" subtitle="Qué contiene el producto y cómo se compone.">
            {ingredients.length > 0 ? (
              <div className="space-y-2">
                {ingredients.map((ingredient) => (
                  <div key={ingredient} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {ingredient}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No hay ingredientes declarados.</p>
            )}
          </SectionCard>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Origen de los ingredientes" subtitle="Trazabilidad adicional cuando la ficha lo permite.">
            {ingredientOrigins.length > 0 ? (
              <div className="space-y-3">
                {ingredientOrigins.map((item) => (
                  <div key={`${item.ingredient}-${item.origin}`} className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm">
                    <span className="font-medium text-stone-950">{item.ingredient}</span>
                    <span className="text-stone-500">{item.origin}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No hay origen detallado para cada ingrediente.</p>
            )}
          </SectionCard>

          <SectionCard title="Alérgenos" subtitle="Lectura rápida y visible sin dramatizar el diseño.">
            {allergens.length > 0 ? (
              <div className="space-y-2">
                {allergens.map((allergen) => (
                  <div key={allergen} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700">
                    <AlertTriangle className="h-4 w-4 text-stone-700" />
                    {allergen}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">Sin alérgenos declarados.</p>
            )}
          </SectionCard>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Certificados" subtitle="Señales de confianza presentadas con una lectura sobria.">
            <div className="space-y-3">
              {certifications.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-950">{item}</p>
                    <p className="text-sm text-stone-500">Certificación asociada al producto.</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="La historia detrás del producto" subtitle="Contexto humano y de origen para entender por qué importa.">
            <div className="rounded-[24px] border border-stone-100 bg-stone-50 p-5">
              <p className="text-sm font-medium text-stone-950">
                {storeInfo?.name || product.producer_name || 'Productor independiente'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                {storeInfo?.story || storeInfo?.tagline || product.description || 'Este producto forma parte de una selección con trazabilidad visible y una narrativa de origen más clara.'}
              </p>
              {product.country_origin ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600">
                  <MapPin className="h-4 w-4" />
                  {product.country_origin}
                </div>
              ) : null}
              {canBuyFromStore ? (
                <button
                  type="button"
                  onClick={handleBuy}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-stone-950 transition-colors hover:text-stone-700"
                >
                  Ir a la tienda y abrir producto
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <section className="mt-6 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-stone-950">Comprar</h2>
              <p className="mt-1 text-sm text-stone-500">
                Abre la tienda del productor y entra directamente al detalle del producto.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleBuy}
              className="rounded-full bg-stone-950 text-white hover:bg-stone-800"
              data-testid="buy-online-button"
            >
              Comprar
            </Button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
