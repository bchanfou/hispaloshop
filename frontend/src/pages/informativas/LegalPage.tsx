// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../../hooks/usePageTitle';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';

const TABS = [
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'terminos', label: 'T\u00e9rminos' },
  { id: 'cookies', label: 'Cookies' },
];

const COOKIE_TABLE = [
  { cookie: 'hsp_token', tipo: 'Esencial', duracion: 'Sesi\u00f3n', proposito: 'Autenticaci\u00f3n' },
  { cookie: 'hsp_accounts', tipo: 'Esencial', duracion: 'Permanente', proposito: 'Multi-cuenta' },
  { cookie: 'locale', tipo: 'Esencial', duracion: '1 a\u00f1o', proposito: 'Idioma/pa\u00eds' },
  { cookie: 'cart_id', tipo: 'Esencial', duracion: '30 d\u00edas', proposito: 'Carrito' },
  { cookie: '_ph_*', tipo: 'Anal\u00edtica', duracion: '1 a\u00f1o', proposito: 'PostHog analytics' },
];

const CONTENT: Record<string, { title: string; updated: string; sections: { heading: string; body: string }[] }> = {
  privacidad: {
    title: 'Pol\u00edtica de Privacidad',
    updated: '\u00daltima actualizaci\u00f3n: 1 de marzo de 2026',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        body: 'Hispaloshop SL, con domicilio en Reus, Tarragona, Espa\u00f1a. Email de contacto: hola@hispaloshop.com.',
      },
      {
        heading: '2. Datos que recogemos',
        body: 'Recogemos los datos que nos proporcionas al registrarte (nombre, email, direcci\u00f3n), los datos de uso de la plataforma, y datos de pago procesados por Stripe. No almacenamos datos de tarjetas bancarias.',
      },
      {
        heading: '3. Finalidad del tratamiento',
        body: 'Utilizamos tus datos para gestionar tu cuenta, procesar pedidos, enviarte comunicaciones relacionadas con el servicio, y mejorar la plataforma. Base legal: ejecuci\u00f3n del contrato y consentimiento.',
      },
      {
        heading: '4. Conservaci\u00f3n de datos',
        body: 'Conservamos tus datos mientras mantengas tu cuenta activa. Puedes solicitar la eliminaci\u00f3n de tu cuenta y datos en cualquier momento.',
      },
      {
        heading: '5. Derechos RGPD',
        body: 'Puedes ejercer tus derechos de acceso, rectificaci\u00f3n, supresi\u00f3n, portabilidad, limitaci\u00f3n y oposici\u00f3n escribiendo a hola@hispaloshop.com. Tienes derecho a presentar una reclamaci\u00f3n ante la Agencia Espa\u00f1ola de Protecci\u00f3n de Datos.',
      },
    ],
  },
  terminos: {
    title: 'T\u00e9rminos y Condiciones',
    updated: '\u00daltima actualizaci\u00f3n: 1 de marzo de 2026',
    sections: [
      {
        heading: '1. Objeto',
        body: 'Estos t\u00e9rminos regulan el uso de la plataforma Hispaloshop, un marketplace de alimentaci\u00f3n artesanal que conecta productores locales con consumidores.',
      },
      {
        heading: '2. Registro',
        body: 'Para utilizar determinadas funcionalidades es necesario crear una cuenta. Debes proporcionar informaci\u00f3n veraz y mantener tus credenciales seguras.',
      },
      {
        heading: '3. Compras y pagos',
        body: 'Los pagos se procesan a trav\u00e9s de Stripe. Hispaloshop act\u00faa como intermediario entre compradores y vendedores. Los precios incluyen IVA salvo que se indique lo contrario.',
      },
      {
        heading: '4. Env\u00edos y devoluciones',
        body: 'Los plazos de entrega son orientativos (24-72h en pen\u00ednsula). Puedes devolver productos no perecederos en un plazo de 14 d\u00edas desde la recepci\u00f3n.',
      },
      {
        heading: '5. Propiedad intelectual',
        body: 'Todo el contenido de la plataforma (dise\u00f1o, textos, logos) es propiedad de Hispaloshop SL. Los productores mantienen los derechos sobre las im\u00e1genes de sus productos.',
      },
      {
        heading: '6. Limitaci\u00f3n de responsabilidad',
        body: t('legal.hispaloshopNoEsResponsableDeLaCali', 'Hispaloshop no es responsable de la calidad de los productos vendidos por terceros, aunque trabajamos activamente para verificar a todos los productores de la plataforma.'),
      },
      {
        heading: '7. Resoluci\u00f3n de disputas',
        body: 'Ante cualquier disputa, el usuario puede contactar a soporte@hispaloshop.com. Para operaciones B2B, la plataforma ofrece un sistema de mediaci\u00f3n integrado. En caso de no resoluci\u00f3n, aplica la legislaci\u00f3n espa\u00f1ola y los juzgados de Tarragona.',
      },
      {
        heading: '8. T\u00e9rminos B2B',
        body: 'Las operaciones B2B est\u00e1n sujetas a los Incoterms seleccionados por las partes. El comprador acepta los MOQ (cantidad m\u00ednima) indicados por el productor. Los contratos digitales tienen validez legal conforme al Reglamento eIDAS. La cancelaci\u00f3n de un contrato B2B conlleva una penalizaci\u00f3n del 5% del valor total.',
      },
    ],
  },
  cookies: {
    title: 'Pol\u00edtica de Cookies',
    updated: '\u00daltima actualizaci\u00f3n: 1 de marzo de 2026',
    sections: [
      {
        heading: '1. \u00bfQu\u00e9 son las cookies?',
        body: 'Las cookies son peque\u00f1os archivos de texto que se almacenan en tu dispositivo al visitar un sitio web. Nos ayudan a recordar tus preferencias y a entender c\u00f3mo usas la plataforma.',
      },
      {
        heading: '2. Cookies que utilizamos',
        body: 'Cookies esenciales: necesarias para el funcionamiento de la plataforma (sesi\u00f3n, carrito). Cookies de an\u00e1lisis: PostHog para entender el uso de la plataforma (solo con consentimiento). No utilizamos cookies publicitarias de terceros.',
      },
      {
        heading: '3. Gesti\u00f3n de cookies',
        body: 'Puedes aceptar o rechazar cookies no esenciales a trav\u00e9s del banner de consentimiento. Tambi\u00e9n puedes configurar tu navegador para bloquear cookies, aunque esto puede afectar a la funcionalidad de la plataforma.',
      },
    ],
  },
};

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState('privacidad');
  usePageTitle('Legal \u2014 Hispaloshop');

  const content = CONTENT[activeTab];

  return (
    <div className="min-h-screen bg-stone-50 pt-24" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <SEO title="Legal \u2014 HispaloShop" description="Pol\u00edtica de privacidad, t\u00e9rminos y condiciones, y pol\u00edtica de cookies de Hispaloshop. RGPD compliant." />
      <div className="max-w-[720px] mx-auto px-4 pb-20">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex gap-2 mb-10 border-b border-stone-200 pb-3"
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-stone-950 text-white'
                  : 'bg-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-stone-950 tracking-tight mb-2">
              {content.title}
            </h1>

            <p className="text-xs text-stone-500 mb-10">
              {content.updated}
            </p>

            {content.sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="mb-8"
              >
                <h2 className="text-lg font-semibold text-stone-950 mb-3">
                  {section.heading}
                </h2>
                <p className="text-base leading-[1.7] text-stone-700">
                  {section.body}
                </p>
              </motion.div>
            ))}

            {activeTab === 'cookies' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mb-8"
              >
                <h2 className="text-lg font-semibold text-stone-950 mb-3">
                  4. Detalle de cookies
                </h2>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="text-left py-3 px-4 font-semibold text-stone-950">Cookie</th>
                        <th className="text-left py-3 px-4 font-semibold text-stone-950">Tipo</th>
                        <th className="text-left py-3 px-4 font-semibold text-stone-950">Duraci&oacute;n</th>
                        <th className="text-left py-3 px-4 font-semibold text-stone-950">Prop&oacute;sito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COOKIE_TABLE.map((row, i) => (
                        <tr key={row.cookie} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                          <td className="py-3 px-4 font-mono text-stone-700">{row.cookie}</td>
                          <td className="py-3 px-4 text-stone-600">{row.tipo}</td>
                          <td className="py-3 px-4 text-stone-600">{row.duracion}</td>
                          <td className="py-3 px-4 text-stone-600">{row.proposito}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-12 p-6 bg-stone-100 rounded-2xl"
            >
              <p className="text-sm text-stone-500 leading-relaxed">
                <strong className="text-stone-950">Hispaloshop SL</strong><br />
                Reus, Tarragona, Espa&ntilde;a<br />
                hola@hispaloshop.com<br />
                Legislaci&oacute;n aplicable: RGPD (UE) 2016/679
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
