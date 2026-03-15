import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, ExternalLink, Link2, Search, Loader2, Share2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import apiClient from '../../services/api/client';

function AffiliateLinkCard({ link }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success('Link copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex gap-3 mb-3">
        {link.product_image ? (
          <img
            src={link.product_image}
            alt={link.product_name}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-stone-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-950 truncate">{link.product_name}</p>
          <p className="text-xs text-stone-500">{link.product_price}€</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Clics', value: link.clicks || 0 },
          { label: 'Conversiones', value: link.conversions || 0 },
          { label: 'Comisión', value: `${(link.commission_eur || 0).toFixed(2)}€` },
        ].map((stat) => (
          <div key={stat.label} className="bg-stone-50 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-stone-950">{stat.value}</p>
            <p className="text-[10px] text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={copyLink}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          copied
            ? 'bg-stone-100 text-stone-700'
            : 'bg-stone-950 text-white hover:bg-stone-800'
        }`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copiado' : 'Copiar link'}
      </button>
    </div>
  );
}

export default function AffiliateLinksPage() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [myLinks, setMyLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [blocked, setBlocked] = useState(null);

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
        const data = await apiClient.get(`/products?search=${encodeURIComponent(search)}&limit=10`);
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
      <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
        <div className="max-w-xl mx-auto px-4 py-6 pb-28">
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-black)' }}>Mis links de afiliado</h1>
          <div className="mt-6 p-5" style={{ background: 'var(--color-amber-light)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-amber)' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-amber)' }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-black)' }}>
                  Configuración fiscal requerida
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--color-stone)' }}>
                  {blocked.reason || 'Necesitas completar tu configuración fiscal para activar tus links de afiliado.'}
                </p>
                <RouterLink
                  to="/influencer/fiscal-setup"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{ background: 'var(--color-black)', color: '#fff', borderRadius: 'var(--radius-xl)' }}
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
      <div className="max-w-xl mx-auto px-4 py-6 pb-28">
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
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 animate-spin" />
          )}

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSearchResults([])} />
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl border border-stone-200 shadow-lg max-h-64 overflow-y-auto">
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
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-stone-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-950 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-stone-500">{product.price}€</p>
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
            className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6"
          >
            <div className="flex gap-3 mb-3">
              {selectedProduct.images?.[0] && (
                <img
                  src={selectedProduct.images[0]}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-stone-950">{selectedProduct.name}</p>
                <p className="text-xs text-stone-500">Link de afiliado generado</p>
              </div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 text-xs text-stone-500 font-mono mb-3 break-all border border-stone-200">
              {generatedLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  toast.success('Link copiado');
                }}
                className="flex-1 py-2.5 bg-stone-950 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar link
              </button>
              <button
                onClick={() =>
                  navigator.share?.({
                    url: generatedLink,
                    text: `${selectedProduct.name} — Hispaloshop`,
                  })
                }
                className="flex-1 py-2.5 bg-white text-stone-950 rounded-xl text-sm font-medium border border-stone-200 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </motion.div>
        )}

        {/* My links */}
        <h3 className="text-base font-bold text-stone-950 mb-3">Links activos</h3>
        {loadingLinks ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
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
            {myLinks.map((link) => (
              <AffiliateLinkCard key={link.link_id || link.id} link={link} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
