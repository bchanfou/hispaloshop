import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, FileText, Search, MapPin, ChevronRight, Tag, Loader2, MessageSquare } from 'lucide-react';
import { useB2BCatalog, useB2BProducers } from '../../features/b2b/queries';
import QuoteBuilder from '../../components/b2b/QuoteBuilder';

const TABS = [
  { id: 'catalog', label: 'Catálogo', icon: Package },
  { id: 'producers', label: 'Productores', icon: Users },
  { id: 'rfq', label: 'Solicitar oferta', icon: FileText },
];

function ProductCard({ product }) {
  const navigate = useNavigate();
  const lowestPrice = product.b2b_prices?.[0];
  return (
    <div
      onClick={() => navigate(`/products/${product.id || product.product_id}`)}
      className="bg-white rounded-2xl border border-stone-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      {product.image_url && (
        <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        <p className="font-semibold text-stone-800 text-sm line-clamp-2">{product.name}</p>
        {product.moq && (
          <p className="text-xs text-stone-500 mt-1">MOQ: {product.moq} uds</p>
        )}
        {lowestPrice && (
          <p className="text-accent font-bold text-sm mt-2">
            desde {(lowestPrice.unit_price_cents / 100).toFixed(2)} EUR/ud
          </p>
        )}
        {product.b2b_prices?.length > 1 && (
          <p className="text-xs text-stone-400 mt-0.5">{product.b2b_prices.length} tramos de precio</p>
        )}
      </div>
    </div>
  );
}

function ProducerCard({ producer, onContact, onChat }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-start gap-3">
        {producer.profile_image ? (
          <img src={producer.profile_image} alt={producer.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <span className="text-accent font-bold text-lg">{(producer.full_name || producer.company_name || 'P')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 truncate">{producer.company_name || producer.full_name}</p>
          {producer.country && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-stone-400" />
              <span className="text-xs text-stone-500">{producer.country}</span>
            </div>
          )}
          {producer.main_categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {producer.main_categories.slice(0, 3).map((cat) => (
                <span key={cat} className="px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-600">{cat}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-400 mt-1">{producer.product_count || 0} productos activos</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onContact(producer.user_id || producer.id)}
          className="flex-1 py-2 bg-accent text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"
        >
          Cotizar <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChat(producer.user_id || producer.id)}
          className="flex-1 py-2 border border-accent text-accent rounded-xl text-sm font-medium flex items-center justify-center gap-1"
        >
          Chat <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function B2BMarketplacePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [rfqProducerId, setRfqProducerId] = useState('');

  const catalogQuery = useB2BCatalog();
  const producersQuery = useB2BProducers();

  const catalogProducts = catalogQuery.data?.data?.products || catalogQuery.data?.products || [];
  const producers = producersQuery.data?.data?.producers || producersQuery.data?.producers || [];

  const filteredProducts = search
    ? catalogProducts.filter((p) => (p.name || '').toLowerCase().includes(search.toLowerCase()))
    : catalogProducts;

  const filteredProducers = search
    ? producers.filter(
        (p) =>
          (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (p.company_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : producers;

  const handleContactProducer = (producerId) => {
    setRfqProducerId(producerId);
    setActiveTab('rfq');
  };

  const handleChat = (producerId) => {
    navigate(`/b2b/chat?producer=${producerId}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Marketplace B2B</h1>

        {activeTab !== 'rfq' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'catalog' ? 'Buscar productos...' : 'Buscar productores...'}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}

        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-stone-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'catalog' && (
          <>
            {catalogQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            ) : catalogQuery.isError ? (
              <div className="text-center py-16 text-stone-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p className="font-medium">Sin acceso al catálogo B2B</p>
                <p className="text-sm mt-1">Completa tu perfil de importador para acceder</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p>No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id || product.product_id} product={product} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'producers' && (
          <>
            {producersQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            ) : producersQuery.isError ? (
              <div className="text-center py-16 text-stone-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p className="font-medium">Sin acceso al directorio de productores</p>
              </div>
            ) : filteredProducers.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p>No hay productores disponibles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducers.map((producer) => (
                  <ProducerCard
                    key={producer.user_id || producer.id}
                    producer={producer}
                    onContact={handleContactProducer}
                    onChat={handleChat}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'rfq' && (
          <div className="space-y-4">
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-800 text-sm">Como funciona</p>
                  <p className="text-xs text-stone-600 mt-1">
                    Indica el productor, los productos y la cantidad. El productor recibira tu solicitud y podrá responderte con una oferta personalizada.
                  </p>
                </div>
              </div>
            </div>
            <QuoteBuilder initialProducerId={rfqProducerId} />
          </div>
        )}
      </div>
    </div>
  );
}
