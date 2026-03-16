# Backend Architecture Documentation

## Current Structure

The backend is a monolithic FastAPI application in `server.py` (~11,000 lines).

### Main Sections in server.py

| Line Range | Section | Description |
|------------|---------|-------------|
| 1-227 | **Imports & Config** | Dependencies, environment setup, logging |
| 228-535 | **Pydantic Models (Users)** | User, Address, AIProfile, UserConsent, etc. |
| 537-700 | **Pydantic Models (Products)** | Category, Product, Pack, Variant, DiscountCode |
| 695-870 | **Pydantic Models (Business)** | Influencer, StoreProfile, Certificate, Order |
| 870-1200 | **Pydantic Models (Other)** | ChatMessage, Notification, Review, etc. |
| 1200-2000 | **Auth Endpoints** | Login, register, verify, password reset |
| 2000-3500 | **Product Endpoints** | CRUD, search, categories, reviews |
| 3500-4500 | **Cart & Orders** | Cart management, checkout, order tracking |
| 4500-5500 | **AI Chat System** | Hispalo AI assistant, recommendations |
| 5500-6500 | **Producer Endpoints** | Dashboard, products, orders, payments |
| 6500-7500 | **Admin Endpoints** | Dashboard, analytics, user management |
| 7500-8500 | **Influencer System** | Dashboard, commissions, withdrawals |
| 8500-9500 | **Stripe Integration** | Connect, payments, webhooks |
| 9500-10500 | **Email & Notifications** | Resend integration, email templates |
| 10500-11147 | **Utility Functions** | Helpers, startup events |

### API Router Groups

- `/api/auth/*` - Authentication
- `/api/products/*` - Product catalog
- `/api/cart/*` - Shopping cart
- `/api/orders/*` - Order management
- `/api/producer/*` - Producer dashboard
- `/api/admin/*` - Admin dashboard
- `/api/influencer/*` - Influencer system
- `/api/ai/*` - AI chat assistant
- `/api/stripe/*` - Payment integration

### Database Collections

| Collection | Description |
|------------|-------------|
| `users` | All user accounts (customers, producers, admins) |
| `products` | Product catalog |
| `categories` | Product categories |
| `orders` | Customer orders |
| `carts` | Shopping carts |
| `sessions` | User sessions |
| `page_visits` | Analytics tracking |
| `followers` | Store followers |
| `certificates` | Producer certificates |
| `discount_codes` | Promo codes |
| `influencer_codes` | Influencer referral codes |
| `influencer_commissions` | Commission records |
| `ai_profiles` | AI assistant memory |
| `chat_messages` | AI chat history |
| `notifications` | User notifications |
| `reviews` | Product reviews |

## Recommended Future Refactoring

### Phase 1: Extract Models (Low Risk)
```
/backend/models/
├── __init__.py
├── user.py         # User, Address, AIProfile
├── product.py      # Product, Category, Pack, Variant
├── order.py        # Order, CartItem, PaymentTransaction
├── business.py     # Influencer, StoreProfile, Certificate
└── ai.py           # ChatMessage, UserInferredInsights
```

### Phase 2: Extract Routers (Medium Risk)
```
/backend/routers/
├── __init__.py
├── auth.py         # Authentication endpoints
├── products.py     # Product CRUD
├── cart.py         # Cart & checkout
├── admin.py        # Admin dashboard
├── producer.py     # Producer dashboard
├── influencer.py   # Influencer system
└── ai.py           # AI chat
```

### Phase 3: Extract Services (Higher Risk)
```
/backend/services/
├── __init__.py
├── auth_service.py     # Auth logic
├── email_service.py    # Email sending
├── stripe_service.py   # Payment processing
├── ai_service.py       # AI recommendations
└── analytics_service.py # Stats & tracking
```

## Scripts

- `/backend/scripts/cleanup_data.py` - Remove test data, setup production

## Third-Party Integrations

1. **MongoDB** - Primary database (Motor async driver)
2. **Stripe Connect** - Payment processing
3. **Resend** - Email delivery
4. **OpenAI GPT-4o** - AI chat assistant
5. **Google OAuth** - Social login

## Environment Variables

See `/backend/.env` for configuration:
- `MONGO_URL` - MongoDB connection
- `DB_NAME` - Database name
- `STRIPE_SECRET_KEY` - Stripe API key
- `RESEND_API_KEY` - Email service key
- `OPENAI_API_KEY` - AI integration key
