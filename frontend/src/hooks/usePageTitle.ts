import { useEffect } from 'react';

const BASE_TITLE = 'Hispaloshop';

const PAGE_TITLES: Record<string, string> = {
  '/':           'Hispaloshop — La alimentación artesanal española',
  '/about':      '¿Qué es Hispaloshop? — Nuestra historia',
  '/productor':  'Para Productores — Hispaloshop',
  '/influencer': 'Para Influencers — Hispaloshop',
  '/importador': 'Para Importadores — Hispaloshop',
  '/precios':    'Planes y Precios — Hispaloshop',
  '/contacto':   'Contacto — Hispaloshop',
  '/explore':    'Explorar — Hispaloshop',
  '/login':      'Entrar — Hispaloshop',
  '/register':   'Crear cuenta — Hispaloshop',
};

export const usePageTitle = (customTitle?: string): void => {
  useEffect(() => {
    const path = window.location.pathname;
    document.title = customTitle
      || PAGE_TITLES[path]
      || BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [customTitle]);
};
