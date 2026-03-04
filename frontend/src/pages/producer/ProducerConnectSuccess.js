import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProducerConnectSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/producer?stripe_return=true', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-text-muted">Redirigiendo...</p>
    </div>
  );
}

