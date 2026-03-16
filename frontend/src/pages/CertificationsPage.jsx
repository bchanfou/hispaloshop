import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const certifications = [
  {
    icon: '\u{1F33F}',
    name: 'Ecologico EU',
    description: 'Certificacion oficial de produccion ecologica de la Union Europea',
    criteria: [
      'Sin pesticidas sinteticos',
      'Sin organismos modificados geneticamente',
      'Rotacion de cultivos obligatoria',
    ],
  },
  {
    icon: '\u{1F3C6}',
    name: 'DOP (Denominacion de Origen Protegida)',
    description:
      'Garantiza que el producto se produce, transforma y elabora en una zona geografica determinada',
    criteria: [
      'Produccion en zona geografica especifica',
      'Metodos tradicionales de elaboracion',
      'Control de calidad regulado',
    ],
  },
  {
    icon: '\u{1F947}',
    name: 'IGP (Indicacion Geografica Protegida)',
    description:
      'Al menos una etapa de produccion se realiza en la zona geografica',
    criteria: [
      'Vinculo con el territorio',
      'Caracteristicas o reputacion atribuibles al origen',
      'Supervision por organismo de control',
    ],
  },
  {
    icon: '\u262A\uFE0F',
    name: 'Halal',
    description:
      'Certificacion de que el producto cumple con las normas alimentarias islamicas',
    criteria: [
      'Ingredientes permitidos (halal)',
      'Proceso de sacrificio conforme a la ley islamica',
      'Sin contaminacion cruzada con productos no halal',
    ],
  },
  {
    icon: '\u{1F33E}',
    name: 'Sin Gluten',
    description:
      'Producto apto para personas con enfermedad celiaca o sensibilidad al gluten',
    criteria: [
      'Contenido de gluten inferior a 20 ppm',
      'Produccion en lineas libres de contaminacion',
      'Analisis periodicos de laboratorio',
    ],
  },
  {
    icon: '\u{1F331}',
    name: 'Vegano',
    description:
      'No contiene ingredientes de origen animal ni ha sido testado en animales',
    criteria: [
      'Sin ingredientes animales',
      'Sin subproductos animales',
      'Sin pruebas en animales',
    ],
  },
];

export default function CertificationsPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Sticky topbar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-black)',
          }}
          aria-label="Volver"
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            color: 'var(--color-black)',
          }}
        >
          Certificaciones
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-stone)',
            margin: '0 0 24px 0',
          }}
        >
          Certificaciones reconocidas en Hispaloshop
        </p>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {certifications.map((cert) => (
            <div
              key={cert.name}
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>
                  {cert.icon}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: 'var(--color-black)',
                    paddingTop: 4,
                  }}
                >
                  {cert.name}
                </span>
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-stone)',
                  margin: '0 0 12px 0',
                  lineHeight: 1.5,
                }}
              >
                {cert.description}
              </p>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  listStyleType: 'disc',
                }}
              >
                {cert.criteria.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 13,
                      color: 'var(--color-stone)',
                      lineHeight: 1.7,
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
