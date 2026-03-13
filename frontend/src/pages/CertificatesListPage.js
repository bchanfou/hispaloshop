import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import Header from '../components/Header';
import Footer from '../components/Footer';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileCheck, Search, Shield, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import PremiumSelect from '../components/ui/PremiumSelect';
import { Input } from '../components/ui/input';
import { API } from '../utils/api';

async function fetchCertifiedProducts() {
  const res = await fetch(`${API}/certificates/products`);
  if (!res.ok) throw new Error('Error al cargar certificados');
  const data = await res.json();
  return data.products || [];
}

function CertificateRow({ product }) {
  const thumbnail = product.images?.[0] || null;
  const certCount = product.certifications?.length || 0;
  const certificateProductId = product.product_id || product.id;

  return (
    <Link
      to={certificateProductId ? `/certificate/${certificateProductId}` : '/certificates'}
      className="group flex items-center gap-4 rounded-2xl border border-stone-100 bg-white px-4 py-3 transition-colors duration-150 ease-out hover:bg-stone-50"
      data-testid={`certificate-item-${certificateProductId || 'unknown'}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <FileCheck className="h-5 w-5 text-stone-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-950 sm:text-base">{product.name}</p>
        <p className="mt-1 truncate text-xs text-stone-500 sm:text-sm">
          {[product.producer_name, product.country_origin].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
        <Shield className="h-3.5 w-3.5 text-stone-700" />
        <span>{certCount > 0 ? `${certCount} certificado${certCount > 1 ? 's' : ''}` : 'Certificado'}</span>
      </div>
    </Link>
  );
}

export default function CertificatesListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['certified-products'],
    queryFn: fetchCertifiedProducts,
    staleTime: 60_000,
  });

  const allCertifications = useMemo(
    () => [...new Set(data.flatMap((product) => product.certifications || []))].sort((a, b) => a.localeCompare(b, 'es')),
    [data],
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...data]
      .filter((product) => {
        const matchesSearch =
          !query ||
          product.name?.toLowerCase().includes(query) ||
          product.producer_name?.toLowerCase().includes(query) ||
          product.certifications?.some((certification) => certification.toLowerCase().includes(query));
        const matchesCert = !selectedCert || product.certifications?.includes(selectedCert);
        return matchesSearch && matchesCert;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  }, [data, searchQuery, selectedCert]);

  const hasFilters = Boolean(searchQuery || selectedCert);
  const certOptions = [
    { value: '', label: 'Todas las certificaciones' },
    ...allCertifications.map((certification) => ({ value: certification, label: certification })),
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <BackButton />
        <Breadcrumbs />

        <div className="mt-5 rounded-[32px] border border-stone-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">
                Confianza del producto
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950" data-testid="certificates-page-title">
                Certificados
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Explora productos con documentación visible, ordenados alfabéticamente para una lectura rápida y clara.
              </p>
            </div>

            <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600">
              {filteredProducts.length} productos certificados
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Buscar producto, productor o certificado"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 rounded-full border-stone-200 bg-stone-50 pl-11 text-sm placeholder:text-stone-400"
                data-testid="cert-search-input"
                aria-label="Buscar certificados"
              />
            </div>

            <PremiumSelect
              value={selectedCert}
              onChange={setSelectedCert}
              options={certOptions}
              placeholder="Filtrar por certificación"
              ariaLabel="Filtrar por certificación"
            />

            {hasFilters ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCert('');
                }}
                aria-label="Limpiar filtros de certificados"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
              <p className="text-sm text-stone-500">Cargando certificados...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[32px] border border-stone-100 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                <FileCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-stone-950">No hay certificados visibles</h2>
              <p className="mt-2 text-sm text-stone-500">
                Ajusta la búsqueda o elimina filtros para revisar otros productos certificados.
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="certificates-list">
              {filteredProducts.map((product) => (
                <CertificateRow key={product.product_id} product={product} />
              ))}
            </div>
          )}
        </div>

        {!isLoading && filteredProducts.length > 0 ? (
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600">
              <Shield className="h-4 w-4 text-stone-950" />
              Orden alfabético activo
            </div>
          </div>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}
