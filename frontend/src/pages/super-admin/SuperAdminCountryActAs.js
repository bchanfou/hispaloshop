import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { SACard, SAPageHeader, SAButton, SASelect } from '../../components/super-admin/SAUI';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminCountryActAs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/superadmin/countries').catch(() => ({ countries: [] })),
      apiClient.get('/super-admin/act-as-country-admin').catch(() => ({})),
    ]).then(([countryData, actData]) => {
      setCountries(countryData?.countries || []);
      setCurrent(actData?.acting_as || null);
    }).finally(() => setLoading(false));
  }, []);

  const start = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await apiClient.post(`/super-admin/act-as-country-admin/${selected}`);
      toast.success(t('actAs.started', 'Actuando como {{c}}', { c: selected }));
      navigate('/country-admin/overview');
    } catch (err) {
      toast.error(err?.message || 'Error');
    } finally {
      setActing(false);
    }
  };

  const stop = async () => {
    try {
      await apiClient.delete('/super-admin/act-as-country-admin');
      setCurrent(null);
      toast.success(t('actAs.stopped', 'Vuelta a super admin'));
    } catch (err) { toast.error(err?.message || 'Error'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <SAPageHeader
        title={t('actAs.title', 'Actuar como country admin')}
        subtitle={t('actAs.subtitle', 'Visita el dashboard de un país sin perder permisos super admin.')}
      />

      {current && (
        <SACard className="p-5 border-amber-500/40 bg-amber-500/[0.04]">
          <p className="text-sm text-amber-200">
            {t('actAs.currentlyActing', 'Actualmente estás actuando como')} <strong>{current}</strong>
          </p>
          <SAButton variant="secondary" onClick={stop} className="mt-3">
            {t('actAs.stop', 'Dejar de actuar')}
          </SAButton>
        </SACard>
      )}

      <SACard className="p-6 space-y-4">
        <p className="text-sm text-white/70">
          {t('actAs.body', 'Selecciona un país y entra como si fueras su country admin. La cookie expira en 1 hora.')}
        </p>
        <SASelect
          value={selected}
          onChange={setSelected}
          options={[
            { value: '', label: t('actAs.choose', 'Elegir país…') },
            ...countries.map((c) => ({ value: c.country_code, label: `${c.flag || ''} ${c.country_code} — ${c.name_local || c.country_code}` })),
          ]}
          className="w-full"
        />
        <SAButton variant="primary" onClick={start} disabled={!selected || acting}>
          {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {t('actAs.start', 'Empezar a actuar')}
        </SAButton>
      </SACard>
    </div>
  );
}
