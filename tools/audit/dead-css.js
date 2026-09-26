/* Deep audit — part 9: dead CSS selector detection.
 *
 * Collects every class/ID selector declared in assets/css/*.css and checks it
 * against (a) the static markup, (b) class names emitted from JS templates and
 * (c) classes that actually appear in the live DOM after a full app walkthrough.
 * A selector that matches nothing anywhere is dead weight.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

(async () => {
    // ---- 1. collect declared classes/ids from CSS
    const cssFiles = fs.readdirSync(path.join(ROOT, 'assets/css')).filter(f => f.endsWith('.css'));
    const declared = {}; // name -> [files]
    const keyframes = {};
    for (const f of cssFiles) {
        let css = fs.readFileSync(path.join(ROOT, 'assets/css', f), 'utf8');
        // strip comments
        css = css.replace(/\/\*[\s\S]*?\*\//g, '');
        for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) keyframes[m[1]] = (keyframes[m[1]] || []).concat(f);
        // selectors only: text before '{' that is not an at-rule
        for (const m of css.matchAll(/(^|[};])\s*([^{}@]+)\{/g)) {
            const sel = m[2];
            for (const c of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) { (declared[c[1]] = declared[c[1]] || new Set()).add(f); }
            for (const c of sel.matchAll(/#([_a-zA-Z][\w-]*)/g)) { (declared[c[1]] = declared[c[1]] || new Set()).add(f); }
        }
    }

    // ---- 2. what the markup + JS mention
    const sourceText = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') +
        fs.readdirSync(path.join(ROOT, 'assets/js')).filter(f => f.endsWith('.js'))
            .map(f => fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')).join('\n');

    // ---- 3. what the live DOM actually contains
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(2200);

    const liveClasses = new Set(), liveIds = new Set();
    const harvest = () => page.evaluate(() => {
        const cls = new Set(), ids = new Set();
        document.querySelectorAll('*').forEach(el => {
            if (el.id) ids.add(el.id);
            const a = el.getAttribute('class');
            if (a) a.split(/\s+/).forEach(c => c && cls.add(c));
        });
        return { cls: [...cls], ids: [...ids] };
    });

    for (const p of ['home', 'search', 'brands', 'services', 'about', 'contact', 'shipping']) {
        await page.evaluate(n => showPage(n), p); await page.waitForTimeout(400);
        const r = await harvest(); r.cls.forEach(c => liveClasses.add(c)); r.ids.forEach(i => liveIds.add(i));
    }
    for (const fn of ['showCart()', 'showCompare()', 'showWishlist()', 'renderCheckout()', "showAccount('overview')", "showAccount('orders')", "showAccount('profile')", "showAccount('addresses')", "showAccount('security')", "showAccount('saved')", 'showAdminPanel()', 'openLeadModal()', `showProductDetail(ProductDatabase[0].id)`, 'setLanguage("en")']) {
        await page.evaluate(f => { try { eval(f); } catch {} }, fn);
        await page.waitForTimeout(500);
        const r = await harvest(); r.cls.forEach(c => liveClasses.add(c)); r.ids.forEach(i => liveIds.add(i));
    }
    await page.evaluate(() => { try { setLanguage('fa'); } catch {} });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ['home', 'search', 'about']) { await page.evaluate(n => showPage(n), p); await page.waitForTimeout(500); }
    const r = await harvest(); r.cls.forEach(c => liveClasses.add(c)); r.ids.forEach(i => liveIds.add(i));

    // ---- 4. keyframe usage: is the animation name referenced anywhere?
    const unusedKeyframes = Object.entries(keyframes).filter(([k]) => !new RegExp(`animation[^;{}]*\\b${k}\\b`).test(sourceText + fs.readdirSync(path.join(ROOT, 'assets/css')).map(f => fs.readFileSync(path.join(ROOT, 'assets/css', f), 'utf8')).join('\n')));

    // ---- 5. report
    const dead = [];
    for (const [name, files] of Object.entries(declared)) {
        const inMarkup = new RegExp(`(?<![\\w-])${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(?![\\w-])`).test(sourceText);
        const inDom = liveClasses.has(name) || liveIds.has(name);
        if (!inMarkup && !inDom) dead.push({ name, files: [...files] });
    }
    dead.sort((a, b) => a.files[0].localeCompare(b.files[0]) || a.name.localeCompare(b.name));

    console.log(`CSS selectors declared: ${Object.keys(declared).length}`);
    console.log(`Classes/ids present in live DOM: ${liveClasses.size} classes, ${liveIds.size} ids`);
    console.log(`\n=== SELECTORS DECLARED IN CSS BUT NEVER USED ANYWHERE (${dead.length}) ===`);
    let cur = '';
    for (const d of dead) {
        if (d.files[0] !== cur) { cur = d.files[0]; console.log(`\n-- ${cur}`); }
        console.log(`   .${d.name}`);
    }

    if (unusedKeyframes.length) {
        console.log(`\n=== @keyframes NEVER REFERENCED BY ANY animation PROPERTY (${unusedKeyframes.length}) ===`);
        for (const [k, f] of unusedKeyframes) console.log(`   ${k}  (${[...new Set(f)].join(', ')})`);
    }

    const dir = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'dead-css.json'), JSON.stringify({ dead, unusedKeyframes, declaredCount: Object.keys(declared).length, liveClasses: [...liveClasses] }, null, 2));
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
