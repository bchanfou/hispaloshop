# Hispaloshop — PRD

## Platform Overview
Multi-role digital supermarket supporting customers, sellers (producers), influencers, admins, and super-admins.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + i18n (ES, EN, KR + 10 more)
- **Backend**: FastAPI + MongoDB
- **Integrations**: Stripe, Cloudinary, pywebpush, bcrypt, Lucide-React, GoogleMapReact, Emergent LLM (OpenAI GPT-5.2)

## What's Been Implemented

### Session Feb 19, 2026 — Phase 10 (Latest)
- **Hi AI Chat Fix (P0)** — Fixed `NameError: LANGUAGE_NAMES is not defined` in `ai_chat.py` by adding the language names dictionary. Chat endpoint now works correctly.
- **Profile Button Navigation (P1)** — Changed bottom nav profile button to link to public profile (`/user/{user_id}`) instead of dashboard.
- **Seller Earnings Page Fix (P1)** — Fixed crash in `ProducerPayments.js` caused by using `t()` without importing `useTranslation`.
- **Sales Assistant Chat UI (P1)** — Verified user messages already have white text (`bg-stone-900 text-white`) in `SellerAIAssistant.js`.
- **Create Recipe Form Mobile (P2)** — Refactored `IngredientRow` to stack inputs across 2 rows on mobile for better usability.
- **Mobile Post Creation Flow (P2)** — `+` button now opens device gallery directly. Panel opens only after image selection.

### Previous Sessions (Phases 1-9)
- Image URL sanitization & seed data cleanup
- 5xx error fix (certificates route NameError)
- AI Chat readability (dark bg + white text for user messages)
- Store page i18n + mobile
- Wishlist + In-App Notifications
- Product filters fix, regions extension, producer form
- Badge/Achievement System
- All bug fixes and UI enhancements

## Test Credentials
- **Super Admin:** admin@hispaloshop.com / password123
- **Seller:** producer@test.com / password123
- **Customer:** test@example.com / password123
- **Influencer:** influencer@test.com / password123

## Remaining Backlog
- **P0:** Google Auth Rework — Replace Emergent-managed Google Auth with self-managed Google OAuth2 (user postponed, needs Client ID/Secret)
- **P4:** Final System Re-audit — Comprehensive audit of entire application for stability and i18n coverage
