// @ts-nocheck
import React, { useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, ArrowLeft, ArrowRight, Eye, CheckCircle, Check, Clock, XCircle, Upload, X, Image as ImageIcon, Loader2, Package, AlertTriangle, Layers, Globe, Trash2, List, Apple, Award, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VariantPackManager from './VariantPackManager';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../features/products/queries';
import {
  useProducerImageUpload,
  useProducerProductMutations,
  useProducerProducts,
} from '../../features/producer/hooks';
import { asNumber } from '../../utils/safe';

/* ── WizardStepper ── */
const WIZARD_STEPS = [
  { key: 'images', label: 'Fotos', icon: ImageIcon },
  { key: 'info', label: 'Info', icon: Package },
  { key: 'composition', label: 'Composición', icon: Apple },
  { key: 'publish', label: 'Publicar', icon: Send },
];

function WizardStepper({ current }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {WIZARD_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`flex-1 h-[2px] transition-colors ${done ? 'bg-stone-950' : 'bg-stone-200'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                  done
                    ? 'bg-stone-950 text-white'
                    : active
                    ? 'bg-stone-950 text-white ring-4 ring-stone-200'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[11px] font-medium ${active || done ? 'text-stone-950' : 'text-stone-400'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}



const statusIcons = {
  approved: <CheckCircle className="w-4 h-4 text-stone-700" />,
  pending: <Clock className="w-4 h-4 text-stone-700" />,
  rejected: <XCircle className="w-4 h-4 text-stone-700" />
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
          toast.error(
            uploadError?.message || t('producerProducts.uploadFailed'),
            { duration: 4000 }
          );
        }
      }
    } catch {
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
      <label className="block text-sm font-medium text-stone-600 mb-1">
        {t('producerProducts.imagesCount', { current: currentCount, max: maxImages })}
      </label>
      
      {/* Image Preview Grid */}
      <div className="flex flex-wrap gap-3">
        {normalizedImages.filter(img => img && typeof img === 'string' && img.trim()).map((image, index) => (
          <div 
            key={index} 
            className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50"
          >
            <img loading="lazy" 
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
              className="absolute top-1 right-1 p-1 bg-stone-950 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Eliminar imagen ${index + 1}`}
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
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-stone-200 hover:border-stone-950 hover:bg-stone-50 transition-colors flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-stone-950 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <p className="text-xs text-stone-500">
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
    const parsedStock = parseInt(stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      toast.error(t('producerProducts.stockNegative'));
      return;
    }

    try {
      await updateStock({ productId, stock: parsedStock });
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
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-20 h-8 text-sm px-3 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
          data-testid={`stock-input-${productId}`}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={updateStockLoading}
          className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors"
        >
          {updateStockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setStock(currentStock); }}
          className="flex items-center px-3 py-1.5 text-sm font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-medium transition-colors ${
        isOutOfStock
          ? 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
          : isLowStock
          ? 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
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
  const [wizardStep, setWizardStep] = useState(0);
  
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
    free_shipping_min_qty: '',
    // Inventory
    stock: '100',
    // B2B wholesale
    b2b_enabled: false,
    b2b_moq: '',
    b2b_tiers: [],
  });

  // Legacy string fields for backward compatibility
  const [ingredientsStr, setIngredientsStr] = useState('');
  const [allergensStr, setAllergensStr] = useState('');
  const [certificationsStr, setCertificationsStr] = useState('');
  
  // (wizard steps replace old collapsible sections)

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

    // Name validation
    if (!formData.name?.trim()) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }

    // Category validation
    if (!formData.category_id) {
      toast.error('Selecciona una categoría');
      return;
    }

    // Country origin validation
    if (!formData.country_origin) {
      toast.error('Selecciona el país de origen');
      return;
    }

    // Price validation
    const parsedPrice = parseFloat(formData.price);
    if (!formData.price || isNaN(parsedPrice) || parsedPrice < 0.01 || parsedPrice > 99999.99) {
      toast.error('El precio debe estar entre 0,01 y 99.999,99 EUR');
      return;
    }

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
        allergens: [
          ...formData.allergens,
          ...allergensStr.split(',').map(a => a.trim()).filter(a => a && !formData.allergens.includes(a)),
        ],
        certifications: [
          ...formData.certifications,
          ...certificationsStr.split(',').map(c => c.trim()).filter(c => c && !formData.certifications.includes(c)),
        ],
        // New fields
        sku: formData.sku || null,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : null,
        flavor: formData.flavor || null,
        parent_product_id: formData.parent_product_id || null,
        packs: packsData.length > 0 ? packsData : null,
        // Shipping fields
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
        free_shipping_min_qty: formData.free_shipping_min_qty ? parseInt(formData.free_shipping_min_qty) : null,
        stock: formData.stock !== '' ? parseInt(formData.stock) : 0,
        // B2B wholesale
        b2b_enabled: formData.b2b_enabled || false,
        b2b_moq: formData.b2b_moq ? parseInt(formData.b2b_moq) : null,
        b2b_tiers: formData.b2b_enabled && formData.b2b_tiers.length > 0
          ? formData.b2b_tiers.filter(t => t.min_quantity && t.unit_price).map(t => ({
              min_quantity: parseInt(t.min_quantity),
              unit_price: parseFloat(t.unit_price),
            }))
          : null,
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
      free_shipping_min_qty: '',
      stock: '100',
      b2b_enabled: false,
      b2b_moq: '',
      b2b_tiers: [],
    });
    setIngredientsStr('');
    setAllergensStr('');
    setCertificationsStr('');
  };

  const startEdit = (product) => {
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
      free_shipping_min_qty: product.free_shipping_min_qty?.toString() || '',
      stock: product.stock?.toString() ?? '0',
      b2b_enabled: product.b2b_enabled || false,
      b2b_moq: product.b2b_moq?.toString() || '',
      b2b_tiers: product.b2b_tiers || [],
    });
    
    // Set legacy strings for backward compatibility
    setIngredientsStr(product.ingredients?.join(', ') || '');
    setAllergensStr(product.allergens?.join(', ') || '');
    setCertificationsStr(product.certifications?.join(', ') || '');
    setWizardStep(0);
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
    
    // 14 EU mandatory allergens (official Spanish names)
    const EU_ALLERGENS = [
      { key: 'gluten',      label: 'Gluten' },
      { key: 'crustaceans', label: 'Crustáceos' },
      { key: 'egg',         label: 'Huevo' },
      { key: 'fish',        label: 'Pescado' },
      { key: 'peanuts',     label: 'Cacahuetes' },
      { key: 'soy',         label: 'Soja' },
      { key: 'dairy',       label: 'Lácteos' },
      { key: 'nuts',        label: 'Frutos de cáscara' },
      { key: 'celery',      label: 'Apio' },
      { key: 'mustard',     label: 'Mostaza' },
      { key: 'sesame',      label: 'Sésamo' },
      { key: 'sulfites',    label: 'Sulfitos' },
      { key: 'lupin',       label: 'Altramuces' },
      { key: 'mollusks',    label: 'Moluscos' },
    ];
    const commonAllergens = EU_ALLERGENS;
    
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
    
    // Wizard step validation
    const canAdvance = (step) => {
      if (step === 0) return formData.images.filter(img => img && typeof img === 'string' && img.trim()).length > 0;
      if (step === 1) return formData.name && formData.category_id && formData.description && formData.price && formData.country_origin;
      if (step === 2) return true; // composition is optional
      return true;
    };

    const handleNext = () => {
      if (!canAdvance(wizardStep)) {
        if (wizardStep === 0) toast.error('Añade al menos una imagen');
        if (wizardStep === 1) toast.error('Completa todos los campos obligatorios');
        return;
      }
      setWizardStep((s) => Math.min(s + 1, 3));
    };
    const handleBack = () => setWizardStep((s) => Math.max(s - 1, 0));

    // Summary data for Step 4
    const normalizedImgs = formData.images.filter(img => img && typeof img === 'string' && img.trim());
    const categoryName = categories.find(c => c.category_id === formData.category_id)?.name || formData.category_id;
    const countryName = countryOriginOptions.find(c => c.code === formData.country_origin)?.name || formData.country_origin;

    return (
      <div className="pb-8">
        <button
          onClick={() => { setShowCreateForm(false); setEditingProduct(null); resetForm(); setWizardStep(0); }}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-950 mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('producerProducts.backToProducts')}
        </button>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-6 max-w-3xl">
          <h2 className="text-2xl font-bold text-stone-950 mb-2">
            {editingProduct ? t('producerProducts.editProduct') : t('producerProducts.createNewProduct')}
          </h2>

          <WizardStepper current={wizardStep} />

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* ═══ STEP 0 — IMAGES ═══ */}
              {wizardStep === 0 && (
                <motion.div key="step-images" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 p-5">
                    <h3 className="font-semibold text-stone-950 mb-1 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      {t('producerProducts.productImages')}
                    </h3>
                    <p className="text-sm text-stone-500 mb-4">Sube hasta 5 fotos de tu producto. La primera será la portada.</p>
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
                </motion.div>
              )}

              {/* ═══ STEP 1 — INFO ═══ */}
              {wizardStep === 1 && (
                <motion.div key="step-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.productName')} *</label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('producerProducts.productNamePlaceholder')}
                        className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                        data-testid="product-name-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.category')} *</label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="w-full px-4 py-2 rounded-2xl border border-stone-200 bg-white text-sm"
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
                    <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.description')} *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-2xl border border-stone-200 min-h-[80px] text-sm"
                      placeholder={t('producerProducts.descriptionPlaceholder')}
                      data-testid="product-description-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.unitPrice')} *</label>
                      <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="product-price-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.countryOrigin')} *</label>
                      <select value={formData.country_origin} onChange={(e) => setFormData({ ...formData, country_origin: e.target.value })} className="w-full px-3 py-2 rounded-2xl border border-stone-200 bg-white text-sm" data-testid="product-country-input">
                        <option value="">{t('producerProducts.selectCountry', 'Seleccionar país')}</option>
                        {countryOriginOptions.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.sku')}</label>
                      <input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder={t('producerProducts.skuPlaceholder')} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="product-sku-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.flavorVariant')}</label>
                      <input value={formData.flavor} onChange={(e) => setFormData({ ...formData, flavor: e.target.value })} placeholder={t('producerProducts.flavorPlaceholder')} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="product-flavor-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-600 mb-1">{t('producerProducts.stock', 'Stock inicial')} *</label>
                      <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} placeholder="100" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="product-stock-input" />
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="pt-3 border-t border-stone-100">
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {t('producerProducts.shippingConfig')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">{t('producerProducts.shippingCost')}</label>
                        <input type="number" step="0.01" min="0" value={formData.shipping_cost} onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })} placeholder={t('producerProducts.shippingCostPlaceholder')} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="product-shipping-cost-input" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-600 mb-1">{t('producerProducts.freeShippingFrom')}</label>
                        <input type="number" min="1" value={formData.free_shipping_min_qty} onChange={(e) => setFormData({ ...formData, free_shipping_min_qty: e.target.value })} placeholder="3" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="product-free-shipping-qty-input" />
                      </div>
                    </div>
                  </div>

                  {/* Packs */}
                  <div className="pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {t('producerProducts.packsOffers')}
                      </h4>
                      <button type="button" onClick={addPack} className="text-sm text-stone-950 hover:underline flex items-center gap-1" data-testid="add-pack-btn">
                        <Plus className="w-4 h-4" /> {t('producerProducts.addPack')}
                      </button>
                    </div>
                    {formData.packs.length === 0 ? (
                      <p className="text-sm text-stone-500 text-center py-2">{t('producerProducts.noPacksConfigured')}</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.packs.map((pack, index) => {
                          const discount = calculatePackDiscount(pack);
                          return (
                            <div key={index} className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-2xl">
                              <div className="flex-1 grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-stone-600 mb-0.5">{t('producerProducts.packQuantity')}</label>
                                  <input type="number" min="2" value={pack.quantity} onChange={(e) => updatePack(index, 'quantity', e.target.value)} placeholder="6" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid={`pack-quantity-${index}`} />
                                </div>
                                <div>
                                  <label className="block text-xs text-stone-600 mb-0.5">{t('producerProducts.packPrice')}</label>
                                  <input type="number" step="0.01" min="0" value={pack.price} onChange={(e) => updatePack(index, 'price', e.target.value)} placeholder="50.00" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid={`pack-price-${index}`} />
                                </div>
                                <div>
                                  <label className="block text-xs text-stone-600 mb-0.5">{t('producerProducts.packLabel')}</label>
                                  <input value={pack.label} onChange={(e) => updatePack(index, 'label', e.target.value)} placeholder={`Pack de ${pack.quantity || 'X'}`} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid={`pack-label-${index}`} />
                                </div>
                              </div>
                              {discount && <div className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-xs font-medium">-{discount}%</div>}
                              <button type="button" onClick={() => removePack(index)} className="p-1.5 text-stone-700 hover:bg-stone-50 rounded" data-testid={`remove-pack-${index}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* B2B Wholesale */}
                  <div className="pt-3 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        Venta B2B / Mayorista
                      </h4>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, b2b_enabled: !formData.b2b_enabled })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${formData.b2b_enabled ? 'bg-stone-950' : 'bg-stone-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.b2b_enabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>

                    {formData.b2b_enabled && (
                      <div className="space-y-3">
                        {/* MOQ */}
                        <div>
                          <label className="block text-xs text-stone-600 mb-0.5">Pedido mínimo (uds.)</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.b2b_moq}
                            onChange={(e) => setFormData({ ...formData, b2b_moq: e.target.value })}
                            placeholder="10"
                            className="w-32 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                          />
                        </div>

                        {/* Tiers */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs text-stone-600">Escalado de precios</label>
                            <button
                              type="button"
                              onClick={() => {
                                const retailPrice = parseFloat(formData.price) || 0;
                                const nextIdx = formData.b2b_tiers.length;
                                const defaultDiscounts = [0.80, 0.72, 0.65, 0.60, 0.55];
                                const discount = defaultDiscounts[nextIdx] || 0.50;
                                setFormData({
                                  ...formData,
                                  b2b_tiers: [
                                    ...formData.b2b_tiers,
                                    {
                                      min_quantity: nextIdx === 0 ? (formData.b2b_moq || '10') : '',
                                      unit_price: retailPrice ? (retailPrice * discount).toFixed(2) : '',
                                    },
                                  ],
                                });
                              }}
                              className="text-sm text-stone-950 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Añadir tramo
                            </button>
                          </div>

                          {formData.b2b_tiers.length === 0 ? (
                            <p className="text-sm text-stone-500 text-center py-2">Sin tramos configurados</p>
                          ) : (
                            <div className="space-y-2">
                              {formData.b2b_tiers.map((tier, index) => {
                                const retailPrice = parseFloat(formData.price) || 0;
                                const tierPrice = parseFloat(tier.unit_price) || 0;
                                const discountPct = retailPrice > 0 && tierPrice > 0
                                  ? Math.round((1 - tierPrice / retailPrice) * 100)
                                  : null;
                                return (
                                  <div key={index} className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-2xl">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-xs text-stone-600 mb-0.5">Desde (uds.)</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={tier.min_quantity}
                                          onChange={(e) => {
                                            const tiers = [...formData.b2b_tiers];
                                            tiers[index] = { ...tiers[index], min_quantity: e.target.value };
                                            setFormData({ ...formData, b2b_tiers: tiers });
                                          }}
                                          placeholder="10"
                                          className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-stone-600 mb-0.5">Precio/ud. (€)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={tier.unit_price}
                                          onChange={(e) => {
                                            const tiers = [...formData.b2b_tiers];
                                            tiers[index] = { ...tiers[index], unit_price: e.target.value };
                                            setFormData({ ...formData, b2b_tiers: tiers });
                                          }}
                                          placeholder="8.50"
                                          className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                                        />
                                      </div>
                                    </div>
                                    {discountPct !== null && discountPct > 0 && (
                                      <div className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                                        -{discountPct}%
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const tiers = formData.b2b_tiers.filter((_, i) => i !== index);
                                        setFormData({ ...formData, b2b_tiers: tiers });
                                      }}
                                      className="p-1.5 text-stone-700 hover:bg-stone-50 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 2 — COMPOSITION ═══ */}
              {wizardStep === 2 && (
                <motion.div key="step-composition" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {/* Ingredients */}
                  <div className="rounded-2xl border border-stone-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-stone-950 flex items-center gap-2">
                        <List className="w-4 h-4" />
                        {t('producerProducts.ingredients')}
                      </h3>
                      <button type="button" onClick={addIngredient} className="text-sm text-stone-950 hover:underline flex items-center gap-1" data-testid="add-ingredient-btn">
                        <Plus className="w-4 h-4" /> {t('producerProducts.addIngredient')}
                      </button>
                    </div>
                    {formData.ingredients.length === 0 ? (
                      <div>
                        <p className="text-sm text-stone-500 mb-2">{t('producerProducts.ingredientsSeparated')}</p>
                        <input value={ingredientsStr} onChange={(e) => setIngredientsStr(e.target.value)} placeholder={t('producerProducts.ingredientsPlaceholder')} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="ingredients-text-input" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input value={ingredient.name} onChange={(e) => updateIngredient(index, 'name', e.target.value)} placeholder={t('producerProducts.ingredientName')} className="flex-1 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid={`ingredient-name-${index}`} />
                            <input value={ingredient.origin} onChange={(e) => updateIngredient(index, 'origin', e.target.value)} placeholder={t('producerProducts.ingredientOrigin')} className="w-28 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid={`ingredient-origin-${index}`} />
                            <button type="button" onClick={() => removeIngredient(index)} className="p-1.5 text-stone-700 hover:bg-stone-50 rounded" data-testid={`remove-ingredient-${index}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nutritional Info */}
                  <div className="rounded-2xl border border-stone-200 p-5">
                    <h3 className="font-semibold text-stone-950 mb-3 flex items-center gap-2">
                      <Apple className="w-4 h-4" />
                      {t('producerProducts.nutritionalInfo')}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {nutritionalFields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs text-stone-600 mb-0.5">
                            {field.label} <span className="text-stone-400">({field.unit})</span>
                          </label>
                          <input type="number" step="0.1" min="0" value={formData.nutritional_info[field.key]} onChange={(e) => setFormData({ ...formData, nutritional_info: { ...formData.nutritional_info, [field.key]: e.target.value } })} placeholder="0" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid={`nutrition-${field.key}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allergens */}
                  <div className="rounded-2xl border border-stone-200 p-5">
                    <h3 className="font-semibold text-stone-950 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {t('producerProducts.allergens')}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                      {EU_ALLERGENS.map((allergen) => {
                        const isSelected = formData.allergens.includes(allergen.label);
                        return (
                          <label key={allergen.key} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) setFormData({ ...formData, allergens: formData.allergens.filter(a => a !== allergen.label) });
                                else setFormData({ ...formData, allergens: [...formData.allergens, allergen.label] });
                              }}
                              className="accent-stone-950 w-4 h-4 rounded"
                              data-testid={`allergen-${allergen.key}`}
                            />
                            <span className="text-sm text-stone-700">{allergen.label}</span>
                          </label>
                        );
                      })}
                      {/* Otros */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allergensStr.length > 0}
                          onChange={(e) => { if (!e.target.checked) setAllergensStr(''); }}
                          className="accent-stone-950 w-4 h-4 rounded"
                          data-testid="allergen-otros"
                        />
                        <span className="text-sm text-stone-700">Otros</span>
                      </label>
                    </div>
                    <input
                      value={allergensStr}
                      onChange={(e) => setAllergensStr(e.target.value)}
                      placeholder="Especifica otros alérgenos..."
                      className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                      data-testid="allergens-text-input"
                    />
                  </div>

                  {/* Certifications */}
                  <div className="rounded-2xl border border-stone-200 p-5">
                    <h3 className="font-semibold text-stone-950 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {t('producerProducts.certifications')}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {commonCertifications.map((cert) => {
                        const isSelected = formData.certifications.includes(cert.label);
                        return (
                          <button key={cert.key} type="button" onClick={() => {
                            if (isSelected) setFormData({ ...formData, certifications: formData.certifications.filter(c => c !== cert.label) });
                            else setFormData({ ...formData, certifications: [...formData.certifications, cert.label] });
                          }} className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${isSelected ? 'bg-stone-950 border-stone-950 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`} data-testid={`cert-${cert.key}`}>
                            {cert.label}
                          </button>
                        );
                      })}
                    </div>
                    <input value={certificationsStr} onChange={(e) => setCertificationsStr(e.target.value)} placeholder={t('producerProducts.otherCertificationsPlaceholder')} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950" data-testid="certifications-text-input" />
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 3 — PUBLISH (review) ═══ */}
              {wizardStep === 3 && (
                <motion.div key="step-publish" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {/* Image preview strip */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {normalizedImgs.map((img, i) => (
                      <div key={i} className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
                        <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>

                  {/* Summary card */}
                  <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100">
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-stone-500">{t('producerProducts.productName')}</span>
                      <span className="text-sm font-semibold text-stone-950">{formData.name || '—'}</span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-stone-500">{t('producerProducts.category')}</span>
                      <span className="text-sm font-medium text-stone-950">{categoryName || '—'}</span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-stone-500">{t('producerProducts.unitPrice')}</span>
                      <span className="text-sm font-semibold text-stone-950">{formData.price ? parseFloat(formData.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}</span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-stone-500">{t('producerProducts.countryOrigin')}</span>
                      <span className="text-sm text-stone-950">{countryName || '—'}</span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-stone-500">Stock</span>
                      <span className="text-sm text-stone-950">{formData.stock || '0'}</span>
                    </div>
                    {formData.allergens.length > 0 && (
                      <div className="px-5 py-3">
                        <span className="text-sm text-stone-500 block mb-1.5">{t('producerProducts.allergens')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.allergens.map(a => (
                            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-2.5 py-0.5 text-[11px] font-medium text-white">
                              <AlertTriangle className="w-3 h-3" />{a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.certifications.length > 0 && (
                      <div className="px-5 py-3">
                        <span className="text-sm text-stone-500 block mb-1.5">{t('producerProducts.certifications')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.certifications.map(c => (
                            <span key={c} className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                              <Award className="w-3 h-3" />{c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Approval note */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3">
                    <p className="text-xs text-stone-700">
                      <strong>{t('common.note')}:</strong> {t('producerProducts.approvalNote')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Wizard navigation ── */}
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-stone-100">
              <button
                type="button"
                onClick={wizardStep === 0 ? () => { setShowCreateForm(false); setEditingProduct(null); resetForm(); setWizardStep(0); } : handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {wizardStep === 0 ? t('common.cancel') : 'Atrás'}
              </button>

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-2xl transition-colors"
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saveProductLoading}
                  data-testid="submit-product-btn"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors"
                >
                  {saveProductLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? t('producerProducts.updateProduct') : t('producerProducts.createProduct')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-[975px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 mb-1">
            {t('producerProducts.title')}
          </h1>
          <p className="text-stone-500 text-sm">{t('producerProducts.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowCreateForm(true)} className="shrink-0 flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors" data-testid="create-product">
          <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">{t('producerProducts.createProduct')}</span><span className="sm:hidden">Crear</span>
        </button>
      </div>

      {/* Products */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-stone-200">
            {[1,2,3,4].map(i => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-stone-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-stone-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-stone-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-stone-500 mb-4">{t('producerProducts.noProductsYet')}</p>
            <button type="button" onClick={() => setShowCreateForm(true)} className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors">
              <Plus className="w-4 h-4 mr-2" /> {t('producerProducts.createFirstProduct')}
            </button>
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
                      <div className="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden shrink-0">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name || 'Producto'} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-950 truncate">{product.name}</p>
                        <p className="text-sm text-stone-500">{product.country_origin}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-semibold text-stone-950">{asNumber(product.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${product.approved ? 'bg-stone-100 text-stone-700' : 'bg-stone-100 text-stone-700'}`}>
                            {product.approved ? t('producerProducts.table.approved') : t('producerProducts.table.pending')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <span>Stock: <strong className={isOutOfStock ? 'text-stone-700' : isLowStock ? 'text-stone-700' : 'text-stone-950'}>{stock}</strong></span>
                      {variantCount > 0 && <span>· {variantCount} variantes</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => window.open(`/products/${product.product_id}`, '_blank')} data-testid={`view-product-${product.product_id}`} className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                      </button>
                      <button type="button" onClick={() => startEdit(product)} data-testid={`edit-product-${product.product_id}`} className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors">
                        <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                      </button>
                      <button type="button" onClick={() => window.open(`/producer/products/${product.product_id}/countries`, '_self')} className="flex items-center px-3 py-1.5 text-sm font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors">
                        <Globe className="w-3.5 h-3.5 mr-1" /> Países
                      </button>
                      <button type="button" onClick={() => setVariantManagerProduct(product)} data-testid={`manage-variants-mobile-${product.product_id}`} className="flex items-center px-3 py-1.5 text-sm font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors">
                        <Layers className="w-3.5 h-3.5 mr-1" /> Variantes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout */}
            <table className="w-full hidden md:table" data-testid="products-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('producerProducts.table.product')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('producerProducts.table.price')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('producerProducts.table.stock')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('producerProducts.table.variants')}</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('producerProducts.table.status')}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-stone-600">{t('producerProducts.table.actions')}</th>
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
                        <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.name || 'Producto'} className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-stone-950">{product.name}</p>
                          <p className="text-sm text-stone-500">{product.country_origin}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-950">{asNumber(product.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm transition-colors ${
                          variantCount > 0
                            ? 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {statusIcons[product.approved ? 'approved' : 'pending']}
                          <span className={`text-sm font-medium ${product.approved ? 'text-stone-700' : 'text-stone-700'}`}>
                            {product.approved ? t('producerProducts.table.approved') : t('producerProducts.table.pending')}
                          </span>
                        </div>
                        <span className={`text-[11px] flex items-center gap-1 ${product.certificate_id ? 'text-stone-700' : 'text-stone-400'}`}>
                          {product.certificate_id ? <><Award className="w-3 h-3" /> {t('producerProducts.certified', 'Certificado')}</> : <><span>○</span> {t('producerProducts.noCertificate', 'Sin certificado')}</>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(`/producer/products/${product.product_id}/countries`, '_self')}
                          title={t('producer.manageCountries')}
                          className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(`/products/${product.product_id}`, '_blank')}
                          className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          aria-label={`Editar ${product.name || 'producto'}`}
                          className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
