import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTitle } from '../../hooks/usePageTitle';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';

const TABS = [
  { id: 'privacidad', labelKey: 'landing.legal.tabs.privacidad', fallback: 'Privacidad' },
  { id: 'terminos', labelKey: 'landing.legal.tabs.terminos', fallback: 'Términos' },
  { id: 'cookies', labelKey: 'landing.legal.tabs.cookies', fallback: 'Cookies' },
  { id: 'aviso-legal', labelKey: 'landing.legal.tabs.avisoLegal', fallback: 'Aviso Legal' },
];

const COOKIE_TABLE = [
  { cookie: 'hsp_token', tipo: 'Esencial', duracion: 'Sesión', proposito: 'Autenticación' },
  { cookie: 'hsp_accounts', tipo: 'Esencial', duracion: 'Permanente', proposito: 'Multi-cuenta' },
  { cookie: 'locale', tipo: 'Esencial', duracion: '1 año', proposito: 'Idioma/país' },
  { cookie: 'cart_id', tipo: 'Esencial', duracion: '30 días', proposito: 'Carrito' },
  { cookie: 'hispaloshop_consent_v2', tipo: 'Esencial', duracion: 'Permanente', proposito: 'Preferencias de cookies' },
  { cookie: '_ph_*', tipo: 'Analítica', duracion: '1 año', proposito: 'PostHog analytics (solo con consentimiento)' },
];

const CONTENT: Record<string, { title: string; updated: string; sections: { heading: string; body: string }[] }> = {
  privacidad: {
    title: 'Política de Privacidad',
    updated: 'Última actualización: 12 de abril de 2026',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        // TODO: review by lawyer — verify entity name, registration details, DPO contact
        body: 'HispaloShop LLC, con domicilio social en Florida, Estados Unidos. La empresa opera como plataforma de marketplace de alimentación artesanal con mercados en España (UE), Corea del Sur y Estados Unidos. Email de contacto para protección de datos: privacy@hispaloshop.com. Al tratar datos de residentes en la UE, cumplimos el Reglamento General de Protección de Datos (UE) 2016/679 (RGPD).',
      },
      {
        heading: '2. Datos que recogemos',
        // TODO: review by lawyer — ensure completeness of data categories
        body: 'Recogemos las siguientes categorías de datos personales: (a) Datos de cuenta: nombre, email, teléfono, dirección de envío, foto de perfil, nombre de usuario. (b) Datos transaccionales: historial de pedidos, direcciones de envío, métodos de pago (procesados por Stripe, no almacenamos datos de tarjeta). (c) Datos de contenido: publicaciones, reels, stories, comentarios, reseñas, recetas, mensajes directos. (d) Datos de uso: navegación, búsquedas, interacciones con la plataforma, preferencias. (e) Datos de IA: inferencias de preferencias de compra generadas por nuestros asistentes IA (David, Rebeca, Pedro, Iris), solo con consentimiento explícito. (f) Datos técnicos: dirección IP (hasheada), user-agent, datos de sesión.',
      },
      {
        heading: '3. Base legal del tratamiento',
        // TODO: review by lawyer — verify legal bases per processing activity
        body: 'Tratamos tus datos en base a: (a) Ejecución del contrato (Art. 6.1.b RGPD): para gestionar tu cuenta, procesar pedidos y prestar el servicio. (b) Consentimiento (Art. 6.1.a RGPD): para cookies analíticas, marketing y procesamiento IA. El consentimiento es libre, específico, informado e inequívoco, y puede retirarse en cualquier momento. (c) Interés legítimo (Art. 6.1.f RGPD): para prevención de fraude, seguridad de la plataforma y mejora del servicio. (d) Obligación legal (Art. 6.1.c RGPD): para cumplimiento fiscal y contable (retención de pedidos y facturas).',
      },
      {
        heading: '4. Tus derechos RGPD',
        // TODO: review by lawyer — verify exercise procedures comply with Art. 12 response times
        body: 'Como usuario residente en la UE, tienes los siguientes derechos: (1) Derecho de información (Art. 13-14): esta política te informa sobre el tratamiento de tus datos. (2) Derecho de acceso (Art. 15): puedes descargar todos tus datos desde Ajustes > Privacidad y datos > Descargar mis datos. (3) Derecho de rectificación (Art. 16): puedes modificar tus datos en Ajustes > Editar perfil en cualquier momento. (4) Derecho de supresión (Art. 17): puedes eliminar tu cuenta desde Ajustes > Privacidad y datos > Eliminar cuenta. Ofrecemos un periodo de gracia de 30 días o eliminación inmediata. (5) Derecho de limitación (Art. 18): puedes desactivar el procesamiento IA desde Ajustes > Privacidad y datos > Consentimiento IA. (6) Derecho de portabilidad (Art. 20): la descarga de datos genera un archivo JSON con todos tus datos en formato estructurado y portable. (7) Derecho de oposición (Art. 21): puedes oponerte al tratamiento basado en interés legítimo contactando a privacy@hispaloshop.com. (8) Derecho a no ser objeto de decisiones automatizadas (Art. 22): nuestros asistentes IA generan recomendaciones pero nunca toman decisiones vinculantes sin intervención humana. Puedes desactivar el procesamiento IA en cualquier momento.',
      },
      {
        heading: '5. Cómo ejercer tus derechos',
        body: 'La mayoría de derechos se ejercen directamente desde la plataforma (Ajustes > Privacidad y datos). Para derechos que requieran atención manual (oposición, consultas complejas), escribe a privacy@hispaloshop.com. Responderemos en un plazo máximo de 30 días. Si consideras que tus derechos no han sido atendidos, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).',
      },
      {
        heading: '6. Conservación de datos',
        // TODO: review by lawyer — verify retention periods comply with applicable law
        body: 'Conservamos tus datos mientras mantengas tu cuenta activa. Al eliminar tu cuenta: los datos personales se eliminan permanentemente (inmediato o tras 30 días de gracia). Los pedidos y facturas se anonimizan pero conservan los datos mínimos requeridos por la legislación fiscal (6 años en España). Los comentarios y reseñas se anonimizan ("Usuario eliminado"). Las notificaciones se eliminan automáticamente tras 90 días. Los datos analíticos anónimos se eliminan tras 365 días.',
      },
      {
        heading: '7. Transferencias internacionales de datos',
        // TODO: review by lawyer — verify adequacy of US transfer mechanisms for GDPR
        body: 'HispaloShop LLC tiene su sede en Florida, EE.UU. Los datos de usuarios de la UE pueden transferirse a Estados Unidos para su procesamiento. Esta transferencia se realiza bajo las siguientes garantías: cláusulas contractuales tipo (SCC) aprobadas por la Comisión Europea, y proveedores certificados bajo el EU-US Data Privacy Framework cuando aplique.',
      },
      {
        heading: '8. Encargados del tratamiento (terceros)',
        // TODO: review by lawyer — verify completeness of processor list + DPA status
        body: 'Compartimos datos con los siguientes proveedores, todos con acuerdos de procesamiento de datos (DPA) vigentes: Stripe (pagos), MongoDB Atlas (base de datos, infraestructura UE disponible), Anthropic (procesamiento IA, solo con consentimiento del usuario), Sentry (monitorización de errores, solo con consentimiento analítico), Cloudflare (CDN y seguridad), PostHog (analítica, solo con consentimiento). No vendemos ni compartimos datos personales con terceros con fines publicitarios.',
      },
      {
        heading: '9. Protección de menores',
        body: 'HispaloShop requiere una edad mínima de 16 años para crear una cuenta (Art. 8 RGPD). La verificación de edad se realiza durante el registro. No recopilamos intencionadamente datos de menores de 16 años.',
      },
      {
        heading: '10. Cookies',
        body: 'Utilizamos cookies esenciales (necesarias para el servicio), analíticas (solo con consentimiento) y de procesamiento IA (solo con consentimiento). Consulta la pestaña "Cookies" de esta página para el detalle completo. Puedes gestionar tus preferencias de cookies en cualquier momento desde el banner de consentimiento o desde Ajustes > Privacidad y datos.',
      },
      {
        heading: '11. Informacion adicional para usuarios de Corea del Sur (PIPA)',
        // TODO: review by Korean lawyer
        body: 'De conformidad con la Ley de Proteccion de Informacion Personal (PIPA) de Corea del Sur: (a) Representante local: el administrador de pais designado para Corea del Sur actua como representante conforme al Art. 39-11. (b) Transferencia transfronteriza: tus datos se procesan en servidores ubicados en Estados Unidos. HispaloShop LLC garantiza medidas de seguridad equivalentes a las exigidas por PIPA. (c) Consentimiento: el consentimiento para el tratamiento de datos se obtiene de forma separada por cada finalidad conforme a PIPA Art. 15. (d) Contacto: privacy@hispaloshop.com.',
      },
    ],
  },
  terminos: {
    title: 'Términos y Condiciones',
    updated: 'Ultima actualizacion: 12 de abril de 2026',
    sections: [
      {
        heading: '1. Aceptacion de los terminos',
        body: 'Al registrarte o utilizar HispaloShop, aceptas estos Terminos de Servicio, la Politica de Privacidad y la Politica de Cookies. Si no estas de acuerdo, no utilices la plataforma.',
      },
      {
        heading: '2. Descripcion del servicio',
        body: 'HispaloShop es un marketplace de social commerce especializado en productos artesanales alimentarios. Conecta productores locales con consumidores, influencers e importadores en Espana, Corea del Sur y Estados Unidos.',
      },
      {
        heading: '3. Elegibilidad',
        body: 'Para usar HispaloShop debes ser mayor de 18 anos. Al registrarte confirmas que cumples este requisito. HispaloShop se reserva el derecho de solicitar verificacion de edad.',
      },
      {
        heading: '4. Cuentas de usuario',
        body: 'HispaloShop ofrece cuatro tipos de cuenta: consumidor, productor, influencer e importador. Eres responsable de mantener la seguridad de tus credenciales. Se permite tener multiples cuentas. HispaloShop puede suspender o eliminar cuentas que violen estos terminos.',
      },
      {
        heading: '5. Comisiones y planes',
        // TODO: review by lawyer — verify commission disclosure meets consumer protection requirements
        body: 'HispaloShop cobra una comision sobre cada venta realizada a traves de la plataforma. Los productores pueden elegir entre planes FREE, PRO y ELITE con diferentes tasas de comision. Los influencers reciben comisiones por ventas atribuidas a sus codigos de descuento. La estructura completa de comisiones esta disponible en la pagina de planes. HispaloShop se reserva el derecho de modificar las comisiones con 30 dias de preaviso.',
      },
      {
        heading: '6. Pagos y facturacion',
        body: 'Los pagos se procesan a traves de Stripe. HispaloShop LLC opera desde Estados Unidos y no retiene impuestos locales de ningun pais. Los vendedores e influencers son responsables de declarar sus ingresos segun la normativa fiscal de su pais de residencia. Los formularios fiscales W-8BEN (no residentes US) o W-9 (residentes US) son obligatorios antes del primer cobro.',
      },
      {
        heading: '7. Productos alimentarios y responsabilidad',
        // TODO: review by lawyer — food liability clause per EU General Food Law Regulation 178/2002
        body: 'Los productos son elaborados y enviados directamente por el productor. Los productores son responsables de cumplir la normativa alimentaria de su pais (incluidos etiquetado, alergenos, y seguridad alimentaria). HispaloShop verifica las certificaciones presentadas como medida adicional de confianza pero no es responsable de la seguridad alimentaria de los productos. Al comprar, el consumidor acepta que el productor es el responsable directo del producto adquirido.',
      },
      {
        heading: '8. Propiedad intelectual',
        body: 'El contenido publicado por los usuarios (posts, reels, stories, recetas, resenas) sigue siendo propiedad del usuario. Al publicar en HispaloShop, otorgas una licencia limitada, no exclusiva y revocable para mostrar tu contenido dentro de la plataforma. HispaloShop no utilizara tu contenido fuera de la plataforma sin tu consentimiento.',
      },
      {
        heading: '9. Conducta prohibida',
        body: 'Esta prohibido: publicar contenido ilegal, difamatorio o danino; spam, harassment o fraude; manipulacion de resenas o estadisticas; suplantacion de identidad; uso de bots o automatizacion no autorizada; venta de productos prohibidos, ilegales o no alimentarios. Las infracciones pueden resultar en suspension o eliminacion de cuenta.',
      },
      {
        heading: '10. Resolucion de disputas',
        // TODO: review by lawyer — verify arbitration clause is valid for EU consumers
        body: 'Ante cualquier disputa, el usuario puede contactar a soporte@hispaloshop.com. Para operaciones B2B, la plataforma ofrece mediacion integrada. Las disputas se resolveran mediante arbitraje vinculante bajo las leyes del Estado de Florida, USA. Excepcion: los consumidores residentes en la UE mantienen su derecho a acudir a los tribunales de su pais de residencia conforme a la Directiva 93/13/CEE.',
      },
      {
        heading: '11. Limitacion de responsabilidad',
        // TODO: review by lawyer — verify limitation of liability is enforceable per jurisdiction
        body: 'HispaloShop actua como marketplace intermediario. No es vendedor ni distribuidor de los productos. En la maxima medida permitida por la ley aplicable, HispaloShop no sera responsable de danos indirectos, incidentales o consecuentes derivados del uso de la plataforma.',
      },
      {
        heading: '12. Modificacion de terminos',
        body: 'HispaloShop se reserva el derecho de modificar estos terminos. Los cambios materiales se comunicaran con al menos 30 dias de antelacion por email y notificacion en la plataforma. El uso continuado de la plataforma tras la notificacion implica aceptacion de los nuevos terminos.',
      },
      {
        heading: '13. Contacto y ley aplicable',
        body: 'Contacto legal: legal@hispaloshop.com. Ley aplicable: Estado de Florida, USA, con las excepciones para consumidores de la UE descritas en la seccion 10. Version en espanol: vinculante para usuarios en Espana. Version en ingles: vinculante para usuarios en Estados Unidos. Version en coreano: vinculante para usuarios en Corea del Sur.',
      },
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    updated: 'Última actualización: 12 de abril de 2026',
    sections: [
      {
        heading: '1. ¿Qué son las cookies?',
        body: 'Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo al visitar un sitio web. Nos ayudan a recordar tus preferencias y a entender cómo usas la plataforma.',
      },
      {
        heading: '2. Categorías de cookies',
        body: 'Esenciales: necesarias para el funcionamiento de la plataforma (sesión, carrito, autenticación, preferencias de idioma, preferencias de consent). Se activan siempre. Analíticas: PostHog para entender el uso de la plataforma y Sentry para monitorización de errores. Solo se activan con tu consentimiento explícito. Marketing: actualmente no utilizamos cookies de marketing. La categoría existe para futuras integraciones, que siempre requerirán tu consentimiento previo. Procesamiento IA: permite a nuestros asistentes IA procesar tus datos para recomendaciones personalizadas. Solo con consentimiento explícito.',
      },
      {
        heading: '3. Gestión de cookies',
        body: 'Puedes aceptar o rechazar cookies opcionales de forma granular (por categoría) a través del banner de consentimiento que aparece en tu primera visita. También puedes modificar tus preferencias en cualquier momento desde Ajustes > Privacidad y datos > Gestionar cookies. Las cookies esenciales no pueden desactivarse ya que son necesarias para el servicio. Tu consentimiento se registra con fecha, hash de IP y user-agent como prueba legal.',
      },
    ],
  },
  'aviso-legal': {
    title: 'Aviso Legal',
    updated: 'Ultima actualizacion: 12 de abril de 2026',
    sections: [
      {
        heading: '1. Datos identificativos',
        // TODO: review by lawyer — verify EIN and registered agent address
        body: 'En cumplimiento del articulo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Informacion y de Comercio Electronico (LSSI-CE): Denominacion social: HispaloShop LLC. Domicilio: Florida, Estados Unidos. EIN (Employer Identification Number): [pendiente]. Email: legal@hispaloshop.com. Actividad: marketplace de alimentacion artesanal (social commerce).',
      },
      {
        heading: '2. Objeto del sitio web',
        body: 'HispaloShop es una plataforma de social commerce que conecta productores artesanales de alimentacion con consumidores, influencers e importadores en Espana, Corea del Sur y Estados Unidos.',
      },
      {
        heading: '3. Condiciones de uso',
        body: 'El acceso y uso de esta plataforma atribuye la condicion de usuario e implica la aceptacion de los Terminos de Servicio y la Politica de Privacidad vigentes. El uso de la plataforma requiere ser mayor de 18 anos.',
      },
      {
        heading: '4. Propiedad intelectual',
        body: 'Todos los contenidos del sitio web (diseno, textos, graficos, logos, iconos, software) son propiedad de HispaloShop LLC o de sus licenciantes y estan protegidos por las leyes de propiedad intelectual aplicables. Los productores mantienen los derechos sobre las imagenes y descripciones de sus productos.',
      },
      {
        heading: '5. Responsabilidad',
        // TODO: review by lawyer — marketplace liability limitations per E-Commerce Directive
        body: 'HispaloShop actua como intermediario (marketplace) entre compradores y vendedores. No es el vendedor ni el distribuidor de los productos ofrecidos por terceros productores. Los productores son responsables de la calidad, seguridad alimentaria y cumplimiento normativo de sus productos. HispaloShop verifica certificaciones como medida adicional de confianza pero no garantiza la seguridad alimentaria.',
      },
      {
        heading: '6. Legislacion aplicable y jurisdiccion',
        // TODO: review by lawyer — verify jurisdiction clause is enforceable for EU consumers
        body: 'Este aviso legal se rige por las leyes del Estado de Florida, Estados Unidos. No obstante, para consumidores residentes en la Union Europea, se respetaran los derechos irrenunciables reconocidos por la legislacion del pais de residencia del consumidor conforme a la Directiva 93/13/CEE y el Reglamento (CE) 593/2008 (Roma I).',
      },
      {
        heading: '7. Representante local (Corea del Sur)',
        body: 'De conformidad con el articulo 39-11 de la Ley de Proteccion de Informacion Personal (PIPA) de Corea del Sur, el administrador de pais designado para Corea del Sur actua como representante local. Contacto: privacy@hispaloshop.com.',
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
                type="button"
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
                  <strong className="text-stone-950">HispaloShop LLC</strong><br />
                  Florida, Estados Unidos<br />
                  privacy@hispaloshop.com<br />
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
