/* Deep audit — part 7: does the motion layer respect prefers-reduced-motion?
 * Lists every animation that is still running for a user who asked for less motion.
 */
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

const PAGES = ['home', 'search', 'brands', 'about', 'contact', 'services', 'shipping'];

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const out = {};
    for (const pg of PAGES) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
        await page.goto(BASE_URL, { waitUntil: 'load' });
        await page.waitForTimeout(2000);
        await page.evaluate(n => { showPage(n); if (n === 'search') { AppState.searchResults = [...ProductDatabase]; renderSearchResults(); } }, pg);
        await page.waitForTimeout(1200);

        out[pg] = await page.evaluate(() => {
            const still = [];
            for (const a of document.getAnimations()) {
                if (a.playState !== 'running') continue;
                const t = a.effect?.target;
                if (!t || !t.offsetParent) continue;
                const cs = getComputedStyle(t);
                still.push({
                    el: t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + (t.className ? '.' + String(t.className).split(' ').filter(Boolean).slice(0, 2).join('.') : ''),
                    anim: a.animationName || a.transitionProperty || '(js)',
                    dur: cs.animationDuration,
                    iter: cs.animationIterationCount,
                    infinite: cs.animationIterationCount === 'infinite'
                });
            }
            return { total: still.length, infinite: still.filter(s => s.infinite).length, list: still.slice(0, 25) };
        });
        await page.close();
    }
    const dir = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'reduced-motion.json'), JSON.stringify(out, null, 2));

    console.log('=== ANIMATIONS STILL RUNNING WITH prefers-reduced-motion: reduce ===\n');
    for (const [pg, r] of Object.entries(out)) {
        console.log(`[${pg}]  running=${r.total}  infinite=${r.infinite}`);
        const uniq = [...new Map(r.list.map(x => [x.anim, x])).values()];
        uniq.forEach(x => console.log(`   ${x.infinite ? '∞' : ' '} ${x.anim.padEnd(22)} ${x.dur.padEnd(8)} ${x.el}`));
    }
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
