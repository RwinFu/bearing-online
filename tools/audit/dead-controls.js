/* Deep audit for Bearing Online — part 2: per-page dead-control detector.
 *
 * Drives real Playwright clicks on every visible control, page by page, and
 * fingerprints the whole app state before/after. Reports controls that throw,
 * call undefined globals, do nothing, or force a full page reload.
 *
 * Usage: CHROMIUM_EXECUTABLE_PATH=/path/to/chrome node dead-controls.js
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';
const PAGES = ['home', 'search', 'brands', 'services', 'about', 'contact', 'shipping', 'cart', 'checkout', 'account', 'compare', 'wishlist'];

const FP = () => {
    const toArr = q => [...document.querySelectorAll(q)];
    let html = '';
    try { html = document.body.outerHTML; } catch { html = ''; }
    let h = 0;
    for (let i = 0; i < html.length; i += 7) { h = (h * 31 + html.charCodeAt(i)) | 0; } // structural hash
    let st = '';
    try {
        st = JSON.stringify(window.AppState, (k, v) => (typeof v === 'function' || v?.nodeType ? undefined : v)) || '';
    } catch { st = 'unserializable'; }
    return JSON.stringify([
        location.hash,
        window.AppState?.page,
        window.AppState?.language,
        window.AppState?.cart?.length, window.AppState?.compare?.length, window.AppState?.wishlist?.length,
        toArr('.page-section:not(.hidden)').map(s => s.id),
        toArr('.notification, .toast').length,
        toArr('[role="dialog"]:not(.hidden), .modal:not(.hidden), dialog[open], .lightbox.open').length,
        html.length, h,
        toArr('input,textarea,select').filter(el => el.offsetParent).map(el => el.value).join('~'),
        document.activeElement?.id || document.activeElement?.tagName,
        toArr('.page-section:not(.hidden)').map(s => s.className).join('|'),
        st.length, st.slice(0, 4000)
    ]);
};

const CONTROL_SEL = 'button, [role="button"], a[href], [onclick], [onchange], input[type="checkbox"], input[type="radio"], summary';

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const findings = [];
    const origin = new URL(BASE_URL).origin;

    // Keep the audit inside the local origin: external links (WhatsApp, QR, …) would
    // otherwise destroy the app context and mask real findings.
    await page.route('**', route => {
        const url = route.request().url();
        if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return route.continue();
        return route.abort();
    });
    page.on('framenavigated', frame => {
        if (frame === page.mainFrame() && !frame.url().startsWith(origin)) {
            // bounce straight back to the app
            frame.goto(BASE_URL, { waitUntil: 'load' }).catch(() => {});
        }
    });

    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(1200);

    for (const name of PAGES) {
        const perPage = [];
        await page.waitForLoadState('load').catch(() => {});
        await page.evaluate(n => { if (typeof showPage === 'function') showPage(n); window.scrollTo(0, 0); }, name);
        await page.waitForTimeout(650);

        // snapshot of controls to sweep, with stable indices
        const list = await page.evaluate(({ pageName, sel }) => {
            const out = [];
            [...document.querySelectorAll(sel)].forEach((el, i) => {
                const sec = el.closest('.page-section');
                if (sec && sec.id !== 'page-' + pageName) return;
                const cs = getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none') return;
                const r = el.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) return;
                if (el.closest('[aria-hidden="true"]')) return;
                out.push({
                    i,
                    label: (el.innerText || el.value || el.getAttribute('aria-label') || el.title || el.id || el.className.toString() || '').trim().replace(/\s+/g, ' ').slice(0, 65),
                    tag: el.tagName,
                    id: el.id || null,
                    cls: el.className.toString().slice(0, 80),
                    handler: el.getAttribute('onclick') || el.getAttribute('onchange') || null,
                    // A <button type="submit"> has no handler of its own: the work is
                    // wired to the enclosing <form onsubmit>. Without this the sweep
                    // reports working submit buttons as dead.
                    formHandler: (() => {
                        const form = el.form || el.closest('form');
                        if (!form) return null;
                        if (el.tagName === 'BUTTON' && (el.type || 'submit') !== 'submit') return null;
                        return form.getAttribute('onsubmit') || null;
                    })(),
                    href: el.getAttribute('href') || null
                });
            });
            return out;
        }, { pageName: name, sel: CONTROL_SEL });

        const seenKeys = new Set();
        for (const meta of list) {
            const key = meta.label + '|' + meta.handler + '|' + meta.href + '|' + meta.tag;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            let reloaded = false;
            const onLoad = () => { reloaded = true; };
            page.on('load', onLoad);
            let thrown = null;
            page.once('pageerror', e => { thrown = e.message ?? String(e); });

            const before = await page.evaluate(FP).catch(() => null);
            if (before === null) break; // context gone; skip page

            await page.evaluate(({ pageName, idx, sel }) => {
                const el = [...document.querySelectorAll(sel)][idx];
                if (el) el.click();
            }, { pageName: name, idx: meta.i, sel: CONTROL_SEL }).catch(() => { throw new Error('nav'); });
            await page.waitForTimeout(230);

            const after = await page.evaluate(FP).catch(() => null);
            page.off('load', onLoad);

            const fnMatch = (meta.handler || '').match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
            const fnName = fnMatch ? fnMatch[1] : null;
            const fnMissing = fnName
                ? await page.evaluate(n => typeof window[n] !== 'function', fnName).catch(() => false)
                : false;

            // reset transient UI
            await page.evaluate(() => {
                try { document.querySelectorAll('[role="dialog"]:not(.hidden), .modal:not(.hidden), .lightbox').forEach(m => m.classList.add('hidden')); } catch {}
                try { document.querySelectorAll('.mobile-menu, #mobile-menu').forEach(m => m.classList.remove('open', 'active')); } catch {}
                try { document.body.style.overflow = ''; } catch {}
                if (typeof AppState !== 'undefined' && AppState) AppState.mobileMenuOpen = false;
            }).catch(() => {});

            if (reloaded) {
                await page.waitForLoadState('load').catch(() => {});
                await page.waitForTimeout(400);
                await page.evaluate(n => { if (typeof showPage === 'function') showPage(n); }, name);
                await page.waitForTimeout(400);
            } else {
                await page.evaluate(n => { try { if (typeof showPage === 'function') showPage(n); window.scrollTo(0, 0); } catch {} }, name);
                await page.waitForTimeout(70);
            }

            let noEffect = after !== null && before === after;
            const isLink = meta.tag === 'A';

            // A control that navigates to the page we are already on legitimately
            // changes nothing (clicking "cart" while on the cart page). Before
            // reporting a no-op, re-run the same handler from a neutral page: if it
            // does something there, the control is fine and the sweep was standing
            // in the wrong place.
            if (noEffect && fnName && !thrown) {
                const neutral = name === 'home' ? 'search' : 'home';
                const probe = await page.evaluate(({ neutralPage, fn }) => {
                    try {
                        if (typeof showPage === 'function') showPage(neutralPage);
                        return { ok: true, before: null };
                    } catch { return { ok: false }; }
                }, { neutralPage: neutral, fn: fnName }).catch(() => ({ ok: false }));
                if (probe.ok) {
                    await page.waitForTimeout(220);
                    const neutBefore = await page.evaluate(FP).catch(() => null);
                    const callErr = await page.evaluate(fn => {
                        try { window[fn](); return null; } catch (e) { return String(e); }
                    }, fnName).catch(() => 'unavailable');
                    await page.waitForTimeout(220);
                    const neutAfter = await page.evaluate(FP).catch(() => null);
                    if (neutBefore !== null && neutAfter !== null && neutBefore !== neutAfter && !callErr) {
                        noEffect = false; // false positive — the control works from the real entry point
                    }
                    await page.evaluate(n => {
                        try { if (typeof showPage === 'function') showPage(n); window.scrollTo(0, 0); } catch {}
                    }, name).catch(() => {});
                }
            }

            const reason =
                thrown ? 'JS error on click: ' + thrown :
                fnMissing ? `calls undefined global ${fnName}()` :
                reloaded && isLink ? 'forces a full page reload instead of SPA routing: ' + meta.href :
                noEffect && !isLink && !meta.handler && !meta.formHandler ? 'no handler, click changes nothing' :
                noEffect && meta.href === '#' ? 'href="#" and click changes nothing' :
                noEffect && fnName ? `calls ${fnName}() but nothing changes (no-op)` :
                null;

            if (reason) perPage.push({ label: meta.label || '(no label)', tag: meta.tag, id: meta.id, cls: meta.cls, handler: meta.handler, href: meta.href, reason });
        }
        findings.push({ page: name, swept: list.length, problems: perPage });
        console.log(`\n[${name}] swept ${list.length} controls — ${perPage.length} problem(s)`);
        perPage.forEach(d => console.log(`  • "${d.label}" <${d.tag}${d.id ? ' #' + d.id : ''}>  ->  ${d.reason}`));
    }

    const out = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'dead-controls.json'), JSON.stringify(findings, null, 2));
    const total = findings.reduce((a, f) => a + f.problems.length, 0);
    console.log(`\n=========== TOTAL: ${total} problem(s) ===========`);
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
