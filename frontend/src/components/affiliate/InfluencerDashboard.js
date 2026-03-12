import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '../../utils/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Copy, 
  TrendingUp, 
  MousePointer, 
  ShoppingCart, 
  DollarSign,
  Award,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export function InfluencerDashboard() {
  const [copied, setCopied] = useState(false);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['influencer-dashboard'],
    queryFn: async () => {
      const response = await API.get('/affiliates/dashboard');
      return response.data.data;
    },
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">Error cargando dashboard</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
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
    toast.success('Link copiado', { description: 'Compartelo en tus redes sociales' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      {/* Header con link */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-purple-100 text-sm mb-1">Tu link de afiliado</p>
              <p className="text-xl md:text-2xl font-bold font-mono truncate">
                {affiliate_link}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Award className="w-4 h-4 text-yellow-300" />
                <p className="text-sm text-purple-100">
                  Ganas {current_tier.rate_percent}% por cada venta • Tier {current_tier.name}
                </p>
              </div>
            </div>
            <Button 
              onClick={copyLink} 
              variant="secondary" 
              className="gap-2 shrink-0"
            >
              {copied ? 'Copiado!' : <><Copy className="w-4 h-4" /> Copiar link</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={MousePointer} 
          label="Clicks (30d)" 
          value={stats.last_30_days.clicks.toLocaleString()}
        />
        <StatCard 
          icon={ShoppingCart} 
          label="Ventas (30d)" 
          value={stats.last_30_days.conversions.toLocaleString()}
        />
        <StatCard 
          icon={DollarSign} 
          label="Ganado (30d)" 
          value={`€${(stats.last_30_days.commission_cents / 100).toFixed(2)}`}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Pendiente" 
          value={`€${(stats.pending_payout_cents / 100).toFixed(2)}`}
          highlight
        />
      </div>

      {/* Tier progress */}
      {next_tier && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Progreso a {next_tier.name} (+{Math.round(next_tier.rate * 100)}%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${next_tier.progress_percent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>{current_tier.name}</span>
              <span className="font-medium">
                €{(next_tier.gmv_needed / 100).toLocaleString()} para subir
              </span>
              <span>{next_tier.name}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tus productos mas vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {top_products && top_products.length > 0 ? (
                top_products.map((product) => (
                  <div 
                    key={product._id} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{product.product_name}</p>
                      <p className="text-sm text-gray-500">{product.conversions} ventas</p>
                    </div>
                    <p className="font-bold text-green-600 ml-2">
                      €{(product.total_commission / 100).toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Aún no tienes ventas. ¡Comparte tu link!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversiones recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recent_conversions && recent_conversions.length > 0 ? (
                recent_conversions.map((conv, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                  >
                    {conv.product_image ? (
                      <img 
                        src={conv.product_image} 
                        alt="" 
                        className="w-12 h-12 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conv.product_name}</p>
                      <p className="text-sm text-gray-500">
                        {conv.converted_at ? new Date(conv.converted_at).toLocaleDateString() : 'Reciente'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-600">
                        +€{(conv.commission_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Venta: €{(conv.value_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No hay ventas recientes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generar link de producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductLinkGenerator affiliateCode={affiliate_link.split('/r/')[1]?.split('/')[0]} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }) {
  return (
    <Card className={highlight ? 'border-green-500 border-2' : ''}>
      <CardContent className="p-4">
        <Icon className={`w-5 h-5 mb-2 ${highlight ? 'text-green-600' : 'text-gray-500'}`} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProductLinkGenerator({ affiliateCode }) {
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

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="ID del producto"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <Button onClick={generateLink}>
          Generar
        </Button>
      </div>
      
      {generatedLink && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <code className="flex-1 text-sm truncate">{generatedLink}</code>
          <Button size="sm" variant="ghost" onClick={copyGeneratedLink}>
            <Copy className="w-4 h-4" />
          </Button>
          <a 
            href={generatedLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <Card className="h-32 bg-gray-100 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-28 bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="h-80 bg-gray-100 animate-pulse" />
        <Card className="h-80 bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}
