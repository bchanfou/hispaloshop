// @ts-nocheck
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProducerConnectRefresh() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/producer?stripe_refresh=true', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-stone-500">Redirigiendo...</p>
    </div>
  );
}

