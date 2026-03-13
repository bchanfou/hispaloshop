import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import {
  Search, CheckCircle, XCircle, Trash2, Edit, ArrowLeft, Plus,
  Package, DollarSign, ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asLowerText } from '../../utils/safe';



export default function AdminProducts() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checklistProduct, setChecklistProduct] = useState(null); // product pending checklist approval
  const [checklistItems, setChecklistItems] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    images: [''],
    country_origin: '',
    ingredients: [],
    allergens: [],
    certifications: []
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/admin/products`, { withCredentials: true });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const openApprovalChecklist = (product) => {
    // Auto-detect which items are already met
    const hasPhotos = (product.images?.filter(i => i)?.length || 0) >= 1;
    const hasIngredients = (product.ingredients?.length || 0) > 0;
    const hasAllergens = Array.isArray(product.allergens); // field exists (can be empty = "none")
    const hasCertifications = (product.certifications?.length || 0) > 0;
    const hasDescription = (product.description?.trim()?.length || 0) >= 20;
    const hasCountry = !!product.country_origin?.trim();
    setChecklistItems({
      photos: hasPhotos,
      ingredients: hasIngredients,
      allergens: hasAllergens,
      certifications: hasCertifications,
      description: hasDescription,
      country: hasCountry,
    });
    setChecklistProduct(product);
  };

  const approveProduct = async (productId, approved) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/approve?approved=${approved}`, {}, { withCredentials: true });
      toast.success(approved ? t('adminProducts.messages.productApproved') : t('adminProducts.messages.productRejected'));
      setChecklistProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error(t('adminProducts.messages.updateError'));
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm(t('adminProducts.messages.confirmDelete'))) return;
    try {
      await axios.delete(`${API}/products/${productId}`, { withCredentials: true });
      toast.success(t('adminProducts.messages.productDeleted'));
      fetchProducts();
    } catch (error) {
      toast.error(t('adminProducts.messages.deleteError'));
    }
  };

  const updatePrice = async (productId, price) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/price?price=${price}`, {}, { withCredentials: true });
      toast.success(t('adminProducts.messages.priceUpdated'));
      fetchProducts();
      setEditingProduct(null);
    } catch (error) {
      toast.error(t('adminProducts.messages.priceError'));
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        images: formData.images.filter(img => img.trim()),
        ingredients: formData.ingredientsStr?.split(',').map(i => i.trim()).filter(Boolean) || [],
        allergens: formData.allergensStr?.split(',').map(a => a.trim()).filter(Boolean) || [],
        certifications: formData.certificationsStr?.split(',').map(c => c.trim()).filter(Boolean) || []
      };
      delete data.ingredientsStr;
      delete data.allergensStr;
      delete data.certificationsStr;
      
      await axios.post(`${API}/products`, data, { withCredentials: true });
      toast.success(t('adminProducts.messages.productCreated'));
      setShowCreateForm(false);
      setFormData({
        name: '',
        category_id: '',
        description: '',
        price: '',
        images: [''],
        country_origin: '',
        ingredients: [],
        allergens: [],
        certifications: []
      });
      fetchProducts();
    } catch (error) {
      toast.error(t('adminProducts.messages.createError'));
    }
  };

  const filteredProducts = products.filter(p => {
    const searchNeedle = asLowerText(searchTerm);
    const matchesSearch = 
      asLowerText(p.name).includes(searchNeedle) ||
      asLowerText(p.producer_name).includes(searchNeedle);
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'pending' && !p.approved) ||
      (filter === 'approved' && p.approved);
    
    return matchesSearch && matchesFilter;
  });

  // Create Form
  if (showCreateForm) {
    return (
      <div>
        <button
          onClick={() => setShowCreateForm(false)}
          className="flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminProducts.backToProducts')}
        </button>

        <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-2xl">
          <h2 className="font-heading text-2xl font-bold text-text-primary mb-6">{t('adminProducts.createProduct')}</h2>
          
          <form onSubmit={createProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.name')} *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.category')} *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-stone-200"
                required
              >
                <option value="">{t('adminProducts.form.selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.description')} *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-stone-200 min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.price')} *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.countryOrigin')} *</label>
                <Input
                  value={formData.country_origin}
                  onChange={(e) => setFormData({ ...formData, country_origin: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.imageUrl')}</label>
              <Input
                value={formData.images[0]}
                onChange={(e) => setFormData({ ...formData, images: [e.target.value] })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.ingredients')}</label>
              <Input
                value={formData.ingredientsStr || ''}
                onChange={(e) => setFormData({ ...formData, ingredientsStr: e.target.value })}
                placeholder={t('adminProducts.form.ingredientsPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.allergens')}</label>
              <Input
                value={formData.allergensStr || ''}
                onChange={(e) => setFormData({ ...formData, allergensStr: e.target.value })}
                placeholder={t('adminProducts.form.allergensPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('adminProducts.form.certifications')}</label>
              <Input
                value={formData.certificationsStr || ''}
                onChange={(e) => setFormData({ ...formData, certificationsStr: e.target.value })}
                placeholder={t('adminProducts.form.certificationsPlaceholder')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="bg-primary">{t('adminProducts.createProduct')}</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List View
  return (
    <>
      <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
            {t('adminProducts.title')}
          </h1>
          <p className="text-text-muted">{t('adminProducts.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-primary" data-testid="create-product">
          <Plus className="w-4 h-4 mr-2" /> {t('adminProducts.createProduct')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder={t('adminProducts.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-stone-200 bg-white"
          data-testid="status-filter"
        >
          <option value="all">{t('adminProducts.allProducts')}</option>
          <option value="pending">{t('adminProducts.pendingApproval')}</option>
          <option value="approved">{t('adminProducts.approved')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">{t('common.loading')}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-text-muted">{t('adminProducts.noProductsFound')}</div>
        ) : (
          <table className="w-full" data-testid="products-table">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducts.table.product')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducts.table.producer')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducts.table.price')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducts.table.status')}</th>
                <th scope="col" className="text-right px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducts.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredProducts.map((product) => (
                <tr key={product.product_id} className="hover:bg-stone-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{product.name}</p>
                        <p className="text-sm text-text-muted">{product.country_origin}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-text-primary">{product.producer_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    {editingProduct === product.product_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={product.price}
                          className="w-24"
                          id={`price-${product.product_id}`}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById(`price-${product.product_id}`);
                            updatePrice(product.product_id, parseFloat(input.value));
                          }}
                        >
                          {t('common.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProduct(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{product.price?.toFixed(2)}€</span>
                        <button
                          onClick={() => setEditingProduct(product.product_id)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`${t('common.edit')} ${t('adminProducts.table.price')}`}
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      product.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {product.approved ? t('adminProducts.table.approved') : t('adminProducts.table.pending')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!product.approved && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openApprovalChecklist(product)}
                          aria-label={`${t('adminProducts.table.pending')} — ${product.name}`}
                          data-testid={`approve-${product.product_id}`}
                        >
                          <ClipboardList className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                      {product.approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-600"
                          onClick={() => approveProduct(product.product_id, false)}
                          aria-label={`${t('adminProducts.messages.productRejected')} — ${product.name}`}
                        >
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => deleteProduct(product.product_id)}
                        aria-label={`${t('adminProducts.messages.confirmDelete')} — ${product.name}`}
                        data-testid={`delete-${product.product_id}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

    {/* Approval Checklist Modal */}
    {checklistProduct && (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-title"
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="w-6 h-6 text-amber-600" aria-hidden="true" />
            <h2 id="checklist-title" className="text-lg font-semibold text-primary">Checklist de Aprobación</h2>
          </div>
          <p className="text-sm text-text-muted mb-5">
            Verifica que el producto <strong>{checklistProduct.name}</strong> cumple todos los requisitos antes de aprobar.
          </p>
          <div className="space-y-3 mb-6">
            {[
              { key: 'photos', label: 'Al menos 1 foto del producto', auto: true },
              { key: 'description', label: 'Descripción completa (mín. 20 caracteres)', auto: true },
              { key: 'country', label: 'País de origen indicado', auto: true },
              { key: 'ingredients', label: 'Ingredientes listados', auto: true },
              { key: 'allergens', label: 'Alérgenos revisados (campo presente)', auto: true },
              { key: 'certifications', label: 'Certificaciones o normativas adjuntas', auto: true },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checklistItems[key]}
                  onChange={(e) => setChecklistItems(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-green-600"
                />
                <span className={`text-sm ${checklistItems[key] ? 'text-primary' : 'text-text-muted'}`}>
                  {label}
                  {checklistItems[key] === false && <span className="ml-1 text-amber-500 text-xs">(falta)</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40"
              disabled={!Object.values(checklistItems).every(Boolean)}
              onClick={() => approveProduct(checklistProduct.product_id, true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprobar Producto
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setChecklistProduct(null)}
            >
              Cancelar
            </Button>
          </div>
          {!Object.values(checklistItems).every(Boolean) && (
            <p className="text-xs text-amber-600 mt-3 text-center">
              Marca todos los ítems para poder aprobar
            </p>
          )}
        </div>
      </div>
    )}
    </>
  );
}
