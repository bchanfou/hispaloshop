export const CATEGORY_GROUPS = [
  { slug: 'frescos',  icon: 'Leaf',       label: 'Frescos' },
  { slug: 'despensa', icon: 'Package',    label: 'Despensa' },
  { slug: 'snacks',   icon: 'Cookie',     label: 'Dulces y Snacks' },
  { slug: 'bebidas',  icon: 'CupSoda',    label: 'Bebidas' },
  { slug: 'bebes',    icon: 'Baby',       label: 'Bebés y Niños' },
  { slug: 'mascotas', icon: 'PawPrint',   label: 'Mascotas' },
  { slug: 'gourmet',  icon: 'Crown',      label: 'Gourmet' },
];

export const getGroupBySlug = (slug) =>
  CATEGORY_GROUPS.find((g) => g.slug === slug) || null;

export const CATEGORIES = [
  // FRESCOS
  { slug: 'frutas-verduras',  icon: 'Sprout',     label: 'Verduras',       group: 'frescos' },
  { slug: 'frutas',           icon: 'Apple',       label: 'Frutas',         group: 'frescos' },
  { slug: 'carnes',           icon: 'Beef',        label: 'Carnes',         group: 'frescos' },
  { slug: 'pescados',         icon: 'Fish',        label: 'Pescados',       group: 'frescos' },
  { slug: 'lacteos',          icon: 'MilkOff',     label: 'Lácteos',        group: 'frescos' },
  { slug: 'huevos',           icon: 'Egg',         label: 'Huevos',         group: 'frescos' },

  // DESPENSA
  { slug: 'aceites',          icon: 'Droplets',    label: 'Aceites',        group: 'despensa' },
  { slug: 'vinagres',         icon: 'Wine',        label: 'Vinagres',       group: 'despensa' },
  { slug: 'conservas',        icon: 'Package',     label: 'Conservas',      group: 'despensa' },
  { slug: 'legumbres',        icon: 'Bean',        label: 'Legumbres',      group: 'despensa' },
  { slug: 'arroces-pastas',   icon: 'Wheat',       label: 'Arroces',        group: 'despensa' },
  { slug: 'harinas',          icon: 'Wheat',       label: 'Harinas',        group: 'despensa' },
  { slug: 'mieles',           icon: 'Candy',       label: 'Mieles',         group: 'despensa' },
  { slug: 'especias',         icon: 'Flame',       label: 'Especias',       group: 'despensa' },

  // DULCES Y SNACKS
  { slug: 'chocolates',       icon: 'Cookie',      label: 'Chocolates',     group: 'snacks' },
  { slug: 'galletas',         icon: 'Cookie',      label: 'Galletas',       group: 'snacks' },
  { slug: 'frutos-secos',     icon: 'Nut',         label: 'Frutos secos',   group: 'snacks' },
  { slug: 'snacks-salados',   icon: 'Popcorn',     label: 'Snacks',         group: 'snacks' },
  { slug: 'reposteria',       icon: 'CakeSlice',   label: 'Repostería',     group: 'snacks' },

  // BEBIDAS SIN ALCOHOL
  { slug: 'zumos',            icon: 'Citrus',      label: 'Zumos',          group: 'bebidas' },
  { slug: 'infusiones',       icon: 'Coffee',      label: 'Infusiones',     group: 'bebidas' },
  { slug: 'aguas',            icon: 'Droplet',     label: 'Aguas',          group: 'bebidas' },
  { slug: 'refrescos',        icon: 'CupSoda',     label: 'Refrescos',      group: 'bebidas' },

  // BEBÉS Y NIÑOS
  { slug: 'bebes',            icon: 'Baby',        label: 'Bebés',          group: 'bebes' },
  { slug: 'ninos',            icon: 'Smile',       label: 'Niños',          group: 'bebes' },

  // MASCOTAS
  { slug: 'mascotas-perros',  icon: 'Dog',         label: 'Perros',         group: 'mascotas' },
  { slug: 'mascotas-gatos',   icon: 'Cat',         label: 'Gatos',          group: 'mascotas' },
  { slug: 'mascotas-otros',   icon: 'PawPrint',    label: 'Otras mascotas', group: 'mascotas' },

  // GOURMET
  { slug: 'gourmet',          icon: 'Crown',       label: 'Gourmet',        group: 'gourmet' },
  { slug: 'dop-igp',          icon: 'Award',       label: 'DOP / IGP',      group: 'gourmet' },
  { slug: 'ecologico',        emoji: '🌿', label: 'Ecológico',      group: 'gourmet' },
  { slug: 'sin-gluten',       emoji: '🌾', label: 'Sin gluten',     group: 'gourmet' },
  { slug: 'vegano',           emoji: '🌱', label: 'Vegano',         group: 'gourmet' },
];

export const getCategoryBySlug = (slug) =>
  CATEGORIES.find((c) => c.slug === slug) || null;

export const getCategoriesByGroup = (group) =>
  CATEGORIES.filter((c) => c.group === group);
