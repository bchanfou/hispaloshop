import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube } from 'lucide-react';

const FooterLanding = () => {
  const navigate = useNavigate();

  const footerLinks = {
    producto: [
      { label: 'Cómo funciona', href: '/que-es' },
      { label: 'Para productores', href: '/productor' },
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
      { label: 'Términos', href: '/terms' },
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
    <footer className="border-t border-stone-800 bg-stone-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-4 text-xl font-bold">Hispaloshop</h3>
            <p className="mb-4 text-sm text-stone-400">
              Una forma más clara de descubrir, entender y comprar comida con contexto.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 transition-colors hover:text-white"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 font-semibold capitalize text-white">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.href)}
                      className="text-sm text-stone-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-stone-800 pt-8 text-center text-sm text-stone-400">
          Copyright {new Date().getFullYear()} Hispaloshop. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default FooterLanding;
