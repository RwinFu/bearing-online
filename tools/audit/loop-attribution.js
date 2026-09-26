/* Deep audit — part 4: attribute every animation-frame callback to its source file.
 *
 * Instruments requestAnimationFrame before any page script runs and records the
 * stack of every registration. Reports, per source location, how many callbacks
 * are scheduled per second while the page is IDLE (no user interaction) — i.e.
 * how much CPU the decorative layer burns for nothing.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';

const instrument = () => {
    window.__rafLog = {};
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
        try {
            const stack = (new Error().stack || '');
            let site = null;
            // Chromium: "at fnName (http://host/assets/js/16-animations.js:127:9)"
            const m = stack.match(/assets\/js\/([\w.-]+)\.js:(\d+):(\d+)/);
            if (m) site = `${m[1]}:${m[2]}`;
            if (!site) {
                const src = String(cb).replace(/\s+/g, ' ').slice(0, 110);
                site = 'inline: ' + src;
            }
            window.__rafLog[site] = (window.__rafLog[site] || 0) + 1;
        } catch { /* ignore */ }
        return raf(cb);
    };
    // also count timers, which are the other way to burn CPU while idle
    window.__timerLog = {};
    const si = window.setInterval;
    window.setInterval = function (fn, ms, ...rest) {
        const stack = (new Error().stack || '').split('\n');
        let site = 'unknown';
        for (const line of stack) { const m = line.match(/(assets\/js\/[\w.-]+\.js)[^)]*?:(\d+):(\d+)/); if (m) { site = `${m[1]}:${m[2]}`; break; } }
        window.__timerLog[site] = window.__timerLog[site] || { count: 0, everyMs: ms };
        window.__timerLog[site].count++;
        return si.call(window, fn, ms, ...rest);
    };
};

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(instrument);
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(2500);

    // fully idle: no scrolling, no mouse movement, user is just reading
    await page.evaluate(() => { window.__rafLog = {}; });
    await page.waitForTimeout(5000);
    const idle = await page.evaluate(() => ({ raf: window.__rafLog, timers: window.__timerLog }));

    // while scrolling the home page
    await page.evaluate(() => { window.__rafLog = {}; });
    await page.evaluate(async () => {
        for (let i = 0; i < 25; i++) { window.scrollBy(0, 160); await new Promise(r => setTimeout(r, 90)); }
    });
    const scrolling = await page.evaluate(() => ({ raf: window.__rafLog }));

    // while moving the mouse across the page (cursor/tilt/spotlight listeners)
    await page.evaluate(() => { window.__rafLog = {}; });
    for (let i = 0; i < 40; i++) { await page.mouse.move(300 + i * 22, 300 + (i % 7) * 40); }
    const mouse = await page.evaluate(() => ({ raf: window.__rafLog }));

    const out = { idle, scrolling, mouse };
    const dir = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'loops.json'), JSON.stringify(out, null, 2));

    const pct = n => `${(n / 5).toFixed(1)}/s`;
    console.log('\n=== rAF CALLBACKS WHILE PAGE IS FULLY IDLE (5s window) ===');
    Object.entries(idle.raf).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${pct(v).padStart(9)}  ${k}`));
    console.log('\n=== setInterval REGISTRATIONS ===');
    Object.entries(idle.timers).forEach(([k, v]) => console.log(`  x${v.count} every ${v.everyMs}ms  ${k}`));
    console.log('\n=== rAF WHILE SCROLLING HOME (25 scrolls) ===');
    Object.entries(scrolling.raf).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(6)}  ${k}`));
    console.log('\n=== rAF WHILE MOVING MOUSE (40 moves) ===');
    Object.entries(mouse.raf).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(6)}  ${k}`));

    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
