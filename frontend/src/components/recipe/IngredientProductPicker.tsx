import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Check, Package, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api/client';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface Product {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  unit?: string;
  image?: string;
  producer_id?: string;
  origin_country?: string;
  certifications?: string[];
  stock?: number;
}

interface IngredientProductPickerProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientName: string;
  onSelect: (product: Product, alternatives?: string[]) => void;
  onMarkGeneric: () => void;
}

export default function IngredientProductPicker({
  isOpen,
  onClose,
  ingredientName,
  onSelect,
  onMarkGeneric
}: IngredientProductPickerProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(ingredientName);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [alternativeProducts, setAlternativeProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen && ingredientName) {
      loadSuggestions(ingredientName);
    }
  }, [isOpen, ingredientName]);

  const loadSuggestions = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get('/recipes/suggest/products', {
        params: { ingredient: query, limit: 10 }
      });
      setProducts(response.suggestions || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    await loadSuggestions(searchQuery);
  }, [searchQuery]);

  const toggleAlternative = (product: Product) => {
    setAlternativeProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, product];
    });
  };

  const handleConfirm = () => {
    if (selectedProduct) {
      onSelect(selectedProduct, alternativeProducts.map(p => p.id));
      onClose();
    }
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(price);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('recipe.picker.title', 'Vincular producto')}
    >
      <div className="space-y-4">
        <div className="bg-stone-50 p-3 rounded-lg">
          <span className="text-sm text-stone-500">
            {t('recipe.picker.ingredient', 'Ingrediente')}:
          </span>
          <span className="ml-2 font-medium text-stone-900">{ingredientName}</span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('recipe.picker.searchPlaceholder', 'Buscar productos...')}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} variant="secondary">
            {t('common.search', 'Buscar')}
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p>{t('recipe.picker.noProducts', 'No se encontraron productos')}</p>
            </div>
          ) : (
            products.map((product) => {
              const isSelected = selectedProduct?.id === product.id;
              const isAlternative = alternativeProducts.find(p => p.id === product.id);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg border-2 cursor-pointer ${
                    isSelected ? 'border-stone-900 bg-stone-50' :
                    isAlternative ? 'border-stone-300 bg-stone-50' :
                    'border-stone-200'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-full h-full p-4 text-stone-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-stone-900">{product.name}</h4>
                      <p className="text-sm text-stone-500">
                        {formatPrice(product.price, product.currency)}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-stone-900 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onMarkGeneric} className="flex-1">
            {t('recipe.picker.markGeneric', 'Genérico')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProduct} className="flex-1">
            {t('common.confirm', 'Confirmar')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
