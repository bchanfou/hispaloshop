// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Building2, Check, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

const font = { fontFamily: 'inherit' };

export default function PayoutSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payoutData, setPayoutData] = useState(null);
  const [method, setMethod] = useState(null); // 'stripe' | 'sepa'
  const [iban, setIban] = useState('');
  const [accountName, setAccountName] = useState('');

  const isProducer = user?.role === 'producer' || user?.role === 'importer';
  const isInfluencer = user?.role === 'influencer';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.get('/influencer/fiscal/status');
        setPayoutData(data);
        setMethod(data.payout_method || null);
      } catch {
        // No fiscal data yet
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStripeConnect = async () => {
    setSaving(true);
    try {
      const data = await apiClient.post('/influencer/fiscal/payout-method', {
        method: 'stripe',
        origin: window.location.origin,
      });
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else if (data.connected) {
        setMethod('stripe');
        setPayoutData(prev => ({ ...prev, payout_method: 'stripe', stripe_onboarding_complete: true }));
        toast.success('Stripe Connect activado');
      }
    } catch {
      toast.error('Error al conectar con Stripe');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSEPA = async () => {
    if (!iban.trim() || !accountName.trim()) {
      toast.error('IBAN y nombre del titular son obligatorios');
      return;
    }
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/i.test(iban.replace(/\s/g, ''))) {
      toast.error('El formato del IBAN no es válido');
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post('/influencer/fiscal/payout-method', {
        method: 'sepa',
        iban: iban.trim(),
        account_name: accountName.trim(),
      });
      setMethod('sepa');
      setPayoutData(prev => ({
        ...prev,
        payout_method: 'sepa',
        sepa_iban_last4: data.iban_masked?.slice(-4),
        sepa_account_name: accountName.trim(),
      }));
      toast.success('Datos bancarios guardados');
    } catch (err) {
      toast.error(err?.detail || 'Error al guardar datos bancarios');
    } finally {
      setSaving(false);
    }
  };

  const stripeConnected = payoutData?.stripe_onboarding_complete;
  const sepaConfigured = payoutData?.sepa_iban_last4;

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="#0c0a09" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Método de cobro</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 100px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={28} color="#78716c" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div style={{
              display: 'flex', gap: 12, padding: 16,
              background: '#f5f5f4', borderRadius: '16px',
              marginBottom: 24, alignItems: 'flex-start',
            }}>
              <AlertCircle size={18} color="#78716c" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: '#78716c', margin: 0, lineHeight: 1.5 }}>
                Configura cómo quieres recibir tus pagos. Puedes elegir entre Stripe Connect (instantáneo) o transferencia SEPA.
              </p>
            </div>

            {/* ── Method Selection ── */}
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#78716c',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              margin: '0 0 12px',
            }}>
              Elige tu método
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {/* Stripe Connect */}
              <button
                onClick={() => setMethod('stripe')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  background: '#ffffff',
                  border: method === 'stripe' ? '2px solid #0c0a09' : '1px solid #e7e5e4',
                  borderRadius: '16px',
                  cursor: 'pointer', textAlign: 'left', ...font,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '14px',
                  background: method === 'stripe' ? '#0c0a09' : '#f5f5f4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CreditCard size={20} color={method === 'stripe' ? '#ffffff' : '#78716c'} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: 0 }}>Stripe Connect</p>
                  <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>
                    Cobros instantáneos · Comisión 0,25€/pago
                  </p>
                </div>
                {stripeConnected && method === 'stripe' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#0c0a09',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={14} color="#ffffff" />
                  </div>
                )}
              </button>

              {/* SEPA */}
              <button
                onClick={() => setMethod('sepa')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  background: '#ffffff',
                  border: method === 'sepa' ? '2px solid #0c0a09' : '1px solid #e7e5e4',
                  borderRadius: '16px',
                  cursor: 'pointer', textAlign: 'left', ...font,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '14px',
                  background: method === 'sepa' ? '#0c0a09' : '#f5f5f4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Building2 size={20} color={method === 'sepa' ? '#ffffff' : '#78716c'} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: 0 }}>Transferencia SEPA</p>
                  <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>
                    Sin comisión · 2-3 días laborables
                  </p>
                </div>
                {sepaConfigured && method === 'sepa' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#0c0a09',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={14} color="#ffffff" />
                  </div>
                )}
              </button>
            </div>

            {/* ── Stripe Connect Section ── */}
            {method === 'stripe' && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '16px',
                padding: 20, marginBottom: 20,
              }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: '0 0 8px' }}>
                  Stripe Connect
                </p>

                {stripeConnected ? (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: '9999px',
                      background: '#f5f5f4', marginBottom: 12, width: 'fit-content',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0c0a09' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09' }}>Conectado</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#78716c', margin: 0, lineHeight: 1.5 }}>
                      Tu cuenta de Stripe Connect está activa. Los pagos se procesan automáticamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 16px', lineHeight: 1.5 }}>
                      Conecta tu cuenta de Stripe para recibir pagos directamente. Serás redirigido al proceso de verificación de Stripe.
                    </p>
                    <button
                      onClick={handleStripeConnect}
                      disabled={saving}
                      style={{
                        width: '100%', padding: 14,
                        background: '#0c0a09', color: '#ffffff',
                        border: 'none', borderRadius: '14px',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        ...font,
                      }}
                    >
                      {saving ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          <ExternalLink size={16} />
                          Conectar con Stripe
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── SEPA Section ── */}
            {method === 'sepa' && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '16px',
                padding: 20, marginBottom: 20,
              }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: '0 0 16px' }}>
                  Datos bancarios SEPA
                </p>

                {sepaConfigured && !iban.trim() && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: '14px',
                    background: '#f5f5f4', marginBottom: 16,
                  }}>
                    <Building2 size={16} color="#78716c" />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09', margin: 0 }}>
                        {payoutData?.sepa_account_name || 'Titular'}
                      </p>
                      <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>
                        ···· ···· ···· {payoutData?.sepa_iban_last4}
                      </p>
                    </div>
                  </div>
                )}

                {/* IBAN */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0c0a09', marginBottom: 6 }}>
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder={sepaConfigured ? `···· ···· ···· ${payoutData?.sepa_iban_last4}` : 'ES00 0000 0000 0000 0000 0000'}
                    style={{
                      width: '100%', padding: '10px 14px',
                      border: '1px solid #e7e5e4',
                      borderRadius: '14px',
                      fontSize: 14, color: '#0c0a09',
                      background: '#ffffff',
                      outline: 'none', boxSizing: 'border-box',
                      letterSpacing: '0.05em', ...font,
                    }}
                  />
                </div>

                {/* Account holder name */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0c0a09', marginBottom: 6 }}>
                    Nombre del titular
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder={payoutData?.sepa_account_name || 'Nombre completo o razón social'}
                    style={{
                      width: '100%', padding: '10px 14px',
                      border: '1px solid #e7e5e4',
                      borderRadius: '14px',
                      fontSize: 14, color: '#0c0a09',
                      background: '#ffffff',
                      outline: 'none', boxSizing: 'border-box', ...font,
                    }}
                  />
                </div>

                <button
                  onClick={handleSaveSEPA}
                  disabled={saving || (!iban.trim() && !accountName.trim())}
                  style={{
                    width: '100%', padding: 14,
                    background: (iban.trim() && accountName.trim()) ? '#0c0a09' : '#f5f5f4',
                    color: (iban.trim() && accountName.trim()) ? '#ffffff' : '#78716c',
                    border: 'none', borderRadius: '14px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    ...font,
                  }}
                >
                  {saving ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    'Guardar datos bancarios'
                  )}
                </button>
              </div>
            )}

            {/* Producer note */}
            {isProducer && (
              <div style={{
                padding: 16, background: '#f5f5f4',
                borderRadius: '16px',
                marginTop: 12,
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09', margin: '0 0 4px' }}>
                  Vendedores y productores
                </p>
                <p style={{ fontSize: 12, color: '#78716c', margin: 0, lineHeight: 1.5 }}>
                  Los pagos por ventas de productos se procesan automáticamente vía Stripe Connect.
                  Configura tu cuenta de Stripe para empezar a recibir pagos.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
