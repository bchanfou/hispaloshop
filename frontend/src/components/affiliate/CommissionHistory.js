import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  approved: { label: 'Aprobado', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle },
  paid: { label: 'Pagado', color: 'text-green-600', bg: 'bg-green-50', icon: DollarSign },
  disputed: { label: 'Disputado', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle }
};

export function CommissionHistory() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['commissions', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const data = await apiClient.get(`/affiliates/commissions?${params}`);
      return data.data ?? data;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { commissions, total, pages } = data || { commissions: [], total: 0, pages: 0 };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'approved', 'paid'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
          >
            {status === 'all' ? 'Todos' : STATUS_CONFIG[status]?.label || status}
          </Button>
        ))}
      </div>

      {/* Lista de comisiones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Historial de comisiones</span>
            <span className="text-sm font-normal text-gray-500">
              {total} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commissions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay comisiones {statusFilter !== 'all' ? 'con este filtro' : ''}
              </p>
            ) : (
              commissions.map((commission) => (
                <CommissionRow key={commission.id} commission={commission} />
              ))
            )}
          </div>

          {/* Paginacion */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              
              <span className="text-sm text-gray-600">
                Página {page} de {pages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pages}
              >
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CommissionRow({ commission }) {
  const status = STATUS_CONFIG[commission.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition">
      <div className={`p-2 rounded-full ${status.bg}`}>
        <StatusIcon className={`w-5 h-5 ${status.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{commission.product_name}</p>
        <p className="text-sm text-gray-500">
          Orden {commission.order_number} • {new Date(commission.created_at).toLocaleDateString()}
        </p>
      </div>
      
      <div className="text-right shrink-0">
        <p className="font-bold text-lg">
          €{(commission.commission_cents / 100).toFixed(2)}
        </p>
        <p className={`text-xs ${status.color}`}>
          {status.label}
        </p>
      </div>
    </div>
  );
}
