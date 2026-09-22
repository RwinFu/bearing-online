#!/usr/bin/env node
/* Deep static analyzer: parses all 19 classic scripts as ONE shared global
 * scope (like the browser does) and reports identifiers that resolve to
 * nothing — i.e. latent ReferenceErrors hiding on rarely-tested code paths.
 * Also reports assignments to undeclared names (silent implicit globals). */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('/home/user/bearing-online/tools/smoke-test/node_modules/acorn/dist/acorn.js');

const ROOT = '/home/user/bearing-online';
const files = fs.readdirSync(path.join(ROOT, 'assets/js'))
  .filter(f => f.endsWith('.js')).sort()
  .map(f => path.join(ROOT, 'assets/js', f));

// ---- Browser + vendor + JS builtins considered "defined" ----
const BROWSER_GLOBALS = new Set(Object.getOwnPropertyNames(globalThis));
['window','document','navigator','location','history','screen','localStorage','sessionStorage',
 'alert','confirm','prompt','fetch','XMLHttpRequest','FormData','URLSearchParams','Blob','File','FileReader',
 'requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval',
 'queueMicrotask','getComputedStyle','matchMedia','IntersectionObserver','ResizeObserver','MutationObserver',
 'CustomEvent','Event','KeyboardEvent','MouseEvent','TouchEvent','HTMLElement','Element','Node','NodeList',
 'DOMParser','XMLSerializer','Image','Audio','Worker','BroadcastChannel','crypto','performance',
 'devicePixelRatio','innerWidth','innerHeight','scrollX','scrollY','pageXOffset','pageYOffset',
 'addEventListener','removeEventListener','dispatchEvent','open','close','print','focus','blur',
 'SpeechSynthesisUtterance','speechSynthesis','Notification','indexedDB','caches','atob','btoa',
 'AbortController','AbortSignal','WeakRef','FinalizationRegistry','structuredClone','scrollTo','scrollBy',
 'scrollIntoView','isSecureContext','origin','frames','parent','top','self','name','status',
 // vendor libs used by the site
 'THREE',
 // test-harness / jsdom shims that exist at runtime in supported browsers
 'CSS','CSSRule','FontFace','URL','webkitURL'
].forEach(g => BROWSER_GLOBALS.add(g));

// HTMLInlineHandlers: functions referenced from markup count as "used", not defined.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function parse(file) {
  const code = fs.readFileSync(file, 'utf8');
  return acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', locations: true });
}

// ---- Pass 1: collect every top-level binding from every file ----
const globalNames = new Map(); // name -> [file, ...]
function declareTopLevel(ast, file) {
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id) addGlobal(node.id.name, file);
    else if (node.type === 'ClassDeclaration' && node.id) addGlobal(node.id.name, file);
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) collectPattern(d.id, file);
    }
  }
}
function addGlobal(name, file) {
  if (!globalNames.has(name)) globalNames.set(name, []);
  globalNames.get(name).push(path.basename(file));
}
function collectPattern(pat, file) {
  if (!pat) return;
  if (pat.type === 'Identifier') addGlobal(pat.name, file);
  else if (pat.type === 'ObjectPattern') pat.properties.forEach(p => collectPattern(p.type === 'RestElement' ? p.argument : p.value, file));
  else if (pat.type === 'ArrayPattern') pat.elements.forEach(e => collectPattern(e, file));
  else if (pat.type === 'RestElement') collectPattern(pat.argument, file);
  else if (pat.type === 'AssignmentPattern') collectPattern(pat.left, file);
}

// Known cross-file *intentional* patterns: assignments to `window.X` etc. are fine.
const asts = new Map();
for (const f of files) { const a = parse(f); asts.set(f, a); declareTopLevel(a, f); }

// ---- Pass 2: walk each file with lexical scope, resolve identifiers ----
const problems = [];
const declaredButShadowedOk = new Set();

function isDeclarationPosition(node, parent) {
  if (!parent) return false;
  if ((parent.type === 'VariableDeclarator' && parent.id === node) ||
      (parent.type === 'FunctionDeclaration' && parent.id === node) ||
      (parent.type === 'FunctionExpression' && parent.id === node) ||
      (parent.type === 'ClassDeclaration' && parent.id === node) ||
      (parent.type === 'ClassExpression' && parent.id === node) ||
      ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' ||
        parent.type === 'ArrowFunctionExpression') && parent.params.includes(node)) ||
      (parent.type === 'CatchClause' && parent.param === node) ||
      (parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier' ||
       parent.type === 'ImportNamespaceSpecifier')) return true;
  if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return true;
  if (parent.type === 'ObjectPattern') return true;
  if (parent.type === 'ArrayPattern') return true;
  if (parent.type === 'RestElement') return true;
  if (parent.type === 'AssignmentPattern' && parent.left === node) return true;
  if (parent.type === 'Property' && parent.key === node && !parent.computed) return true;
  if ((parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') && parent.label === node) return true;
  if (parent.type === 'LabeledStatement' && parent.label === node) return true;
  return false;
}

function scopeDeclares(node, name, scopeChain) {
  // scopeChain: array of Sets from innermost to outermost (excluding globals)
  return scopeChain.some(s => s.has(name));
}

function namesInPattern(pat, out) {
  if (!pat) return;
  if (pat.type === 'Identifier') out.push(pat.name);
  else if (pat.type === 'ObjectPattern') pat.properties.forEach(p => namesInPattern(p.type === 'RestElement' ? p.argument : p.value, out));
  else if (pat.type === 'ArrayPattern') pat.elements.forEach(e => namesInPattern(e, out));
  else if (pat.type === 'RestElement') namesInPattern(pat.argument, out);
  else if (pat.type === 'AssignmentPattern') namesInPattern(pat.left, out);
}

function walk(node, parent, scopeChain, file, inFunction) {
  if (!node || typeof node.type !== 'string') return;
  // New scopes
  let chain = scopeChain;
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression') {
    const s = new Set();
    if (node.id && node.type !== 'ArrowFunctionExpression' && node.type === 'FunctionExpression') s.add(node.id.name);
    node.params.forEach(p => { const tmp = []; namesInPattern(p, tmp); tmp.forEach(n => s.add(n)); });
    if (node.type !== 'ArrowFunctionExpression') { s.add('arguments'); }
    chain = [s, ...scopeChain];
    // named FunctionExpression id already added; FunctionDeclaration id belongs to outer scope
    if (node.type === 'FunctionDeclaration' && node.id) scopeChain[0] && scopeChain[0].add(node.id.name);
  } else if (node.type === 'BlockStatement' || node.type === 'ForStatement' ||
             node.type === 'ForInStatement' || node.type === 'ForOfStatement' ||
             node.type === 'SwitchStatement' || node.type === 'CatchClause') {
    chain = [new Set(), ...scopeChain];
    if (node.type === 'CatchClause' && node.param) { const t = []; namesInPattern(node.param, t); t.forEach(n => chain[0].add(n)); }
  }
  // Variable declarations add to current scope
  if (node.type === 'VariableDeclaration') {
    for (const d of node.declarations) {
      // `var` in function scope hoists to function; approximate with current block — fine for resolution
      const t = []; namesInPattern(d.id, t); t.forEach(n => chain[0].add(n));
    }
  }
  // Check identifier use
  if (node.type === 'Identifier' && parent && !isDeclarationPosition(node, parent)) {
    const name = node.name;
    if (name === 'undefined') { /* skip */ }
    else if (scopeDeclares(node, name, chain)) { /* local ok */ }
    else if (globalNames.has(name) || BROWSER_GLOBALS.has(name)) { /* global ok */ }
    else {
      const isWrite = parent.type === 'AssignmentExpression' && parent.left === node;
      problems.push({ file: path.basename(file), line: node.loc.start.line,
        name, kind: isWrite ? 'implicit-global-write' : 'undefined-read',
        snippet: '' });
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach(c => c && c.type && walk(c, node, chain, file));
    else if (child && child.type) walk(child, node, chain, file);
  }
}

for (const f of files) walk(asts.get(f), null, [new Set()], f);

// Attach snippets
for (const p of problems) {
  const lines = fs.readFileSync(path.join(ROOT, 'assets/js', p.file), 'utf8').split('\n');
  p.snippet = (lines[p.line - 1] || '').trim().slice(0, 140);
}

// ---- Report ----
console.log('=== duplicate top-level bindings across files (would throw at load) ===');
let dupes = 0;
for (const [name, where] of [...globalNames.entries()].sort()) {
  if (where.length > 1) { dupes++; console.log(`  ${name}: ${where.join(', ')}`); }
}
if (!dupes) console.log('  none');
console.log('\n=== unresolved identifiers ===');
const byFile = {};
for (const p of problems) { (byFile[p.file] = byFile[p.file] || []).push(p); }
let total = 0;
for (const f of Object.keys(byFile).sort()) {
  console.log(`--- ${f} ---`);
  const seen = new Set();
  for (const p of byFile[f]) {
    total++;
    const key = p.kind + ':' + p.name;
    if (seen.has(key)) { console.log(`  L${p.line} [${p.kind}] ${p.name}`); continue; }
    seen.add(key);
    console.log(`  L${p.line} [${p.kind}] ${p.name} :: ${p.snippet}`);
  }
}
console.log(`\n${total} unresolved uses in ${Object.keys(byFile).length} files, ${globalNames.size} project globals.`);
