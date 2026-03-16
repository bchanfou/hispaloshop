import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  Search, CheckCircle, XCircle, Trash2, Edit, ArrowLeft, Plus,
  Package, DollarSign, ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asLowerText, asNumber } from '../../utils/safe';
import FocusTrap from 'focus-trap-react';



export default function AdminProducts() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checklistProduct, setChecklistProduct] = useState(null); // product pending checklist approval
  const [checklistItems, setChecklistItems] = useState({});
  const [editingPrice, setEditingPrice] = useState({ productId: null, value: '' });
  const [selectedProducts, setSelectedProducts] = useState([]);
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
      const data = await apiClient.get('/admin/products');
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get('/categories');
      setCategories(data);
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
      await apiClient.put(`/admin/products/${productId}/approve?approved=${approved}`, {});
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
      await apiClient.delete(`/products/${productId}`);
      toast.success(t('adminProducts.messages.productDeleted'));
      fetchProducts();
    } catch (error) {
      toast.error(t('adminProducts.messages.deleteError'));
    }
  };

  const updatePrice = async (productId, price) => {
    try {
      await apiClient.put(`/admin/products/${productId}/price?price=${price}`, {});
      toast.success(t('adminProducts.messages.priceUpdated'));
      fetchProducts();
      setEditingPrice({ productId: null, value: '' });
    } catch (error) {
      toast.error(t('adminProducts.messages.priceError'));
    }
  };

  const approveSelected = async () => {
    try {
      await Promise.all(selectedProducts.map(id => apiClient.put(`/admin/products/${id}/approve?approved=true`, {})));
      toast.success(`${selectedProducts.length} producto(s) aprobado(s)`);
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      toast.error(t('adminProducts.messages.updateError'));
    }
  };

  const toggleSelectProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
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
      
      await apiClient.post('/products', data);
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
          className="flex items-center gap-2 text-stone-600 hover:text-stone-950 mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminProducts.backToProducts')}
        </button>

        <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-2xl">
          <h2 className="text-2xl font-bold text-stone-950 mb-6">{t('adminProducts.createProduct')}</h2>
          
          <form onSubmit={createProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.name')} *</label>
              <input
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.category')} *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-stone-200"
                required
              >
                <option value="">{t('adminProducts.form.selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.description')} *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.price')} *</label>
                <input
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.countryOrigin')} *</label>
                <input
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                  value={formData.country_origin}
                  onChange={(e) => setFormData({ ...formData, country_origin: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.imageUrl')}</label>
              <input
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                value={formData.images[0]}
                onChange={(e) => setFormData({ ...formData, images: [e.target.value] })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.ingredients')}</label>
              <input
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                value={formData.ingredientsStr || ''}
                onChange={(e) => setFormData({ ...formData, ingredientsStr: e.target.value })}
                placeholder={t('adminProducts.form.ingredientsPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.allergens')}</label>
              <input
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                value={formData.allergensStr || ''}
                onChange={(e) => setFormData({ ...formData, allergensStr: e.target.value })}
                placeholder={t('adminProducts.form.allergensPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('adminProducts.form.certifications')}</label>
              <input
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                value={formData.certificationsStr || ''}
                onChange={(e) => setFormData({ ...formData, certificationsStr: e.target.value })}
                placeholder={t('adminProducts.form.certificationsPlaceholder')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors">{t('adminProducts.createProduct')}</button>
              <button type="button" className="px-4 py-2 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors" onClick={() => setShowCreateForm(false)}>{t('common.cancel')}</button>
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
          <h1 className="text-3xl font-bold text-stone-950 mb-2">
            {t('adminProducts.title')}
          </h1>
          <p className="text-stone-500">{t('adminProducts.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowCreateForm(true)} className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors" data-testid="create-product">
          <Plus className="w-4 h-4 mr-2" /> {t('adminProducts.createProduct')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
            placeholder={t('adminProducts.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="search-input"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-stone-200 bg-white"
          data-testid="status-filter"
        >
          <option value="all">{t('adminProducts.allProducts')}</option>
          <option value="pending">{t('adminProducts.pendingApproval')}</option>
          <option value="approved">{t('adminProducts.approved')}</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedProducts.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-stone-950 rounded-xl">
          <span className="text-sm text-white flex-1">{selectedProducts.length} producto(s) seleccionado(s)</span>
          <button
            onClick={approveSelected}
            className="px-4 py-1.5 bg-white text-stone-950 text-sm font-medium rounded-xl hover:bg-stone-100 transition-colors"
          >
            Aprobar seleccionados ({selectedProducts.length})
          </button>
          <button
            onClick={() => setSelectedProducts([])}
            className="px-3 py-1.5 border border-white/30 text-white text-sm rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">{t('common.loading')}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-stone-500">{t('adminProducts.noProductsFound')}</div>
        ) : (
          <table className="w-full" data-testid="products-table">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th scope="col" className="px-4 py-4 w-10"></th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducts.table.product')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducts.table.producer')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducts.table.price')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducts.table.status')}</th>
                <th scope="col" className="text-right px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducts.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredProducts.map((product) => (
                <tr key={product.product_id} className="hover:bg-stone-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.product_id)}
                      onChange={() => toggleSelectProduct(product.product_id)}
                      className="w-4 h-4 accent-stone-950"
                      aria-label={`Seleccionar ${product.name}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-stone-950">{product.name}</p>
                        <p className="text-sm text-stone-500">{product.country_origin}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-stone-950">{product.producer_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    {editingPrice.productId === product.product_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editingPrice.value}
                          onChange={e => setEditingPrice(prev => ({ ...prev, value: e.target.value }))}
                          className="w-24 px-2 py-1 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                        />
                        <button
                          type="button"
                          className="px-2 py-1 text-xs font-medium bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors"
                          onClick={() => updatePrice(product.product_id, parseFloat(editingPrice.value))}
                        >
                          {t('common.save')}
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                          onClick={() => setEditingPrice({ productId: null, value: '' })}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-950">{asNumber(product.price).toFixed(2)}€</span>
                        <button
                          onClick={() => setEditingPrice({ productId: product.product_id, value: String(product.price) })}
                          className="text-stone-500 hover:text-stone-950"
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
                      product.approved ? 'bg-stone-950 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {product.approved ? t('adminProducts.table.approved') : t('adminProducts.table.pending')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!product.approved && (
                        <button
                          type="button"
                          className="p-1.5 bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors"
                          onClick={() => openApprovalChecklist(product)}
                          aria-label={`${t('adminProducts.table.pending')} — ${product.name}`}
                          data-testid={`approve-${product.product_id}`}
                        >
                          <ClipboardList className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {product.approved && (
                        <button
                          type="button"
                          className="p-1.5 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
                          onClick={() => approveProduct(product.product_id, false)}
                          aria-label={`${t('adminProducts.messages.productRejected')} — ${product.name}`}
                        >
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-1.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl transition-colors"
                        onClick={() => deleteProduct(product.product_id)}
                        aria-label={`${t('adminProducts.messages.confirmDelete')} — ${product.name}`}
                        data-testid={`delete-${product.product_id}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
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
      <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-title"
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="w-6 h-6 text-stone-600" aria-hidden="true" />
            <h2 id="checklist-title" className="text-lg font-semibold text-stone-950">Checklist de Aprobación</h2>
          </div>
          <p className="text-sm text-stone-500 mb-5">
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
                  className="mt-0.5 w-4 h-4 accent-stone-950"
                />
                <span className={`text-sm ${checklistItems[key] ? 'text-stone-950' : 'text-stone-500'}`}>
                  {label}
                  {checklistItems[key] === false && <span className="ml-1 text-stone-500 text-xs">(falta)</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors disabled:opacity-40"
              disabled={!Object.values(checklistItems).every(Boolean)}
              onClick={() => approveProduct(checklistProduct.product_id, true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprobar Producto
            </button>
            <button
              type="button"
              className="flex-1 px-4 py-2 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              onClick={() => setChecklistProduct(null)}
            >
              Cancelar
            </button>
          </div>
          {!Object.values(checklistItems).every(Boolean) && (
            <p className="text-xs text-stone-600 mt-3 text-center">
              Marca todos los ítems para poder aprobar
            </p>
          )}
        </div>
      </div>
      </FocusTrap>
    )}
    </>
  );
}
