import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'text-stone-600', bg: 'bg-stone-100', icon: Clock },
  approved: { label: 'Aprobado', color: 'text-stone-700', bg: 'bg-stone-100', icon: CheckCircle },
  paid: { label: 'Pagado', color: 'text-stone-950', bg: 'bg-stone-100', icon: DollarSign },
};

export function CommissionHistory() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // recent | highest
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
      <div className="border border-stone-200 rounded-2xl bg-white">
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { commissions, total, pages } = data || { commissions: [], total: 0, pages: 0 };

  return (
    <div className="space-y-4">
      {/* Filtros + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'pending', 'approved', 'paid'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={statusFilter === status
              ? 'px-3 py-1.5 sm:px-4 sm:py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl transition-colors text-xs sm:text-sm'
              : 'px-3 py-1.5 sm:px-4 sm:py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors text-xs sm:text-sm'}
          >
            {status === 'all' ? 'Todos' : STATUS_CONFIG[status]?.label || status}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="ml-auto px-3 py-1.5 border border-stone-200 text-stone-600 rounded-xl text-xs sm:text-sm bg-white"
        >
          <option value="recent">Más recientes</option>
          <option value="highest">Mayor comisión</option>
        </select>
      </div>

      {/* Lista de comisiones */}
      <div className="border border-stone-200 rounded-2xl bg-white">
        <div className="px-5 pt-5 pb-2">
          <div className="text-lg flex items-center justify-between font-semibold">
            <span>Historial de comisiones</span>
            <span className="text-sm font-normal text-stone-500">
              {total} total
            </span>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="space-y-3">
            {commissions.length === 0 ? (
              <p className="text-center text-stone-500 py-8">
                No hay comisiones {statusFilter !== 'all' ? 'con este filtro' : ''}
              </p>
            ) : (
              [...commissions].sort((a, b) => {
                if (sortBy === 'highest') return (b.commission_cents || 0) - (a.commission_cents || 0);
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
              }).map((commission) => (
                <CommissionRow key={commission.id} commission={commission} />
              ))
            )}
          </div>

          {/* Paginacion */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50 flex items-center text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </button>

              <span className="text-sm text-stone-600">
                Página {page} de {pages}
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pages}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50 flex items-center text-sm"
              >
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommissionRow({ commission }) {
  const status = STATUS_CONFIG[commission.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-4 p-4 border border-stone-100 rounded-xl hover:bg-stone-50 transition">
      <div className={`p-2 rounded-full ${status.bg}`}>
        <StatusIcon className={`w-5 h-5 ${status.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{commission.product_name}</p>
        <p className="text-sm text-stone-500">
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
