import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NavbarLanding = ({ variant = 'light', extraLinks = [] }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-white' : 'text-stone-950';
  const navTextColor = isDark ? 'text-stone-300' : 'text-stone-700';
  const bgColor = isDark ? 'bg-stone-950/95' : 'bg-white/95';

  const navLinks = [
    { label: 'Descubrir', href: '/discover' },
    { label: 'Ser Influencer', href: '/influencer' },
    { label: 'Ser Vendedor', href: '/productor' },
    ...extraLinks,
  ];

  const handleNav = (href) => {
    if (href.startsWith('#')) {
      const targetId = href.slice(1);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setIsOpen(false);
      return;
    }

    navigate(href);
    setIsOpen(false);
  };

  return (
    <nav className={`${bgColor} sticky top-0 z-50 border-b border-stone-200 backdrop-blur`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => navigate('/')} className={`text-xl font-bold ${textColor}`}>
            Hispaloshop
          </button>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link.href)}
                className={`text-sm font-medium ${navTextColor} transition-colors hover:text-stone-950`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => navigate('/login')}
              className={`text-sm font-medium ${navTextColor} transition-colors hover:text-stone-950`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/register/new')}
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              Registrarse
            </button>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className={`p-2 md:hidden ${textColor}`}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-stone-200 bg-white md:hidden">
          <div className="space-y-2 px-4 py-3">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link.href)}
                className="block w-full rounded-2xl px-3 py-2 text-left font-medium text-stone-950 transition-colors hover:bg-stone-50"
              >
                {link.label}
              </button>
            ))}
            <hr className="my-2 border-stone-200" />
            <button
              onClick={() => { navigate('/login'); setIsOpen(false); }}
              className="block w-full rounded-2xl px-3 py-2 text-left font-medium text-stone-950 transition-colors hover:bg-stone-50"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { navigate('/register/new'); setIsOpen(false); }}
              className="w-full rounded-2xl bg-stone-950 py-3 font-medium text-white transition-colors hover:bg-black"
            >
              Registrarse
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavbarLanding;
