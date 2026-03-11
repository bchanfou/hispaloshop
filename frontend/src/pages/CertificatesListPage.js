import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import Header from '../components/Header';
import Footer from '../components/Footer';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Shield, Search, X, FileCheck, ChevronRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useLocale } from '../context/LocaleContext';
import { API } from '../utils/api';

const PAGE_SIZE = 24;

async function fetchCertifiedProducts({ pageParam = 0 }) {
  const res = await fetch(`${API}/certificates/products?offset=${pageParam}&limit=${PAGE_SIZE}`);
  if (!res.ok) throw new Error('Error fetching certificates');
  const data = await res.json();
  return {
    products: data.products || [],
    nextOffset: (data.products || []).length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
  };
}

export default function CertificatesListPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState('');
  const sentinelRef = useRef(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['certified-products'],
    queryFn: fetchCertifiedProducts,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 60_000,
  });

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];

  const allCertifications = [...new Set(allProducts.flatMap((p) => p.certifications || []))].sort();

  const filteredProducts = allProducts.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.name?.toLowerCase().includes(q) ||
      p.producer_name?.toLowerCase().includes(q) ||
      p.certifications?.some((c) => c.toLowerCase().includes(q));
    const matchesCert = !selectedCert || p.certifications?.includes(selectedCert);
    return matchesSearch && matchesCert;
  });

  // IntersectionObserver — load next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <BackButton />
        <Breadcrumbs />

        {/* Header + Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 shrink-0 text-stone-950 md:w-6 md:h-6" />
            <h1
              className="font-serif text-xl md:text-3xl font-semibold text-stone-900"
              data-testid="certificates-page-title"
            >
              {t('certificate.title', 'Certificados de producto')}
            </h1>
          </div>
          <p className="text-stone-600 text-xs md:text-sm">
            {filteredProducts.length} {t('certificate.productsAvailable', 'productos certificados')}
          </p>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder={t('certificate.searchPlaceholder', 'Buscar certificado o producto...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 w-full rounded-lg border-stone-200 text-sm"
                data-testid="cert-search-input"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCert}
                onChange={(e) => setSelectedCert(e.target.value)}
                className="h-10 px-3 flex-1 sm:flex-none sm:w-auto border border-stone-200 rounded-lg bg-white text-sm focus:outline-none focus:border-stone-400 truncate max-w-full"
                data-testid="cert-filter-select"
              >
                <option value="">{t('certificate.allCerts', 'Todas las certificaciones')}</option>
                {allCertifications.map((cert) => (
                  <option key={cert} value={cert}>{cert}</option>
                ))}
              </select>
              {(searchQuery || selectedCert) && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCert(''); }}
                  className="h-10 w-10 flex items-center justify-center shrink-0 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  data-testid="cert-clear-filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4" />
            <p className="text-stone-500 text-sm">{t('common.loading', 'Cargando...')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <FileCheck className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">{t('empty.products', 'No hay productos')}</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            data-testid="certificates-list"
          >
            {filteredProducts.map((product) => (
              <Link
                key={product.product_id}
                to={`/products/${product.product_id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-all hover:border-stone-950 hover:shadow-md"
                data-testid={`certificate-item-${product.product_id}`}
              >
                {/* Square image */}
                <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                  <img
                    src={product.images?.[0] || 'https://images.unsplash.com/photo-1541401154946-62f8d84bd284?w=300'}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Cert count badge */}
                  {product.certifications?.length > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-stone-950 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      <Shield className="w-2.5 h-2.5" />
                      {product.certifications.length}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                    <FileCheck className="w-3 h-3 text-stone-950" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 flex flex-col flex-1 min-w-0">
                  <h3 className="line-clamp-2 text-xs font-medium leading-tight text-stone-950 transition-colors group-hover:text-stone-700">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                    {product.producer_name || product.country_origin}
                  </p>
                  {/* First cert badge */}
                  {product.certifications?.[0] && (
                    <span className="mt-1.5 inline-flex max-w-full items-center gap-0.5 self-start truncate rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[9px] font-medium text-stone-700">
                      {product.certifications[0]}
                      {product.certifications.length > 1 && (
                        <span className="ml-0.5 text-stone-500">+{product.certifications.length - 1}</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <div className="px-2.5 pb-2 flex justify-end">
                  <ChevronRight className="h-3.5 w-3.5 text-stone-400 transition-colors group-hover:text-stone-700" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-12 flex items-center justify-center mt-4">
          {isFetchingNextPage && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-stone-400" />
          )}
        </div>

        {/* Trust Badge */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-200 text-xs md:text-sm text-stone-600">
              <Shield className="w-4 h-4 text-stone-950" />
              {t('certificate.allVerified', 'Todos los certificados verificados')}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
