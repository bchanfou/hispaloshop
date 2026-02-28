import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import Header from '../components/Header';
import Footer from '../components/Footer';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Search, X, FileCheck, ChevronRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useLocale } from '../context/LocaleContext';

const API = process.env.REACT_APP_BACKEND_URL;

export default function CertificatesListPage() {
  const { t } = useLocale();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/certificates/products`).then(r => {
      setProducts(r.data?.products || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const allCertifications = [...new Set(products.flatMap(p => p.certifications || []))].sort();

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCert = !selectedCert || p.certifications?.includes(selectedCert);
    return matchesSearch && matchesCert;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <BackButton />
        <Breadcrumbs />

        {/* Header + Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-green-600 shrink-0" />
            <h1 className="font-serif text-xl md:text-3xl font-semibold text-stone-900" data-testid="certificates-page-title">
              {t('certificate.title', 'Product Certificate')}
            </h1>
          </div>
          <p className="text-stone-600 text-xs md:text-sm">
            {filteredProducts.length} {t('certificate.productsAvailable', 'productos certificados')}
          </p>

          {/* Filters — stacked on mobile */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder={t('certificate.searchPlaceholder', 'Buscar producto...')}
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
                {allCertifications.map(cert => (
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
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4" />
            <p className="text-stone-500 text-sm">{t('common.loading', 'Cargando...')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <FileCheck className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">{t('empty.products', 'No hay productos')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="certificates-list">
            {filteredProducts.map((product) => (
              <Link
                key={product.product_id}
                to={`/product/${product.product_id}`}
                className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-green-300 hover:shadow-md transition-all"
                data-testid={`certificate-item-${product.product_id}`}
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100">
                    <img
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1541401154946-62f8d84bd284?w=200'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                      <FileCheck className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-stone-900 text-sm line-clamp-2 leading-tight group-hover:text-green-700 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">
                        {product.producer_name || product.country_origin}
                      </p>
                    </div>
                    {/* Cert badges inline */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {product.certifications?.slice(0, 3).map((cert, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium border border-green-100"
                        >
                          <Shield className="w-2.5 h-2.5" />
                          {cert}
                        </span>
                      ))}
                      {product.certifications?.length > 3 && (
                        <span className="text-[10px] text-stone-400 self-center">+{product.certifications.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-green-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Trust Badge */}
        {!loading && filteredProducts.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-200 text-xs md:text-sm text-stone-600">
              <Shield className="w-4 h-4 text-green-600" />
              {t('certificate.allVerified', 'Todos los certificados verificados')}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
