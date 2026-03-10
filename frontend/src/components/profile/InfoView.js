import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Truck, Award, Clock, Shield, Star, ChevronDown, ChevronUp, Phone, Mail, Globe } from 'lucide-react';

const CERTIFICATIONS = [
  { name: 'Denominación de Origen', icon: Award, description: 'Producto certificado con DO' },
  { name: 'Ecológico', icon: Shield, description: 'Agricultura ecológica certificada' },
  { name: 'Artesanal', icon: Star, description: 'Producción artesanal tradicional' }
];

const SHIPPING_INFO = [
  { name: 'Envío estándar', time: '2-3 días', price: 'Gratis >€50' },
  { name: 'Envío express', time: '24h', price: '€5.90' },
  { name: 'Recogida en tienda', time: 'Inmediato', price: 'Gratis' }
];

const REVIEWS = [
  {
    id: 1,
    user: 'María G.',
    avatar: 'https://i.pravatar.cc/150?u=maria',
    rating: 5,
    date: 'hace 2 días',
    comment: 'Excelente calidad del aceite. Repetiré seguro!',
    product: 'Aceite de Oliva Virgen Extra Premium'
  },
  {
    id: 2,
    user: 'Carlos R.',
    avatar: 'https://i.pravatar.cc/150?u=carlos',
    rating: 5,
    date: 'hace 1 semana',
    comment: 'El jamón es espectacular, muy buen sabor y curación.',
    product: 'Jamón Ibérico de Bellota'
  },
  {
    id: 3,
    user: 'Ana L.',
    avatar: 'https://i.pravatar.cc/150?u=ana',
    rating: 4,
    date: 'hace 2 semanas',
    comment: 'Buena calidad, aunque el envío tardó un poco más de lo esperado.',
    product: 'Pack Degustación Aceites'
  }
];

const BUSINESS_HOURS = [
  { day: 'Lunes - Viernes', hours: '9:00 - 19:00' },
  { day: 'Sábado', hours: '10:00 - 14:00' },
  { day: 'Domingo', hours: 'Cerrado' }
];

function InfoView() {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const Section = ({ id, title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background-subtle flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent" />
          </div>
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {expandedSection === id ? (
          <ChevronUp className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted" />
        )}
      </button>
      
      {expandedSection === id && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4"
        >
          {children}
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      {/* About */}
      <Section id="about" title="Sobre nosotros" icon={MapPin}>
        <p className="text-text-muted text-sm leading-relaxed">
          Somos Cortijo Andaluz, una empresa familiar con más de 50 años de tradición 
          dedicada a la producción de aceite de oliva virgen extra de la más alta calidad. 
          Ubicados en el corazón de Andalucía, combinamos métodos tradicionales con 
          tecnología moderna para ofrecerte los mejores productos.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-text-muted" />
            <span className="text-gray-900">Córdoba, Andalucía, España</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-text-muted" />
            <span className="text-gray-900">www.cortijoandaluz.es</span>
          </div>
        </div>
      </Section>

      {/* Certifications */}
      <Section id="certifications" title="Certificaciones" icon={Award}>
        <div className="space-y-3">
          {CERTIFICATIONS.map((cert) => (
            <div key={cert.name} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-state-amber/10 flex items-center justify-center flex-shrink-0">
                <cert.icon className="w-4 h-4 text-state-amber" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{cert.name}</p>
                <p className="text-xs text-text-muted">{cert.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Shipping */}
      <Section id="shipping" title="Envíos" icon={Truck}>
        <div className="space-y-3">
          {SHIPPING_INFO.map((shipping) => (
            <div key={shipping.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-sm text-gray-900">{shipping.name}</p>
                <p className="text-xs text-text-muted">{shipping.time}</p>
              </div>
              <span className="text-sm font-medium text-accent">{shipping.price}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Business Hours */}
      <Section id="hours" title="Horario" icon={Clock}>
        <div className="space-y-2">
          {BUSINESS_HOURS.map((schedule) => (
            <div key={schedule.day} className="flex items-center justify-between text-sm">
              <span className="text-gray-900">{schedule.day}</span>
              <span className={schedule.hours === 'Cerrado' ? 'text-state-error' : 'text-text-muted'}>
                {schedule.hours}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Reviews Preview */}
      <Section id="reviews" title="Opiniones" icon={Star}>
        <div className="space-y-4">
          {REVIEWS.map((review) => (
            <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-3">
                <img
                  src={review.avatar}
                  alt={review.user}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{review.user}</span>
                    <span className="text-xs text-text-muted">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-0.5 my-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < review.rating ? 'fill-state-amber text-state-amber' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-900">{review.comment}</p>
                  <p className="text-xs text-text-muted mt-1">{review.product}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors">
          Ver todas las opiniones
        </button>
      </Section>

      {/* Contact */}
      <div className="bg-accent rounded-xl p-4 text-white">
        <h3 className="font-medium mb-3">¿Necesitas ayuda?</h3>
        <div className="space-y-2">
          <a href="tel:+34600123456" className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity">
            <Phone className="w-4 h-4" />
            <span>+34 600 123 456</span>
          </a>
          <a href="mailto:hola@cortijoandaluz.es" className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity">
            <Mail className="w-4 h-4" />
            <span>hola@cortijoandaluz.es</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default InfoView;
