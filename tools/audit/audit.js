/* Deep audit for Bearing Online.
 *
 * Finds, against a running static server:
 *   1. JS runtime errors on every page
 *   2. Controls that look interactive but do nothing (dead buttons)
 *   3. Controls whose inline handler is undefined / throws
 *   4. Accessibility violations (axe-core, WCAG 2.1 A/AA)
 *   5. Missing labels / alt text / empty links
 *
 * Usage:
 *   python3 -m http.server 8080 --directory ../../   # from repo root
 *   CHROMIUM_EXECUTABLE_PATH=/path/to/chrome node audit.js
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';
const PAGES = ['home', 'search', 'brands', 'services', 'about', 'contact', 'shipping', 'cart', 'checkout', 'account', 'compare', 'wishlist'];

const report = { baseUrl: BASE_URL, pages: {}, deadControls: [], errors: [], summary: {} };

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // ---------------------------------------------------------------- 1. errors per page
    for (const name of PAGES) {
        pageErrors.length = 0;
        const ok = await page.evaluate(n => {
            if (typeof showPage !== 'function') return false;
            showPage(n);
            return !document.getElementById('page-' + n)?.classList.contains('hidden');
        }, name);
        await page.waitForTimeout(600);
        report.pages[name] = { rendered: ok, errors: [...new Set(pageErrors)] };
        if (!ok) report.errors.push({ type: 'page-not-rendered', page: name });
        for (const e of new Set(pageErrors)) report.errors.push({ type: 'js-error', page: name, message: e });
    }

    // ---------------------------------------------------------------- 2. dead controls
    // A control is "dead" when it is visible, enabled, and clicking it produces
    // no DOM mutation, no navigation, no state change and no notification.
    const controlReport = await page.evaluate(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const results = [];
        const fingerprint = () => {
            const bits = [
                location.hash,
                AppState?.page,
                AppState?.language,
                JSON.stringify(AppState?.cart ?? []),
                JSON.stringify(AppState?.compare ?? []),
                JSON.stringify(AppState?.wishlist ?? []),
                document.querySelectorAll('.lightbox.open, .modal.open, [role="dialog"]:not(.hidden), dialog[open]').length,
                document.querySelectorAll('#notification-container .notification, .notification-container .notification').length,
                [...document.querySelectorAll('.page-section:not(.hidden)')].map(s => s.id).join(','),
                document.body.innerHTML.length,
                document.querySelectorAll('input:focus,textarea:focus').length
            ];
            return bits.join('|');
        };

        const selector = 'button:not([disabled]), [role="button"]:not([disabled]), a[href="#"], a[href^="javascript:"], .tilt-card, [onclick], [onchange]';
        const nodes = [...document.querySelectorAll(selector)];
        const seen = new Set();

        for (const el of nodes) {
            const label = (el.innerText || el.value || el.getAttribute('aria-label') || el.id || el.className || '').trim().replace(/\s+/g, ' ').slice(0, 70);
            const key = label + '::' + el.tagName + '::' + (el.getAttribute('onclick') || '');
            if (seen.has(key)) continue;
            seen.add(key);

            if (!el.offsetParent && el.tagName !== 'A') continue; // hidden
            const rect = el.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) continue;

            // only audit controls reachable on the current page
            const pageSection = el.closest('.page-section');
            if (pageSection && pageSection.classList.contains('hidden')) continue;

            const before = fingerprint();
            const errs = [];
            try {
                el.click();
            } catch (e) {
                errs.push(e.message);
            }
            await sleep(160);
            const after = fingerprint();

            const handlerAttr = el.getAttribute('onclick') || el.getAttribute('onchange') || '';
            const namedFn = handlerAttr.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
            let undefinedFn = false;
            if (namedFn && typeof window[namedFn[1]] !== 'function') undefinedFn = true;

            if (errs.length || undefinedFn || (before === after && !handlerAttr && el.tagName !== 'A')) {
                // a <button> with no handler attr at all and no state change is a strong dead signal
                const isDead = errs.length || undefinedFn || (before === after && el.tagName === 'BUTTON' && !handlerAttr && !el.dataset.bound);
                if (isDead) {
                    results.push({
                        label,
                        tag: el.tagName,
                        id: el.id || null,
                        classes: el.className.toString().slice(0, 90),
                        handler: handlerAttr || null,
                        reason: errs.length ? 'threw: ' + errs[0] : undefinedFn ? 'handler undefined: ' + namedFn[1] : 'no effect on click',
                        listenerBound: !!el.dataset.bound
                    });
                }
            }
            // restore state so later clicks are not affected
            try { if (typeof closeModal === 'function') closeModal(); } catch { /* ignore */ }
        }
        return results;
    });
    report.deadControls = controlReport;

    // ---------------------------------------------------------------- 3. markup-level checks
    report.markup = await page.evaluate(() => {
        const emptyLinks = [...document.querySelectorAll('a[href="#"]')].filter(a => !a.getAttribute('onclick') && !a.dataset.bound).length;
        const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].map(i => i.getAttribute('src'));
        const inputsNoLabel = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')]
            .filter(el => {
                if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.placeholder) return false;
                if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
                return !el.closest('label');
            })
            .map(el => el.id || el.name || el.className.toString().slice(0, 40));
        return { emptyLinks, imgsNoAlt, inputsNoLabel };
    });

    // ---------------------------------------------------------------- 4. axe accessibility
    try {
        const { AxeBuilder } = require('@axe-core/playwright');
        const axeResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        report.a11y = axeResults.violations.map(v => ({
            id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
            targets: v.nodes.slice(0, 4).map(n => n.target.join(' '))
        }));
    } catch (e) {
        report.a11yError = e.message;
    }

    // ---------------------------------------------------------------- summary
    report.summary = {
        pagesChecked: PAGES.length,
        jsErrors: report.errors.length,
        deadControls: report.deadControls.length,
        emptyLinks: report.markup.emptyLinks,
        imgsNoAlt: report.markup.imgsNoAlt.length,
        inputsNoLabel: report.markup.inputsNoLabel.length,
        a11yViolations: (report.a11y || []).length
    };

    const out = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

    // readable console output
    console.log('\n================ AUDIT SUMMARY ================');
    console.log(JSON.stringify(report.summary, null, 2));
    if (report.errors.length) {
        console.log('\n---- JS ERRORS ----');
        report.errors.forEach(e => console.log(` [${e.page}] ${e.message}`));
    }
    if (report.deadControls.length) {
        console.log('\n---- DEAD / BROKEN CONTROLS ----');
        report.deadControls.forEach(d => console.log(` <${d.tag}> "${d.label}"  id=${d.id}  -> ${d.reason}`));
    }
    if (report.a11y?.length) {
        console.log('\n---- A11Y VIOLATIONS ----');
        report.a11y.forEach(v => console.log(` [${v.impact}] ${v.id} x${v.nodes} — ${v.help}`));
    }
    console.log('\nmarkup:', JSON.stringify(report.markup, null, 2));
    console.log('\nfull report -> .arena/audit/report.json');

    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
