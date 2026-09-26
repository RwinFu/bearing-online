/* Deep audit — part 8: dead CSS & dead JS detection via real coverage.
 *
 * Visits every page, exercising the whole app, and records which CSS rules and
 * which JS byte ranges the browser actually used. Whatever is never used across
 * the entire session is dead weight shipped to every visitor.
 *
 * Output: .arena/audit/coverage.json + a per-file summary on stdout.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const styleSheetUrls = {};
    cdp.on('CSS.styleSheetAdded', e => { styleSheetUrls[e.header.styleSheetId] = e.header.sourceURL || ('inline:' + (e.header.origin || '?')); });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await cdp.send('CSS.startRuleUsageTracking');

    // ---- exercise the whole app so "unused" really means unused
    const allPages = ['home', 'search', 'brands', 'services', 'about', 'contact', 'shipping', 'cart', 'compare', 'wishlist', 'checkout', 'account'];
    for (const p of allPages) {
        await page.evaluate(n => {
            try {
                if (n === 'cart') showCart();
                else if (n === 'compare') showCompare();
                else if (n === 'wishlist') showWishlist();
                else if (n === 'checkout') renderCheckout();
                else if (n === 'account') showAccount('overview');
                else showPage(n);
            } catch { showPage('home'); }
        }, p);
        await page.waitForTimeout(450);
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
        await page.waitForTimeout(220);
    }
    // states that change the DOM a lot
    await page.evaluate(() => { try { AppState.searchResults = [...ProductDatabase]; showPage('search'); renderSearchResults(); } catch {} });
    await page.waitForTimeout(700);
    await page.evaluate(() => { try { showProductDetail(ProductDatabase[0].id); } catch {} });
    await page.waitForTimeout(700);
    await page.evaluate(() => { try { showAdminPanel(); } catch {} });
    await page.waitForTimeout(900);
    await page.evaluate(() => { try { closeAdminPanel(); openLeadModal(); } catch {} });
    await page.waitForTimeout(700);
    await page.evaluate(() => { try { closeLeadModal(); AppState.wishlist = [ProductDatabase[0].id]; showWishlist(); AppState.compare = [ProductDatabase[0].id, ProductDatabase[1].id]; showCompare(); addToCart(ProductDatabase[0].id, null, 1, true); showCart(); } catch {} });
    await page.waitForTimeout(900);
    await page.evaluate(() => { try { showPage('home'); setLanguage('en'); showPage('search'); setLanguage('fa'); showPage('home'); } catch {} });
    await page.waitForTimeout(900);
    // mobile layout pass
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ['home', 'search', 'brands', 'about', 'shipping']) {
        await page.evaluate(n => showPage(n), p);
        await page.waitForTimeout(400);
    }
    await page.waitForTimeout(700);

    // ---- collect
    const cssUsage = await cdp.send('CSS.stopRuleUsageTracking');
    const { result: jsCov } = await cdp.send('Profiler.takePreciseCoverage');

    // map CSS rule usage → per stylesheet
    const cssFiles = {};
    for (const r of cssUsage.ruleUsage) {
        const file = styleSheetUrls[r.styleSheetId] || 'unknown';
        const local = file.split('/').pop().split('?')[0];
        if (!cssFiles[local]) cssFiles[local] = { used: 0, unused: 0, unusedRanges: [] };
        if (r.used) cssFiles[local].used++;
        else { cssFiles[local].unused++; cssFiles[local].unusedRanges.push([r.startOffset, r.endOffset]); }
    }

    // map JS coverage → per file
    const jsFiles = {};
    for (const s of jsCov) {
        const local = s.url.split('/').pop().split('?')[0];
        if (!local || /vendor|tailwind|three|fontawesome/.test(s.url)) continue;
        let total = 0, used = 0, fnsTotal = 0, fnsUsed = 0;
        for (const f of s.functions) {
            fnsTotal++;
            const anyCount = f.ranges.some(r => r.count > 0);
            if (anyCount) fnsUsed++;
            for (const r of f.ranges) { const len = r.endOffset - r.startOffset; total += len; if (r.count > 0) used += len; }
        }
        if (!jsFiles[local]) jsFiles[local] = { bytes: 0, usedBytes: 0, fns: 0, usedFns: 0 };
        jsFiles[local].bytes += total;
        jsFiles[local].usedBytes += used;
        jsFiles[local].fns += fnsTotal;
        jsFiles[local].usedFns += fnsUsed;
    }

    // ---- report
    console.log('\n================ CSS COVERAGE (app files) ================');
    console.log('file'.padEnd(26) + 'used'.padStart(7) + 'unused'.padStart(8) + '  dead%');
    const cssRows = Object.entries(cssFiles).filter(([f]) => /^\d\d-/.test(f)).sort((a, b) => b[1].unused - a[1].unused);
    for (const [f, v] of cssRows) {
        const pct = v.used + v.unused ? (100 * v.unused / (v.used + v.unused)).toFixed(1) : '0';
        console.log(f.padEnd(26) + String(v.used).padStart(7) + String(v.unused).padStart(8) + `  ${pct}%`);
    }
    const totU = cssRows.reduce((a, [, v]) => a + v.used, 0);
    const totN = cssRows.reduce((a, [, v]) => a + v.unused, 0);
    console.log(`TOTAL rules: ${totU + totN}   unused: ${totN}  (${(100 * totN / (totU + totN)).toFixed(1)}% dead)`);

    console.log('\n================ JS COVERAGE (app files) ================');
    console.log('file'.padEnd(26) + 'fns'.padStart(6) + 'unused'.padStart(8) + '  never-called%');
    const jsRows = Object.entries(jsFiles).filter(([f]) => /^\d\d-/.test(f)).sort((a, b) => (b[1].fns - b[1].usedFns) - (a[1].fns - a[1].usedFns));
    for (const [f, v] of jsRows) {
        const pct = v.fns ? (100 * (v.fns - v.usedFns) / v.fns).toFixed(1) : '0';
        console.log(f.padEnd(26) + String(v.fns).padStart(6) + String(v.fns - v.usedFns).padStart(8) + `  ${pct}%`);
    }
    const jt = jsRows.reduce((a, [, v]) => a + v.fns, 0);
    const ju = jsRows.reduce((a, [, v]) => a + (v.fns - v.usedFns), 0);
    console.log(`TOTAL functions: ${jt}   never called in this session: ${ju}  (${(100 * ju / jt).toFixed(1)}%)`);

    const dir = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'coverage.json'), JSON.stringify({ cssFiles, jsFiles }, null, 2));
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
