import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { Search, FileText, Loader2, MessageCircle } from 'lucide-react';

const ROLE_FILTERS = [
  { value: '', labelKey: 'helpCenter.roleAll', label: 'Todos' },
  { value: 'customer', labelKey: 'helpCenter.roleCustomer', label: 'Soy customer' },
  { value: 'producer', labelKey: 'helpCenter.roleProducer', label: 'Soy seller' },
  { value: 'importer', labelKey: 'helpCenter.roleImporter', label: 'Soy importer' },
  { value: 'influencer', labelKey: 'helpCenter.roleInfluencer', label: 'Soy influencer' },
];

export default function HelpCenterPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '40' });
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    setLoading(true);
    apiClient.get(`/help/articles?${params.toString()}`)
      .then((data) => setItems(data?.items || []))
      .finally(() => setLoading(false));
  }, [search, role]);

  const lang = i18n.language || 'es';
  const titleOf = (a) => (lang === 'en' ? a.title_en : lang === 'ko' ? a.title_ko : a.title) || a.title;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-950">{t('helpCenter.title', 'Centro de ayuda')}</h1>
          <p className="text-stone-500 mt-2">{t('helpCenter.subtitle', 'Respuestas rápidas a las preguntas más comunes.')}</p>
        </header>

        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('helpCenter.searchPh', 'Busca un artículo...')}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-stone-400"
          />
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                role === r.value ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {t(r.labelKey, r.label)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <p className="text-sm text-stone-500">{t('helpCenter.noArticles', 'No se encontraron artículos.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((a) => (
              <Link key={a.slug} to={`/help/${a.slug}`} className="block bg-white rounded-2xl border border-stone-200 p-5 hover:border-stone-300">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-950">{titleOf(a)}</p>
                    <p className="text-xs text-stone-500 mt-1">{t(`support.cat.${a.category}`, a.category)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 bg-white rounded-2xl border border-stone-200 p-6 text-center">
          <MessageCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-stone-700 font-medium">{t('helpCenter.stillNeedHelp', '¿Aún tienes dudas?')}</p>
          <Link to="/support/new" className="inline-block mt-3 px-5 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800">
            {t('helpCenter.openTicket', 'Crear un ticket')}
          </Link>
        </div>
      </div>
    </div>
  );
}
