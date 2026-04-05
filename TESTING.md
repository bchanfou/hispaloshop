# HispaloShop — Testing Guide

> Ground truth for how we test the platform. Scope is pragmatic: we cover
> the critical revenue paths and the flows that can lock users out. We do
> NOT chase 90% coverage. We chase "no obvious regressions ship to prod".

**Last updated**: Section 0.3 of the launch roadmap.

---

## 1. Philosophy

- **Critical paths first.** Tests exist to catch bugs that would embarrass us
  in prod or lose revenue. Not to hit a coverage number.
- **Independence.** Every test must run in isolation, in any order, without
  depending on other tests' side effects.
- **Zero tolerance for flakiness.** A flaky test is worse than no test.
  Fix it or skip it with a documented reason.
- **Speed matters.** If smoke tests take >60 s backend or >3 min frontend,
  they stop being smoke tests.
- **Mocks at the boundaries.** Stripe, Anthropic, FCM, Cloudinary are mocked.
  MongoDB is mocked in unit tests, real in CI service container.

---

## 2. Layers

| Layer | Framework | Where | When it runs | What it covers |
|---|---|---|---|---|
| **Backend smoke** | pytest + httpx ASGITransport | `backend/tests/smoke/` | Every PR | 10 critical endpoints + commission math (pure functions) |
| **Backend unit (non-smoke)** | pytest | `backend/tests/test_*.py` | Every PR | Services, auth helpers, monetization, fiscal, affiliate, shipping, etc. |
| **Backend integration (legacy)** | pytest + `requests` | `backend/tests/test_iteration_*.py` | Manual (`LIVE_API_TESTS=1`) | Broad HTTP regression against a live backend. Auto-skipped in CI. |
| **Frontend unit** | vitest + @testing-library/react | `frontend/src/**/*.test.{js,jsx,ts,tsx}` | Every PR | Components, hooks, contexts, utils |
| **E2E** | Playwright | `frontend/e2e/*.spec.ts` | Main push, or PR labeled `run-e2e` | 5 canonical user flows in Chromium + Mobile |

---

## 3. Running tests locally

### Backend

```bash
cd backend

# Quick smoke run (critical paths only) — ~5 seconds
pytest -m smoke

# Just the commission math tests (pure functions, instant)
pytest -m commission

# Full non-live suite (what CI runs) — ~35 seconds
pytest

# With coverage
pytest --cov=routes --cov=services --cov=core --cov-report=term

# Include the legacy integration tests (requires a live backend)
LIVE_API_TESTS=1 pytest

# Single file with verbose output
pytest tests/smoke/test_smoke_commission.py -v

# Single test case
pytest tests/smoke/test_smoke_commission.py::TestFounderCanonicalExample::test_canonical_scenario_1_elite_zeus_first_purchase -v
```

### Frontend unit

```bash
cd frontend

# All vitest unit tests (~35 seconds)
npx vitest run

# Watch mode during dev
npx vitest

# Single file
npx vitest run src/__tests__/CartContext.test.js

# With coverage (HTML report in coverage/)
npx vitest run --coverage
```

### E2E (Playwright)

Playwright needs a running frontend + backend. The config auto-starts the
dev server when `CI` is not set.

**Prerequisites**:
1. Backend running locally: `cd backend && uvicorn main:app --reload`
2. MongoDB running (local or Atlas)
3. Seeded test users for the flows that need login. See
   `backend/scripts/seed_showcase_accounts.py` or create manually.
4. Stripe in test mode (`STRIPE_SECRET_KEY=sk_test_...`)

```bash
cd frontend

# List the 5 canonical flows
npx playwright test --list

# Run all 5 flows in Chromium (webServer auto-starts the frontend)
npx playwright test --project=chromium

# Single flow, headed for debugging
npx playwright test 01-consumer-journey.spec.ts --project=chromium --headed --debug

# Against a deployed environment (skip webServer)
PLAYWRIGHT_BASE_URL=https://staging.hispaloshop.com npx playwright test

# View the HTML report after a failure
npx playwright show-report
```

---

## 4. The 5 canonical E2E flows

| File | Flow | Covers prompt requirement |
|---|---|---|
| `01-consumer-journey.spec.ts` | Registration → feed → marketplace → add to cart → checkout Stripe test card | Consumer reg + Search/cart/checkout (combines 2 prompt flows into 1 journey) |
| `02-influencer.spec.ts` | Login influencer → dashboard → commission earnings (no NaN) | Influencer dashboard access |
| `03-producer.spec.ts` | Login producer → dashboard GMV → create product → verify in marketplace | Producer login + create product |
| `04-origin-country.spec.ts` | Country metadata visibility in product cards vs detail | Country-scoped UX (adjacent to admin verification) |
| `05-chat.spec.ts` | Login → chat → WebSocket handshake active | Chat real-time smoke |

**Known gap**: admin country-scoped verification flow is not E2E-tested. It
is covered at the backend contract level in
`tests/smoke/test_smoke_endpoints.py::TestAdminVerification` and the full
behavior is audited via Cycle 2 of the mega audit (`memory/mega_plan_audit.md`).
Writing a full E2E for it requires seeding per-country admin users and
verification requests, which exceeds 0.3 scope. Move to section 4.x if
needed.

---

## 5. Backend smoke tests — the 10 critical endpoints

| # | Endpoint | File | Target |
|---|---|---|---|
| 1 | `GET /health`, `/api/health` | `test_smoke_health.py` | DB ping + shape |
| 2 | `POST /api/auth/register` | `test_smoke_auth.py` | Validation + CSRF exempt |
| 3 | `POST /api/auth/login` | `test_smoke_auth.py` | Validation + no user enum leak |
| 4 | `POST /api/auth/verify-email` | `test_smoke_auth.py` | Endpoint exists |
| 5 | `GET /api/cart`, `POST /api/cart/items`, `POST /api/cart/apply-coupon` | `test_smoke_endpoints.py` | Auth gating + endpoint existence |
| 6 | `POST /api/payments/create-checkout` + commission math | `test_smoke_endpoints.py` + `test_smoke_commission.py` | Auth + **all 4+4 commission scenarios** |
| 7 | `GET /api/search` | `test_smoke_endpoints.py` | Public, shape |
| 8 | `GET /api/discovery/feed` | `test_smoke_endpoints.py` | Auth required |
| 9 | `POST /api/admin/verification/{id}/approve` | `test_smoke_endpoints.py` | Admin gated |
| 10 | `POST /api/v1/hispal-ai/chat` | `test_smoke_endpoints.py` | Accepts guests (by design) |

### Commission tests are sacred

`tests/smoke/test_smoke_commission.py::TestFounderCanonicalExample` is the
untouchable source of truth for the 4 canonical commission scenarios. If it
fails, **the bug is in the code, never in the assertions**. Do not modify
the expected values without founder approval. See
`memory/commission_interpretation.md` for the full 8-scenario table and the
formula rationale.

---

## 6. Writing a new backend smoke test

Use the fixtures from `backend/tests/conftest.py`. Do NOT set env vars via
`os.environ.setdefault` at module level — conftest does this once for the
whole suite.

```python
# backend/tests/smoke/test_smoke_my_feature.py
import pytest

pytestmark = pytest.mark.smoke  # auto-tag every test in this file


class TestMyFeature:
    async def test_endpoint_exists(self, client):
        response = await client.get("/api/my-feature")
        assert response.status_code != 404
        assert response.status_code in (200, 401, 403)

    async def test_requires_auth(self, client):
        response = await client.post("/api/my-feature", json={})
        assert response.status_code in (401, 403)

    async def test_mocked_ai_call(self, client, mock_anthropic):
        # mock_anthropic replaces anthropic.Anthropic with a fake — no real API call
        response = await client.post(
            "/api/v1/hispal-ai/chat",
            json={"messages": [{"role": "user", "content": "hola"}]},
        )
        assert response.status_code in (200, 422)

    async def test_mocked_stripe_checkout(self, client, mock_stripe):
        # mock_stripe replaces stripe.checkout.Session.create with a fake
        # Tests can now exercise checkout flows without hitting Stripe
        ...
```

Available fixtures:
- `client` — httpx AsyncClient via ASGITransport (no live server)
- `mock_anthropic` — patched `anthropic.Anthropic` returning canned responses
- `mock_stripe` — patched Stripe SDK (Session, PaymentIntent, Transfer, Webhook)

Available markers:
- `@pytest.mark.smoke` — fast critical-path
- `@pytest.mark.commission` — revenue-critical math
- `@pytest.mark.integration` — hits a real backend (rare)
- `@pytest.mark.slow` — >5 s (excluded from smoke runs)

---

## 7. Writing a new frontend test

```jsx
// src/components/MyComponent.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import MyComponent from './MyComponent';

// Mock external modules at the top
vi.mock('../../services/api/client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

describe('MyComponent', () => {
  it('renders the empty state', () => {
    render(<MyComponent items={[]} />);
    expect(screen.getByText(/aún no hay/i)).toBeInTheDocument();
  });

  it('calls onSelect when user clicks an item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MyComponent items={[{ id: 1, name: 'Test' }]} onSelect={onSelect} />);
    await user.click(screen.getByText('Test'));
    expect(onSelect).toHaveBeenCalledWith({ id: 1, name: 'Test' });
  });
});
```

Global mocks (in `src/test/setup.ts`): `matchMedia`, `IntersectionObserver`,
`navigator.vibrate`. If a test needs another global mock, add it there.

---

## 8. Debugging flaky tests

### Backend flaky

1. Run with `-p no:randomly` to disable any random ordering
2. Add `-v -s` for verbose output and unbuffered print
3. Run the single flaky test N times: `for i in {1..20}; do pytest path::test_name -v || break; done`
4. Check `response.text` in assertions when status codes are ambiguous
5. Check mock leakage between tests (monkeypatch should auto-clean, but fixtures that mutate module state at import time can leak)
6. If truly flaky and not root-cause-able, `@pytest.mark.skip(reason="flaky: ticket #XXX")` and escalate

### Frontend flaky

1. `npx vitest run <file>` in isolation
2. Run the same file 5 times to confirm reproducibility
3. Check for `act()` warnings — unwrapped state updates cause race conditions
4. `waitFor()` with proper timeouts instead of fixed `setTimeout`
5. Mock `Date.now()` or `performance.now()` if tests assert on timing

### Playwright flaky

1. `npx playwright test <file> --headed --debug` to step through
2. `--trace on` to record a trace for each test run
3. `page.waitForLoadState('networkidle')` between navigation + assertions
4. Check selectors — prefer `getByRole`, `getByLabel`, `getByTestId` over class-based
5. If a test is environment-dependent (needs staging data), mark it
   `test.describe.configure({ mode: 'serial' })` or skip with reason

---

## 9. What we do NOT test in V1 (and why)

- **Full cart → checkout → Stripe webhook → order creation chain in E2E**:
  requires Stripe CLI or webhook mocking infrastructure. Backend has unit
  tests for the webhook handler; E2E stops at Stripe redirect.
- **Admin country-scoped verification in E2E**: requires seeding per-country
  admin users. Backend tests cover the contract; skip for V1.
- **FCM push delivery** (see §10 below — manual post-deploy smoke).
- **Email delivery** (Resend): we mock the API call; we don't verify actual
  delivery. Use a Resend test inbox manually post-deploy.
- **Cloudinary upload** in unit tests: mocked. Real uploads verified manually
  in staging.
- **Multi-currency conversion at checkout**: out of V1 scope (currency fixed
  per market).
- **Native push on iOS/Android**: no native apps in V1.
- **Every language except ES/KO/EN**: 57 other locales are on-disk but not
  bundled. Tests in those languages would be meaningless.

---

## 10. Post-deploy manual smoke tests

Some flows cannot reasonably be automated. Run these after every production
deploy. Total time: ~5 minutes.

### 10.1 FCM push notifications (MANDATORY post-deploy)

**Why manual**: FCM delivery requires a real device token, which in turn
requires a real browser visiting the production frontend and granting
notification permission. Impossible to automate cleanly in CI without a
physical device fleet.

**Steps**:

1. Open `https://www.hispaloshop.com` in a Chromium browser on a device with
   notifications enabled
2. Log in as an admin user (or any authenticated user for test delivery)
3. When the permission prompt appears, click "Allow"
4. The frontend registers a device token via the service worker (`sw-push.js`)
5. Trigger a test notification:
   ```bash
   curl -X POST https://api.hispaloshop.com/api/notifications/push/test \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test push","body":"Deploy OK","action_url":"/"}'
   ```
6. Expected: notification appears on the device within 5 seconds
7. If nothing arrives: check Railway logs for `[FCM]` errors. The most common
   issue is a stale `FCM_SERVICE_ACCOUNT_JSON` (rotate it in Firebase Console
   and update the Railway env var).

**Historical note**: Section 0.2 discovered that `FCM_SERVICE_ACCOUNT_JSON`
was read via `getattr(settings, ..., None)` but NOT declared as a pydantic
field in `core/config.py`, causing it to always be `None` regardless of the
Railway env var. Fixed in commit `6b91c90`. Run this smoke test after ANY
change to the FCM code path or service account rotation.

### 10.2 Stripe test purchase (MANDATORY post-deploy)

1. Go to `https://www.hispaloshop.com` and add a product to cart
2. Proceed to checkout
3. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
4. Expected: redirect to `/checkout/success` with an order confirmation
5. Check Stripe Dashboard → Payments → recent payment appears with
   metadata matching the order
6. Check backend logs for `[STRIPE]` webhook received + order created
7. If webhook fails signature: rotate `STRIPE_WEBHOOK_SECRET` per
   `DEPLOYMENT.md §7`

### 10.3 David AI smoke (nice-to-have)

1. Go to `https://www.hispaloshop.com`
2. Click the David floating button (bottom right)
3. Send "Hola"
4. Expected: response within 3 seconds
5. If slow or fails: check `ANTHROPIC_API_KEY` quota in Anthropic console

---

## 11. Coverage targets

**V1 targets** (not enforced in CI yet — see `ci.yml` TODO comments):
- Backend: ≥40% on `routes/` and `services/`
- Frontend: ≥30% on `context/`, `features/`, critical components

**Current state** (as of section 0.3):
- Backend total: 22% (of 25,772 lines). Lower because 1103 legacy integration
  tests are auto-skipped in CI. The 217 tests that DO run hit the critical
  paths well but not the full route surface area.
- Frontend total: see vitest coverage report (`npx vitest run --coverage`)

**Stabilization period**: Coverage gates are `warn-only` for the first week
after 0.3 to let the smoke suite stabilize. After that, CI will fail if
coverage drops below the targets. See `ci.yml` — search for the TODO markers
to enable the gates.

---

## 12. When CI is red

| Job | Red means | Action |
|---|---|---|
| `backend-tests` | A unit test failed | `cd backend && pytest <file>` locally with same env vars |
| `frontend-tests` | A vitest failed | `cd frontend && npx vitest run <file>` locally |
| `frontend-build` | Webpack/craco build failed | Usually a TypeScript or import error — check the log |
| `e2e-tests` | Playwright failed on main or `run-e2e` label | Download artifact `playwright-report`, open `index.html` locally |
| `deploy-frontend` / `deploy-backend` | Deploy failed | Check Vercel / Railway dashboard, not CI itself |

### Forcing E2E on a PR

Add the `run-e2e` label to the PR. CI will run the 5 canonical flows in
Chromium against `localhost` (or `STAGING_URL` if that secret is set).

### Bypassing a broken test (emergency)

Prefer fixing over skipping. If you genuinely must land code while a test is
red:

```python
@pytest.mark.xfail(reason="TICKET-123: root cause XYZ, owner @alice", strict=False)
def test_something(): ...
```

```js
it.skip('thing that is broken', () => { ... });
```

Never merge with a fresh `@pytest.mark.skip` without a ticket or owner.

---

## 13. Trusted sources

- Commission formula: `memory/commission_interpretation.md`
- Scope boundaries: `memory/v1_scope_final.md`
- Environment vars: `backend/.env.example`, `frontend/.env.example`
- Deploy runbook: `DEPLOYMENT.md`
- Design tokens (for component visual tests): `DESIGN_SYSTEM.md`
