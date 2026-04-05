// ═══════════════════════════════════════════════════════════════════════════
// HISPALOSHOP — Copy constants (single source of truth para frases recurrentes)
// ---------------------------------------------------------------------------
// Ground truth: DESIGN_SYSTEM.md → sección "Copy guidelines".
//
// Reglas:
// - Tono por defecto: cercano, tuteo, toca la fibra. "Tu productor",
//   "tu comunidad", "descubre a quién alimenta tu mesa".
// - Tono profesional (B2B, admin, fiscal, billing): directo, minimalista,
//   sin adjetivos. Estas frases viven en `pro.*`.
// - Nunca: corporativo frío, "nosotros en HispaloShop nos enorgullecemos...",
//   emojis decorativos.
// - Las frases son sugerencias reutilizables: si una página necesita una
//   variante contextual más específica, escribe la frase inline.
// - Integración con i18n: estas constantes son el ES default. Cuando la
//   sección 4.3 (i18n) esté activa, servirán como fallback keys.
// ═══════════════════════════════════════════════════════════════════════════

export const COPY = {
  // ── Empty states (tono cercano) ─────────────────────────────────────────
  emptyStates: {
    noProducts: 'Aún no hay productos aquí. Explora otros productores.',
    noResults: 'No hemos encontrado nada con esos términos.',
    noOrders: 'Cuando hagas tu primer pedido, aparecerá aquí.',
    noMessages: 'Aquí aparecerán tus conversaciones.',
    noNotifications: 'Estás al día.',
    noFollowers: 'Todavía no te sigue nadie. Comparte tu perfil.',
    noFollowing: 'No sigues a nadie aún. Descubre productores cerca.',
    noSaved: 'Los productos que guardes aparecerán aquí.',
    noCommunities: 'No formas parte de ninguna comunidad todavía.',
    noStories: 'No hay stories nuevas. Vuelve más tarde.',
    emptyCart: 'Tu carrito está vacío. Descubre quién alimenta tu mesa.',
    emptyWishlist: 'Guarda productos y recetas para volver a ellos.',
    noDrafts: 'Tus borradores aparecerán aquí.',
  },

  // ── Errors (tono cercano + útil, sin alarmar) ──────────────────────────
  errors: {
    generic: 'Algo no salió bien. Inténtalo de nuevo.',
    network: 'Sin conexión. Revisa tu internet y reintenta.',
    notFound: 'No hemos encontrado lo que buscas.',
    unauthorized: 'Necesitas iniciar sesión para hacer esto.',
    forbidden: 'No tienes permiso para ver esto.',
    validation: 'Revisa los campos marcados.',
    retry: 'Algo falló. Prueba otra vez.',
    tooLarge: 'El archivo es demasiado grande. Máximo {size}.',
    wrongFormat: 'Formato no soportado. Prueba con {formats}.',
    rateLimited: 'Vas muy rápido. Espera un momento.',
  },

  // ── Call-to-actions (verbos directos) ──────────────────────────────────
  cta: {
    addToCart: 'Añadir al carrito',
    buyNow: 'Comprar ahora',
    follow: 'Seguir',
    following: 'Siguiendo',
    unfollow: 'Dejar de seguir',
    save: 'Guardar',
    saved: 'Guardado',
    share: 'Compartir',
    seeMore: 'Ver más',
    seeLess: 'Ver menos',
    continue: 'Continuar',
    back: 'Volver',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    edit: 'Editar',
    publish: 'Publicar',
    send: 'Enviar',
    retry: 'Reintentar',
    refresh: 'Actualizar',
    viewProfile: 'Ver perfil',
    viewStore: 'Ver tienda',
    viewProduct: 'Ver producto',
    contactSeller: 'Contactar al productor',
    exploreProducers: 'Explorar productores',
  },

  // ── Onboarding / welcome (tono cercano + aspiracional) ─────────────────
  onboarding: {
    welcomeTitle: 'Bienvenido a HispaloShop',
    welcomeSubtitle: 'Descubre quién está detrás de cada producto.',
    welcomeCta: 'Empezar',
    step1Title: 'Compra directo al productor',
    step1Body: 'Conecta con las personas que cultivan, crían o elaboran lo que comes.',
    step2Title: 'Descubre historias reales',
    step2Body: 'Cada tienda tiene un nombre, una cara y una historia.',
    step3Title: 'Come mejor, sabe más',
    step3Body: 'Transparencia radical: origen, ingredientes, certificaciones.',
    signupCta: 'Crear cuenta',
    loginCta: 'Ya tengo cuenta',
  },

  // ── Checkout flow (tono cercano pero enfocado en claridad) ─────────────
  checkout: {
    summary: 'Resumen del pedido',
    shippingTo: 'Enviar a',
    paymentMethod: 'Método de pago',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    total: 'Total',
    payNow: 'Pagar ahora',
    placeOrder: 'Confirmar pedido',
    processing: 'Procesando tu pago…',
    success: '¡Pedido confirmado!',
    successSubtitle: 'Te avisaremos cuando tu productor prepare el envío.',
    failedTitle: 'El pago no se completó',
    failedBody: 'Revisa los datos de tu tarjeta e inténtalo de nuevo.',
  },

  // ── Profesional (B2B / admin / fiscal / billing — directo, minimalista) ─
  pro: {
    // B2B
    moq: 'Cantidad mínima',
    incoterm: 'Incoterm',
    deliveryDays: 'Plazo de entrega',
    paymentTerms: 'Condiciones de pago',
    requestQuote: 'Solicitar presupuesto',
    sendOffer: 'Enviar oferta',
    acceptOffer: 'Aceptar oferta',
    counterOffer: 'Contrapropuesta',
    contractPending: 'Contrato pendiente',
    contractSigned: 'Contrato firmado',
    // Admin
    approve: 'Aprobar',
    reject: 'Rechazar',
    suspend: 'Suspender',
    activate: 'Activar',
    bulkAction: 'Acción masiva',
    exportCsv: 'Exportar CSV',
    filters: 'Filtros',
    // Fiscal / billing
    vatNumber: 'NIF / VAT',
    invoice: 'Factura',
    withholding: 'Retención',
    balanceAvailable: 'Saldo disponible',
    payoutRequest: 'Solicitar cobro',
    nextPayout: 'Próximo cobro',
    commission: 'Comisión',
  },

  // ── Form labels (neutros, reutilizables) ───────────────────────────────
  forms: {
    email: 'Email',
    password: 'Contraseña',
    passwordConfirm: 'Confirmar contraseña',
    name: 'Nombre',
    fullName: 'Nombre completo',
    username: 'Usuario',
    phone: 'Teléfono',
    country: 'País',
    city: 'Ciudad',
    address: 'Dirección',
    postalCode: 'Código postal',
    required: 'Obligatorio',
    optional: 'Opcional',
    search: 'Buscar',
    searchPlaceholder: 'Buscar productos, productores, recetas…',
  },
} as const;

export type CopyNamespace = keyof typeof COPY;
