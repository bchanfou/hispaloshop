# HispaloShop

> **E-commerce social marketplace** conectando productores locales con consumidores conscientes.
> Launch: ES + KR + US | Todos los roles | Calidad > Velocidad

[![Deploy](https://img.shields.io/badge/deploy-Railay-%230B0D0E)](https://railway.app)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-%23000000)](https://vercel.com)
[![License](https://img.shields.io/badge/license-Private-red)](#)

---

## 🚀 Quick Start

```bash
# 1. Clone y setup
git clone <repo>
cd hispaloshop

# 2. Backend
cd backend
cp .env.example .env
# Editar .env con tus variables
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend (nueva terminal)
cd frontend
npm install
npm start
```

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para despliegue a producción.

---

## 📁 Estructura del Proyecto

```
hispaloshop/
├── backend/           # FastAPI + MongoDB
│   ├── routes/        # API endpoints (66 routers)
│   ├── services/      # Business logic
│   ├── core/          # Auth, models, config
│   └── main.py        # Entry point
├── frontend/          # React 19 + Tailwind
│   ├── src/pages/     # 170+ páginas
│   ├── src/components/# Componentes reutilizables
│   └── src/locales/   # i18n (ES/EN/KO)
├── docs/              # Documentación adicional
└── scripts/           # Automatización
```

---

## ✨ Features Principales

### Consumer
- **Home Feed** puramente social (Instagram-like)
- **Universal Search** (Ctrl+K) - 7 tipos de entidades
- **Recetas** con ingredientes comprables
- **Wishlists** compartibles
- **Chat** con audio, grupos, request inbox

### Sellers
- **Producer Dashboard** con analytics
- **Plan tiers**: FREE / PRO (79€) / ELITE (149€)
- **AI Assistants**: David (consumer), Rebeca (PRO), Pedro (ELITE)
- **Market Interest** - "Tráelo a mi país" leads

### Operations
- **Admin Dashboard** country-scoped
- **Super Admin** global view
- **Support Ticketing** integrado
- **Feedback System** con votos

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Tailwind CSS, i18next |
| Backend | FastAPI, MongoDB, Pydantic |
| AI | Claude (Anthropic) |
| Pagos | Stripe (Checkout + Connect) |
| Imágenes | Cloudinary |
| Email | Resend |
| Push | Firebase Cloud Messaging |
| Monitoreo | Sentry |

---

## 📋 Fases Completadas

- ✅ **FASE 0**: Fundamentos (design system, backups, testing)
- ✅ **FASE 1**: Consumer (feed, cart, checkout, chat, recipes, search)
- ✅ **FASE 2**: Sellers (dashboards, AI, plans, payouts)
- ✅ **FASE 3**: Operations (admin, support, feedback, moderation)
- ✅ **FASE 4**: Legal/Fiscal/Polish (GDPR, i18n, performance, a11y)
- 🔄 **FASE 5**: Launch Prep

Ver [ROADMAP_LAUNCH.md](ROADMAP_LAUNCH.md) para detalles.

---

## 🧪 Testing

```bash
# Verificacion recomendada desde raiz (lint + build frontend + backend focal)
npm run verify

# Verificacion completa desde raiz (incluye backend completo)
npm run verify:full

# Equivalentes por area
npm run lint:frontend
npm run build:frontend
npm run verify:backend
```

### Gate de calidad

- Usar `npm run verify` como validacion minima antes de merge.
- Usar `npm run verify:full` antes de release/deploy grande.

---

## 📚 Documentación

- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía de despliegue
- [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) - Checklist día del launch
- [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) - Runbooks de emergencia
- [ROADMAP_LAUNCH.md](ROADMAP_LAUNCH.md) - Roadmap completo
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - Tokens y guía de diseño

---

## 🔐 Variables de Entorno Críticas

Ver `backend/.env.example` para lista completa (45+ variables).

**Mínimas para desarrollo:**
```bash
ENV=development
JWT_SECRET=dev-secret-min-32-chars-long
MONGO_URL=mongodb://localhost:27017/hispaloshop
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

---

## 📝 Licencia

Private - Todos los derechos reservados.

---

**Built with ❤️ for local commerce.**
