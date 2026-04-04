import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Mail, MapPin, Instagram, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { usePageTitle } from '../../hooks/usePageTitle';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import { FAQSection } from '../../components/informativas';

export default function ContactoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Consumidor');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const formInView = useInView(formRef, { once: true, margin: '-40px' });
  const infoInView = useInView(infoRef, { once: true, margin: '-40px' });

  const roles = t('landing.contacto.form.roles', { returnObjects: true, defaultValue: ['Consumidor', 'Productor', 'Influencer', 'Distribuidor', 'Prensa'] }) as string[];

  const faqItems = t('landing.contacto.faq.items', { returnObjects: true, defaultValue: [] }) as { question: string; answer: string }[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t('landing.contacto.form.errorCampos', 'Completa todos los campos'));
      return;
    }
    setSending(true);
    try {
      await apiClient.post('/contact', { name, email, role, message });
      toast.success(t('landing.contacto.form.exito', 'Mensaje enviado. Te responderemos pronto.'));
      setName(''); setEmail(''); setMessage('');
    } catch (error) {
      toast.error(error?.response?.data?.detail || t('landing.contacto.form.error', 'Error al enviar. Inténtalo de nuevo.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO
        title="Contacto — HispaloShop"
        description="Contáctanos para dudas, colaboraciones o prensa. Respondemos en menos de 24 horas."
      />

      {/* Hero */}
      <section className="bg-stone-50 pt-32 pb-6 lg:pt-40 lg:pb-8">
        <div className="max-w-[1100px] mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone-400 mb-4"
          >
            {t('landing.contacto.hero.eyebrow', 'Contacto')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl sm:text-5xl font-semibold tracking-tight text-stone-950 m-0 mb-3"
          >
            {t('landing.contacto.hero.title', 'Hablemos.')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-lg text-stone-500 m-0 max-w-[480px] leading-relaxed"
          >
            {t('landing.contacto.hero.subtitle', 'Para dudas sobre la plataforma, colaboraciones o prensa. Respondemos en menos de 24 horas.')}
          </motion.p>
        </div>
      </section>

      {/* Form + Info */}
      <section className="bg-stone-50 py-16 lg:py-20">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:gap-16">
            {/* Form */}
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, y: 24 }}
              animate={formInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="flex-1 max-w-[560px]"
            >
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-stone-200">
                <form onSubmit={handleSubmit}>
                  <div className="mb-5">
                    <label className="block text-[13px] font-medium text-stone-950 mb-1.5">
                      {t('landing.contacto.form.nombre', 'Nombre')}
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('landing.contacto.form.nombrePlaceholder', 'Tu nombre')}
                      className="w-full h-11 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-[13px] font-medium text-stone-950 mb-1.5">
                      {t('landing.contacto.form.email', 'Email')}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('landing.contacto.form.emailPlaceholder', 'tu@email.com')}
                      className="w-full h-11 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-[13px] font-medium text-stone-950 mb-1.5">
                      {t('landing.contacto.form.soy', 'Soy')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(roles) ? roles : []).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 border ${
                            role === r
                              ? 'bg-stone-950 text-white border-stone-950'
                              : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[13px] font-medium text-stone-950 mb-1.5">
                      {t('landing.contacto.form.mensaje', 'Mensaje')}
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={t('landing.contacto.form.mensajePlaceholder', '¿En qué podemos ayudarte?')}
                      rows={5}
                      className="w-full px-3.5 py-3 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors resize-y min-h-[120px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full h-12 bg-stone-950 text-white rounded-full text-[14px] font-semibold cursor-pointer hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-default"
                  >
                    {sending
                      ? t('landing.contacto.form.enviando', 'Enviando...')
                      : t('landing.contacto.form.enviar', 'Enviar mensaje')
                    }
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Info sidebar */}
            <motion.div
              ref={infoRef}
              initial={{ opacity: 0, y: 24 }}
              animate={infoInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-10 lg:mt-0 lg:w-[320px] flex-shrink-0"
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-[15px] font-semibold text-stone-950 m-0 mb-3 tracking-tight">
                    {t('landing.contacto.empresa.nombre', 'Hispaloshop SL')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-[13px] text-stone-500">
                      <MapPin size={14} className="text-stone-400 flex-shrink-0" />
                      {t('landing.contacto.empresa.ubicacion', 'Reus, Tarragona, España')}
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-stone-500">
                      <Mail size={14} className="text-stone-400 flex-shrink-0" />
                      {t('landing.contacto.empresa.email', 'hola@hispaloshop.com')}
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-stone-500">
                      <Instagram size={14} className="text-stone-400 flex-shrink-0" />
                      {t('landing.contacto.empresa.instagram', '@hispaloshop')}
                    </div>
                  </div>
                </div>

                {/* CTA card */}
                <div className="bg-stone-100 rounded-2xl p-5">
                  <p className="text-[13px] font-semibold text-stone-950 m-0 mb-3">
                    {t('landing.contacto.ctaCard', '¿Eres productor y quieres unirte?')}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="w-full h-10 bg-stone-950 text-white rounded-full text-[13px] font-semibold cursor-pointer hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 border-none"
                  >
                    {t('landing.contacto.ctaButton', 'Crear cuenta gratuita')}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        eyebrow={t('landing.contacto.faq.eyebrow', 'Preguntas frecuentes')}
        title={t('landing.contacto.faq.title', 'Antes de escribirnos')}
        items={Array.isArray(faqItems) ? faqItems : []}
        tone="white"
      />
    </>
  );
}
