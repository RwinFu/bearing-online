/**
 * Static cross-reference check between index.html and the assets/js modules.
 *  - every function called from an inline handler (onclick="…") must be defined
 *  - every getElementById('x') / querySelector('#x') target should exist in the markup
 *  - every local src/href must exist on disk
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const jsFiles = fs.readdirSync(path.join(ROOT, 'assets/js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')).join('\n');

const problems = [];
const note = (m) => problems.push(m);

// --- 1. inline handler functions -------------------------------------------------
const defined = new Set();
for (const m of js.matchAll(/function\s+([A-Za-z0-9_$]+)\s*\(/g)) defined.add(m[1]);
for (const m of js.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:function|\()/g)) defined.add(m[1]);
for (const m of js.matchAll(/window\.([A-Za-z0-9_$]+)\s*=\s*(?:function|\()/g)) defined.add(m[1]);

const BUILTINS = new Set(['event', 'this', 'window', 'document', 'history', 'location', 'alert', 'print',
    'stopPropagation', 'preventDefault', 'setTimeout', 'open', 'close', 'parseInt', 'saveJSON', 'scrollTo',
    'getElementById', 'querySelector', 'querySelectorAll', 'if', 'for', 'while', 'switch', 'return', 'typeof',
    'function', 'catch', 'Boolean', 'Number', 'String']);

const handlers = [...html.matchAll(/on[a-z]+\s*=\s*"([^"]*)"/g)].map(m => m[1]);
const called = new Set();
for (const h of handlers) {
    // only bare calls: skip member calls (foo.bar(...)) and keywords
    for (const m of h.matchAll(/(^|[^.A-Za-z0-9_$])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) {
        if (m[2] !== 'if' && m[2] !== 'function') called.add(m[2]);
    }
}
const missingFns = [...called].filter(fn => !defined.has(fn) && !BUILTINS.has(fn));
if (missingFns.length) note('inline handlers call undefined functions: ' + missingFns.join(', '));

// --- 2. element ids -----------------------------------------------------------------
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const jsIds = new Set([...js.matchAll(/getElementById\(\s*['"`]([^'"`$]+)['"`]/g)].map(m => m[1]));
// ids created by the JS itself (templates and element.id assignments)
const jsCreatedIds = new Set([...js.matchAll(/id="([^"$]+)"/g)].map(m => m[1]));
for (const m of js.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)) jsCreatedIds.add(m[1]);
for (const m of js.matchAll(/id="([^"$]+)"/g)) jsIds.add(m[1]);
const dynamicOk = (id) => /^co-|^lead-|^filter-|^rc|^bearing|^pf-|^order-|^tipax|^courier/.test(id);
const missingIds = [...jsIds].filter(id => !htmlIds.has(id) && !jsCreatedIds.has(id) && !dynamicOk(id));
if (missingIds.length) note('JS looks up ids that the markup does not define: ' + missingIds.join(', '));

// --- 3. local asset references -------------------------------------------------------
const localRefs = [...html.matchAll(/(?:src|href)="((?!https?:|#|mailto:|tel:|data:)[^"]+)"/g)].map(m => m[1]);
for (const ref of localRefs) {
    if (!fs.existsSync(path.join(ROOT, ref))) note('missing local asset referenced by index.html: ' + ref);
}
for (const f of jsFiles) {
    if (!html.includes('assets/js/' + f)) note('module not loaded by index.html: ' + f);
}
for (const m of js.matchAll(/['"](assets\/img\/[^'"]+)['"]/g)) {
    if (!fs.existsSync(path.join(ROOT, m[1]))) note('missing image referenced by JS: ' + m[1]);
}

// --- 4. load-order sanity ------------------------------------------------------------
const order = [...html.matchAll(/assets\/js\/(\d\d)-[a-z0-9-]+\.js/g)].map(m => m[1]);
const expected = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
if (order.join(',') !== expected.join(',')) note('unexpected module load order: ' + order.join(','));

const dupHead = (html.match(/<\/head>/g) || []).length;
if (dupHead !== 1) note(`index.html has ${dupHead} </head> tags`);

console.log(`checked: ${handlers.length} inline handlers, ${jsIds.size} id lookups, ${localRefs.length} local refs, ${jsFiles.length} modules`);
if (problems.length) {
    console.log('\nPROBLEMS:');
    problems.forEach(p => console.log('  - ' + p));
    process.exit(1);
}
console.log('static cross-reference check: OK');
