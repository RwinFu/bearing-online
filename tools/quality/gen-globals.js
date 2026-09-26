#!/usr/bin/env node
/* Generates the cross-file global surface of the site's classic scripts.
 *
 * All 19 files in assets/js are loaded as plain <script> tags into ONE global
 * scope, so a name declared in 01-state-data.js is legitimately visible in
 * 19-account-dashboard.js. ESLint lints each file in isolation and would report
 * every such reference as `no-undef`. This script parses the files with acorn
 * (the same parser the smoke tests use), collects the real shared surface, and
 * writes it to .globals.json for eslint.config.js to consume.
 *
 * Two things it also checks, both of which are real click-time failures:
 *   - a name called from an inline on* handler in index.html that no script declares
 *   - the same top-level name declared in two different files, which silently
 *     makes the later declaration win for every earlier caller
 *
 * Usage: node tools/quality/gen-globals.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '../..');
const JS_DIR = path.join(ROOT, 'assets/js');
const OUT = path.join(__dirname, '.globals.json');

// Reserved words plus the handful of identifiers that appear inside inline
// handlers but are not functions (e.g. `event`, `this`).
const NOT_FUNCTIONS = new Set([
    'if', 'return', 'typeof', 'void', 'new', 'delete', 'in', 'of', 'else', 'do', 'try',
    'event', 'this', 'window', 'document', 'arguments', 'function', 'true', 'false', 'null', 'undefined'
]);

const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();

/** Top-level bindings, keyed by name -> [files that declare it]. */
const declared = new Map();
const parseErrors = [];

function collectPattern(pat, file, into) {
    if (!pat) return;
    switch (pat.type) {
        case 'Identifier': into.push(pat.name); break;
        case 'ObjectPattern': pat.properties.forEach(p => collectPattern(p.type === 'RestElement' ? p.argument : p.value, file, into)); break;
        case 'ArrayPattern': pat.elements.forEach(e => collectPattern(e, file, into)); break;
        case 'RestElement': collectPattern(pat.argument, file, into); break;
        case 'AssignmentPattern': collectPattern(pat.left, file, into); break;
        default: break;
    }
}

for (const f of files) {
    const code = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
    let ast;
    try {
        ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', locations: true });
    } catch (e) {
        parseErrors.push(`${f}:${e.loc ? e.loc.line : '?'} ${e.message}`);
        continue;
    }
    const add = name => {
        if (!declared.has(name)) declared.set(name, []);
        declared.get(name).push(f);
    };
    for (const node of ast.body) {
        if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) add(node.id.name);
        else if (node.type === 'VariableDeclaration') {
            for (const d of node.declarations) {
                const names = [];
                collectPattern(d.id, f, names);
                names.forEach(add);
            }
        } else if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
            // window.foo = ... / window.foo.bar = ... → exposes foo globally
            let left = node.expression.left;
            while (left && left.type === 'MemberExpression' && !left.computed) left = left.object;
            if (left && left.type === 'Identifier' && (left.name === 'window' || left.name === 'globalThis')) {
                let m = node.expression.left;
                const parts = [];
                while (m && m.type === 'MemberExpression' && !m.computed) { parts.unshift(m.property.name); m = m.object; }
                if (parts.length) add(parts[0]);
            }
        }
    }
}

// ---- inline-handler targets, in index.html AND in the HTML that JS renders.
// The second half matters: most of this site's buttons are produced by template
// literals inside assets/js, so a typo there is a dead button that only appears
// after some interaction.
const HANDLER_RE = /\son(?:click|change|input|submit|keydown|keyup|keypress|focus|blur|load|error|mouseenter|mouseleave|toggle)\s*=\s*(["'])([^"']*)\1/g;

function handlersIn(text) {
    const found = new Set();
    for (const m of text.matchAll(HANDLER_RE)) {
        // Strip any string literals inside the handler body so that
        // onclick="f('a(')" does not produce a bogus call target.
        const body = m[2].replace(/'[^']*'|"[^"]*"/g, '""');
        for (const c of body.matchAll(/(?:^|[^\w.$])([A-Za-z_$][\w$]*)\s*\(/g)) {
            if (!NOT_FUNCTIONS.has(c[1])) found.add(c[1]);
        }
    }
    return found;
}

const htmlHandlers = handlersIn(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
const jsHandlers = new Set();
for (const f of files) {
    for (const h of handlersIn(fs.readFileSync(path.join(JS_DIR, f), 'utf8'))) jsHandlers.add(h);
}
const handlerCalls = new Set([...htmlHandlers, ...jsHandlers]);
const missingHandlers = [...handlerCalls].filter(n => !declared.has(n)).sort();
const missingFromHtml = [...htmlHandlers].filter(n => !declared.has(n)).sort();
const missingFromJs = [...jsHandlers].filter(n => !declared.has(n)).sort();

// ---- duplicate top-level declarations (last one silently wins)
const duplicates = [...declared.entries()].filter(([, where]) => where.length > 1)
    .map(([name, where]) => ({ name, files: where })).sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(OUT, JSON.stringify({
    globals: [...declared.keys()].sort(),
    missingHandlers,
    missingFromHtml,
    missingFromJs,
    handlerTargets: [...handlerCalls].sort(),
    duplicates,
    parseErrors,
    generatedFrom: files
}, null, 2));

console.log(`scripts parsed        : ${files.length}`);
console.log(`cross-file globals    : ${declared.size}  ->  ${path.relative(ROOT, OUT)}`);
console.log(`inline handlers       : ${handlerCalls.size} distinct call targets (${htmlHandlers.size} in index.html, ${jsHandlers.size} in rendered templates)`);

if (parseErrors.length) {
    console.log(`\nPARSE ERRORS (the file will not load at all in a browser):`);
    parseErrors.forEach(e => console.log('  ' + e));
}
if (duplicates.length) {
    console.log(`\nDUPLICATE TOP-LEVEL DECLARATIONS (later file silently overrides earlier):`);
    duplicates.forEach(d => console.log(`  ${d.name}: ${d.files.join(', ')}`));
}
if (missingHandlers.length) {
    console.log(`\nINLINE HANDLERS WITH NO TARGET (throw "x is not defined" when clicked):`);
    if (missingFromHtml.length) missingFromHtml.forEach(n => console.log(`  ${n}()   [index.html]`));
    if (missingFromJs.length) missingFromJs.forEach(n => console.log(`  ${n}()   [rendered from JS]`));
}
if (!parseErrors.length && !duplicates.length && !missingHandlers.length) {
    console.log('\nOK — every script parses, no duplicate declarations, every inline handler resolves.');
}

process.exitCode = parseErrors.length || missingHandlers.length ? 1 : 0;
