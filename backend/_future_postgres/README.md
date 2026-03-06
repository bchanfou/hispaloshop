# Stack PostgreSQL - CONGELADO PARA POST-MVP

## Estado
- Fecha de congelación: 2026-03-07
- Estado: Funcional pero sin datos de producción
- Motivo: Deadline MVP 16 marzo requiere estabilidad inmediata

## Contenido preservado

### Modelos de datos (SQLAlchemy)
- models.py: 25+ entidades completas
  - Tenant, User, Category, Product, ProductImage
  - Cart, CartItem, Order, OrderItem, Payment
  - Post, Reel, Story, Comment, Like, Follow
  - AffiliateLink, Commission, Payout
  - Conversation, Message
  - InfluencerProfile, ProducerProfile, ImporterProfile
  - B2BQuote, Shipment, UserEmbedding (pgvector)

### Migraciones Alembic (15 archivos)
- 20260303_0001_initial_schema.py
- 20260303_0002_add_cart_order_transaction_tables.py
- 20260310_0003_affiliates_sprint3.py
- 20260317_0004_hi_ai_pgvector.py
- 20260320_0005_product_slug_unique.py
- 20260321_0006_matching_score_unique.py
- 20260324_0007_social_motor_sprint5.py
- 20260325_0008_reels_content_advanced.py
- 20260327_0009_realtime_chat_sprint7.py
- 20260401_0010_importers_b2b_foundation.py
- 20260408_0011_b2b_logistics_engine.py
- 20260415_0012_enable_rls_core_tables.py
- 20260416_0013_unify_influencer_tiers_5_levels.py
- 20260417_0014_stripe_connect_onboarding_fields.py
- 20260417_0015_add_shipping_policy_fields.py

### API Routers (27 archivos)
- auth.py: JWT auth con SQLAlchemy
- products.py: CRUD completo
- cart.py, orders.py, checkout.py: Flujo comercio
- affiliates.py: Sistema de afiliados completo
- posts.py, reels.py, stories.py: Social feed
- chat.py: Mensajería
- ai.py: Embeddings y recomendaciones
- [y 18 más...]

### Características avanzadas implementadas
- pgvector para embeddings de IA
- Row Level Security (RLS) en PostgreSQL
- Stripe Connect con split de pagos
- Tier system influencers (Perseo→Zeus)
- Matching score productor-influencer
- Sistema de reputación verificable

## Para reactivar post-MVP

1. Mover directorios a raíz:
   mv _future_postgres/routers/* ../routers/
   mv _future_postgres/alembic/* ../alembic/
   mv _future_postgres/*.py ../

2. Ejecutar migraciones:
   cd backend
   alembic upgrade head

3. Crear tenant inicial:
   python seed_tenant.py

4. Migrar datos de MongoDB (script necesario)

5. Actualizar main.py para registrar routers /api/v1

## Notas técnicas
- JWT_SECRET ya no tiene default inseguro (corregido Día 1)
- CORS restringido a orígenes explícitos
- Variables de entorno validadas en startup
