const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const SRC_ROOT = path.resolve(__dirname, '..', 'src');
const I18N_FILE = path.resolve(SRC_ROOT, 'locales', 'i18n.js');

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

function toImportPath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  rel = rel.replace(/\.js$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function hasI18nImport(ast) {
  return ast.program.body.some(
    (node) =>
      t.isImportDeclaration(node) &&
      node.specifiers.some((s) => t.isImportDefaultSpecifier(s) && s.local.name === 'i18n')
  );
}

function ensureI18nImport(ast, filePath) {
  if (hasI18nImport(ast)) return false;
  const importPath = toImportPath(filePath, I18N_FILE);
  const importDecl = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier('i18n'))],
    t.stringLiteral(importPath)
  );

  const body = ast.program.body;
  let insertAt = 0;
  while (insertAt < body.length && t.isImportDeclaration(body[insertAt])) {
    insertAt += 1;
  }
  body.splice(insertAt, 0, importDecl);
  return true;
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch {
    return { changed: false, replacements: 0, importAdded: false };
  }

  let replacements = 0;
  traverse(ast, {
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (!t.isIdentifier(callee, { name: 't' })) return;
      if (callPath.scope.hasBinding('t')) return;

      callPath.node.callee = t.memberExpression(t.identifier('i18n'), t.identifier('t'));
      replacements += 1;
    },
  });

  if (!replacements) {
    return { changed: false, replacements: 0, importAdded: false };
  }

  const importAdded = ensureI18nImport(ast, filePath);
  const out = generate(ast, { jsescOption: { minimal: true } }, code).code;
  fs.writeFileSync(filePath, out, 'utf8');

  return { changed: true, replacements, importAdded };
}

const files = walk(SRC_ROOT);
let changedFiles = 0;
let totalReplacements = 0;
let importsAdded = 0;

for (const filePath of files) {
  const result = processFile(filePath);
  if (!result.changed) continue;
  changedFiles += 1;
  totalReplacements += result.replacements;
  if (result.importAdded) importsAdded += 1;
  const rel = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
  console.log(`[fixed] ${rel} (replacements=${result.replacements}${result.importAdded ? ', +import' : ''})`);
}

console.log(`DONE files=${changedFiles} replacements=${totalReplacements} importsAdded=${importsAdded}`);
