import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../brand/Logo';
import { useTranslation } from 'react-i18next';
const NAV_LINKS = [{
  label: "Qué es",
  to: '/about'
}, {
  label: 'Productores',
  to: '/productor'
}, {
  label: 'Influencers',
  to: '/influencer'
}, {
  label: 'Precios',
  to: '/pricing'
}, {
  label: 'Blog',
  to: '/blog'
}];
export default function InfoHeader() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  // Scroll-aware: transparent → dark blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Close drawer on Escape
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-stone-950/85 backdrop-blur-[20px] border-b border-white/[0.08]' : 'bg-transparent border-b border-transparent'}`}>
        {/* ── Mobile ── */}
        <div className="lg:hidden h-[52px] flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Logo variant="icon" theme="dark" size={26} />
            <span className="text-base font-bold text-white">
              Hispaloshop
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/login" className="py-[7px] px-3.5 text-[11px] font-semibold text-white no-underline border border-white/25 rounded-full bg-transparent transition-colors">
              Entrar
            </Link>

            {/* Hamburger */}
            <button onClick={() => setDrawerOpen(v => !v)} className="flex items-center justify-center w-[38px] h-[38px] border-none bg-transparent cursor-pointer text-white" aria-label={drawerOpen ? t('info_header.cerrarMenu', 'Cerrar menú') : 'Abrir menú'}>
              {drawerOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Desktop ── */}
        <div className="hidden lg:grid h-[60px] grid-cols-[200px_1fr_200px] items-center max-w-[1200px] mx-auto px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <Logo variant="icon" theme="dark" size={28} />
            <span className="text-lg font-bold text-white">
              Hispaloshop
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center justify-center gap-1">
            {NAV_LINKS.map(link => <Link key={link.to} to={link.to} className="py-2 px-4 text-sm font-medium text-white/80 no-underline rounded-full transition-all duration-150 hover:text-white hover:bg-white/10">
                {link.label}
              </Link>)}
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <Link to="/login" className="py-2 px-[18px] text-sm font-semibold text-white no-underline border border-white/25 rounded-full bg-transparent transition-all duration-150 hover:bg-white/10 hover:border-white/40">
              Entrar
            </Link>
            <Link to="/register" className="py-2 px-[18px] text-sm font-semibold text-white no-underline rounded-full bg-stone-950 border border-stone-950 transition-colors">
              Empieza gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {drawerOpen && <>
            {/* Backdrop */}
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} transition={{
          duration: 0.2
        }} onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/50 z-50" />

            {/* Drawer panel */}
            <motion.div ref={drawerRef} initial={{
          x: '100%'
        }} animate={{
          x: 0
        }} exit={{
          x: '100%'
        }} transition={{
          type: 'spring',
          damping: 28,
          stiffness: 300
        }} className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-[51] flex flex-col shadow-xl">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200">
                <span className="text-sm font-bold text-stone-950">
                  Menú
                </span>
                <button onClick={() => setDrawerOpen(false)} className="flex items-center justify-center w-8 h-8 border-none bg-stone-100 rounded-full cursor-pointer">
                  <X size={16} className="text-stone-950" />
                </button>
              </div>

              {/* Links */}
              <nav className="flex-1 p-3 px-2 overflow-y-auto">
                {NAV_LINKS.map(link => <Link key={link.to} to={link.to} onClick={() => setDrawerOpen(false)} className="flex items-center justify-between px-3 py-3.5 rounded-xl no-underline text-base font-medium text-stone-950">
                    {link.label}
                    <ChevronRight size={16} className="text-stone-500" />
                  </Link>)}
              </nav>

              {/* CTA */}
              <div className="p-4 border-t border-stone-200 flex flex-col gap-2">
                <Link to="/register" onClick={() => setDrawerOpen(false)} className="flex items-center justify-center h-11 rounded-full bg-stone-950 text-white text-sm font-semibold no-underline">
                  Empieza gratis
                </Link>
                <Link to="/login" onClick={() => setDrawerOpen(false)} className="flex items-center justify-center h-11 rounded-full bg-transparent text-stone-950 text-sm font-semibold no-underline border border-stone-200">
                  Iniciar sesión
                </Link>
              </div>
            </motion.div>
          </>}
      </AnimatePresence>
    </>;
}