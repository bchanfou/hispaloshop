"""
Routers module - API route handlers.

Available routers:
- auth: Authentication (register, login, verify, password reset)
- config: Categories, countries, languages, currencies
- account: Account deletion, consent management
- insights: Super Admin analytics dashboard
- reviews: Product reviews
- products: CRUD products, search, certificates
- cart: Cart operations
- orders: Order management
- influencers: Influencer system, Stripe Connect
- admin: Admin management (producers, products, certificates)
- producer: Producer dashboard, products, Stripe Connect
- customer: Customer profile, orders, addresses
- payments: Stripe checkout, buy-now, status
- ai: AI profile, memory, execute actions, smart cart

Usage:
    from app.routers import auth, products, cart, orders, ai
"""
from . import auth
from . import config
from . import account
from . import insights
from . import reviews
from . import products
from . import cart
from . import orders
from . import influencers
from . import admin
from . import producer
from . import customer
from . import payments
from . import ai

__all__ = [
    'auth', 'config', 'account', 'insights', 'reviews',
    'products', 'cart', 'orders', 'influencers',
    'admin', 'producer', 'customer', 'payments', 'ai'
]




