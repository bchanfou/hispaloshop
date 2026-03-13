import React, { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { Plus, Edit, ArrowLeft, Eye, CheckCircle, Clock, XCircle, Upload, X, Image as ImageIcon, Loader2, Package, AlertTriangle, Layers, Globe, Trash2, List, Apple, Award, ChevronDown } from 'lucide-react';
import VariantPackManager from './VariantPackManager';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../features/products/queries';
import {
  useProducerImageUpload,
  useProducerProductMutations,
  useProducerProducts,
} from '../../features/producer/hooks';
import { asNumber } from '../../utils/safe';



const statusIcons = {
  approved: <CheckCircle className="w-4 h-4 text-green-600" />,
  pending: <Clock className="w-4 h-4 text-amber-600" />,
  rejected: <XCircle className="w-4 h-4 text-red-600" />
};

// Image Upload Component
function ImageUploader({ images, setImages, maxImages = 3, t }) {
  const fileInputRef = useRef(null);
  const { uploadImage, uploading } = useProducerImageUpload();

  // Helper to normalize images array
  const normalizeImages = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(img => img && typeof img === 'string' && img.trim());
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Check if we can add more images (normalize first)
    const normalizedImages = normalizeImages(images);
    const currentCount = normalizedImages.length;
    const availableSlots = maxImages - currentCount;
    
    if (availableSlots <= 0) {
      toast.error(t('producerProducts.maxImagesError', { max: maxImages }));
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    try {
      for (const file of filesToUpload) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(t('producerProducts.notAnImage', { name: file.name }), { duration: 3000 });
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(t('producerProducts.fileTooLarge', { name: file.name }), { duration: 3000 });
          continue;
        }

        // Upload file
        try {
          const imageUrl = await uploadImage(file);
          setImages(prev => {
            const normalizedPrev = Array.isArray(prev) ? prev.filter(img => img && typeof img === 'string' && img.trim()) : [];
            return [...normalizedPrev, imageUrl];
          });

          toast.success(t('producerProducts.uploadSuccess'), { duration: 2000 });
        } catch (uploadError) {
          console.error('Upload error for file:', file.name, uploadError);
          toast.error(
            uploadError?.message || t('producerProducts.uploadFailed'),
            { duration: 4000 }
          );
        }
      }
    } catch (error) {
      console.error('Upload process error:', error);
      toast.error(t('producerProducts.uploadFailed'), { duration: 4000 });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.filter((_, index) => index !== indexToRemove);
    });
  };

  // Normalize images to always be an array
  const normalizedImages = Array.isArray(images) ? images : [];
  const currentCount = normalizedImages.filter(img => img && typeof img === 'string' && img.trim()).length;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-secondary mb-1">
        {t('producerProducts.imagesCount', { current: currentCount, max: maxImages })}
      </label>
      
      {/* Image Preview Grid */}
      <div className="flex flex-wrap gap-3">
        {normalizedImages.filter(img => img && typeof img === 'string' && img.trim()).map((image, index) => (
          <div 
            key={index} 
            className="relative group w-24 h-24 rounded-lg overflow-hidden border border-stone-200 bg-stone-50"
          >
            <img 
              src={image} 
              alt={`Product ${index + 1}`} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f5f5f4" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23a8a29e" font-size="12">Error</text></svg>';
              }}
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {/* Upload Button */}
        {currentCount < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-stone-300 hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-xs">{t('producerProducts.upload')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-text-muted">
        {t('producerProducts.imagesSupported')}
      </p>
    </div>
  );
}

// Stock Editor Component
function StockEditor({ productId, currentStock, isLowStock, isOutOfStock, onUpdate, t }) {
  const [editing, setEditing] = useState(false);
  const [stock, setStock] = useState(currentStock);
  const { updateStock, updateStockLoading } = useProducerProductMutations();

  const handleSave = async () => {
    if (stock < 0) {
      toast.error(t('producerProducts.stockNegative'));
      return;
    }
    
    try {
      await updateStock({ productId, stock });
      toast.success(t('producerProducts.stockUpdated'));
      setEditing(false);
      onUpdate();
    } catch (error) {
      toast.error(error?.message || t('producerProducts.stockError'));
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-20 h-8 text-sm"
          data-testid={`stock-input-${productId}`}
        />
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={updateStockLoading}
          className="h-8 px-2"
        >
          {updateStockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => { setEditing(false); setStock(currentStock); }}
          className="h-8 px-2"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isOutOfStock 
          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
          : isLowStock 
          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
      }`}
      data-testid={`stock-badge-${productId}`}
    >
      {isOutOfStock ? (
        <>
          <AlertTriangle className="w-4 h-4" />
          {t('producerProducts.outOfStock')}
        </>
      ) : isLowStock ? (
        <>
          <AlertTriangle className="w-4 h-4" />
          {currentStock} {t('producerProducts.left')}
        </>
      ) : (
        <>
          <Package className="w-4 h-4" />
          {currentStock}
        </>
      )}
    </button>
  );
}

export default function ProducerProducts() {
  const { t } = useTranslation();
  const { products, loading, refetchProducts } = useProducerProducts();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data || [];
  const { saveProduct, saveProductLoading } = useProducerProductMutations();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [variantManagerProduct, setVariantManagerProduct] = useState(null);
  
  // Enhanced form data with new fields
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    images: [],
    country_origin: '',
    // New structured fields
    ingredients: [], // Array of {name: '', origin: ''}
    allergens: [],
    certifications: [],
    sku: '',
    flavor: '',
    parent_product_id: '',
    // Nutritional info per 100g
    nutritional_info: {
      calories: '',
      protein: '',
      carbohydrates: '',
      sugars: '',
      fat: '',
      saturated_fat: '',
      fiber: '',
      sodium: '',
      salt: ''
    },
    // Packs configuration
    packs: [], // Array of {quantity: number, price: number, label: ''}
    // Shipping configuration
    shipping_cost: '',
    free_shipping_min_qty: ''
  });
  
  // Legacy string fields for backward compatibility
  const [ingredientsStr, setIngredientsStr] = useState('');
  const [allergensStr, setAllergensStr] = useState('');
  const [certificationsStr, setCertificationsStr] = useState('');
  
  // Collapsible form sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    images: true,
    packs: false,
    ingredients: false,
    nutrition: false,
    allergens: false,
    certifications: false,
  });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Country options for origin dropdown
  const countryOriginOptions = [
    { code: 'ES', name: 'España' }, { code: 'IT', name: 'Italia' },
    { code: 'FR', name: 'Francia' }, { code: 'PT', name: 'Portugal' },
    { code: 'DE', name: 'Alemania' }, { code: 'GR', name: 'Grecia' },
    { code: 'NL', name: 'Paises Bajos' }, { code: 'BE', name: 'Belgica' },
    { code: 'GB', name: 'Reino Unido' }, { code: 'CH', name: 'Suiza' },
    { code: 'AT', name: 'Austria' }, { code: 'PL', name: 'Polonia' },
    { code: 'IE', name: 'Irlanda' }, { code: 'SE', name: 'Suecia' },
    { code: 'DK', name: 'Dinamarca' }, { code: 'NO', name: 'Noruega' },
    { code: 'TR', name: 'Turquia' }, { code: 'US', name: 'Estados Unidos' },
    { code: 'CA', name: 'Canadá' }, { code: 'MX', name: 'México' },
    { code: 'CO', name: 'Colombia' }, { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' }, { code: 'PE', name: 'Peru' },
    { code: 'BR', name: 'Brasil' }, { code: 'EC', name: 'Ecuador' },
    { code: 'JP', name: 'Japón' }, { code: 'KR', name: 'Corea del Sur' },
    { code: 'CN', name: 'China' }, { code: 'IN', name: 'India' },
    { code: 'TH', name: 'Tailandia' }, { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'Nueva Zelanda' }, { code: 'MA', name: 'Marruecos' },
    { code: 'IL', name: 'Israel' }, { code: 'ZA', name: 'Sudafrica' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Normalize images array before sending
      const normalizedImages = Array.isArray(formData.images) 
        ? formData.images.filter(img => img && typeof img === 'string' && img.trim()) 
        : [];
      
      // Build nutritional info object (only include non-empty values)
      const nutritionalInfo = {};
      Object.entries(formData.nutritional_info).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          nutritionalInfo[key] = parseFloat(value);
        }
      });
      
      // Process packs - calculate discount percentages
      const packsData = formData.packs.filter(p => p.quantity && p.price).map(pack => ({
        quantity: parseInt(pack.quantity),
        price: parseFloat(pack.price),
        label: pack.label || `Pack de ${pack.quantity}`
      }));
      
      const data = {
        name: formData.name,
        category_id: formData.category_id,
        description: formData.description,
        price: parseFloat(formData.price),
        images: normalizedImages,
        country_origin: formData.country_origin,
        // Use structured data or fall back to comma-separated strings
        ingredients: formData.ingredients.length > 0 
          ? formData.ingredients.map(i => i.name || i).filter(Boolean)
          : ingredientsStr.split(',').map(i => i.trim()).filter(Boolean),
        allergens: formData.allergens.length > 0
          ? formData.allergens
          : allergensStr.split(',').map(a => a.trim()).filter(Boolean),
        certifications: formData.certifications.length > 0
          ? formData.certifications
          : certificationsStr.split(',').map(c => c.trim()).filter(Boolean),
        // New fields
        sku: formData.sku || null,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : null,
        flavor: formData.flavor || null,
        parent_product_id: formData.parent_product_id || null,
        packs: packsData.length > 0 ? packsData : null,
        // Shipping fields
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
        free_shipping_min_qty: formData.free_shipping_min_qty ? parseInt(formData.free_shipping_min_qty) : null
      };

      await saveProduct({
        productId: editingProduct?.product_id,
        payload: data,
      });
      toast.success(editingProduct ? t('producerProducts.productUpdated') : t('producerProducts.productCreated'));
      setShowCreateForm(false);
      setEditingProduct(null);
      resetForm();
      await refetchProducts();
    } catch (error) {
      toast.error(error?.message || t('producerProducts.saveError'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      description: '',
      price: '',
      images: [],
      country_origin: '',
      ingredients: [],
      allergens: [],
      certifications: [],
      sku: '',
      flavor: '',
      parent_product_id: '',
      nutritional_info: {
        calories: '',
        protein: '',
        carbohydrates: '',
        sugars: '',
        fat: '',
        saturated_fat: '',
        fiber: '',
        sodium: '',
        salt: ''
      },
      packs: [],
      shipping_cost: '',
      free_shipping_min_qty: ''
    });
    setIngredientsStr('');
    setAllergensStr('');
    setCertificationsStr('');
  };

  const startEdit = (product) => {
    if (product.approved) {
      toast.error(t('producerProducts.cannotEditApproved'));
      return;
    }
    setEditingProduct(product);
    // Normalize images to always be an array
    const productImages = Array.isArray(product.images) 
      ? product.images.filter(img => img && typeof img === 'string' && img.trim()) 
      : [];
    
    // Load existing data
    setFormData({
      name: product.name,
      category_id: product.category_id,
      description: product.description,
      price: product.price.toString(),
      images: productImages,
      country_origin: product.country_origin,
      ingredients: product.ingredients?.map(i => typeof i === 'string' ? {name: i, origin: ''} : i) || [],
      allergens: product.allergens || [],
      certifications: product.certifications || [],
      sku: product.sku || '',
      flavor: product.flavor || '',
      parent_product_id: product.parent_product_id || '',
      nutritional_info: product.nutritional_info || {
        calories: '',
        protein: '',
        carbohydrates: '',
        sugars: '',
        fat: '',
        saturated_fat: '',
        fiber: '',
        sodium: '',
        salt: ''
      },
      packs: product.packs || [],
      shipping_cost: product.shipping_cost?.toString() || '',
      free_shipping_min_qty: product.free_shipping_min_qty?.toString() || ''
    });
    
    // Set legacy strings for backward compatibility
    setIngredientsStr(product.ingredients?.join(', ') || '');
    setAllergensStr(product.allergens?.join(', ') || '');
    setCertificationsStr(product.certifications?.join(', ') || '');
    setShowCreateForm(true);
  };

  // Form View
  if (showCreateForm) {
    // Helper to add ingredient
    const addIngredient = () => {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, { name: '', origin: '' }]
      });
    };
    
    // Helper to remove ingredient
    const removeIngredient = (index) => {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData({ ...formData, ingredients: newIngredients });
    };
    
    // Helper to update ingredient
    const updateIngredient = (index, field, value) => {
      const newIngredients = [...formData.ingredients];
      newIngredients[index] = { ...newIngredients[index], [field]: value };
      setFormData({ ...formData, ingredients: newIngredients });
    };
    
    // Helper to add pack
    const addPack = () => {
      setFormData({
        ...formData,
        packs: [...formData.packs, { quantity: '', price: '', label: '' }]
      });
    };
    
    // Helper to remove pack
    const removePack = (index) => {
      const newPacks = formData.packs.filter((_, i) => i !== index);
      setFormData({ ...formData, packs: newPacks });
    };
    
    // Helper to update pack
    const updatePack = (index, field, value) => {
      const newPacks = [...formData.packs];
      newPacks[index] = { ...newPacks[index], [field]: value };
      setFormData({ ...formData, packs: newPacks });
    };
    
    // Calculate pack discount
    const calculatePackDiscount = (pack) => {
      if (!formData.price || !pack.quantity || !pack.price) return null;
      const unitPrice = parseFloat(formData.price);
      const expectedTotal = unitPrice * parseInt(pack.quantity);
      const actualPrice = parseFloat(pack.price);
      if (expectedTotal > actualPrice) {
        return Math.round(((expectedTotal - actualPrice) / expectedTotal) * 100);
      }
      return null;
    };
    
    // Nutritional info field config
    const nutritionalFields = [
      { key: 'calories', label: t('producerProducts.nutritionLabels.calories'), unit: 'kcal' },
      { key: 'protein', label: t('producerProducts.nutritionLabels.protein'), unit: 'g' },
      { key: 'carbohydrates', label: t('producerProducts.nutritionLabels.carbohydrates'), unit: 'g' },
      { key: 'sugars', label: t('producerProducts.nutritionLabels.sugars'), unit: 'g' },
      { key: 'fat', label: t('producerProducts.nutritionLabels.fat'), unit: 'g' },
      { key: 'saturated_fat', label: t('producerProducts.nutritionLabels.saturated_fat'), unit: 'g' },
      { key: 'fiber', label: t('producerProducts.nutritionLabels.fiber'), unit: 'g' },
      { key: 'sodium', label: t('producerProducts.nutritionLabels.sodium'), unit: 'mg' },
      { key: 'salt', label: t('producerProducts.nutritionLabels.salt'), unit: 'g' }
    ];
    
    // Common allergens
    const commonAllergens = [
      { key: 'gluten', label: t('producerProducts.commonAllergens.gluten') },
      { key: 'dairy', label: t('producerProducts.commonAllergens.dairy') },
      { key: 'egg', label: t('producerProducts.commonAllergens.egg') },
      { key: 'nuts', label: t('producerProducts.commonAllergens.nuts') },
      { key: 'peanuts', label: t('producerProducts.commonAllergens.peanuts') },
      { key: 'soy', label: t('producerProducts.commonAllergens.soy') },
      { key: 'fish', label: t('producerProducts.commonAllergens.fish') },
      { key: 'shellfish', label: t('producerProducts.commonAllergens.shellfish') },
      { key: 'celery', label: t('producerProducts.commonAllergens.celery') },
      { key: 'mustard', label: t('producerProducts.commonAllergens.mustard') },
      { key: 'sesame', label: t('producerProducts.commonAllergens.sesame') },
      { key: 'sulfites', label: t('producerProducts.commonAllergens.sulfites') },
      { key: 'lupin', label: t('producerProducts.commonAllergens.lupin') },
      { key: 'mollusks', label: t('producerProducts.commonAllergens.mollusks') }
    ];
    
    // Common certifications
    const commonCertifications = [
      { key: 'organic', label: t('producerProducts.commonCertifications.organic') },
      { key: 'vegan', label: t('producerProducts.commonCertifications.vegan') },
      { key: 'glutenFree', label: t('producerProducts.commonCertifications.glutenFree') },
      { key: 'kosher', label: t('producerProducts.commonCertifications.kosher') },
      { key: 'halal', label: t('producerProducts.commonCertifications.halal') },
      { key: 'bio', label: t('producerProducts.commonCertifications.bio') },
      { key: 'fairTrade', label: t('producerProducts.commonCertifications.fairTrade') },
      { key: 'dop', label: t('producerProducts.commonCertifications.dop') }
    ];
    
    return (
      <div className="pb-8">
        <button
          onClick={() => { setShowCreateForm(false); setEditingProduct(null); resetForm(); }}
          className="flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('producerProducts.backToProducts')}
        </button>

        <div className="bg-white rounded-xl border border-stone-200 p-4 md:p-6 max-w-3xl">
          <h2 className="font-heading text-2xl font-bold text-text-primary mb-6">
            {editingProduct ? t('producerProducts.editProduct') : t('producerProducts.createNewProduct')}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* === BASIC INFO SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('basic')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('producerProducts.basicInfo')}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.basic ? 'rotate-180' : ''}`} />
              </button>
              {openSections.basic && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.productName')} *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('producerProducts.productNamePlaceholder')}
                      required
                      data-testid="product-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.category')} *</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm"
                      required
                      data-testid="product-category-select"
                    >
                      <option value="">{t('producerProducts.selectCategory')}</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.description')} *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 min-h-[80px] text-sm"
                    placeholder={t('producerProducts.descriptionPlaceholder')}
                    required
                    data-testid="product-description-input"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.unitPrice')} *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                      data-testid="product-price-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.countryOrigin')} *</label>
                    <select
                      value={formData.country_origin}
                      onChange={(e) => setFormData({ ...formData, country_origin: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm"
                      required
                      data-testid="product-country-input"
                    >
                      <option value="">{t('producerProducts.selectCountry', 'Seleccionar pais')}</option>
                      {countryOriginOptions.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.sku')}</label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder={t('producerProducts.skuPlaceholder')}
                      data-testid="product-sku-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('producerProducts.flavorVariant')}</label>
                    <Input
                      value={formData.flavor}
                      onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                      placeholder={t('producerProducts.flavorPlaceholder')}
                      data-testid="product-flavor-input"
                    />
                  </div>
                </div>

                {/* Shipping Config — inline */}
                <div className="pt-3 border-t border-stone-100">
                  <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {t('producerProducts.shippingConfig')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        {t('producerProducts.shippingCost')}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.shipping_cost}
                        onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                        placeholder={t('producerProducts.shippingCostPlaceholder')}
                        data-testid="product-shipping-cost-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">
                        {t('producerProducts.freeShippingFrom')}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.free_shipping_min_qty}
                        onChange={(e) => setFormData({ ...formData, free_shipping_min_qty: e.target.value })}
                        placeholder="3"
                        data-testid="product-free-shipping-qty-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* === IMAGES SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('images')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t('producerProducts.productImages')}
                  {formData.images.length > 0 && <span className="text-xs text-stone-400">({formData.images.length})</span>}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.images ? 'rotate-180' : ''}`} />
              </button>
              {openSections.images && (
              <div className="p-4">
                <ImageUploader 
                  images={formData.images} 
                  setImages={(newImages) => {
                    if (typeof newImages === 'function') {
                      setFormData(prev => ({ ...prev, images: newImages(prev.images) }));
                    } else {
                      setFormData(prev => ({ ...prev, images: newImages }));
                    }
                  }}
                  maxImages={5}
                  t={t}
                />
              </div>
              )}
            </div>

            {/* === PACKS SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('packs')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {t('producerProducts.packsOffers')}
                  {formData.packs.length > 0 && <span className="text-xs text-emerald-600 font-semibold">({formData.packs.length})</span>}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.packs ? 'rotate-180' : ''}`} />
              </button>
              {openSections.packs && (
              <div className="p-4">
                <div className="flex justify-end mb-3">
                  <button type="button" onClick={addPack} className="text-sm text-primary hover:underline flex items-center gap-1" data-testid="add-pack-btn">
                    <Plus className="w-4 h-4" /> {t('producerProducts.addPack')}
                  </button>
                </div>
                {formData.packs.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-3">
                    {t('producerProducts.noPacksConfigured')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.packs.map((pack, index) => {
                      const discount = calculatePackDiscount(pack);
                      return (
                        <div key={index} className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-lg">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-text-secondary mb-0.5">{t('producerProducts.packQuantity')}</label>
                              <Input type="number" min="2" value={pack.quantity} onChange={(e) => updatePack(index, 'quantity', e.target.value)} placeholder="6" data-testid={`pack-quantity-${index}`} />
                            </div>
                            <div>
                              <label className="block text-xs text-text-secondary mb-0.5">{t('producerProducts.packPrice')}</label>
                              <Input type="number" step="0.01" min="0" value={pack.price} onChange={(e) => updatePack(index, 'price', e.target.value)} placeholder="50.00" data-testid={`pack-price-${index}`} />
                            </div>
                            <div>
                              <label className="block text-xs text-text-secondary mb-0.5">{t('producerProducts.packLabel')}</label>
                              <Input value={pack.label} onChange={(e) => updatePack(index, 'label', e.target.value)} placeholder={`Pack de ${pack.quantity || 'X'}`} data-testid={`pack-label-${index}`} />
                            </div>
                          </div>
                          {discount && <div className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">-{discount}%</div>}
                          <button type="button" onClick={() => removePack(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" data-testid={`remove-pack-${index}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* === INGREDIENTS SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('ingredients')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <List className="w-4 h-4" />
                  {t('producerProducts.ingredients')}
                  {formData.ingredients.length > 0 && <span className="text-xs text-stone-400">({formData.ingredients.length})</span>}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.ingredients ? 'rotate-180' : ''}`} />
              </button>
              {openSections.ingredients && (
              <div className="p-4">
                <div className="flex justify-end mb-2">
                  <button type="button" onClick={addIngredient} className="text-sm text-primary hover:underline flex items-center gap-1" data-testid="add-ingredient-btn">
                    <Plus className="w-4 h-4" /> {t('producerProducts.addIngredient')}
                  </button>
                </div>
                {formData.ingredients.length === 0 ? (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">{t('producerProducts.ingredientsSeparated')}</p>
                    <Input
                      value={ingredientsStr}
                      onChange={(e) => setIngredientsStr(e.target.value)}
                      placeholder={t('producerProducts.ingredientsPlaceholder')}
                      data-testid="ingredients-text-input"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={ingredient.name} onChange={(e) => updateIngredient(index, 'name', e.target.value)} placeholder={t('producerProducts.ingredientName')} className="flex-1" data-testid={`ingredient-name-${index}`} />
                        <Input value={ingredient.origin} onChange={(e) => updateIngredient(index, 'origin', e.target.value)} placeholder={t('producerProducts.ingredientOrigin')} className="w-28" data-testid={`ingredient-origin-${index}`} />
                        <button type="button" onClick={() => removeIngredient(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" data-testid={`remove-ingredient-${index}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* === NUTRITIONAL INFO SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('nutrition')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <Apple className="w-4 h-4" />
                  {t('producerProducts.nutritionalInfo')}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.nutrition ? 'rotate-180' : ''}`} />
              </button>
              {openSections.nutrition && (
              <div className="p-4">
                <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                  {nutritionalFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-text-secondary mb-0.5">
                        {field.label} <span className="text-stone-400">({field.unit})</span>
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.nutritional_info[field.key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          nutritional_info: { ...formData.nutritional_info, [field.key]: e.target.value }
                        })}
                        placeholder="0"
                        data-testid={`nutrition-${field.key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* === ALLERGENS SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('allergens')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('producerProducts.allergens')}
                  {formData.allergens.length > 0 && <span className="text-xs text-red-600 font-semibold">({formData.allergens.length})</span>}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.allergens ? 'rotate-180' : ''}`} />
              </button>
              {openSections.allergens && (
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {commonAllergens.map((allergen) => {
                    const isSelected = formData.allergens.includes(allergen.label);
                    return (
                      <button
                        key={allergen.key}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({ ...formData, allergens: formData.allergens.filter(a => a !== allergen.label) });
                          } else {
                            setFormData({ ...formData, allergens: [...formData.allergens, allergen.label] });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          isSelected 
                            ? 'bg-red-100 border-red-300 text-red-800' 
                            : 'bg-white border-stone-200 text-text-secondary hover:border-stone-300'
                        }`}
                        data-testid={`allergen-${allergen.key}`}
                      >
                        {allergen.label}
                      </button>
                    );
                  })}
                </div>
                <Input
                  value={allergensStr}
                  onChange={(e) => setAllergensStr(e.target.value)}
                  placeholder={t('producerProducts.otherAllergensPlaceholder')}
                  data-testid="allergens-text-input"
                />
              </div>
              )}
            </div>

            {/* === CERTIFICATIONS SECTION (collapsible) === */}
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggleSection('certifications')} className="w-full bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {t('producerProducts.certifications')}
                  {formData.certifications.length > 0 && <span className="text-xs text-emerald-600 font-semibold">({formData.certifications.length})</span>}
                </h3>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openSections.certifications ? 'rotate-180' : ''}`} />
              </button>
              {openSections.certifications && (
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {commonCertifications.map((cert) => {
                    const isSelected = formData.certifications.includes(cert.label);
                    return (
                      <button
                        key={cert.key}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({ ...formData, certifications: formData.certifications.filter(c => c !== cert.label) });
                          } else {
                            setFormData({ ...formData, certifications: [...formData.certifications, cert.label] });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          isSelected 
                            ? 'bg-green-100 border-green-300 text-green-800' 
                            : 'bg-white border-stone-200 text-text-secondary hover:border-stone-300'
                        }`}
                        data-testid={`cert-${cert.key}`}
                      >
                        {cert.label}
                      </button>
                    );
                  })}
                </div>
                <Input
                  value={certificationsStr}
                  onChange={(e) => setCertificationsStr(e.target.value)}
                  placeholder={t('producerProducts.otherCertificationsPlaceholder')}
                  data-testid="certifications-text-input"
                />
              </div>
              )}
            </div>

            {/* === SUBMIT === */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>{t('common.note')}:</strong> {t('producerProducts.approvalNote')}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saveProductLoading} data-testid="submit-product-btn">
                {editingProduct ? t('producerProducts.updateProduct') : t('producerProducts.createProduct')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowCreateForm(false); setEditingProduct(null); resetForm(); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary mb-1">
            {t('producerProducts.title')}
          </h1>
          <p className="text-text-muted text-sm">{t('producerProducts.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="shrink-0" data-testid="create-product">
          <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">{t('producerProducts.createProduct')}</span><span className="sm:hidden">Crear</span>
        </Button>
      </div>

      {/* Products */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">{t('common.loading')}</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-muted mb-4">{t('producerProducts.noProductsYet')}</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> {t('producerProducts.createFirstProduct')}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-stone-200">
              {products.map((product) => {
                const stock = product.stock ?? 100;
                const lowThreshold = product.low_stock_threshold ?? 5;
                const trackStock = product.track_stock !== false;
                const isLowStock = trackStock && stock <= lowThreshold && stock > 0;
                const isOutOfStock = trackStock && stock <= 0;
                const variantCount = product.variants?.length || 0;

                return (
                  <div key={product.product_id} className="p-4 space-y-3" data-testid={`product-card-${product.product_id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{product.name}</p>
                        <p className="text-sm text-text-muted">{product.country_origin}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-semibold text-text-primary">${asNumber(product.price).toFixed(2)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${product.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {product.approved ? t('producerProducts.table.approved') : t('producerProducts.table.pending')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <span>Stock: <strong className={isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-text-primary'}>{stock}</strong></span>
                      {variantCount > 0 && <span>· {variantCount} variantes</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => window.open(`/products/${product.product_id}`, '_blank')} data-testid={`view-product-${product.product_id}`}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                      </Button>
                      {!product.approved && (
                        <Button size="sm" onClick={() => startEdit(product)} data-testid={`edit-product-${product.product_id}`}>
                          <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => window.open(`/producer/products/${product.product_id}/countries`, '_self')}>
                        <Globe className="w-3.5 h-3.5 mr-1" /> Países
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setVariantManagerProduct(product)} data-testid={`manage-variants-mobile-${product.product_id}`}>
                        <Layers className="w-3.5 h-3.5 mr-1" /> Variantes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout */}
            <table className="w-full hidden md:table" data-testid="products-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('producerProducts.table.product')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('producerProducts.table.price')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('producerProducts.table.stock')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('producerProducts.table.variants')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('producerProducts.table.status')}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">{t('producerProducts.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {products.map((product) => {
                  const stock = product.stock ?? 100;
                  const lowThreshold = product.low_stock_threshold ?? 5;
                  const trackStock = product.track_stock !== false;
                  const isLowStock = trackStock && stock <= lowThreshold && stock > 0;
                  const isOutOfStock = trackStock && stock <= 0;
                  const variantCount = product.variants?.length || 0;
                  const packCount = product.variants?.reduce((sum, v) => sum + (v.packs?.length || 0), 0) || 0;
                  
                  return (
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
                      <p className="font-medium text-text-primary">${asNumber(product.price).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StockEditor 
                        productId={product.product_id} 
                        currentStock={stock}
                        isLowStock={isLowStock}
                        isOutOfStock={isOutOfStock}
                        onUpdate={refetchProducts}
                        t={t}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setVariantManagerProduct(product)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          variantCount > 0
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                            : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                        }`}
                        data-testid={`manage-variants-${product.product_id}`}
                      >
                        <Layers className="w-4 h-4" />
                        {variantCount > 0 ? (
                          <span>{t('producerProducts.table.varPacks', { vars: variantCount, packs: packCount })}</span>
                        ) : (
                          <span>{t('producerProducts.table.addVariants')}</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {statusIcons[product.approved ? 'approved' : 'pending']}
                        <span className={`text-sm font-medium ${product.approved ? 'text-green-600' : 'text-amber-600'}`}>
                          {product.approved ? t('producerProducts.table.approved') : t('producerProducts.table.pending')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(`/producer/products/${product.product_id}/countries`, '_self')}
                          title={t('producer.manageCountries')}
                        >
                          <Globe className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.open(`/products/${product.product_id}`, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!product.approved && (
                          <Button
                            size="sm"
                            onClick={() => startEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Variant/Pack Manager Modal */}
      {variantManagerProduct && (
        <VariantPackManager
          product={variantManagerProduct}
          onClose={() => setVariantManagerProduct(null)}
          onUpdate={refetchProducts}
        />
      )}
    </div>
  );
}
