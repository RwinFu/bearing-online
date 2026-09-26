/* Deep audit — part 5: forced-reflow (layout thrash) counter.
 *
 * Counts how many times per second the app asks the browser to synchronously
 * recalculate layout / style — the classic cause of a "laggy" page. Also counts
 * getComputedStyle reads. Everything is attributed to the JS source line.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

const instrument = () => {
    window.__thrash = { gbcr: {}, gcs: {}, reflow: 0 };
    const label = () => {
        // capture the nearest call site from the app
        const st = (new Error().stack || '').split('\n');
        for (const l of st) {
            const m = l.match(/assets\/js\/([\w.-]+\.js)(?::(\d+))?/);
            if (m) return `${m[1]}${m[2] ? ':' + m[2] : ''}`;
        }
        return 'unknown';
    };
    const gbcr = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
        const k = label();
        window.__thrash.gbcr[k] = (window.__thrash.gbcr[k] || 0) + 1;
        return gbcr.call(this);
    };
    const gcs = window.getComputedStyle;
    window.getComputedStyle = function (...a) {
        const k = label();
        window.__thrash.gcs[k] = (window.__thrash.gcs[k] || 0) + 1;
        return gcs.apply(window, a);
    };
    try {
        new PerformanceObserver(l => { window.__thrash.reflow += l.getEntries().length; }).observe({ entryTypes: ['layout-shift', 'longtask'] });
    } catch { /* ignore */ }
};

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(instrument);
    page.on('pageerror', e => console.log('PAGEERROR:', e.message ?? String(e)));

    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    const sample = async (secs, label) => {
        await page.evaluate(() => { window.__thrash.gbcr = {}; window.__thrash.gcs = {}; window.__thrash.reflow = 0; });
        await page.waitForTimeout(secs * 1000);
        const r = await page.evaluate(() => window.__thrash);
        const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
        return {
            phase: label,
            getBoundingClientRectPerSec: Math.round(sum(r.gbcr) / secs),
            getComputedStylePerSec: Math.round(sum(r.gcs) / secs),
            topGbcr: Object.entries(r.gbcr).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} = ${Math.round(v / secs)}/s`),
            topGcs: Object.entries(r.gcs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} = ${Math.round(v / secs)}/s`)
        };
    };

    const out = [];
    await page.evaluate(() => showPage('home'));
    await page.waitForTimeout(800);
    out.push(await sample(5, 'home — fully idle (user reading)'));

    await page.evaluate(() => showPage('search'));
    await page.waitForTimeout(800);
    out.push(await sample(5, 'search — fully idle'));

    await page.evaluate(() => showPage('cart'));
    await page.waitForTimeout(800);
    out.push(await sample(4, 'cart — fully idle'));

    await page.evaluate(() => showPage('home'));
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.scrollTo(0, 300); });
    out.push(await sample(4, 'home — scrolled past hero'));

    const dir = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'reflow.json'), JSON.stringify(out, null, 2));

    for (const r of out) {
        console.log(`\n### ${r.phase}`);
        console.log(`   getBoundingClientRect : ${r.getBoundingClientRectPerSec}/s   <- forced synchronous layout`);
        console.log(`   getComputedStyle      : ${r.getComputedStylePerSec}/s   <- forced style recalc`);
        if (r.topGbcr.length) console.log('   hot spots: ' + r.topGbcr.join(' | '));
        if (r.topGcs.length) console.log('   style hot: ' + r.topGcs.join(' | '));
    }
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
