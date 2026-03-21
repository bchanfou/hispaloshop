// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { resolveApiAssetUrl } from '../../utils/api';
import apiClient from '../../services/api/client';
import { 
  Store, Image, Upload, X, Loader2, Save, Eye, MapPin, 
  Phone, Mail, Globe, Clock, Instagram, Facebook, Trash2
} from 'lucide-react';



function ImageUploader({ label, value, onChange, type = "gallery", aspectRatio = "aspect-video" }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Archivo muy grande. Máximo: ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(
        `/producer/store-profile/upload-image?image_type=${type}`,
        formData
      );

      const imageUrl = resolveApiAssetUrl(response.url);
      onChange(imageUrl);
      toast.success('Imagen subida');
    } catch (error) {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-600">{label}</label>
      <div className={`relative ${aspectRatio} rounded-2xl border-2 border-dashed border-stone-200 overflow-hidden bg-stone-50`}>
        {value ? (
          <>
            <img loading="lazy" src={value} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={`Eliminar ${label}`}
              className="absolute top-2 right-2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-stone-950 text-white rounded-full hover:bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={`Subir ${label}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-stone-950 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8" />
                <span className="text-sm">Subir imagen</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}

function GalleryUploader({ images, onChange, maxImages = 6 }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || images.length >= maxImages) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(
        `/producer/store-profile/upload-image?image_type=gallery`,
        formData
      );

      const imageUrl = resolveApiAssetUrl(response.url);
      onChange([...images, imageUrl]);
      toast.success('Imagen añadida a la galería');
    } catch (error) {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    if (!window.confirm('¿Eliminar esta foto? Esta acción no se puede deshacer.')) return;
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-600">
        Galería de fotos ({images.length}/{maxImages})
      </label>
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200">
            <img loading="lazy" src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              aria-label={`Eliminar imagen ${idx + 1}`}
              className="absolute top-1 right-1 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-stone-950 text-white rounded-full hover:bg-stone-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Añadir foto a la galería"
            className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-stone-950 hover:border-stone-950 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-xs">Añadir</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      <p className="text-xs text-stone-500">Fotos del obrador, equipo, proceso de elaboración</p>
    </div>
  );
}

export default function ProducerStoreProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    slug: '',
    name: '',
    tagline: '',
    story: '',
    founder_name: '',
    founder_quote: '',
    hero_image: '',
    logo: '',
    gallery: [],
    location: '',
    full_address: '',
    coverage_area: '',
    delivery_time: '',
    contact_email: '',
    contact_phone: '',
    whatsapp: '',
    website: '',
    social_instagram: '',
    social_facebook: '',
    business_hours: ''
  });

  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(false);

  const fetchStoreProfile = () => {
    setLoading(true);
    setError(false);
    let active = true;
    apiClient.get('/producer/store-profile')
      .then(data => { if (active) setProfile(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  };

  useEffect(() => {
    const cleanup = fetchStoreProfile();
    return cleanup;
  }, []);

  // Warn on unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/producer/store-profile', profile);
      toast.success('Perfil de tienda actualizado');
      setIsDirty(false);
    } catch (error) {
      if (error?.response?.status === 409) {
        toast.error('Esta URL de tienda ya está en uso. Elige otra.');
      } else {
        toast.error('Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-stone-100 rounded-2xl animate-pulse" />
            <div className="h-4 w-64 bg-stone-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-stone-100 rounded-2xl animate-pulse" />
            <div className="h-10 w-36 bg-stone-100 rounded-2xl animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="h-5 w-32 bg-stone-100 rounded animate-pulse" />
              <div className="aspect-[3/1] bg-stone-100 rounded-2xl animate-pulse" />
              <div className="w-32 h-32 bg-stone-100 rounded-2xl animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="h-5 w-40 bg-stone-100 rounded animate-pulse" />
              <div className="h-10 bg-stone-100 rounded-2xl animate-pulse" />
              <div className="h-10 bg-stone-100 rounded-2xl animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="h-5 w-40 bg-stone-100 rounded animate-pulse" />
              <div className="h-10 bg-stone-100 rounded-2xl animate-pulse" />
              <div className="h-10 bg-stone-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Store className="w-12 h-12 text-stone-300 mb-4" />
        <p className="text-stone-600 font-medium mb-2">Error al cargar el perfil de tienda</p>
        <p className="text-stone-500 text-sm mb-4">Comprueba tu conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={fetchStoreProfile}
          className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm rounded-2xl transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-950 flex items-center gap-2">
            <Store className="w-6 h-6" />
            Perfil de Tienda
          </h1>
          <p className="text-stone-600 mt-1">Personaliza la página pública de tu tienda</p>
        </div>
        <div className="flex items-center gap-3">
          {profile.slug && (
            <Link to={`/store/${profile.slug}`} target="_blank" className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] border border-stone-200 rounded-2xl text-sm text-stone-700 hover:bg-stone-50 transition-colors no-underline">
              <Eye className="w-4 h-4" />
              Ver tienda
            </Link>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white text-sm rounded-2xl transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* URL Preview + Ver mi tienda */}
      {profile.slug && (
        <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">URL de tu tienda:</p>
            <p className="text-stone-950 font-medium">{window.location.origin}/store/{profile.slug}</p>
          </div>
          <Link to={`/store/${profile.slug}`} target="_blank" className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium rounded-2xl transition-colors">
            Ver mi tienda →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Brand Identity */}
        <div className="space-y-6">
          {/* Hero & Logo */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-950 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Identidad Visual
            </h2>
            
            <ImageUploader
              label="Imagen de portada (1200x400 recomendado)"
              value={profile.hero_image}
              onChange={(val) => updateField('hero_image', val)}
              type="hero"
              aspectRatio="aspect-[3/1]"
            />
            
            <ImageUploader
              label="Logo (cuadrado, 400x400 recomendado)"
              value={profile.logo}
              onChange={(val) => updateField('logo', val)}
              type="logo"
              aspectRatio="aspect-square w-32"
            />
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-950">Información básica</h2>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Nombre de la tienda</label>
              <input
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Artisan Foods Co"
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Tagline (eslogan corto)</label>
              <input
                value={profile.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Aceites ecológicos desde 1985"
                maxLength={150}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
              <p className="text-xs text-stone-500 mt-1">{(profile.tagline || '').length}/150 caracteres</p>
            </div>
          </div>

          {/* Story */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-950">Nuestra Historia</h2>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Historia de la marca</label>
              <textarea
                value={profile.story || ''}
                onChange={(e) => updateField('story', e.target.value)}
                placeholder="Cuenta la historia de tu marca, cómo empezaste, tu filosofía..."
                rows={5}
                maxLength={500}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 resize-none"
              />
              <p className="text-xs text-stone-500 mt-1">{(profile.story || '').length}/500 caracteres</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Nombre del fundador</label>
                <input
                  value={profile.founder_name || ''}
                  onChange={(e) => updateField('founder_name', e.target.value)}
                  placeholder="Carlos Martínez"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Cita destacada</label>
                <input
                  value={profile.founder_quote || ''}
                  onChange={(e) => updateField('founder_quote', e.target.value)}
                  placeholder="La calidad no es un accidente..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
            </div>
            
            <GalleryUploader
              images={profile.gallery || []}
              onChange={(val) => updateField('gallery', val)}
            />

            {/* Certifications visible */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1">
              <h3 className="text-sm font-semibold text-stone-950">Certificaciones visibles</h3>
              <p className="text-sm text-stone-500">Tus certificados verificados aparecen automáticamente en tu tienda.</p>
              <Link to="/producer/certificates" className="inline-flex items-center gap-1 text-sm font-medium text-stone-950 hover:underline mt-1">
                Gestionar certificados →
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - Location & Contact */}
        <div className="space-y-6">
          {/* Location */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-950 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ubicación y Envío
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Ubicación (ciudad, región)</label>
              <input
                value={profile.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="Jaén, Andalucía, España"
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Dirección completa</label>
              <input
                value={profile.full_address || ''}
                onChange={(e) => updateField('full_address', e.target.value)}
                placeholder="Ctra. de los Olivares, km 12, 23001 Jaén"
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Zona de envío</label>
                <input
                  value={profile.coverage_area || ''}
                  onChange={(e) => updateField('coverage_area', e.target.value)}
                  placeholder="Toda España peninsular"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Tiempo de entrega</label>
                <input
                  value={profile.delivery_time || ''}
                  onChange={(e) => updateField('delivery_time', e.target.value)}
                  placeholder="24-48 horas"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-950 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contacto
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Email de contacto</label>
                <input
                  type="email"
                  value={profile.contact_email || ''}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  placeholder="info@tutienda.es"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Teléfono</label>
                <input
                  value={profile.contact_phone || ''}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  placeholder="+34 953 123 456"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">WhatsApp</label>
                <input
                  value={profile.whatsapp || ''}
                  onChange={(e) => updateField('whatsapp', e.target.value)}
                  placeholder="+34 600 123 456"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Sitio web</label>
                <input
                  value={profile.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://tutienda.es"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Horario de atención</label>
              <textarea
                value={profile.business_hours || ''}
                onChange={(e) => updateField('business_hours', e.target.value)}
                placeholder="Lun-Vie: 9:00-18:00&#10;Sáb: 9:00-14:00"
                rows={2}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 resize-none"
              />
            </div>
          </div>

          {/* Social */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h2 className="font-semibold text-stone-950 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Redes Sociales
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1 flex items-center gap-2">
                <Instagram className="w-4 h-4" /> Instagram
              </label>
              <input
                value={profile.social_instagram || ''}
                onChange={(e) => updateField('social_instagram', e.target.value)}
                placeholder="https://instagram.com/tutienda"
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1 flex items-center gap-2">
                <Facebook className="w-4 h-4" /> Facebook
              </label>
              <input
                value={profile.social_facebook || ''}
                onChange={(e) => updateField('social_facebook', e.target.value)}
                placeholder="https://facebook.com/tutienda"
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button (bottom) */}
      <div className="flex justify-end pt-4 border-t border-stone-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar todos los cambios
        </button>
      </div>
    </div>
  );
}
