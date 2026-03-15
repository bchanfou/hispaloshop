import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const V2 = {
  black: '#0A0A0A',
  cream: '#F7F6F2',
  stone: '#8A8881',
  white: '#fff',
  fontSans: 'Inter, sans-serif',
};

export default function B2BOfferPlaceholder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversationId');

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundColor: V2.cream,
        fontFamily: V2.fontSans,
      }}
    >
      {/* TopBar */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: V2.cream,
          padding: '12px 16px',
          borderBottom: `1px solid #E5E2DA`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: V2.black,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: V2.black,
          }}
        >
          Crear oferta B2B
        </span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: 24 }}>
        <FileText size={48} style={{ color: V2.stone, marginBottom: 16 }} />
        <div
          style={{
            fontSize: 16,
            color: V2.stone,
            textAlign: 'center',
            marginBottom: 6,
          }}
        >
          El flujo de oferta se implementa en la Fase 20
        </div>
        <div
          style={{
            fontSize: 13,
            color: V2.stone,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Vuelve pronto
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center"
          style={{
            height: 44,
            borderRadius: 999,
            padding: '0 28px',
            backgroundColor: V2.black,
            color: V2.white,
            border: 'none',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: V2.fontSans,
          }}
        >
          Volver al chat
        </button>
      </div>
    </div>
  );
}
