import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../../hooks/usePageTitle';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';

const TABS = [
  { id: 'privacidad', labelKey: 'landing.legal.tabs.privacidad', fallback: 'Privacidad' },
  { id: 'terminos', labelKey: 'landing.legal.tabs.terminos', fallback: 'Términos' },
  { id: 'cookies', labelKey: 'landing.legal.tabs.cookies', fallback: 'Cookies' },
];

const COOKIE_TABLE = [
  { cookie: 'hsp_token', tipo: 'Esencial', duracion: 'Sesión', proposito: 'Autenticación' },
  { cookie: 'hsp_accounts', tipo: 'Esencial', duracion: 'Permanente', proposito: 'Multi-cuenta' },
  { cookie: 'locale', tipo: 'Esencial', duracion: '1 año', proposito: 'Idioma/país' },
  { cookie: 'cart_id', tipo: 'Esencial', duracion: '30 días', proposito: 'Carrito' },
  { cookie: '_ph_*', tipo: 'Analítica', duracion: '1 año', proposito: 'PostHog analytics' },
];

const CONTENT: Record<string, { title: string; updated: string; sections: { heading: string; body: string }[] }> = {
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
      {
        heading: '7. Resolución de disputas',
        body: 'Ante cualquier disputa, el usuario puede contactar a soporte@hispaloshop.com. Para operaciones B2B, la plataforma ofrece un sistema de mediación integrado. En caso de no resolución, aplica la legislación española y los juzgados de Tarragona.',
      },
      {
        heading: '8. Términos B2B',
        body: 'Las operaciones B2B están sujetas a los Incoterms seleccionados por las partes. El comprador acepta los MOQ (cantidad mínima) indicados por el productor. Los contratos digitales tienen validez legal conforme al Reglamento eIDAS. La cancelación de un contrato B2B conlleva una penalización del 5% del valor total.',
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

export default function LegalPageNew() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('privacidad');
  usePageTitle('Legal — Hispaloshop');

  const content = CONTENT[activeTab];

  return (
    <>
      <SEO
        title="Legal — HispaloShop"
        description="Política de privacidad, términos y condiciones, y política de cookies de Hispaloshop. RGPD compliant."
      />

      {/* Header + Tabs */}
      <section className="bg-stone-50 pt-32 lg:pt-40">
        <div className="max-w-[720px] mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone-400 mb-4"
          >
            Legal
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex gap-2 mb-0 pb-0"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-all duration-200 border ${
                  activeTab === tab.id
                    ? 'bg-stone-950 text-white border-stone-950'
                    : 'bg-transparent text-stone-500 border-transparent hover:text-stone-700'
                }`}
              >
                {t(tab.labelKey, tab.fallback)}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-stone-50 py-12 lg:py-16">
        <div className="max-w-[720px] mx-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="text-2xl sm:text-3xl font-semibold text-stone-950 tracking-tight m-0 mb-2">
                {content.title}
              </h1>
              <p className="text-[12px] text-stone-400 m-0 mb-10">
                {content.updated}
              </p>

              {content.sections.map((section, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="mb-8"
                >
                  <h2 className="text-[15px] font-semibold text-stone-950 m-0 mb-2.5 tracking-tight">
                    {section.heading}
                  </h2>
                  <p className="text-[14px] leading-[1.75] text-stone-600 m-0">
                    {section.body}
                  </p>
                </motion.div>
              ))}

              {/* Cookie table */}
              {activeTab === 'cookies' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="mb-8"
                >
                  <h2 className="text-[15px] font-semibold text-stone-950 m-0 mb-3 tracking-tight">
                    4. Detalle de cookies
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-stone-100">
                          <th className="text-left py-3 px-4 font-semibold text-stone-950">Cookie</th>
                          <th className="text-left py-3 px-4 font-semibold text-stone-950">Tipo</th>
                          <th className="text-left py-3 px-4 font-semibold text-stone-950">Duración</th>
                          <th className="text-left py-3 px-4 font-semibold text-stone-950">Propósito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COOKIE_TABLE.map((row, i) => (
                          <tr key={row.cookie} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                            <td className="py-2.5 px-4 font-mono text-stone-700">{row.cookie}</td>
                            <td className="py-2.5 px-4 text-stone-600">{row.tipo}</td>
                            <td className="py-2.5 px-4 text-stone-600">{row.duracion}</td>
                            <td className="py-2.5 px-4 text-stone-600">{row.proposito}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Company info footer */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mt-12 p-5 bg-white rounded-2xl border border-stone-200"
              >
                <p className="text-[13px] text-stone-500 leading-relaxed m-0">
                  <strong className="text-stone-950">Hispaloshop SL</strong><br />
                  Reus, Tarragona, España<br />
                  hola@hispaloshop.com<br />
                  Legislación aplicable: RGPD (UE) 2016/679
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
