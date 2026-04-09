const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const API_BASE = process.env.PLAYWRIGHT_API_URL || process.env.AUTH_BACKEND_URL || 'http://127.0.0.1:8000';
const BACKEND_HEALTH_URL = process.env.SMOKE_BACKEND_HEALTH_URL || `${API_BASE.replace(/\/$/, '')}/health`;

const MAX_FRONTEND_MS = Number(process.env.SMOKE_MAX_FRONTEND_MS || 12000);
const MAX_BACKEND_MS = Number(process.env.SMOKE_MAX_BACKEND_MS || 5000);
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS || 15000);

async function checkUrl(label, url, maxAllowedMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const response = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    const elapsedMs = Date.now() - start;

    if (!response.ok) {
      throw new Error(`${label} returned HTTP ${response.status} in ${elapsedMs}ms`);
    }

    if (elapsedMs > maxAllowedMs) {
      throw new Error(
        `${label} latency ${elapsedMs}ms exceeded threshold ${maxAllowedMs}ms`
      );
    }

    console.log(`[preflight] ${label}: OK (${elapsedMs}ms)`);
    return elapsedMs;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log('[preflight] Running smoke preflight checks...');
  console.log(`[preflight] Frontend URL: ${FRONTEND_URL}`);
  console.log(`[preflight] Backend health URL: ${BACKEND_HEALTH_URL}`);

  const frontendMs = await checkUrl('frontend', FRONTEND_URL, MAX_FRONTEND_MS);
  const backendMs = await checkUrl('backend-health', BACKEND_HEALTH_URL, MAX_BACKEND_MS);

  console.log('[preflight] Summary');
  console.log(`[preflight] frontend_ms=${frontendMs}`);
  console.log(`[preflight] backend_health_ms=${backendMs}`);
}

main().catch((error) => {
  console.error(`[preflight] FAILED: ${error.message}`);
  process.exit(1);
});
