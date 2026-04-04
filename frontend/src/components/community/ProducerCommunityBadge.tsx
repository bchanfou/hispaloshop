// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

/**
 * Shows a compact badge/banner on product pages when the producer has a community.
 * Usage: <ProducerCommunityBadge creatorId={product.seller_id} />
 */
export default function ProducerCommunityBadge({ creatorId }) {
  const { data } = useQuery({
    queryKey: ['producer-communities', creatorId],
    queryFn: () => apiClient.get(`/communities/by-creator/${creatorId}`),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
  });

  const communities = data?.communities || [];
  if (communities.length === 0) return null;

  const community = communities[0]; // Show the biggest one

  return <CommunityBadgeCard community={community} />;
}

const CommunityBadgeCard = ({ community }) => {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(!!community.is_member);
  const cid = community.id || community._id;

  const handleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joining || joined) return;
    setJoining(true);
    try {
      await apiClient.post(`/communities/${cid}/join`);
      setJoined(true);
      toast.success(`Te uniste a ${community.name}`);
    } catch {
      toast.error('Error al unirse');
    } finally {
      setJoining(false);
    }
  };

  // Show member discount badge if available
  const discount = community.member_discount;
  const hasDiscount = discount?.is_active && discount?.value > 0;

  return <Link
    to={`/communities/${community.slug || cid}`}
    className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-3 no-underline hover:bg-stone-100 transition-colors"
  >
    <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{
      background: community.logo_url ? '#f5f5f4' : ['#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c'][(community.name || 'C').charCodeAt(0) % 5]
    }}>
      {community.logo_url
        ? <img src={community.logo_url} alt="" className="w-full h-full object-cover" />
        : <span className="text-lg">{community.emoji || '🌿'}</span>}
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-stone-950 m-0 truncate">{community.name}</p>
      <p className="text-[11px] text-stone-500 m-0 flex items-center gap-1">
        <Users size={10} />
        {(community.member_count || 0).toLocaleString()} miembros
        {hasDiscount && <span className="ml-1 font-bold text-stone-950">
          · Miembros: -{discount.value}{discount.type === 'percentage' ? '%' : '€'}
        </span>}
      </p>
    </div>

    <button
      onClick={handleJoin}
      disabled={joining || joined}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
        joined
          ? 'border border-stone-200 bg-white text-stone-400'
          : 'border-none bg-stone-950 text-white'
      }`}
    >
      {joining ? '...' : joined ? 'Unida' : 'Unirse'}
    </button>
  </Link>;
};
