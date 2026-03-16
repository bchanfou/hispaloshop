export const CATEGORY_GROUPS = [
  { slug: 'frescos',  emoji: '🥬', label: 'Frescos' },
  { slug: 'despensa', emoji: '🫙', label: 'Despensa' },
  { slug: 'snacks',   emoji: '🍫', label: 'Dulces y Snacks' },
  { slug: 'bebidas',  emoji: '🥤', label: 'Bebidas' },
  { slug: 'bebes',    emoji: '👶', label: 'Bebés y Niños' },
  { slug: 'mascotas', emoji: '🐾', label: 'Mascotas' },
  { slug: 'gourmet',  emoji: '⭐', label: 'Gourmet' },
];

export const getGroupBySlug = (slug) =>
  CATEGORY_GROUPS.find((g) => g.slug === slug) || null;

export const CATEGORIES = [
  // FRESCOS
  { slug: 'frutas-verduras',  emoji: '🥦', label: 'Verduras',       group: 'frescos' },
  { slug: 'frutas',           emoji: '🍎', label: 'Frutas',         group: 'frescos' },
  { slug: 'carnes',           emoji: '🥩', label: 'Carnes',         group: 'frescos' },
  { slug: 'pescados',         emoji: '🐟', label: 'Pescados',       group: 'frescos' },
  { slug: 'lacteos',          emoji: '🧀', label: 'Lácteos',        group: 'frescos' },
  { slug: 'huevos',           emoji: '🥚', label: 'Huevos',         group: 'frescos' },

  // DESPENSA
  { slug: 'aceites',          emoji: '🫒', label: 'Aceites',        group: 'despensa' },
  { slug: 'vinagres',         emoji: '🍶', label: 'Vinagres',       group: 'despensa' },
  { slug: 'conservas',        emoji: '🫙', label: 'Conservas',      group: 'despensa' },
  { slug: 'legumbres',        emoji: '🫘', label: 'Legumbres',      group: 'despensa' },
  { slug: 'arroces-pastas',   emoji: '🌾', label: 'Arroces',        group: 'despensa' },
  { slug: 'harinas',          emoji: '🌾', label: 'Harinas',        group: 'despensa' },
  { slug: 'mieles',           emoji: '🍯', label: 'Mieles',         group: 'despensa' },
  { slug: 'especias',         emoji: '🌶️', label: 'Especias',       group: 'despensa' },

  // DULCES Y SNACKS
  { slug: 'chocolates',       emoji: '🍫', label: 'Chocolates',     group: 'snacks' },
  { slug: 'galletas',         emoji: '🍪', label: 'Galletas',       group: 'snacks' },
  { slug: 'frutos-secos',     emoji: '🥜', label: 'Frutos secos',   group: 'snacks' },
  { slug: 'snacks-salados',   emoji: '🧂', label: 'Snacks',         group: 'snacks' },
  { slug: 'reposteria',       emoji: '🥐', label: 'Repostería',     group: 'snacks' },

  // BEBIDAS SIN ALCOHOL
  { slug: 'zumos',            emoji: '🍊', label: 'Zumos',          group: 'bebidas' },
  { slug: 'infusiones',       emoji: '🍵', label: 'Infusiones',     group: 'bebidas' },
  { slug: 'aguas',            emoji: '💧', label: 'Aguas',          group: 'bebidas' },
  { slug: 'refrescos',        emoji: '🥤', label: 'Refrescos',      group: 'bebidas' },

  // BEBÉS Y NIÑOS
  { slug: 'bebes',            emoji: '👶', label: 'Bebés',          group: 'bebes' },
  { slug: 'ninos',            emoji: '🧒', label: 'Niños',          group: 'bebes' },

  // MASCOTAS
  { slug: 'mascotas-perros',  emoji: '🐕', label: 'Perros',         group: 'mascotas' },
  { slug: 'mascotas-gatos',   emoji: '🐈', label: 'Gatos',          group: 'mascotas' },
  { slug: 'mascotas-otros',   emoji: '🐾', label: 'Otras mascotas', group: 'mascotas' },

  // GOURMET
  { slug: 'gourmet',          emoji: '⭐', label: 'Gourmet',        group: 'gourmet' },
  { slug: 'dop-igp',          emoji: '🏆', label: 'DOP / IGP',      group: 'gourmet' },
  { slug: 'ecologico',        emoji: '🌿', label: 'Ecológico',      group: 'gourmet' },
  { slug: 'sin-gluten',       emoji: '🌾', label: 'Sin gluten',     group: 'gourmet' },
  { slug: 'vegano',           emoji: '🌱', label: 'Vegano',         group: 'gourmet' },
];

export const getCategoryBySlug = (slug) =>
  CATEGORIES.find((c) => c.slug === slug) || null;

export const getCategoriesByGroup = (group) =>
  CATEGORIES.filter((c) => c.group === group);
