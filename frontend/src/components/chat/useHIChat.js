import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

// Configuración por rol
const ROLE_CONFIG = {
  consumer: {
    name: 'HI Nutrición',
    avatar: '🍎',
    color: '#2D5A3D',
    welcomeMessage: '¡Hola! Soy HI, tu nutricionista personal. ¿En qué puedo ayudarte hoy?',
    suggestions: [
      { id: 'meal_plan', label: '🍽️ Planificar comidas', action: 'meal_plan' },
      { id: 'analyze_cart', label: '📊 Analizar mi cesta', action: 'analyze_cart' },
      { id: 'find_products', label: '🏪 Encontrar productos', action: 'find_products' },
      { id: 'recipe', label: '👨‍🍳 ¿Qué cocinar hoy?', action: 'recipe' },
    ],
  },
  producer: {
    name: 'HI Ventas',
    avatar: '📈',
    color: '#E6A532',
    welcomeMessage: '¡Hola! Soy HI, tu asistente de ventas. ¿Qué quieres analizar hoy?',
    suggestions: [
      { id: 'sales', label: '📈 Analizar ventas', action: 'sales_analysis' },
      { id: 'pricing', label: '💰 Optimizar precios', action: 'pricing' },
      { id: 'content', label: '📅 Calendario contenido', action: 'content_calendar' },
      { id: 'stock', label: '📦 Gestión stock', action: 'stock' },
    ],
  },
  importer: {
    name: 'HI Import',
    avatar: '🌍',
    color: '#2563EB',
    welcomeMessage: '¡Hola! Soy HI, tu analista de mercado internacional.',
    suggestions: [
      { id: 'find_producers', label: '🔍 Encontrar productores', action: 'find_producers' },
      { id: 'margins', label: '📊 Análisis de márgenes', action: 'margins' },
      { id: 'trends', label: '📈 Tendencias 2024', action: 'trends' },
      { id: 'b2b', label: '🤝 Negociaciones B2B', action: 'b2b' },
    ],
  },
  influencer: {
    name: 'HI Creator',
    avatar: '✨',
    color: '#9333EA',
    welcomeMessage: '¡Hola! Soy HI, tu creativo de contenido. ¿Qué vamos a crear hoy?',
    suggestions: [
      { id: 'caption', label: '✍️ Generar caption', action: 'caption' },
      { id: 'reel', label: '🎬 Ideas para reels', action: 'reel_ideas' },
      { id: 'analytics', label: '📊 Analizar posts', action: 'analytics' },
      { id: 'products', label: '🏷️ Productos para promocionar', action: 'promote_products' },
    ],
  },
};

// Mock responses para desarrollo
const MOCK_RESPONSES = {
  consumer: {
    meal_plan: `🗓️ **Plan de comidas para esta semana**

**Lunes:**
🥗 Desayuno: Yogur griego con miel y frutos secos
🍝 Comida: Pasta integral con pesto de albahaca
🐟 Cena: Salmón al horno con verduras

**Martes:**
🥑 Desayuno: Tostada de aguacate
🥘 Comida: Paella de marisco (porción moderada)
🥗 Cena: Ensalada de quinoa

¿Quieres que añada los ingredientes que te faltan a tu cesta?`,

    analyze_cart: `📊 **Análisis nutricional de tu cesta**

✅ **Bien:**
- Alto en proteínas (queso, jamón)
- Grasas saludables (aceite de oliva)
- Sin ultraprocesados

⚠️ **Mejorar:**
- Añade más verduras de hoja verde
- Considera reducir el queso si buscas adelgazar

🔥 **Calorías totales:** ~2,400 kcal/día
💰 **Coste medio por comida:** €4.50

¿Quieres que sugiera alternativas más ligeras?`,

    recipe: `👨‍🍳 **Receta rápida: Revuelto de espárragos**

⏱️ **Tiempo:** 15 minutos
👥 **Raciones:** 2

**Ingredientes:**
- 12 espárragos verdes
- 4 huevos camperos
- Aceite de oliva virgen extra
- Sal y pimienta

**Preparación:**
1. Saltea los espárragos 5 min
2. Bate los huevos y añade
3. Remueve suavemente hasta cuajar

💡 **Marida con:** Vino blanco verdejo
🛒 **Te faltan:** Espárragos (€3.50)`,

    find_products: `🏪 **Productos recomendados para ti**

Basándome en tu historial y preferencias:

1. 🧀 **Queso Manchego Curado** - €18.50
   ⭐ 4.8 (234 valoraciones)
   Similar al que compraste la semana pasada

2. 🫒 **AOVE Premium 1L** - €12.90
   ⭐ 4.9 (567 valoraciones)
   Oferta: -15% esta semana

3. 🍯 **Miel de Romero** - €8.90
   Producto local de tu zona

¿Te interesa alguno?`,
  },

  producer: {
    sales_analysis: `📈 **Análisis de ventas - Octubre 2024**

💰 **Ingresos:** €12,450 (+23% vs septiembre)
📦 **Pedidos:** 156 (+18%)
📊 **Ticket medio:** €79.80 (+4%)

🏆 **Top productos:**
1. Aceite EVOO 500ml - €4,250 (34%)
2. Queso Curado 1kg - €3,180 (26%)
3. Lote Gourmet - €2,890 (23%)

⚠️ **Productos con baja rotación:**
- Miel de azahar (12 unidades vendidas)
- Aceitunas rellenas (8 unidades)

💡 **Sugerencia:** Crear un bundle "Desayuno gourmet" con miel + aceite + pan artesanal.`,

    pricing: `💰 **Análisis de precios vs competencia**

Tu **Aceite EVOO 500ml:** €12.90
- Competidor A: €14.50 (+12%)
- Competidor B: €11.90 (-8%)
- Media mercado: €13.20

✅ **Estás bien posicionado**

Tu **Queso Curado:** €18.50/kg
- Competidor A: €16.90 (-9%)
- Competidor B: €22.00 (+19%)

⚠️ **Oportunidad:** Podrías subir a €19.50 sin perder competitividad
(+€1.00 x 89 unidades = +€89/mes)

¿Quieres que ajuste los precios sugeridos?`,

    content_calendar: `📅 **Calendario de contenido sugerido**

**Esta semana:**
📆 **Lunes:** "Lunes sin carne" - Destaca tu queso como alternativa proteica
📆 **Miércoles:** Behind the scenes - El proceso de elaboración
📆 **Viernes:** "Viernes de maridaje" - Queso + vino tinto
📆 **Domingo:** Receta rápida con tu producto estrella

🎯 **Mejores horarios para publicar:**
- Feed: 12:00 - 14:00 y 19:00 - 21:00
- Reels: 19:00 - 22:00
- Stories: 10:00 - 11:00 y 17:00 - 18:00

¿Quieres que genere los textos para alguna publicación?`,

    stock: `📦 **Alertas de stock**

🔴 **Urgente (agotan en <3 días):**
- Aceite EVOO 500ml: 12 unidades
- Queso Curado: 8 unidades

🟡 **Preventivo (agotan en <7 días):**
- Miel de romero: 23 unidades
- Jamón ibérico: 15 unidades

💡 **Sugerencias:**
1. Prioriza reponer aceite (tu producto estrella)
2. Considera pre-venta para queso (curado requiere tiempo)

¿Necesitas ayuda para calcular cantidades de reposición?`,
  },

  importer: {
    find_producers: `🔍 **Productores encontrados**

**Criterios:** Aceite BIO, Andalucía, >1000L/mes

1. **Cortijo Andaluz** (Córdoba)
   ✓ BIO certificado, 1500L/mes
   ⭐ 4.8/5 (127 valoraciones)
   💰 Desde €8.50/L (FOB)
   📞 Contacto: María G. (responde <24h)

2. **Olivar de Sierra** (Jaén)
   ✓ BIO, 2000L/mes
   ⭐ 4.6/5 (89 valoraciones)
   💰 Desde €7.90/L (FOB)
   🎁 Oferta: -5% primer pedido

3. **Aceites del Sur** (Sevilla)
   ✓ BIO, 1200L/mes
   ⭐ 4.7/5 (156 valoraciones)
   💰 Desde €8.20/L (FOB)
   🚚 Incluye transporte a tu almacén

¿Quieres que solicite muestras o información adicional?`,

    margins: `📊 **Análisis de márgenes: Aceite EVOO BIO**

**Costes:**
- Producto (FOB): €8.50/L
- Transporte: €0.80/L
- Aduanas/IVA: €2.10/L
- **Coste total:** €11.40/L

**Precio venta sugerido:** €16.90/L
**Margen bruto:** €5.50/L (32%)

📈 **Proyección:**
- Pedido mínimo: 500L
- Inversión inicial: €5,700
- Venta estimada: €8,450
- **Beneficio:** €2,750

✅ **Rentabilidad:** Muy buena (>30%)

¿Te gustaría ver el desglose completo con otros productos?`,

    trends: `📈 **Tendencias de mercado 2024**

🔥 **Productos en auge:**
1. AOVE ecológico (+45% búsquedas)
2. Quesos artesanales DOP (+38%)
3. Miel cruda sin filtrar (+52%)
4. Vinos naturales (+67%)

📍 **Zonas de crecimiento:**
- Alemania: +23% demanda española
- Países Nórdicos: +41%
- EEUU (este): +19%

⚠️ **Oportunidad detectada:**
Escasez de productores de "queso de cabra" BIO en tu región objetivo. Solo 3 productores con capacidad >500kg/mes.

💡 **Recomendación:** Contactar productores de Andalucía Occidental.`,

    b2b: `🤝 **Negociaciones activas**

**Con Cortijo Andaluz:**
📋 Estado: Pendiente de muestras
📅 Último contacto: Hace 3 días
💰 Negociando: Precio objetivo €8.00/L
⏱️ Respuesta típica: 24-48h

**Siguiente paso sugerido:**
Enviar email de seguimiento mencionando:
- Pedido inicial garantizado: 1000L
- Posibilidad de contrato anual
- Pago a 30 días (estándar)

📝 **Template listo:**
"Hola María, siguiendo nuestra conversación..."

¿Quieres que envíe el email o prefieres revisarlo primero?`,
  },

  influencer: {
    caption: `✍️ **Captions para tu reel de queso**

**Opción 1 (Storytelling):**
"Este queso cuesta €18 y la gente hace cola desde las 6am... 🧀

Te explico por qué:
✨ 12 meses de curación artesanal
✨ Leche de oveja de pastoreo
✨ El último quesero de la familia (3ª generación)

El sabor es... indescriptible. 😍

#quesomanchego #artesano #foodie #hispaloshop"

**Opción 2 (Humor):**
"POV: Pruebas queso curado de verdad después de años comiendo plástico amarillo 😅

Yo antes: "El queso es queso"
Yo ahora: ADICTA 🧀

📍 Quesería La Antigua (Manchego)

#queso #realfood #manchego #descubrimiento"

**Opción 3 (Educativo):**
"¿Sabías que el Queso Manchego DOP tiene que cumplir 15 requisitos? 📋

El más importante: estar hecho 100% con leche de oveja manchega 🐑

Este de @queserialaantigua es el auténtico...
[ver más]"

¿Cuál prefieres? ¿O quieres que combine elementos?`,

    reel_ideas: `🎬 **Ideas de reels virales**

**1. "Expectativa vs Realidad"**
- Compras queso en supermercado 😐
- Compras queso artesano 🤩
- Reacción genuina al probar

**2. "ASMR - Corte de queso"**
- Sonido del cuchillo
- Textura al partir
- Close-up del interior

**3. "El reto del quesero"**
- Intentas cortar el queso "como un pro"
- El quesero real te corrige amablemente
- Aprendes la técnica correcta

**4. "Del campo a tu mesa"**
- Ovejas pastando 🐑
- Ordeño tradicional
- Elaboración del queso
- El resultado final

¿Cuál te motiva más? Te puedo escribir el guion completo.`,

    analytics: `📊 **Análisis de tu último post**

**Reel: "Corte de jamón ibérico"**

📈 **Performance:**
- Reproducciones: 12.4k (+340% vs tu media)
- Likes: 890 (+180%)
- Compartidos: 156 (+520%) 🚀
- Comentarios: 67 (+95%)

🎯 **Por qué funcionó:**
1. Hook efectivo (primer 3s: "Esto cuesta €89/kg")
2. ASMR del corte (retención 78%)
3. Producto etiquetado visible

💰 **Impacto ventas:**
- 34 clics al producto
- 12 añadidos al carrito
- 4 compras completadas

✅ **Recomendación:** Más contenido ASMR + precios en hook`,

    promote_products: `🏷️ **Productos recomendados para promocionar**

Basándome en tu audiencia (foodie, 65% 25-34 años, España):

**1. Queso Manchego Curado** - €18.50
✅ Match 95% con tu contenido
💰 Comisión: 8% (€1.48/venta)
🎯 Estimado: 15-25 ventas/post

**2. Lote Gourmet "Desayuno"** - €29.90
✅ Ideal para reels "unboxing"
💰 Comisión: 10% (€2.99/venta)
🎯 Estimado: 20-30 ventas/post

**3. AOVE Premium 1L** - €12.90
✅ Producto recurrente (recompra)
💰 Comisión: 12% (€1.55/venta)
🎯 Estimado: 30-50 ventas/post

💡 **Oportunidad:** El lote gourmet tiene stock limitado. Escasez = urgencia = más conversiones.

¿Quiero que genere ideas de contenido para alguno?`,
  },
};

// Respuesta por defecto si no hay mock específico
const DEFAULT_RESPONSE = `Entiendo tu pregunta. Déjame ayudarte con eso.

Basándome en la información disponible, te sugiero:

1. Explorar las opciones en tu panel de control
2. Contactar con soporte si necesitas ayuda personalizada
3. Revisar nuestra guía de inicio rápido

¿Hay algo específico sobre lo que quieras profundizar?`;

export function useHIChat() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState(() => {
    // Detectar rol del usuario o usar consumer por defecto
    const savedRole = localStorage.getItem('hiActiveRole');
    if (savedRole) return savedRole;
    
    if (user?.role === 'producer' || user?.role === 'importer') {
      return user.role;
    }
    if (user?.role === 'influencer') {
      return 'influencer';
    }
    return 'consumer';
  });
  
  const [messages, setMessages] = useState(() => {
    // Cargar historial del rol activo
    const saved = localStorage.getItem(`hiChat_${activeRole}`);
    if (saved) {
      return JSON.parse(saved);
    }
    // Mensaje inicial
    const config = ROLE_CONFIG[activeRole];
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: config.welcomeMessage,
        timestamp: Date.now(),
      },
    ];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(() => {
    return ROLE_CONFIG[activeRole].suggestions;
  });

  // Persistir mensajes
  useEffect(() => {
    localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(messages));
  }, [messages, activeRole]);

  // Persistir rol activo
  useEffect(() => {
    localStorage.setItem('hiActiveRole', activeRole);
  }, [activeRole]);

  // Cambiar de rol
  const switchRole = useCallback((newRole) => {
    setActiveRole(newRole);
    // Cargar mensajes del nuevo rol
    const saved = localStorage.getItem(`hiChat_${newRole}`);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      const config = ROLE_CONFIG[newRole];
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: config.welcomeMessage,
          timestamp: Date.now(),
        },
      ]);
    }
    setSuggestions(ROLE_CONFIG[newRole].suggestions);
  }, []);

  // Enviar mensaje
  const sendMessage = useCallback(async (content, context = {}) => {
    // Añadir mensaje del usuario
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

    // Generar respuesta mock
    let responseContent = DEFAULT_RESPONSE;
    
    // Buscar si hay una respuesta mock específica
    const roleResponses = MOCK_RESPONSES[activeRole];
    if (roleResponses) {
      // Buscar keyword en el mensaje
      const lowerContent = content.toLowerCase();
      for (const [key, response] of Object.entries(roleResponses)) {
        if (lowerContent.includes(key.replace('_', ' ')) || 
            context.action === key) {
          responseContent = response;
          break;
        }
      }
    }

    // Respuesta de HI
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    return assistantMessage;
  }, [activeRole]);

  // Limpiar conversación
  const clearChat = useCallback(() => {
    const config = ROLE_CONFIG[activeRole];
    const newMessages = [
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: config.welcomeMessage,
        timestamp: Date.now(),
      },
    ];
    setMessages(newMessages);
    localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(newMessages));
  }, [activeRole]);

  // Usar sugerencia
  const useSuggestion = useCallback(async (suggestion) => {
    const { label, action } = suggestion;
    // Enviar el label como mensaje
    await sendMessage(label, { action });
  }, [sendMessage]);

  return {
    activeRole,
    roleConfig: ROLE_CONFIG[activeRole],
    messages,
    isLoading,
    suggestions,
    sendMessage,
    switchRole,
    clearChat,
    useSuggestion,
    availableRoles: Object.keys(ROLE_CONFIG),
  };
}

export default useHIChat;
