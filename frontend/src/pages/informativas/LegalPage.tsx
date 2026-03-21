// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../../hooks/usePageTitle';

const TABS = [
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'terminos', label: 'T\u00e9rminos' },
  { id: 'cookies', label: 'Cookies' },
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
        body: 'Hispaloshop no es responsable de la calidad de los productos vendidos por terceros, aunque trabajamos activamente para verificar a todos los productores de la plataforma.',
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
