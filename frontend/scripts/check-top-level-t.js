const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'build', '.git'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(p));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function findUnboundTCalls(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;

  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch {
    return [];
  }

  const lines = [];
  traverse(ast, {
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (!callee || callee.type !== 'Identifier' || callee.name !== 't') return;

      if (!callPath.scope.hasBinding('t')) {
        lines.push(callPath.node.loc && callPath.node.loc.start ? callPath.node.loc.start.line : '?');
      }
    },
  });

  return [...new Set(lines)];
}

const root = path.resolve(__dirname, '..', 'src');
const files = walk(root);
const offenders = [];

for (const filePath of files) {
  const lines = findUnboundTCalls(filePath);
  if (lines.length) offenders.push({ filePath, lines });
}

if (!offenders.length) {
  console.log('[i18n-guard] OK: no unbound t() calls found.');
  process.exit(0);
}

console.error('[i18n-guard] Found unbound t() calls (runtime crash risk):');
for (const item of offenders) {
  const rel = path.relative(path.resolve(__dirname, '..'), item.filePath).replace(/\\/g, '/');
  console.error(`- ${rel}:${item.lines.join(',')}`);
}
process.exit(1);
