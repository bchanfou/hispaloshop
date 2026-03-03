# PRs Sugeridos (prioridad)

1. **PR-01 (P0):** `fix/payments-idempotency-and-webhook-ledger`
   - Add `stripe_events` table
   - Deduplicate by event id
   - Add transactional safeguards for order payment state transitions

2. **PR-02 (P0):** `fix/checkout-stock-reservation-concurrency`
   - Stock reservation model + expiration
   - Concurrency-safe checkout updates

3. **PR-03 (P0):** `feat/security-rate-limits-auth-chat`
   - Rate limiting middleware
   - Abuse logging and alerts

4. **PR-04 (P1):** `refactor/api-contract-openapi-client-sync`
   - OpenAPI cleanup
   - Generated TS client
   - Remove stale frontend endpoints

5. **PR-05 (P1):** `perf/frontend-bundle-splitting`
   - Route-level lazy loading
   - Chunk strategy
   - Fix major exhaustive-deps warnings
