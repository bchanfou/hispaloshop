import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NavbarLanding = ({ variant = 'light', extraLinks = [] }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const bgColor = isDark ? 'bg-accent' : 'bg-white';
  
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
    <nav className={`${bgColor} sticky top-0 z-50 border-b border-gray-100`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className={`text-xl font-bold ${textColor}`}
          >
            Hispaloshop
          </button>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link.href)}
                className={`text-sm font-medium ${textColor} hover:opacity-70 transition-opacity`}
              >
                {link.label}
              </button>
            ))}
          </div>
          
          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className={`text-sm font-medium ${textColor} hover:opacity-70`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/register/new')}
              className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent/90 transition-colors"
            >
              Registrarse
            </button>
          </div>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 ${textColor}`}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link.href)}
                className="block w-full text-left py-2 text-gray-900 font-medium"
              >
                {link.label}
              </button>
            ))}
            <hr className="my-2" />
            <button
              onClick={() => { navigate('/login'); setIsOpen(false); }}
              className="block w-full text-left py-2 text-gray-900 font-medium"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { navigate('/register/new'); setIsOpen(false); }}
              className="w-full py-2 bg-accent text-white font-medium rounded-lg"
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
