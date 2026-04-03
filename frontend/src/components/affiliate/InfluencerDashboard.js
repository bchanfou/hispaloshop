import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import { Copy, TrendingUp, MousePointer, ShoppingCart, DollarSign, Award, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
export function InfluencerDashboard() {
  const [copied, setCopied] = useState(false);
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['influencer-dashboard'],
    queryFn: async () => {
      const data = await apiClient.get('/affiliates/dashboard');
      return data.data ?? data;
    },
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  if (error) {
    return <div className="p-6 text-center">
        <p className="text-stone-600 mb-4">Error cargando dashboard</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors">
          Reintentar
        </button>
      </div>;
  }
  const {
    affiliate_link,
    current_tier,
    next_tier,
    stats,
    top_products,
    recent_conversions
  } = data;
  const copyLink = () => {
    navigator.clipboard.writeText(affiliate_link);
    setCopied(true);
    toast.success('Link copiado', {
      description: i18n.t('influencer_dashboard.comparteloEnTusRedesSociales', 'Compartelo en tus redes sociales')
    });
    setTimeout(() => setCopied(false), 2000);
  };
  return <div className="space-y-6 p-4 max-w-6xl mx-auto">
      {/* Header con link */}
      <div className="bg-stone-950 text-white border-0 rounded-2xl">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-stone-300 text-sm mb-1">{i18n.t('influencer_dashboard.tuLinkDeAfiliado', 'Tu link de afiliado')}</p>
              <p className="text-xl md:text-2xl font-bold font-mono truncate">
                {affiliate_link}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Award className="w-4 h-4 text-stone-300" />
                <p className="text-sm text-stone-300">
                  Ganas {current_tier.rate_percent}% por cada venta • Tier {current_tier.name}
                </p>
              </div>
            </div>
            <button onClick={copyLink} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors gap-2 shrink-0 flex items-center bg-white">
              {copied ? 'Copiado!' : <><Copy className="w-4 h-4" /> Copiar link</>}
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={MousePointer} label="Clicks (30d)" value={stats.last_30_days.clicks.toLocaleString()} />
        <StatCard icon={ShoppingCart} label="Ventas (30d)" value={stats.last_30_days.conversions.toLocaleString()} />
        <StatCard icon={DollarSign} label="Ganado (30d)" value={`€${(stats.last_30_days.commission_cents / 100).toFixed(2)}`} />
        <StatCard icon={TrendingUp} label="Pendiente" value={`€${(stats.pending_payout_cents / 100).toFixed(2)}`} highlight />
      </div>

      {/* Tier progress */}
      {next_tier && <div className="border border-stone-200 rounded-2xl bg-white">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-lg flex items-center gap-2 font-semibold">
              <TrendingUp className="w-5 h-5 text-stone-600" />
              Progreso a {next_tier.name} (+{Math.round(next_tier.rate * 100)}%)
            </h3>
          </div>
          <div className="px-5 pb-5">
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div className="bg-stone-950 h-3 rounded-full transition-all" style={{
            width: `${next_tier.progress_percent}%`
          }} />
            </div>
            <div className="flex justify-between mt-2 text-sm text-stone-600">
              <span>{current_tier.name}</span>
              <span className="font-medium">
                €{(next_tier.gmv_needed / 100).toLocaleString()} para subir
              </span>
              <span>{next_tier.name}</span>
            </div>
          </div>
        </div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top productos */}
        <div className="border border-stone-200 rounded-2xl bg-white">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-lg font-semibold">Tus productos mas vendidos</h3>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-3">
              {top_products && top_products.length > 0 ? top_products.map(product => <div key={product._id} className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{product.product_name}</p>
                      <p className="text-sm text-stone-500">{product.conversions} ventas</p>
                    </div>
                    <p className="font-bold text-stone-950 ml-2">
                      €{(product.total_commission / 100).toFixed(2)}
                    </p>
                  </div>) : <p className="text-stone-500 text-center py-4">
                  Aún no tienes ventas. ¡Comparte tu link!
                </p>}
            </div>
          </div>
        </div>

        {/* Conversiones recientes */}
        <div className="border border-stone-200 rounded-2xl bg-white">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-lg font-semibold">Ventas recientes</h3>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recent_conversions && recent_conversions.length > 0 ? recent_conversions.map((conv, idx) => <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
                    {conv.product_image ? <img src={conv.product_image} alt="" className="w-12 h-12 object-cover rounded shrink-0" /> : <div className="w-12 h-12 bg-stone-200 rounded flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5 text-stone-400" />
                      </div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conv.product_name}</p>
                      <p className="text-sm text-stone-500">
                        {conv.converted_at ? new Date(conv.converted_at).toLocaleDateString('es-ES') : 'Reciente'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-stone-950">
                        +€{(conv.commission_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-stone-500">
                        Venta: €{(conv.value_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>) : <p className="text-stone-500 text-center py-4">
                  No hay ventas recientes
                </p>}
            </div>
          </div>
        </div>
      </div>

      {/* Link generator */}
      <div className="border border-stone-200 rounded-2xl bg-white">
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-lg font-semibold">Generar link de producto</h3>
        </div>
        <div className="px-5 pb-5">
          <ProductLinkGenerator affiliateCode={affiliate_link.split('/r/')[1]?.split('/')?.[0]} />
        </div>
      </div>
    </div>;
}
function StatCard({
  icon: Icon,
  label,
  value,
  highlight
}) {
  return <div className={`border rounded-2xl bg-white ${highlight ? 'border-stone-500 border-2' : 'border-stone-200'}`}>
      <div className="p-4">
        <Icon className={`w-5 h-5 mb-2 ${highlight ? 'text-stone-700' : 'text-stone-500'}`} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-stone-600">{label}</p>
      </div>
    </div>;
}
function ProductLinkGenerator({
  affiliateCode
}) {
  const [productId, setProductId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const generateLink = () => {
    if (!productId) return;
    const link = `https://hispaloshop.com/r/${affiliateCode}/p/${productId}`;
    setGeneratedLink(link);
  };
  const copyGeneratedLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copiado');
  };
  return <div className="space-y-3">
      <div className="flex gap-2">
        <input type="text" placeholder="ID del producto" value={productId} onChange={e => setProductId(e.target.value)} className="flex-1 px-3 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-500 border-stone-200" />
        <button onClick={generateLink} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors">
          Generar
        </button>
      </div>

      {generatedLink && <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-2xl">
          <code className="flex-1 text-sm truncate">{generatedLink}</code>
          <button onClick={copyGeneratedLink} className="p-1 hover:bg-stone-100 rounded transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="text-stone-950 hover:text-stone-700">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>}
    </div>;
}
function DashboardSkeleton() {
  return <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <div className="h-32 bg-stone-100 animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-stone-100 animate-pulse rounded-2xl" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-80 bg-stone-100 animate-pulse rounded-2xl" />
        <div className="h-80 bg-stone-100 animate-pulse rounded-2xl" />
      </div>
    </div>;
}