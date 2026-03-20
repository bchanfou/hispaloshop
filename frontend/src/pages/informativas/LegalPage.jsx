import React, { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

const TABS = [
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'terminos', label: 'Términos' },
  { id: 'cookies', label: 'Cookies' },
];

const CONTENT = {
  privacidad: {
    title: 'Política de Privacidad',
    updated: 'Última actualización: 1 de marzo de 2026',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        body: 'Hispaloshop SL, con domicilio en Reus, Tarragona, España. Email de contacto: hola@hispaloshop.com.',
      },
      {
        heading: '2. Datos que recogemos',
        body: 'Recogemos los datos que nos proporcionas al registrarte (nombre, email, dirección), los datos de uso de la plataforma, y datos de pago procesados por Stripe. No almacenamos datos de tarjetas bancarias.',
      },
      {
        heading: '3. Finalidad del tratamiento',
        body: 'Utilizamos tus datos para gestionar tu cuenta, procesar pedidos, enviarte comunicaciones relacionadas con el servicio, y mejorar la plataforma. Base legal: ejecución del contrato y consentimiento.',
      },
      {
        heading: '4. Conservación de datos',
        body: 'Conservamos tus datos mientras mantengas tu cuenta activa. Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento.',
      },
      {
        heading: '5. Derechos RGPD',
        body: 'Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad, limitación y oposición escribiendo a hola@hispaloshop.com. Tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos.',
      },
    ],
  },
  terminos: {
    title: 'Términos y Condiciones',
    updated: 'Última actualización: 1 de marzo de 2026',
    sections: [
      {
        heading: '1. Objeto',
        body: 'Estos términos regulan el uso de la plataforma Hispaloshop, un marketplace de alimentación artesanal que conecta productores locales con consumidores.',
      },
      {
        heading: '2. Registro',
        body: 'Para utilizar determinadas funcionalidades es necesario crear una cuenta. Debes proporcionar información veraz y mantener tus credenciales seguras.',
      },
      {
        heading: '3. Compras y pagos',
        body: 'Los pagos se procesan a través de Stripe. Hispaloshop actúa como intermediario entre compradores y vendedores. Los precios incluyen IVA salvo que se indique lo contrario.',
      },
      {
        heading: '4. Envíos y devoluciones',
        body: 'Los plazos de entrega son orientativos (24-72h en península). Puedes devolver productos no perecederos en un plazo de 14 días desde la recepción.',
      },
      {
        heading: '5. Propiedad intelectual',
        body: 'Todo el contenido de la plataforma (diseño, textos, logos) es propiedad de Hispaloshop SL. Los productores mantienen los derechos sobre las imágenes de sus productos.',
      },
      {
        heading: '6. Limitación de responsabilidad',
        body: 'Hispaloshop no es responsable de la calidad de los productos vendidos por terceros, aunque trabajamos activamente para verificar a todos los productores de la plataforma.',
      },
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    updated: 'Última actualización: 1 de marzo de 2026',
    sections: [
      {
        heading: '1. ¿Qué son las cookies?',
        body: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo al visitar un sitio web. Nos ayudan a recordar tus preferencias y a entender cómo usas la plataforma.',
      },
      {
        heading: '2. Cookies que utilizamos',
        body: 'Cookies esenciales: necesarias para el funcionamiento de la plataforma (sesión, carrito). Cookies de análisis: PostHog para entender el uso de la plataforma (solo con consentimiento). No utilizamos cookies publicitarias de terceros.',
      },
      {
        heading: '3. Gestión de cookies',
        body: 'Puedes aceptar o rechazar cookies no esenciales a través del banner de consentimiento. También puedes configurar tu navegador para bloquear cookies, aunque esto puede afectar a la funcionalidad de la plataforma.',
      },
    ],
  },
};

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('privacidad');
  usePageTitle('Legal — Hispaloshop');

  const content = CONTENT[activeTab];

  return (
    <div style={{
      background: '#fafaf9',
      minHeight: '100vh',
      paddingTop: 100,
      fontFamily: 'Inter, inherit',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 80px' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 40,
          borderBottom: '1px solid #e7e5e4',
          paddingBottom: 12,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === tab.id ? '#0c0a09' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#78716c',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, inherit',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div key={activeTab} className="tab-content">
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#0c0a09',
            marginBottom: 8,
          }}>
            {content.title}
          </h1>

          <p style={{
            fontSize: 13,
            color: '#78716c',
            marginBottom: 40,
          }}>
            {content.updated}
          </p>

          {content.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#0c0a09',
                marginBottom: 12,
              }}>
                {section.heading}
              </h2>
              <p style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: '#0c0a09',
              }}>
                {section.body}
              </p>
            </div>
          ))}

          <div style={{
            marginTop: 48,
            padding: 24,
            background: '#f5f5f4',
            borderRadius: '14px',
          }}>
            <p style={{ fontSize: 14, color: '#78716c', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: '#0c0a09' }}>Hispaloshop SL</strong><br />
              Reus, Tarragona, España<br />
              hola@hispaloshop.com<br />
              Legislación aplicable: RGPD (UE) 2016/679
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
