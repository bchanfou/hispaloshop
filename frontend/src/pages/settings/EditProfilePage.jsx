import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '', username: '', bio: '', website: '', location: '',
    company_name: '', company_cif: '', store_description: '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [usernameTimer, setUsernameTimer] = useState(null);

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const font = { fontFamily: 'var(--font-sans)' };

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || user.full_name || '',
      username: user.username || '',
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
      company_name: user.company_name || '',
      company_cif: user.company_cif || user.cif || '',
      store_description: user.store_description || '',
    });
    setAvatarPreview(user.avatar_url || user.avatar || null);
  }, [user]);

  const originalUsername = user?.username || '';

  const hasChanges = () => {
    if (avatarFile) return true;
    if (form.name !== (user?.name || user?.full_name || '')) return true;
    if (form.username !== originalUsername) return true;
    if (form.bio !== (user?.bio || '')) return true;
    if (form.website !== (user?.website || '')) return true;
    if (form.location !== (user?.location || '')) return true;
    if (isProducer) {
      if (form.company_name !== (user?.company_name || '')) return true;
      if (form.store_description !== (user?.store_description || '')) return true;
    }
    return false;
  };

  const handleUsernameChange = useCallback((val) => {
    const clean = val.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
    setForm(f => ({ ...f, username: clean }));

    if (usernameTimer) clearTimeout(usernameTimer);
    if (clean === originalUsername || clean.length < 3) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/users/check-username/${clean}`);
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
    setUsernameTimer(timer);
  }, [originalUsername, usernameTimer]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken') {
      toast.error('El nombre de usuario no está disponible');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = user?.avatar_url || user?.avatar;

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const uploadRes = await apiClient.post('/upload/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
        avatarUrl = uploadRes.url || uploadRes.path || uploadRes.image_url;
      }

      const body = {
        name: form.name,
        username: form.username,
        bio: form.bio,
        website: form.website,
        location: form.location,
        avatar_url: avatarUrl,
      };

      if (isProducer) {
        body.company_name = form.company_name;
        body.store_description = form.store_description;
      }

      await apiClient.put('/customer/profile', body);
      if (refreshUser) await refreshUser();
      toast.success('Perfil actualizado');
      navigate('/settings');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)', flex: 1, textAlign: 'center' }}>
          Editar perfil
        </span>
        <button
          onClick={handleSave}
          disabled={!hasChanges() || saving || usernameStatus === 'taken'}
          style={{
            padding: '6px 16px', borderRadius: 'var(--radius-full, 999px)',
            background: hasChanges() && !saving && usernameStatus !== 'taken' ? 'var(--color-black)' : 'var(--color-surface)',
            color: hasChanges() && !saving && usernameStatus !== 'taken' ? 'var(--color-white)' : 'var(--color-stone)',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', ...font,
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* ── Avatar ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'var(--color-surface)', overflow: 'hidden',
              position: 'relative', cursor: 'pointer',
            }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={28} color="var(--color-stone)" />
              </div>
            )}
            {/* Overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 200ms',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              <Camera size={24} color="var(--color-white)" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
        </div>

        {/* ── Form Fields ── */}
        <FormField label="Nombre completo" value={form.name}
          onChange={v => setForm(f => ({ ...f, name: v }))} />

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', ...font }}>
            Usuario
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: 'var(--color-stone)', pointerEvents: 'none',
            }}>@</span>
            <input
              value={form.username}
              onChange={e => handleUsernameChange(e.target.value)}
              maxLength={30}
              style={{
                width: '100%', height: 44, paddingLeft: 30, paddingRight: 36,
                border: `1px solid ${usernameStatus === 'taken' ? '#dc2626' : usernameStatus === 'available' ? '#16a34a' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                fontSize: 14, color: 'var(--color-black)',
                outline: 'none', boxSizing: 'border-box', ...font,
              }}
            />
            {usernameStatus === 'checking' && (
              <Loader2 size={16} color="var(--color-stone)" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
            )}
            {usernameStatus === 'available' && (
              <Check size={16} color="#16a34a" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />
            )}
            {usernameStatus === 'taken' && (
              <X size={16} color="#dc2626" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>
          {usernameStatus === 'taken' && (
            <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0', ...font }}>Este usuario ya está en uso</p>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', ...font }}>
            Biografía
          </label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 150) }))}
            maxLength={150}
            placeholder="Cuéntanos sobre ti..."
            rows={3}
            style={{
              width: '100%', padding: '10px 14px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 14, color: 'var(--color-black)',
              outline: 'none', resize: 'none', boxSizing: 'border-box',
              lineHeight: 1.5, ...font,
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '4px 0 0', textAlign: 'right', ...font }}>
            {form.bio.length}/150
          </p>
        </div>

        <FormField label="Sitio web" value={form.website} type="url" placeholder="https://..."
          onChange={v => setForm(f => ({ ...f, website: v }))} />

        <FormField label="Ubicación" value={form.location} placeholder="Madrid, España"
          onChange={v => setForm(f => ({ ...f, location: v }))} />

        {/* ── Producer Fields ── */}
        {isProducer && (
          <>
            <div style={{
              borderTop: '1px solid var(--color-border)',
              marginTop: 8, paddingTop: 20,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-stone)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px', ...font }}>
                Datos de empresa
              </p>
            </div>

            <FormField label="Nombre de la empresa" value={form.company_name}
              onChange={v => setForm(f => ({ ...f, company_name: v }))} />

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, ...font }}>
                CIF/NIF empresa
                {user?.is_verified && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 'var(--radius-full, 999px)',
                    background: 'rgba(22,163,74,0.1)', color: '#16a34a',
                  }}>
                    Verificado ✓
                  </span>
                )}
              </label>
              <input
                value={form.company_cif}
                readOnly={!!user?.is_verified}
                style={{
                  width: '100%', height: 44, padding: '0 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 14, color: user?.is_verified ? 'var(--color-stone)' : 'var(--color-black)',
                  outline: 'none', boxSizing: 'border-box',
                  background: user?.is_verified ? 'var(--color-surface)' : 'var(--color-white)', ...font,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', ...font }}>
                Descripción de la tienda
              </label>
              <textarea
                value={form.store_description}
                onChange={e => setForm(f => ({ ...f, store_description: e.target.value.slice(0, 500) }))}
                maxLength={500}
                placeholder="Describe tu tienda, tus productos, tu historia..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 14, color: 'var(--color-black)',
                  outline: 'none', resize: 'none', boxSizing: 'border-box',
                  lineHeight: 1.5, ...font,
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '4px 0 0', textAlign: 'right', ...font }}>
                {form.store_description.length}/500
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', marginBottom: 6, display: 'block', fontFamily: 'var(--font-sans)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 44, padding: '0 14px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 14, color: 'var(--color-black)',
          outline: 'none', boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)',
        }}
      />
    </div>
  );
}
