import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube } from 'lucide-react';

const FooterLanding = () => {
  const navigate = useNavigate();

  const footerLinks = {
    producto: [
      { label: 'Como funciona', href: '/que-es' },
      { label: 'Para empresas', href: '/productor' },
      { label: 'Para influencers', href: '/influencer' },
      { label: 'Para importadores', href: '/importador' },
    ],
    empresa: [
      { label: 'Sobre nosotros', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Prensa', href: '/press' },
      { label: 'Trabaja con nosotros', href: '/careers' },
    ],
    soporte: [
      { label: 'Centro de ayuda', href: '/help' },
      { label: 'Contacto', href: '/contact' },
      { label: 'Terminos', href: '/terms' },
      { label: 'Privacidad', href: '/privacy' },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com/hispaloshop' },
    { icon: Facebook, href: 'https://facebook.com/hispaloshop' },
    { icon: Twitter, href: 'https://twitter.com/hispaloshop' },
    { icon: Youtube, href: 'https://youtube.com/hispaloshop' },
  ];

  return (
    <footer className="bg-[#1A1A1A] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xl font-bold mb-4">Hispaloshop</h3>
            <p className="text-gray-400 text-sm mb-4">
              Tu mercado local de productos artesanales. Conectamos productores con consumidores.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4 capitalize">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.href)}
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
          Copyright {new Date().getFullYear()} Hispaloshop. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default FooterLanding;
