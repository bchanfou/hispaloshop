// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { usePageTitle } from '../../hooks/usePageTitle';
import SEO from '../../components/SEO';

const ROLES = ['Consumidor', 'Productor', 'Influencer', 'Importador', 'Prensa'];

export default function ContactPage() {
  const navigate = useNavigate();
  usePageTitle();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Consumidor');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    setSending(true);
    try {
      await apiClient.post('/contact', { name, email, role, message });
      toast.success('Mensaje enviado. Te responderemos pronto.');
      setName(''); setEmail(''); setMessage('');
    } catch {
      toast.error('Error al enviar. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pt-16" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <SEO title="Contacto \u2014 HispaloShop" description="Cont\u00e1ctanos para dudas, colaboraciones o prensa. Respondemos en menos de 24 horas. Hispaloshop SL, Reus, Tarragona." />
      <div className="max-w-[600px] mx-auto px-4 py-16 md:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-stone-950 tracking-tight mb-3">
            Hablemos.
          </h1>
          <p className="text-base text-stone-500 leading-relaxed">
            Para dudas sobre la plataforma, colaboraciones o prensa.
            Respondemos en menos de 24 horas.
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm mb-10"
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-950 mb-1.5">
                Nombre
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full h-11 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-950 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full h-11 px-3.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-950 mb-1.5">
                Soy
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 ${
                      role === r
                        ? 'bg-stone-950 text-white border border-stone-950'
                        : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-950 mb-1.5">
                Mensaje
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="&iquest;En qu&eacute; podemos ayudarte?"
                rows={5}
                className="w-full px-3.5 py-3 text-sm border border-stone-200 rounded-xl bg-white text-stone-950 outline-none focus:border-stone-400 transition-colors resize-y min-h-[120px]"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full h-12 bg-stone-950 text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-default"
            >
              {sending ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </form>
        </motion.div>

        {/* Info section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-stone-950 mb-2">
            Hispaloshop SL
          </h3>
          <p className="text-sm text-stone-500 mb-6">
            Reus, Tarragona, Espa&ntilde;a
          </p>

          <div className="space-y-1 text-sm text-stone-500 mb-8">
            <p>hola@hispaloshop.com</p>
            <p>@hispaloshop (Instagram)</p>
            <p>@bchanfuah (fundador)</p>
          </div>

          <div className="bg-stone-100 rounded-2xl border border-stone-200 p-6">
            <p className="text-sm font-semibold text-stone-950 mb-3">
              &iquest;Eres productor y quieres unirte?
            </p>
            <button
              onClick={() => navigate('/register')}
              className="w-full h-10 bg-stone-950 text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors"
            >
              Crear cuenta gratuita &rarr;
            </button>
          </div>
        </motion.div>

        {/* ── FAQ Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-12"
        >
          <h3 className="text-lg font-bold text-stone-950 mb-6">Preguntas frecuentes</h3>
          <div>
            {[
              { q: '¿Cuánto cuesta usar HispaloShop?', a: 'Para compradores es gratis. Productores tienen planes desde 0€. Influencers ganan comisiones.' },
              { q: '¿Cómo recibo mis pedidos?', a: 'Los productores envían directamente. Entrega en 24-72h en España peninsular.' },
              { q: '¿Puedo vender internacionalmente?', a: 'Sí. HispaloShop opera en 65+ países con soporte multi-idioma y multi-divisa.' },
              { q: '¿Cómo se verifican los productores?', a: 'Verificamos identidad, certificaciones y calidad antes de aprobar cada productor.' },
              { q: '¿Cómo funciona el programa de influencers?', a: 'Genera enlaces de afiliado, comparte, y cobra comisiones del 3-7%.' },
            ].map((faq, i) => (
              <div key={i} className="border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-left bg-transparent border-none cursor-pointer"
                >
                  <span className="text-sm font-semibold text-stone-950 pr-4">{faq.q}</span>
                  <motion.span
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown size={16} className="text-stone-400" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-stone-600 pb-4 m-0 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
