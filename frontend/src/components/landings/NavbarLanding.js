import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NavbarLanding = ({ variant = 'light', extraLinks = [] }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-white' : 'text-stone-950';
  const navTextColor = isDark ? 'text-stone-300' : 'text-stone-700';
  const navHoverColor = isDark ? 'hover:text-white' : 'hover:text-stone-950';
  const bgColor = isDark ? 'bg-stone-950/95' : 'bg-white/95';
  const borderColor = isDark ? 'border-stone-800' : 'border-stone-200';
  const mobilePanelBgColor = isDark ? 'bg-stone-950 text-white' : 'bg-white text-stone-950';
  const mobileItemTextColor = isDark ? 'text-stone-300 hover:text-white' : 'text-stone-950';
  const mobileItemHoverColor = isDark ? 'hover:bg-white/5' : 'hover:bg-stone-50';
  const mobileCtaClass = isDark
    ? 'bg-white text-stone-950 hover:bg-stone-100'
    : 'bg-stone-950 text-white hover:bg-black';

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
    <nav className={`${bgColor} sticky top-0 z-50 border-b ${borderColor} backdrop-blur`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className={`text-xl font-bold ${textColor}`}>
            Hispaloshop
          </button>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNav(link.href)}
                className={`text-sm font-medium ${navTextColor} ${navHoverColor} transition-colors`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`text-sm font-medium ${navTextColor} ${navHoverColor} transition-colors`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => navigate('/register/new')}
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              Registrarse
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 md:hidden ${textColor}`}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className={`md:hidden ${mobilePanelBgColor} border-t ${borderColor}`}>
          <div className="space-y-2 px-4 py-3">
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNav(link.href)}
                className={`block w-full rounded-2xl px-3 py-2 text-left font-medium transition-colors ${mobileItemTextColor} ${mobileItemHoverColor}`}
              >
                {link.label}
              </button>
            ))}
            <hr className={`my-2 ${borderColor}`} />
            <button
              type="button"
              onClick={() => {
                navigate('/login');
                setIsOpen(false);
              }}
              className={`block w-full rounded-2xl px-3 py-2 text-left font-medium transition-colors ${mobileItemTextColor} ${mobileItemHoverColor}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/register/new');
                setIsOpen(false);
              }}
              className={`w-full rounded-2xl py-3 font-medium transition-colors ${mobileCtaClass}`}
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
