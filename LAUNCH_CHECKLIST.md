# HISPALOSHOP — Checklist de Lanzamiento

## Ejecutar el día antes del lanzamiento

### Infraestructura
- [ ] Variables de entorno en Railway (backend):
      ANTHROPIC_API_KEY, SENTRY_DSN, CLOUDINARY_*, STRIPE_*, MONGODB_URI
- [ ] Variables de entorno en Vercel (frontend):
      REACT_APP_API_URL, REACT_APP_SENTRY_DSN, REACT_APP_ENV=production
- [ ] MongoDB Atlas: IP whitelist incluye Railway + tu IP local
- [ ] Stripe: modo live activado (no test mode)
- [ ] Cloudinary: plan activo y límites revisados
- [ ] Dominio hispaloshop.com apuntando a Vercel

### Backend (Railway)
- [ ] GET  https://api.hispaloshop.com/health → 200 OK
- [ ] GET  https://api.hispaloshop.com/api/v1/commercial-ai/markets → 200 con 9+ mercados
- [ ] POST https://api.hispaloshop.com/api/v1/hispal-ai/chat → responde (401 sin token)

### Frontend (Vercel)
- [ ] https://hispaloshop.com carga en < 3s
- [ ] https://hispaloshop.com/productor → precio ELITE = 249€
- [ ] https://hispaloshop.com/importador → carga correctamente
- [ ] https://hispaloshop.com/influencer → sin mención a IA creativa
- [ ] https://hispaloshop.com/que-es-hispaloshop → carga correctamente

### Flujos críticos (hacer manualmente con cuenta real)
- [ ] Registro como consumidor → llega email de bienvenida
- [ ] Login → redirige al feed
- [ ] Feed carga posts → no hay errores de consola
- [ ] Hispal AI: escribir "busca aceite ecológico" → aparecen ProductCards
- [ ] Hispal AI: "añade el primero al carrito" → badge del carrito sube
- [ ] Añadir producto al carrito → carrito muestra el item
- [ ] Checkout con tarjeta de test Stripe → pedido confirmado
      (tarjeta: 4242 4242 4242 4242, exp: cualquier fecha futura, CVC: cualquiera)
- [ ] Checkout con 3DS → modal de autenticación aparece y funciona
      (tarjeta: 4000 0027 6000 3184)
- [ ] Crear un post → se publica en el feed
- [ ] Seguir a un usuario → contador de seguidores sube
- [ ] Modal de seguidores → lista se abre al clicar el número
- [ ] BottomNav → scroll down lo oculta, scroll up lo muestra
- [ ] Pull-to-refresh → spinner aparece y el feed se actualiza

### Panel productor (con cuenta productora)
- [ ] Dashboard carga sin errores
- [ ] Agente Comercial: escribir "analiza Alemania" → MarketCard aparece
- [ ] Agente Comercial: "genera un contrato" → PDF descargable
- [ ] Con productor sin ELITE → UpgradeScreen aparece

### Seguridad
- [ ] DevTools → Network → WebSocket URL sin ?token= en la URL
- [ ] DevTools → Console → sin logs de debug visibles
- [ ] Modo incógnito → banner de GDPR aparece
- [ ] Aceptar GDPR → banner desaparece y no vuelve al recargar
- [ ] Rechazar GDPR → analytics no se inicializa

### Monitoring
- [ ] Sentry dashboard → error rate < 1%
- [ ] Railway metrics → CPU < 70%, memoria < 80%
- [ ] Vercel analytics → Core Web Vitals en verde

### Post-lanzamiento (primeras 2 horas)
- [ ] Monitorizar Sentry cada 30 minutos
- [ ] Revisar Railway logs por errores 500
- [ ] Verificar que los primeros registros llegan correctamente
- [ ] Confirmar que los emails transaccionales se envían

---
Fecha de lanzamiento: ___________
Responsable técnico: ___________
Firma: ___________
