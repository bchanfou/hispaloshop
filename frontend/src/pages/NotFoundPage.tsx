// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  const font = { fontFamily: 'inherit' };

  return (
    <main
      role="main"
      aria-label="Página no encontrada"
      style={{
        minHeight: '100vh',
        background: '#fafaf9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        ...font,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        {/* Animated icon */}
        <motion.div
          aria-hidden="true"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: '999px',
            background: '#0c0a09',
            marginBottom: 32,
          }}
        >
          <Compass size={32} color="#fafaf9" strokeWidth={1.8} />
        </motion.div>

        {/* 404 */}
        <h1
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#0c0a09',
            margin: '0 0 8px',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#0c0a09',
            margin: '0 0 12px',
          }}
        >
          Esta página no existe
        </h2>

        <p
          style={{
            fontSize: 15,
            color: '#78716c',
            lineHeight: 1.6,
            margin: '0 0 36px',
          }}
        >
          Parece que te has perdido. Vuelve al inicio y continúa explorando.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            to="/"
            aria-label="Ir al inicio"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 48,
              background: '#0c0a09',
              color: '#fafaf9',
              borderRadius: '999px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ir al inicio
          </Link>
          <Link
            to="/discover"
            aria-label="Explorar productos"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 48,
              background: 'transparent',
              color: '#0c0a09',
              border: '1.5px solid #e7e5e4',
              borderRadius: '999px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Explorar
          </Link>
        </div>
      </div>
    </main>
  );
}
