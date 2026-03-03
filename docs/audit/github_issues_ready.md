# GitHub Issues Ready-to-Create

## ISSUE-01: Webhook Stripe idempotency and replay protection
- **Type:** Bug / P0
- **Description:** Implement deduplication by `stripe_event_id`, persist processed events, reject replays, add unique index.
- **Acceptance criteria:** Same event can be retried N times with no duplicated transactions/commissions.

## ISSUE-02: Checkout stock reservation to prevent oversell
- **Type:** Bug / P0
- **Description:** Reserve stock at checkout start or transactional lock at payment confirmation.
- **Acceptance criteria:** Concurrent checkout for last unit cannot oversell.

## ISSUE-03: Align subscription commission rules with business spec
- **Type:** Product/Tech debt / P1
- **Description:** Confirm FREE/PRO/ELITE commission table and enforce in one source of truth.
- **Acceptance criteria:** Automated test validates commission by plan.

## ISSUE-04: Introduce API rate limiting for auth and AI endpoints
- **Type:** Security / P0
- **Description:** Add middleware (IP/user limits) for `/auth/*`, `/chat/*`, `/checkout/*`.
- **Acceptance criteria:** Burst abuse returns 429 with deterministic policy headers.

## ISSUE-05: Stabilize frontend-backend API contracts
- **Type:** Integration / P1
- **Description:** Generate typed client from OpenAPI and remove divergent legacy endpoints.
- **Acceptance criteria:** CI contract tests pass for top 20 endpoints.

## ISSUE-06: Add E2E critical flows suite
- **Type:** Quality / P0
- **Description:** Tests for purchase, affiliate attribution, producer fulfillment, chat-to-cart.
- **Acceptance criteria:** Green pipeline with deterministic fixtures.

## ISSUE-07: Reduce frontend bundle size and hook dependency warnings
- **Type:** Performance / P1
- **Description:** Code splitting, lazy routes, fix exhaustive-deps warnings.
- **Acceptance criteria:** main bundle <300kB gz and warnings reduced >80%.

## ISSUE-08: Implement dispute management and fiscal exports
- **Type:** Feature gap / P1
- **Description:** Add dispute CRUD + backoffice triage + CSV/PDF tax exports.
- **Acceptance criteria:** Endpoints + UI + audit logs available in admin.
