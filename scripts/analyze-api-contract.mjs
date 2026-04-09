import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const FRONTEND_DIR = path.join(ROOT, 'frontend', 'src');
const BACKEND_DIRS = [
  path.join(ROOT, 'backend', 'routes'),
  path.join(ROOT, 'backend', 'app', 'routers'),
];
const BACKEND_MAIN = path.join(ROOT, 'backend', 'main.py');

const SOURCE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.py']);
const FRONTEND_EXCLUDE_SEGMENTS = [
  '/_archive/',
  '/__tests__/',
  '/test/',
  '/mocks/',
  '/build/',
];

function shouldScanFrontendFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return !FRONTEND_EXCLUDE_SEGMENTS.some((segment) => normalized.includes(segment));
}

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

function normalizeEndpoint(raw, options = {}) {
  const { preserveLeadingParam = false } = options;
  if (!raw) return '';
  let p = raw.trim();

  p = p.replace(/^https?:\/\/[^/]+/i, '');
  p = p.replace(/\?.*$/, '');
  // Strip common template base URL placeholders used in frontend.
  p = p.replace(/^\$\{(?:API|apiBase|getApiUrl\(\)|API_BASE_URL)\}/, '');
  // Normalize ternary template literals used in endpoint suffixes.
  p = p.replace(/\$\{[^}]*\?\s*'[^']*'\s*:\s*'[^']*'\s*\}/g, '{choice}');
  p = p.replace(/\$\{[^}]*\?\s*"[^"]*"\s*:\s*"[^"]*"\s*\}/g, '{choice}');
  // Drop optional template suffixes often used only for query strings.
  p = p.replace(/\$\{suffix\}/g, '');
  p = p.replace(/\$\{[^}]+\}/g, '{param}');
  p = p.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '{param}');
  p = p.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, '{param}');
  p = p.replace(/\/+/g, '/');
  p = p.replace(/\/\{param\}\{param\}/g, '/{param}');

  // For frontend templates, a leading /{param} usually comes from base URL placeholders.
  // Preserve it for backend decorators where it can be a real path parameter.
  if (!preserveLeadingParam) {
    p = p.replace(/^\/\{param\}(?=\/)/, '');
  }

  // Drop malformed template leftovers that can't be matched reliably.
  if (p.includes('${') || p.includes('`')) return '';

  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

function stripApiPrefix(endpoint) {
  return endpoint
    .replace(/^\/api\/v1(?=\/|$)/, '')
    .replace(/^\/api(?=\/|$)/, '') || '/';
}

function parseFrontendCalls(filePath) {
  if (!shouldScanFrontendFile(filePath)) return [];

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

  const routerPrefixes = new Map();
  const declRe = /(\w+)\s*=\s*APIRouter\(([^)]*)\)/gms;
  let decl;
  while ((decl = declRe.exec(text)) !== null) {
    const routerName = decl[1];
    const args = decl[2] || '';
    const prefixMatch = args.match(/prefix\s*=\s*([`'\"])(.*?)\1/);
    let routerPrefix = '';
    if (prefixMatch?.[2]) {
      routerPrefix = normalizeEndpoint(prefixMatch[2]);
      if (routerPrefix === '/') routerPrefix = '';
    }
    routerPrefixes.set(routerName, routerPrefix);
  }

  const re = /@([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|patch|delete)\(\s*([`'\"])(.*?)\3/gms;
  let m;
  while ((m = re.exec(text)) !== null) {
    const routerName = m[1];
    if (!routerPrefixes.has(routerName)) {
      continue;
    }
    const routerPrefix = routerPrefixes.get(routerName) || '';
    const rawPath = normalizeEndpoint(m[4], { preserveLeadingParam: true });
    const endpoint = normalizeEndpoint(`${routerPrefix}${rawPath}`, { preserveLeadingParam: true });

    routes.push({
      file: rel,
      method: m[2].toUpperCase(),
      endpoint,
      raw: m[4],
      router: routerName,
      prefix: routerPrefix,
    });
  }

  return routes;
}

function moduleFromBackendFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.startsWith('backend/routes/')) {
    return normalized
      .replace(/^backend\/routes\//, 'routes/')
      .replace(/\.py$/, '')
      .replace(/\//g, '.');
  }
  if (normalized.startsWith('backend/app/routers/')) {
    return normalized
      .replace(/^backend\/app\/routers\//, 'app/routers/')
      .replace(/\.py$/, '')
      .replace(/\//g, '.');
  }
  return null;
}

function parseMountedPrefixes(mainPath) {
  if (!fs.existsSync(mainPath)) {
    return new Map();
  }

  const text = fs.readFileSync(mainPath, 'utf8');
  const aliasToModule = new Map();
  const moduleToPrefixes = new Map();

  const importRe = /from\s+((?:routes|app\.routers)\.[A-Za-z0-9_\.]+)\s+import\s+router\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  let im;
  while ((im = importRe.exec(text)) !== null) {
    aliasToModule.set(im[2], im[1]);
  }

  const includeRe = /app\.include_router\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,\s*prefix\s*=\s*([`'\"])(.*?)\2)?/g;
  let inc;
  while ((inc = includeRe.exec(text)) !== null) {
    const alias = inc[1];
    const moduleName = aliasToModule.get(alias);
    if (!moduleName) continue;

    const rawPrefix = inc[3] || '';
    const prefix = normalizeEndpoint(rawPrefix || '/');
    const normalizedPrefix = prefix === '/' ? '' : prefix;

    if (!moduleToPrefixes.has(moduleName)) {
      moduleToPrefixes.set(moduleName, new Set());
    }
    moduleToPrefixes.get(moduleName).add(normalizedPrefix);
  }

  return moduleToPrefixes;
}

function expandBackendEndpoints(route, modulePrefixes) {
  const moduleName = moduleFromBackendFile(route.file);
  const candidates = new Set();
  candidates.add(route.endpoint);

  if (!moduleName) {
    return Array.from(candidates);
  }

  const prefixes = modulePrefixes.get(moduleName);
  if (!prefixes || prefixes.size === 0) {
    return Array.from(candidates);
  }

  for (const prefix of prefixes) {
    const mounted = normalizeEndpoint(`${prefix}${route.endpoint}`);
    candidates.add(mounted);
  }

  return Array.from(candidates);
}

function toShape(ep) {
  return ep
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg === '{param}' ? '{param}' : seg))
    .join('/');
}

function endpointsCompatible(front, backendMethod, backendEndpoint) {
  const a = toShape(stripApiPrefix(front.endpoint));
  const b = toShape(stripApiPrefix(backendEndpoint));
  if (a !== b) return false;
  if (front.method === 'GET?') return true;
  return front.method === backendMethod;
}

function main() {
  const frontendFiles = walk(FRONTEND_DIR, []);
  const backendFiles = BACKEND_DIRS.flatMap((d) => walk(d, []));

  const frontendCalls = frontendFiles
    .flatMap(parseFrontendCalls)
    .filter((c) => c.endpoint.startsWith('/'));
  const uniqueFrontendCalls = Array.from(
    new Map(frontendCalls.map((c) => [`${c.file}|${c.method}|${c.endpoint}`, c])).values()
  );
  const modulePrefixes = parseMountedPrefixes(BACKEND_MAIN);
  const backendRoutes = backendFiles.flatMap(parseBackendRoutes);

  const missing = [];

  for (const call of uniqueFrontendCalls) {
    const found = backendRoutes.some((r) => {
      const candidates = expandBackendEndpoints(r, modulePrefixes);
      return candidates.some((endpoint) => endpointsCompatible(call, r.method, endpoint));
    });
    if (!found) {
      missing.push(call);
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    frontend_calls: uniqueFrontendCalls.length,
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
