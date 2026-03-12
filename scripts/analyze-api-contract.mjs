import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const FRONTEND_DIR = path.join(ROOT, 'frontend', 'src');
const BACKEND_DIRS = [
  path.join(ROOT, 'backend', 'routes'),
  path.join(ROOT, 'backend', 'app', 'routers'),
];

const SOURCE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.py']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (SOURCE_EXT.has(path.extname(full))) {
      out.push(full);
    }
  }
  return out;
}

function normalizeEndpoint(raw) {
  if (!raw) return '';
  let p = raw.trim();

  p = p.replace(/^https?:\/\/[^/]+/i, '');
  p = p.replace(/\?.*$/, '');
  // Strip common template base URL placeholders used in frontend.
  p = p.replace(/^\$\{(?:API|apiBase|getApiUrl\(\)|API_BASE_URL)\}/, '');
  p = p.replace(/\$\{[^}]+\}/g, '{param}');
  p = p.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '{param}');
  p = p.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, '{param}');
  p = p.replace(/\/+/g, '/');

  // After placeholder normalization, a leading /{param} usually comes from base URL templates.
  p = p.replace(/^\/\{param\}(?=\/)/, '');

  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

function parseFrontendCalls(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const calls = [];

  const regexes = [
    /(apiClient|axios)\.(get|post|put|patch|delete)\s*\(\s*([`'\"])(.*?)\3/gms,
    /fetch\s*\(\s*([`'\"])(.*?)\1/gms,
  ];

  for (const re of regexes) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const method = re.source.startsWith('fetch') ? 'GET?' : m[2].toUpperCase();
      const raw = re.source.startsWith('fetch') ? m[2] : m[4];
      const endpoint = normalizeEndpoint(raw);

      if (!endpoint || endpoint === '/' || endpoint.startsWith('/http')) continue;
      calls.push({ file: rel, method, endpoint, raw });
    }
  }

  return calls;
}

function parseBackendRoutes(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const routes = [];

  let routerPrefix = '';
  const prefixMatch = text.match(/APIRouter\(\s*prefix\s*=\s*([`'\"])(.*?)\1/);
  if (prefixMatch?.[2]) {
    routerPrefix = normalizeEndpoint(prefixMatch[2]);
    if (routerPrefix === '/') {
      routerPrefix = '';
    }
  }

  const re = /@router\.(get|post|put|patch|delete)\(\s*([`'\"])(.*?)\2/gms;
  let m;
  while ((m = re.exec(text)) !== null) {
    const rawPath = normalizeEndpoint(m[3]);
    const endpoint = normalizeEndpoint(`${routerPrefix}${rawPath}`);

    routes.push({
      file: rel,
      method: m[1].toUpperCase(),
      endpoint,
      raw: m[3],
      prefix: routerPrefix,
    });
  }

  return routes;
}

function toShape(ep) {
  return ep
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg === '{param}' ? '{param}' : seg))
    .join('/');
}

function endpointsCompatible(front, back) {
  const a = toShape(front.endpoint);
  const b = toShape(back.endpoint);
  if (a !== b) return false;
  if (front.method === 'GET?') return true;
  return front.method === back.method;
}

function main() {
  const frontendFiles = walk(FRONTEND_DIR, []);
  const backendFiles = BACKEND_DIRS.flatMap((d) => walk(d, []));

  const frontendCalls = frontendFiles.flatMap(parseFrontendCalls)
    .filter((c) => c.endpoint.startsWith('/'));
  const backendRoutes = backendFiles.flatMap(parseBackendRoutes);

  const missing = [];

  for (const call of frontendCalls) {
    const found = backendRoutes.some((r) => endpointsCompatible(call, r));
    if (!found) {
      missing.push(call);
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    frontend_calls: frontendCalls.length,
    backend_routes: backendRoutes.length,
    potential_mismatches: missing.length,
    mismatches: missing.slice(0, 300),
  };

  const outDir = path.join(ROOT, 'architecture-reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 's27-api-contract-report.json'), JSON.stringify(report, null, 2));

  const md = [
    '# S27 API Contract Report',
    '',
    `- Generated: ${report.generated_at}`,
    `- Frontend calls scanned: ${report.frontend_calls}`,
    `- Backend routes scanned: ${report.backend_routes}`,
    `- Potential mismatches: ${report.potential_mismatches}`,
    '',
    '## First 50 Potential Mismatches',
    '',
    '| Method | Endpoint | File |',
    '|---|---|---|',
    ...report.mismatches.slice(0, 50).map((m) => `| ${m.method} | ${m.endpoint} | ${m.file} |`),
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 's27-api-contract-report.md'), md);

  console.log(`frontend_calls=${report.frontend_calls}`);
  console.log(`backend_routes=${report.backend_routes}`);
  console.log(`potential_mismatches=${report.potential_mismatches}`);
}

main();
