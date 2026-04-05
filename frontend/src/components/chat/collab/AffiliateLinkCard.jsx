import React from 'react';

const V2 = {
  black: '#0c0a09',
  green: '#0c0a09',
  stone: '#78716c',
  white: '#fff',
  greenLight: '#f5f5f4',
  greenBorder: '#d6d3d1',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

export default function AffiliateLinkCard({ link, stats, onCopy }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      /* fallback: noop */
    }
    onCopy?.();
  };

  return (
    <div
      style={{
        maxWidth: 260,
        background: V2.greenLight,
        border: `1px solid ${V2.greenBorder}`,
        borderRadius: V2.radiusMd,
        padding: 14,
        fontFamily: V2.fontSans,
      }}
    >
      {/* Header */}
      <span style={{ fontSize: 13, fontWeight: 600, color: V2.green }}>
        Link de afiliado generado
      </span>

      {/* URL */}
      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: V2.black,
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          marginTop: 8,
          marginBottom: 0,
          wordBreak: 'break-all',
        }}
      >
        {link.url}
      </p>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-center"
        style={{
          height: 36,
          background: V2.black,
          color: V2.white,
          border: 'none',
          borderRadius: V2.radiusMd,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: V2.fontSans,
          marginTop: 10,
        }}
      >
        Copiar link
      </button>

      {/* Stats */}
      {stats && (
        <p
          style={{
            fontSize: 11,
            color: V2.stone,
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          {stats.clicks} clics · {stats.sales} ventas
        </p>
      )}
    </div>
  );
}
