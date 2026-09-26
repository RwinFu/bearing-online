/* Deep audit for Bearing Online — part 3: motion & performance cost.
 *
 * Measures what the decorative animation layer costs the user:
 *   - long tasks / forced reflows / layout thrash
 *   - steady-state FPS with all animations running
 *   - the cost of each animation feature measured by switching it off
 *   - CPU work while the tab is idle but the page is open
 *
 * Usage: CHROMIUM_EXECUTABLE_PATH=/path/to/chrome node motion-audit.js
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

const instruments = () => {
    window.__perf = { longTasks: [], rafs: 0, listeners: 0, intervals: 0 };
    try {
        new PerformanceObserver(l => l.getEntries().forEach(e => window.__perf.longTasks.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
    } catch { /* not supported */ }
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) { window.__perf.rafs++; return raf.call(window, cb); };
    const oael = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (t, ...rest) { window.__perf.listeners++; return oael.call(this, t, ...rest); };
    const si = window.setInterval;
    window.setInterval = function (...a) { window.__perf.intervals++; return si.apply(window, a); };
};

const measure = async (page, ms) => {
    await page.evaluate(() => {
        window.__perf.longTasks = []; window.__perf.rafs = 0;
        window.__frames = 0; window.__worst = 0; window.__t0 = performance.now(); window.__tEnd = 0;
        window.__running = true;
        const loop = t => {
            if (!window.__running) return;
            window.__frames++;
            const d = t - (window.__last || t); window.__last = t;
            if (d > window.__worst) window.__worst = d;
            window.__tEnd = t;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    });
    await page.waitForTimeout(ms);
    return page.evaluate(() => {
        window.__running = false;
        const secs = Math.max(0.001, (window.__tEnd - window.__t0) / 1000);
        return { fps: +(window.__frames / secs).toFixed(1), frames: window.__frames, worstFrameMs: Math.round(window.__worst), rafsScheduled: window.__perf.rafs, longTasks: window.__perf.longTasks.length, worstLongTaskMs: window.__perf.longTasks.length ? Math.max(...window.__perf.longTasks) : 0, totalLongTaskMs: window.__perf.longTasks.reduce((a, b) => a + b, 0) };
    });
};

const FEATURES = [
    { id: 'customCursor', css: '.cursor-dot, .cursor-ring { display: none !important; }', js: 'initCursor' },
    { id: 'scrollProgress', css: '#scroll-progress { display: none !important; }', js: 'initScrollEffects' },
    { id: 'vectorCanvas', css: '#page-vector-canvas { display: none !important; }', js: null },
    { id: 'orbsParallax', css: '.orb { display: none !important; }', js: 'initParallax' },
    { id: 'reveal', css: '.reveal, .stagger { opacity: 1 !important; transform: none !important; }', js: 'initRevealObserver' },
    { id: 'typingPlaceholder', css: '', js: 'initTypingPlaceholder' },
    { id: 'marquee', css: '.marquee-track, .marquee, .brand-marquee { animation: none !important; }', js: null },
    { id: 'shimmer', css: '.shimmer, .shine, .skeleton { animation: none !important; }', js: null },
    { id: 'three3d', css: '', js: 'initBearing3D' }
];

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(instruments);

    const errs = [];
    page.on('pageerror', e => errs.push(e.message ?? String(e)));

    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(1800);

    const results = { baseline: {}, features: {}, notes: [] };
    results.baseline.home = await measure(page, 4000);

    // scroll through the whole page (worst case for scroll-driven work)
    await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); }
        window.scrollTo(0, 0);
    });
    results.baseline.scrollHome = await measure(page, 3000);

    await page.evaluate(() => showPage('search'));
    await page.waitForTimeout(900);
    results.baseline.search = await measure(page, 3000);

    await page.evaluate(() => showPage('about'));
    await page.waitForTimeout(1600);
    results.baseline.about3d = await measure(page, 4000);

    // --- idle cost: what the page does when the user is reading, not interacting
    await page.evaluate(() => showPage('home'));
    await page.waitForTimeout(900);
    results.baseline.homeIdleRafPerSec = await page.evaluate(async () => {
        window.__perf.rafs = 0;
        await new Promise(r => setTimeout(r, 3000));
        return Math.round(window.__perf.rafs / 3);
    });

    // --- attribute cost of each decorative feature (CSS-off measurement)
    for (const f of FEATURES) {
        if (!f.css) continue;
        const p2 = await ctx.newPage();
        await p2.addInitScript(instruments);
        await p2.goto(BASE_URL, { waitUntil: 'load' });
        await p2.addStyleTag({ content: f.css });
        await p2.waitForTimeout(1500);
        results.features[f.id] = await measure(p2, 3500);
        await p2.close();
    }

    // --- how many live animation loops exist on a loaded page
    await page.evaluate(() => showPage('home'));
    await page.waitForTimeout(800);
    results.notes.push(await page.evaluate(async () => {
        const anims = [...document.querySelectorAll('*')].filter(el => el.getAnimations && el.getAnimations().length).length;
        const running = document.getAnimations().filter(a => a.playState === 'running').length;
        const infinite = document.getAnimations().filter(a => a.playState === 'running' && /infinite/.test(getComputedStyle(a.effect?.target || document.body).animationIterationCount || '')).length;
        return { elementsWithAnimations: anims, runningAnimations: running, infiniteAnimations: infinite, counters: document.querySelectorAll('.counter').length, tiltCards: document.querySelectorAll('.tilt-card').length, spotlights: document.querySelectorAll('.spotlight').length, orbs: document.querySelectorAll('.orb').length };
    }));

    const out = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'motion.json'), JSON.stringify({ results, errors: [...new Set(errs)] }, null, 2));
    console.log(JSON.stringify(results, null, 2));
    if (errs.length) console.log('ERRORS:', [...new Set(errs)]);
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
