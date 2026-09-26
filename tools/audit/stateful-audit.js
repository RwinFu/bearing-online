/* Deep audit — part 6: stateful dead-control sweep.
 *
 * The default-state sweep can't see buttons that only exist once the app has
 * data: a filled cart, a logged-in customer, an open product page, the ops
 * panel, modals, an active search. This script puts the app into each of those
 * states, then sweeps every visible control inside it.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';
const CONTROL_SEL = 'button, [role="button"], a[href], [onclick], [onchange], input[type="checkbox"], input[type="radio"], summary';

const FP = () => {
    const toArr = q => [...document.querySelectorAll(q)];
    let html = ''; try { html = document.body.outerHTML; } catch {}
    let h = 0; for (let i = 0; i < html.length; i += 7) h = (h * 31 + html.charCodeAt(i)) | 0;
    let st = ''; try { st = JSON.stringify(window.AppState, (k, v) => (typeof v === 'function' || v?.nodeType ? undefined : v)) || ''; } catch { st = 'x'; }
    return JSON.stringify([location.hash, AppState?.page, AppState?.language, AppState?.cart?.length, AppState?.compare?.length, AppState?.wishlist?.length,
        toArr('.page-section:not(.hidden)').map(s => s.id),
        toArr('.notification, .toast').length,
        toArr('[role="dialog"]:not(.hidden), .modal:not(.hidden), dialog[open], .lightbox.open').length,
        html.length, h, toArr('input,textarea,select').filter(el => el.offsetParent).map(el => el.value).join('~'),
        document.activeElement?.id || document.activeElement?.tagName,
        st.length, st.slice(0, 5000)]);
};

const SETUPS = [
    { id: 'search-with-results', page: 'search', prep: () => { showPage('search'); AppState.searchResults = [...ProductDatabase]; renderSearchResults(); } },
    { id: 'product-detail', page: 'product', prep: () => { showProductDetail(ProductDatabase[0].id); } },
    { id: 'cart-filled', page: 'cart', prep: () => { addToCart(ProductDatabase[0].id, null, 2, true); addToCart(ProductDatabase[1].id, null, 1, true); showCart(); } },
    { id: 'checkout-filled', page: 'checkout', prep: () => { addToCart(ProductDatabase[0].id, null, 2, true); renderCheckout(); } },
    { id: 'wishlist-filled', page: 'wishlist', prep: () => { AppState.wishlist = [ProductDatabase[0].id, ProductDatabase[1].id]; persistState(); showWishlist(); } },
    { id: 'compare-filled', page: 'compare', prep: () => { AppState.compare = [ProductDatabase[0].id, ProductDatabase[1].id, ProductDatabase[2].id]; persistState(); showCompare(); } },
    { id: 'account-logged-in', page: 'account', prep: () => { showAccount('overview'); } },
    { id: 'account-orders', page: 'account', prep: () => { showAccount('orders'); } },
    { id: 'account-profile', page: 'account', prep: () => { showAccount('profile'); } },
    { id: 'account-addresses', page: 'account', prep: () => { showAccount('addresses'); } },
    { id: 'account-security', page: 'account', prep: () => { showAccount('security'); } },
    { id: 'account-saved', page: 'account', prep: () => { showAccount('saved'); } },
    { id: 'ops-panel', page: 'account', prep: () => { showAdminPanel(); } },
    { id: 'lead-modal', page: 'home', prep: () => { showPage('home'); openLeadModal(); } },
    { id: 'brands-page', page: 'brands', prep: () => { showPage('brands'); renderBrandsPage(); } },
    { id: 'services', page: 'services', prep: () => { showPage('services'); } },
    { id: 'shipping', page: 'shipping', prep: () => { showPage('shipping'); } },
    { id: 'about', page: 'about', prep: () => { showPage('about'); } },
    { id: 'contact', page: 'contact', prep: () => { showPage('contact'); } }
];

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const origin = new URL(BASE_URL).origin;
    const allFindings = [];
    const allErrors = [];

    for (const setup of SETUPS) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await ctx.newPage();
        await page.route('**', r => (r.request().url().startsWith(origin) || /^(data|blob|about):/.test(r.request().url())) ? r.continue() : r.abort());
        const errs = [];
        page.on('pageerror', e => errs.push(e.message ?? String(e)));
        page.on('console', m => { if (m.type() === 'error' && !/WebGL|three/i.test(m.text())) errs.push('console: ' + m.text()); });

        await page.goto(BASE_URL, { waitUntil: 'load' });
        await page.waitForTimeout(1600);

        const prepOk = await page.evaluate(({ page: pg, fn }) => {
            try {
                window.__prep = null;
                // eslint-disable-next-line no-new-func
                (new Function('return ' + fn))()();
                if (typeof showPage === 'function') showPage(pg);
                return true;
            } catch (e) { return 'prep failed: ' + e.message; }
        }, { page: setup.page, fn: setup.prep.toString() });
        await page.waitForTimeout(1000);

        const list = await page.evaluate(({ pageName, sel }) => {
            const out = [];
            [...document.querySelectorAll(sel)].forEach((el, i) => {
                const sec = el.closest('.page-section');
                if (sec && sec.id !== 'page-' + pageName && !el.closest('[role="dialog"]:not(.hidden), .modal:not(.hidden)')) return;
                const cs = getComputedStyle(el);
                if (cs.visibility === 'hidden' || cs.display === 'none') return;
                const r = el.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) return;
                out.push({ i, label: (el.innerText || el.value || el.getAttribute('aria-label') || el.title || el.id || el.className.toString() || '').trim().replace(/\s+/g, ' ').slice(0, 65),
                    tag: el.tagName, id: el.id || null, cls: el.className.toString().slice(0, 70),
                    handler: el.getAttribute('onclick') || el.getAttribute('onchange') || null, href: el.getAttribute('href') || null });
            });
            return out;
        }, { pageName: setup.page, sel: CONTROL_SEL });

        const perState = [];
        const seen = new Set();
        for (const meta of list) {
            const key = meta.label + '|' + meta.handler + '|' + meta.href + '|' + meta.tag;
            if (seen.has(key)) continue;
            seen.add(key);

            let reloaded = false;
            const onLoad = () => { reloaded = true; };
            page.on('load', onLoad);
            let thrown = null;
            page.once('pageerror', e => { thrown = e.message ?? String(e); });

            const before = await page.evaluate(FP).catch(() => null);
            if (before === null) break;
            await page.evaluate(({ pageName, idx, sel }) => { const el = [...document.querySelectorAll(sel)][idx]; if (el) el.click(); }, { pageName: setup.page, idx: meta.i, sel: CONTROL_SEL }).catch(() => { reloaded = true; });
            await page.waitForTimeout(210);
            const after = await page.evaluate(FP).catch(() => null);
            page.off('load', onLoad);

            const fnMatch = (meta.handler || '').match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
            const fnName = fnMatch ? fnMatch[1] : null;
            const fnMissing = fnName ? await page.evaluate(n => typeof window[n] !== 'function', fnName).catch(() => false) : false;

            await page.evaluate(() => {
                try { document.querySelectorAll('[role="dialog"]:not(.hidden), .modal:not(.hidden), .lightbox').forEach(m => m.classList.add('hidden')); } catch {}
                try { document.body.style.overflow = ''; } catch {}
            }).catch(() => {});

            if (reloaded) { await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(300); }
            await page.evaluate(({ pg, fn }) => { try { (new Function('return ' + fn))()(); showPage(pg); } catch {} }, { pg: setup.page, fn: setup.prep.toString() }).catch(() => {});
            await page.waitForTimeout(90);

            const noEffect = after !== null && before === after;
            const isLink = meta.tag === 'A';
            const reason = thrown ? 'JS error on click: ' + thrown
                : fnMissing ? `calls undefined global ${fnName}()`
                : noEffect && !isLink && !meta.handler ? 'no handler, click changes nothing'
                : noEffect && meta.href === '#' ? 'href="#" and click changes nothing'
                : noEffect && fnName ? `calls ${fnName}() but nothing changes (no-op)`
                : null;
            if (reason) perState.push({ label: meta.label || '(no label)', tag: meta.tag, id: meta.id, cls: meta.cls, handler: meta.handler, href: meta.href, reason });
        }
        allFindings.push({ state: setup.id, prep: prepOk, swept: list.length, problems: perState });
        allErrors.push({ state: setup.id, errors: [...new Set(errs)] });
        console.log(`\n[${setup.id}] prep=${prepOk === true ? 'ok' : prepOk}  swept ${list.length} controls — ${perState.length} problem(s)`);
        perState.forEach(d => console.log(`  • "${d.label}" <${d.tag}${d.id ? ' #' + d.id : ''}>  ->  ${d.reason}`));
        await ctx.close();
    }

    const dir = path.resolve(__dirname, '../../.arena/audit');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'stateful.json'), JSON.stringify({ allFindings, allErrors }, null, 2));
    console.log('\n\n================ JS ERRORS PER STATE ================');
    allErrors.forEach(s => { if (s.errors.length) console.log(`[${s.state}] ${s.errors.join(' ;; ')}`); });
    console.log(`\nTOTAL PROBLEMS: ${allFindings.reduce((a, f) => a + f.problems.length, 0)}`);
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
