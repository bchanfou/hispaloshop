// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, ExternalLink, Link2, Search, Loader2, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useLocale } from '../../context/LocaleContext';

function AffiliateLinkCard({ link, convertAndFormatPrice }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success('Link copiado');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex gap-3 mb-3">
        {link.product_image ? (
          <img
            src={link.product_image}
            alt={link.product_name}
            className="w-12 h-12 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-stone-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-950 truncate">{link.product_name}</p>
          <p className="text-xs text-stone-500">{convertAndFormatPrice(Number(link.product_price || 0))}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Clics', value: link.clicks || 0 },
          { label: 'Conversiones', value: link.conversions || 0 },
          { label: 'Comisión', value: convertAndFormatPrice(Number(link.commission_eur || 0)) },
        ].map((stat) => (
          <div key={stat.label} className="bg-stone-50 rounded-2xl p-2 text-center">
            <p className="text-base font-bold text-stone-950">{stat.value}</p>
            <p className="text-[10px] text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Conversion rate */}
      {(link.clicks || 0) > 0 && (
        <p className="text-xs text-stone-500 mb-2 text-center">
          Conversión: <span className="font-semibold text-stone-950">{((link.conversions || 0) / link.clicks * 100).toFixed(1)}%</span>
        </p>
      )}

      <button
        onClick={copyLink}
        className={`w-full py-2.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          copied
            ? 'bg-stone-950 text-white'
            : 'bg-stone-950 text-white hover:bg-stone-800'
        }`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '¡Copiado!' : 'Copiar link'}
      </button>
    </div>
  );
}

export default function AffiliateLinksPage() {
  const { convertAndFormatPrice } = useLocale();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [myLinks, setMyLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [blocked, setBlocked] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

  const fetchLinks = useCallback(async () => {
    try {
      const data = await apiClient.get('/influencer/links');
      setMyLinks(data?.links || []);
      setBlocked(null);
    } catch (err) {
      if (err?.response?.status === 403 || err?.status === 403) {
        const detail = err?.response?.data?.detail || err?.detail || {};
        setBlocked(detail);
      } else {
        setMyLinks([]);
      }
    } finally {
      setLoadingLinks(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Search products
  useEffect(() => {
    if (search.length < 3) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiClient.get(`/products?search=${encodeURIComponent(search)}&limit=10&approved_only=true`);
        setSearchResults(data?.products || data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const generateLink = async (product) => {
    setGenerating(true);
    try {
      const data = await apiClient.post('/influencer/links', {
        product_id: product.product_id || product.id,
      });
      setGeneratedLink(data?.url || '');
      setSelectedProduct(product);
      setSearch('');
      setSearchResults([]);
      // Refresh links list
      fetchLinks();
    } catch {
      toast.error('Error generando link');
    } finally {
      setGenerating(false);
    }
  };

  // Blocked by fiscal gate
  if (blocked) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-[975px] mx-auto px-4 py-6 pb-28">
          <h1 className="text-xl font-bold mb-1 text-stone-950">Mis links de afiliado</h1>
          <div className="mt-6 p-5 bg-stone-100 rounded-2xl shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-stone-600" />
              <div>
                <p className="text-sm font-semibold mb-1 text-stone-950">
                  Configuración fiscal requerida
                </p>
                <p className="text-sm mb-2 text-stone-500">
                  Necesitas completar tu configuración fiscal para activar tus links de afiliado.
                </p>
                {(blocked.reason || blocked.detail) && (
                  <p className="text-sm text-stone-500 mb-4">
                    Motivo: {blocked.reason || blocked.detail}
                  </p>
                )}
                <RouterLink
                  to="/influencer/fiscal-setup"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors bg-stone-950 text-white rounded-2xl"
                >
                  Activar afiliados
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[975px] mx-auto px-4 py-6 pb-28">
        <h1 className="text-xl font-bold text-stone-950 mb-1">Mis links de afiliado</h1>
        <p className="text-sm text-stone-500 mb-6">
          Genera un link para cualquier producto. Cuando alguien compre a través de tu link, ganas comisión.
        </p>

        {/* Product search */}
        <div className="relative mb-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto para generar link..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 animate-spin" />
          )}

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSearchResults([])} />
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-stone-200 shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.product_id || product.id}
                    type="button"
                    onClick={() => generateLink(product)}
                    disabled={generating}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
                  >
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt=""
                        className="w-9 h-9 rounded-2xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-stone-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-950 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-stone-500">{convertAndFormatPrice(Number(product.price || 0))}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Generated link */}
        {generatedLink && selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-50 shadow-sm rounded-2xl p-4 mb-6"
          >
            <div className="flex gap-3 mb-3">
              {selectedProduct.images?.[0] && (
                <img
                  src={selectedProduct.images[0]}
                  alt=""
                  className="w-12 h-12 rounded-2xl object-cover shrink-0"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-stone-950">{selectedProduct.name}</p>
                <p className="text-xs text-stone-500">Link de afiliado generado</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl px-3 py-2 text-xs text-stone-500 font-mono mb-3 break-all border border-stone-200">
              {generatedLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  toast.success('Link copiado');
                }}
                className="flex-1 py-2.5 bg-stone-950 text-white rounded-2xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar link
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ url: generatedLink, text: `${selectedProduct.name} — Hispaloshop` });
                  } else {
                    navigator.clipboard.writeText(generatedLink);
                    toast.success('Link copiado al portapapeles');
                  }
                }}
                className="flex-1 py-2.5 bg-white text-stone-950 rounded-2xl text-sm font-medium border border-stone-200 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </motion.div>
        )}

        {/* My links */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-stone-950">Links activos</h3>
          {myLinks.length > 1 && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white text-sm text-stone-950 px-3 py-1.5 focus:outline-none focus:border-stone-400"
            >
              <option value="revenue">Más ingresos</option>
              <option value="clicks">Más clics</option>
              <option value="recent">Más recientes</option>
            </select>
          )}
        </div>
        {loadingLinks ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-stone-100 rounded" />
                    <div className="h-3 w-16 bg-stone-100 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map(j => <div key={j} className="h-14 bg-stone-50 rounded-2xl" />)}
                </div>
                <div className="h-10 bg-stone-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : myLinks.length === 0 ? (
          <div className="text-center py-10">
            <Link2 className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">
              Busca un producto arriba para generar tu primer link
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...myLinks].sort((a, b) => {
              if (sortBy === 'revenue') return Number(b.commission_eur || 0) - Number(a.commission_eur || 0);
              if (sortBy === 'clicks') return Number(b.clicks || 0) - Number(a.clicks || 0);
              // recent — newest first by created_at
              const bTime = new Date(b.created_at || 0).getTime() || 0;
              const aTime = new Date(a.created_at || 0).getTime() || 0;
              return bTime - aTime;
            }).map((link) => (
              <AffiliateLinkCard key={link.link_id || link.id} link={link} convertAndFormatPrice={convertAndFormatPrice} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
