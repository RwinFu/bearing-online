/**
 * Optional smoke test for the static site (dev-only, never shipped to the browser).
 *
 *   cd tools/smoke-test && npm install && npm test
 *
 * It serves the repository over HTTP, loads index.html in jsdom with real <script>
 * execution and drives the main user flows (search → product → cart → checkout →
 * proforma → account, leads, compare, ops panel, i18n, hash routing).
 * jsdom has no GPU/CSS engine, so the 3D stage is expected to fall back to the CSS
 * placeholder — that fallback is itself asserted here.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

function startServer() {
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found');
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

let ORIGIN = 'http://127.0.0.1:8000';
const errors = [];
const warnings = [];

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + (e && e.message)));
virtualConsole.on('error', (...a) => {
    const msg = a.map(String).join(' ');
    if (!/Could not parse CSS|Error: Not implemented/.test(msg)) errors.push('console.error: ' + msg);
});
virtualConsole.on('warn', (...a) => warnings.push(a.map(String).join(' ')));
virtualConsole.on('log', () => {});
virtualConsole.on('info', () => {});
virtualConsole.on('debug', () => {});

function stubBrowserApis(window) {
    class IO {
        constructor(cb) { this.cb = cb; }
        observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
        unobserve() {} disconnect() {} takeRecords() { return []; }
    }
    window.IntersectionObserver = IO;
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.matchMedia = window.matchMedia || ((q) => ({
        matches: false, media: q,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null
    }));
    window.scrollTo = () => {};
    window.scroll = () => {};
    // jsdom's Performance has no user-timing API; the Tailwind browser build uses it
    for (const fn of ['mark', 'measure', 'clearMarks', 'clearMeasures', 'getEntriesByName']) {
        if (typeof window.performance[fn] !== 'function') {
            Object.defineProperty(window.performance, fn, { value: () => (fn === 'getEntriesByName' ? [] : undefined), writable: true });
        }
    }
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.Element.prototype.animate = function () { return { cancel() {}, finish() {}, onfinish: null, addEventListener() {} }; };
    window.open = () => ({ document: { write() {}, close() {} }, print() {}, close() {} });
    window.print = () => {};
    window.URL.createObjectURL = () => 'blob:mock';
    window.URL.revokeObjectURL = () => {};
    // no WebGL in jsdom → the app must fall back gracefully
    window.HTMLCanvasElement.prototype.getContext = function () { return null; };
    window.console.warn = (...a) => warnings.push(a.map(String).join(' '));
}

const results = [];
function check(name, fn) {
    try {
        const out = fn();
        results.push(['PASS', name, out === undefined ? '' : String(out)]);
    } catch (e) {
        results.push(['FAIL', name, e && e.message]);
    }
}
async function checkAsync(name, fn) {
    try {
        const out = await fn();
        results.push(['PASS', name, out === undefined ? '' : String(out)]);
    } catch (e) {
        results.push(['FAIL', name, e && e.message]);
    }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// the app queues hashchange events asynchronously — wait for a condition instead of guessing a delay
async function waitFor(fn, ms = 2000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(50); }
    return fn();
}

(async () => {
    const { server, port } = await startServer();
    ORIGIN = `http://127.0.0.1:${port}`;
    const dom = await JSDOM.fromURL(ORIGIN + '/index.html', {
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse: stubBrowserApis
    });
    const { window } = dom;
    const doc = window.document;

    await new Promise((resolve) => {
        if (doc.readyState === 'complete') return resolve();
        window.addEventListener('load', resolve);
        setTimeout(resolve, 8000);
    });
    await sleep(600);

    // `const`/`let` top-level declarations are global *lexical* bindings (not window props)
    const G = (name) => window.eval(name);
    const $ = (sel) => doc.querySelector(sel);
    const $$ = (sel) => [...doc.querySelectorAll(sel)];
    const txt = (sel) => ($(sel) ? $(sel).textContent.trim() : '');
    const visible = (sel) => !!$(sel) && !$(sel).classList.contains('hidden');

    // ---------------------------------------------------------------- boot state
    check('17 JS modules loaded in order', () => {
        const expected = ['AppState', 'ProductDatabase', 'BrandInfo', 'formatPrice', 'showNotification',
            'applyLanguage', 'toggleLanguage', 'showPage', 'routeFromHash', 'Bearing3D', 'searchProducts',
            'BrandCarousel', 'renderHomeBrands', 'showProductDetail', 'addToCart', 'renderCart', 'MockDB',
            'openLeadModal', 'toggleCompare', 'renderBrandsPage', 'STAFF_ROLES', 'toggleMobileMenu',
            'initRevealObserver', 'hydrateProductDatabase'];
        const missing = expected.filter(k => { try { return typeof G(k) === 'undefined'; } catch (e) { return true; } });
        assert(!missing.length, 'missing globals: ' + missing.join(', '));
        return expected.length + ' globals ok';
    });
    check('ProductDatabase hydrated (fix #1: hydrateProductDatabase)', () => {
        const DB = G('ProductDatabase'), AS = G('AppState');
        assert(AS && DB.length === 33, 'expected 33 products, got ' + DB.length);
        const p = DB[0];
        assert(p.code === '6205', 'code not normalized: ' + p.code);
        assert(p.stockStatus && typeof p.unit_price_toman === 'number', 'derived fields missing');
        return DB.length + ' products';
    });
    check('DOMContentLoaded ran: home stats + brand ring rendered', () => {
        assert($('#brandRing').children.length === 9, 'brand ring slots: ' + $('#brandRing').children.length);
        assert(G('AppState').searchResults.length === 33, 'searchResults not initialized');
        return $('#brandRing').children.length + ' brand slots';
    });
    check('Hero copy + vector wordmark fallbacks are present', () => {
        const title = $('[data-vector-title] h2');
        assert(title, 'vector hero title missing');
        assert(title.getAttribute('data-fa') === 'بلبرینگ صنعتی خود را سریع پیدا کنید', 'Persian hero copy is wrong');
        assert(title.getAttribute('data-en') === 'Find your industrial bearing fast', 'English hero copy is wrong');
        const marks = $$('[data-vector-wordmark]');
        assert(marks.length === 2, 'expected header and footer wordmarks, got ' + marks.length);
        assert(marks.every(mark => mark.querySelector('.vector-wordmark-fallback')), 'wordmark fallback missing');
        return marks.length + ' progressive wordmarks';
    });
    check('Footer year is dynamic (fix #10)', () => {
        assert(txt('#footer-year') === String(new Date().getFullYear()), 'footer year: ' + txt('#footer-year'));
        return txt('#footer-year');
    });

    // ---------------------------------------------------------------- search fixes
    check('search 6205 → all brands', () => {
        const r = window.searchProducts('6205');
        assert(r.length >= 5, 'got ' + r.length);
        return r.length + ' results';
    });
    check('Brand search NTN / Timken / ZWZ (fix #2 suffix rule)', () => {
        const ntn = window.searchProducts('NTN').map(p => p.brand);
        const timken = window.searchProducts('Timken').map(p => p.brand);
        const zwz = window.searchProducts('ZWZ').map(p => p.brand);
        assert(ntn.length && ntn.every(b => b === 'NTN'), 'NTN → ' + JSON.stringify(ntn));
        assert(timken.length && timken.every(b => b === 'Timken'), 'Timken → ' + JSON.stringify(timken));
        assert(zwz.length && zwz.every(b => b === 'ZWZ'), 'ZWZ → ' + JSON.stringify(zwz));
        return `NTN:${ntn.length} Timken:${timken.length} ZWZ:${zwz.length}`;
    });
    check('Dimensional text search 25x52x15 (fix #3)', () => {
        const a = window.searchProducts('25x52x15');
        const b = window.searchProducts('25*52*15');
        assert(a.length >= 5, '25x52x15 → ' + a.length);
        assert(a.every(p => p.d === 25 && p.D === 52 && p.B === 15), 'wrong dims: ' + a.map(p => `${p.d}x${p.D}x${p.B}`));
        assert(b.length === a.length, '25*52*15 mismatch');
        return `${a.length} matching bearings`;
    });
    check('Clearance matches product.clearance, not the seal (fix #4)', () => {
        const probe = { id: 'TEST-C3', code: '6205', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 25, D: 52, B: 15,
            priceUSD: 1, origin: 'Sweden', seal: '2RS', clearance: 'C3', stockStatus: 'in-stock', stock: 5,
            sell_mode: 'instant', searchMeta: {}, cageType: 'Steel', lubrication: 'Grease', accuracyClass: 'P0' };
        const DB = G('ProductDatabase');
        DB.push(probe);
        try {
            const r = window.searchProducts('6205 C3').map(p => p.id);
            assert(r.includes('TEST-C3'), 'C3 product not matched: ' + JSON.stringify(r));
            assert(!r.includes('SKF-6205-2RS'), 'sealed 2RS product wrongly matched C3');
            const sealed = window.searchProducts('6205 2RS').map(p => p.id);
            assert(sealed.includes('SKF-6205-2RS'), '2RS seal search broken');
            return 'C3 → ' + JSON.stringify(r);
        } finally {
            DB.splice(DB.findIndex(p => p.id === 'TEST-C3'), 1);
        }
    });
    check('Persian / category search', () => {
        const r = window.searchProducts('بلبرینگ');
        const g = window.searchProducts('گیربکس');
        assert(r.length > 5, 'فارسی بلبرینگ → ' + r.length);
        assert(g.length > 0, 'گیربکس → 0');
        return `بلبرینگ:${r.length} گیربکس:${g.length}`;
    });

    // ---------------------------------------------------------------- navigation
    await checkAsync('showPage with unknown id falls back to home (fix #7)', async () => {
        window.showPage('this-page-does-not-exist');
        await sleep(400);
        assert(visible('#page-home'), 'home not visible');
        assert(!$('#page-transition').classList.contains('active'), 'transition overlay stuck');
        return 'fallback ok';
    });

    // ---------------------------------------------------------------- product / cart / checkout
    check('Product detail renders + language applied (fix #5)', () => {
        window.showProductDetail('SKF-6205');
        const c = $('#product-detail-content');
        assert(c.innerHTML.length > 500, 'empty product detail');
        assert(/6205/.test(c.textContent), 'code missing');
        const langEls = c.querySelectorAll('[data-en]');
        assert(langEls.length > 0, 'no translatable nodes');
        assert(langEls[0].textContent.trim() === langEls[0].getAttribute('data-fa'), 'applyLanguage not run after render');
        return langEls.length + ' localized nodes';
    });
    check('Cart: add / quantity / totals', () => {
        const AS = G('AppState');
        AS.cart = [];
        window.addToCart('SKF-6205');
        window.addToCart('SKF-6205');
        window.addToCart('FAG-22220');
        window.renderCart();
        assert(AS.cart.find(i => i.id === 'SKF-6205').quantity === 2, 'quantity merge failed');
        assert(txt('#cart-content').includes('6205'), 'cart content empty');
        window.updateCartQuantity('SKF-6205', 1);
        assert(AS.cart.find(i => i.id === 'SKF-6205').quantity === 3, 'increment failed');
        window.updateCartQuantity('SKF-6205', -1);
        window.removeFromCart('FAG-22220');
        assert(AS.cart.length === 1, 'remove failed');
        return txt('#cart-count');
    });
    check('Cart render honors language (fix #5)', () => {
        window.renderCart();
        const faCart = $('#cart-content [data-en="Cart Items"]');
        assert(faCart && faCart.textContent.trim() === 'اقلام سبد', 'cart stays English in fa mode: ' + (faCart && faCart.textContent));
        return 'fa ok';
    });
    check('Checkout: quotes → order → proforma', () => {
        window.showCheckout();
        window.renderCheckout();
        assert(txt('#checkout-content').length > 200, 'checkout not rendered');
        const fill = { 'co-name': 'شرکت تست', 'co-mobile': '09121234567', 'co-province': 'تهران',
                       'co-city': 'تهران', 'co-address': 'خیابان اکباتان، مرکز تجاری معصومی', 'co-postal': '1234567890' };
        Object.entries(fill).forEach(([id, v]) => { const el = doc.getElementById(id); if (el) el.value = v; });
        assert(!window.validateAddress(window.getCheckoutAddress()), 'address validation: ' + window.validateAddress(window.getCheckoutAddress()));
        const quotes = window.getShippingQuotes(window.getCartProducts(), window.getCheckoutAddress());
        assert(quotes.length > 0, 'no shipping quotes');
        const usable = quotes.find(q => !q.disabled);
        assert(usable, 'no usable shipping quote: ' + JSON.stringify(quotes.map(q => [q.id, q.disabled])));
        const setQuote = window.eval('(q) => { selectedShippingQuote = q; }');
        setQuote(usable);
        window.selectShippingQuote(usable);
        assert(window.eval('selectedShippingQuote') && window.eval('selectedShippingQuote').title, 'shipping quote not selected');
        window.createOrderAndPay();
        const MockDB = G('MockDB');
        if (MockDB.orders.length !== 1) {
            const notif = [...doc.querySelectorAll('#notification-container .notification')].map(n => n.textContent.trim()).join(' | ');
            throw new Error('no order created (orders=' + MockDB.orders.length + ') notifications: ' + notif);
        }
        const order = MockDB.orders[0];
        assert(/^PRM-\d{4}-\d{6}$/.test(order.orderNumber), 'bad order number: ' + order.orderNumber);
        assert(MockDB.payments.length === 1 && MockDB.payments[0].amount === order.grand_total, 'payment not recorded');
        assert(window.location.hash.includes('/checkout/success/' + order.orderNumber), 'success route missing: ' + window.location.hash);
        assert(G('AppState').cart.length === 0, 'cart not cleared after payment');
        const pf = MockDB.proformas[0];
        assert(pf && pf.order_id === order.orderNumber, 'proforma not issued');
        assert(pf.proforma_number && pf.proforma_number.startsWith('PF-'), 'proforma broken');
        const html = window.buildProformaHtml(order, pf);
        assert(html.includes('<!DOCTYPE html>') && html.includes(pf.proforma_number), 'proforma html broken');
        window.showAccount();
        assert(txt('#account-content').includes(order.orderNumber), 'order not in account page');
        lastOrderNumber = order.orderNumber;
        return order.orderNumber;
    });
    check('Leads: modal → submit → admin list', () => {
        const before = G('AppState').leads.length;
        window.openLeadModal('manual', 'SKF 6205');
        $('#lead-name').value = 'تست کاربر';
        $('#lead-phone').value = '09120000000';
        if ($('#lead-email')) $('#lead-email').value = 'test@example.com';
        if ($('#lead-part')) $('#lead-part').value = 'SKF 6205';
        window.submitLead({ preventDefault() {} });
        assert(G('AppState').leads.length === before + 1, 'lead not stored');
        window.closeLeadModal();
        window.renderAdminLeads();
        return G('AppState').leads.length + ' leads';
    });
    check('Compare + wishlist', () => {
        window.toggleCompare('SKF-6205');
        window.toggleCompare('SKF-6206');
        window.renderCompare();
        assert(txt('#compare-content').includes('6205'), 'compare empty');
        window.toggleWishlist('FAG-6205');
        window.renderWishlist();
        assert(txt('#wishlist-content').includes('6205'), 'wishlist empty');
        window.toggleCompare('SKF-6205');
        window.toggleCompare('SKF-6206');
        return 'compare + wishlist ok';
    });
    check('Engineering stats panel has clear, localized metrics', () => {
        const panel = $('[data-engineering-panel]');
        assert(panel, 'engineering stats panel missing');
        const cards = $$('.stat-vector-card');
        assert(cards.length === 4, 'stats cards: ' + cards.length);
        assert(cards.every(card => card.querySelector('.stat-label[data-fa]') && card.querySelector('.stat-sub[data-en]')), 'metric copy is not bilingual');
        assert($('#indexed-product-counter').getAttribute('data-count') === '33', 'indexed product counter target is stale');
        return cards.length + ' localized metrics';
    });
    check('Premium brands directory renders, localizes and filters 9 brands', () => {
        window.renderBrandsPage();
        const cards = $$('#brands-grid [data-brand-card]');
        assert(cards.length === 9, 'brands grid: ' + cards.length);
        assert(cards.filter(card => card.querySelector('.brand-card-logo img')).length >= 8, 'local brand logos missing');
        assert(cards.every(card => card.querySelector('.brand-card-description[data-fa]')), 'localized descriptions missing');
        window.filterBrandCards('سوئد');
        assert(cards.filter(card => !card.classList.contains('hidden')).length === 1, 'Persian country filter failed');
        window.filterBrandCards('not-a-brand');
        assert(!$('#brands-empty').classList.contains('hidden'), 'empty state not shown');
        window.filterBrandCards('');
        assert(cards.every(card => !card.classList.contains('hidden')), 'brand filter did not reset');
        return cards.length + ' premium brands';
    });
    check('Brand ring uses local logos (fix #8)', () => {
        const imgs = $$('#brandRing img.rc-logo-img, #brandRing img');
        const srcs = imgs.map(i => i.getAttribute('src')).filter(Boolean);
        assert(srcs.length >= 8, 'only ' + srcs.length + ' logos');
        assert(srcs.every(s => s.startsWith('assets/img/brands/')), 'remote logo left: ' + JSON.stringify(srcs.filter(s => !s.startsWith('assets/img/brands/'))));
        return srcs.length + ' local logos';
    });
    check('Ops panel + RBAC', () => {
        window.showAdminPanel();
        ['stock', 'suppliers', 'rfq', 'orders', 'complaints', 'pricing', 'staff', 'tech', 'activity'].forEach(tab => {
            try { window.switchOpsTab(tab); } catch (e) { throw new Error('tab ' + tab + ' failed: ' + e.message); }
        });
        window.setStaffRole('warehouse');
        assert(window.can('stock.write') === true, 'warehouse should write stock');
        assert(window.can('pricing.write') === false, 'warehouse must not write pricing');
        window.setStaffRole('manager');
        window.closeAdminPanel();
        return 'RBAC ok';
    });
    check('Mobile UI toggles', () => {
        window.toggleMobileMenu(true);
        assert($('#mobile-menu').classList.contains('open'), 'menu did not open');
        window.toggleMobileMenu(false);
        assert(!$('#mobile-menu').classList.contains('open'), 'menu did not close');
        window.toggleMobileFilters();
        window.toggleMobileFilters();
        return 'ok';
    });

    // ---------------------------------------------------------------- i18n round trip
    await checkAsync('Language switch re-renders dynamic pages (fix #5)', async () => {
        // make the test self-sufficient: the checkout flow above empties the cart
        G('AppState').cart = [];
        window.addToCart('SKF-6206');
        window.location.hash = '#/cart';
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        assert(await waitFor(() => visible('#page-cart')), 'cart page not visible (hash=' + window.location.hash + ')');
        assert($('#cart-content [data-en="Cart Items"]'), 'cart not rendered with items');
        window.toggleLanguage();
        assert(doc.documentElement.lang === 'en', 'lang not switched');
        let cart = $('#cart-content [data-en="Cart Items"]');
        assert(cart && cart.textContent.trim() === 'Cart Items', 'cart not translated to en: ' + (cart && cart.textContent));
        window.toggleLanguage();
        assert(doc.documentElement.lang === 'fa', 'lang not switched back');
        cart = $('#cart-content [data-en="Cart Items"]');
        assert(cart && cart.textContent.trim() === 'اقلام سبد', 'cart not translated back to fa: ' + (cart && cart.textContent));
        const localized = $$('[data-en]').filter(el => el.hasAttribute('data-fa'));
        const stillEn = localized.filter(el => el.textContent.trim() === el.getAttribute('data-en'));
        assert(localized.length > 200, 'few translatable nodes: ' + localized.length);
        assert(stillEn.length === 0, stillEn.length + ' nodes still English in fa mode, e.g. ' + (stillEn[0] && stillEn[0].textContent));
        assert(localized.every(el => el.textContent.trim() === el.getAttribute('data-fa')), 'fa text not applied');
        return localized.length + ' nodes localized fa';
    });

    // ---------------------------------------------------------------- hash routing
    await checkAsync('Hash routing: #/search, #/product, unknown hash', async () => {
        window.location.hash = '#/search';
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        await sleep(350);
        assert(visible('#page-search'), '#/search did not open');
        window.location.hash = '#/brands';
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        await sleep(350);
        assert(visible('#page-brands'), '#/brands did not open');
        window.location.hash = '#/does-not-exist';
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        await sleep(350);
        assert(visible('#page-home'), 'unknown hash did not fall back home');
        return 'ok';
    });

    // ---------------------------------------------------------------- 3D stage
    await checkAsync('3D bearing degrades gracefully without WebGL', async () => {
        window.location.hash = '#/about';
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        await sleep(500);
        window.ensureBearing3D();
        await sleep(200);
        const fb = $('#bearingFallback');
        assert(fb && fb.style.display === 'flex', 'fallback not shown (display=' + (fb && fb.style.display) + ')');
        assert(!$('#bearingStage canvas'), 'canvas created without WebGL');
        return 'fallback shown';
    });

    // ---------------------------------------------------------------- filters
    check('Sidebar filters + dimension panel + sorting', () => {
        window.showPage('search');
        const AS = G('AppState');
        AS.searchResults = G('ProductDatabase').slice();
        AS.textQuery = '';
        $$('.brand-filter').forEach(cb => { cb.checked = cb.value === 'SKF'; });
        window.applyFilters();
        assert(AS.searchResults.every(p => p.brand === 'SKF'), 'brand filter failed');
        window.clearFilters();
        assert(AS.searchResults.length === 33, 'clearFilters failed: ' + AS.searchResults.length);
        doc.getElementById('filter-d-min').value = '25';
        doc.getElementById('filter-d-max').value = '25';
        window.applyFilters();
        assert(AS.searchResults.length > 0 && AS.searchResults.every(p => p.d === 25), 'dimension filter failed');
        window.clearFilters();
        window.setViewMode('list');
        assert(AS.viewMode === 'list', 'view mode');
        window.sortResults();
        window.setViewMode('grid');
        window.updateFilterCounts();
        return 'filters ok';
    });

    check('State persisted to localStorage (reload safety)', () => {
        const raw = window.localStorage.getItem('prm_orders');
        assert(raw && raw.includes(lastOrderNumber), 'orders not persisted: ' + raw);
        assert(window.localStorage.getItem('prm_cart') !== null, 'cart not persisted');
        return 'prm_orders / prm_cart written';
    });
    check('Complaints: submit → account + ops lists', () => {
        window.renderAccountComplaints();
        const msg = doc.getElementById('cmp-message');
        assert(msg, 'complaint form not rendered on account page');
        msg.value = 'کالای ارسالی مغایرت داشت.';
        if (doc.getElementById('cmp-name')) doc.getElementById('cmp-name').value = 'تست';
        if (doc.getElementById('cmp-phone')) doc.getElementById('cmp-phone').value = '09120000001';
        window.submitComplaint({ preventDefault() {} });
        const DB = G('MockDB');
        assert(DB.complaints.length === 1, 'complaint not stored: ' + DB.complaints.length);
        window.renderOpsComplaints();
        assert(txt('#ops-complaint-list').length > 0, 'ops complaint list empty');
        window.setComplaintStatus(DB.complaints[0].id, 'in-progress');
        assert(DB.complaints[0].status === 'in-progress', 'status change failed');
        return DB.complaints[0].id;
    });
    check('Ops writes: settings, stock, suppliers, statuses', () => {
        const DB = G('MockDB'), AS = G('AppState');
        window.showAdminPanel();
        window.switchOpsTab('stock');
        window.updateStock('SKF-6205', 'stock_on_hand', 42);
        window.setProductSource('SKF-6205', 'ASK');
        window.addSupplier();
        const sup = DB.suppliers[DB.suppliers.length - 1];
        assert(sup && sup.id, 'supplier not added');
        window.deleteSupplier(sup.id);
        if (AS.leads.length) window.setLeadStatus(AS.leads[0].id, 'won');
        window.switchOpsTab('orders');
        if (DB.orders.length) window.setOrderStatus(lastOrderNumber, 'shipped');
        window.switchOpsTab('pricing');
        doc.getElementById('admin-exchange-rate').value = '60000';
        window.saveAdminSettings();
        assert(AS.exchangeRate === 60000, 'exchange rate not saved: ' + AS.exchangeRate);
        assert(G('ProductDatabase')[0].unit_price_toman === Math.round(G('ProductDatabase')[0].priceUSD * 60000 * 1.25), 'prices not recalculated');
        window.switchOpsTab('activity');
        assert(txt('#ops-activity-list').length > 0, 'activity log empty');
        window.closeAdminPanel();
        return 'ops writes ok';
    });
    check('Proforma download (Blob + print window)', () => {
        window.downloadProforma(lastOrderNumber);
        window.downloadLatestProforma();
        const notif = [...doc.querySelectorAll('#notification-container .notification')].map(n => n.textContent);
        assert(!notif.some(n => n.includes('ثبت نشده')), 'proforma missing for order: ' + notif.join(' | '));
        return 'downloads ok';
    });
    check('Quick actions + lead modal from product page', () => {
        window.openLeadModal('product-quote', 'SKF 6205');
        assert(!$('#lead-modal').classList.contains('hidden'), 'lead modal did not open');
        window.closeLeadModal();
        assert($('#lead-modal').classList.contains('hidden'), 'lead modal did not close');
        window.showPage('contact');
        window.showPage('services');
        window.showPage('about');
        return 'modal + static pages ok';
    });

    // ------------------------------------------------------- search / responsive regression audit
    check('Persian and Arabic digits match Latin codes exactly', () => {
        const ids = q => window.searchProducts(q).map(p => p.id).sort().join(',');
        assert(ids('6205') === ids('۶۲۰۵') && ids('6205') === ids('٦٢٠٥'), 'numeric normalization differs');
        assert(ids('۶۲۰۵ ۲RS') === 'SKF-6205-2RS', 'Persian suffix returned unsealed bearings');
    });
    check('Code / brand word order, Persian aliases and spaced codes', () => {
        for (const query of ['6205 SKF', 'SKF 6205', 'SKF-6205', 'SKF6205', 'اس کا اف ۶۲۰۵', 'bearing SKF 6205']) {
            const products = window.searchProducts(query);
            assert(products.length === 2 && products.every(p => p.brand === 'SKF' && p.code.startsWith('6205')), query + ' → ' + products.map(p => p.id));
        }
        assert(window.searchProducts('UCP 205').length > 0, 'spaced part code failed');
        assert(window.searchProducts('HIWIN MGN12H').length === 1, 'alphanumeric part code failed');
        assert(window.searchProducts('6205 nonexistent').length === 0, 'unmatched token ignored');
    });
    check('Dimensions with Persian digits, spaces, brand and mm', () => {
        for (const query of ['۲۵ × ۵۲ × ۱۵', 'ابعاد 25 x 52 x 15 mm', 'SKF 25*52*15']) {
            const result = window.searchProducts(query);
            assert(result.length && result.every(p => p.d === 25 && p.D === 52 && p.B === 15), 'failed ' + query);
        }
        assert(window.toMillimeter('۱٫۵', 'inch') === 38.099999999999994, 'Persian decimal conversion failed');
        assert(window.toMillimeter('25oops', 'metric') === null, 'partial invalid dimension accepted');
    });
    check('Combined seal and clearance constraints; exact and equivalent suffixes', () => {
        const DB = G('ProductDatabase');
        DB.push({ ...DB[1], id: 'TEST-COMBINED', code: '6205-2RS', clearance: 'C3' });
        try {
            for (const query of ['6205-2RS/C3', '6205 2RS C3', '۶۲۰۵ ۲RS C3']) {
                const result = window.searchProducts(query);
                assert(result.length === 1 && result[0].id === 'TEST-COMBINED', query + ' mismatched');
            }
            const equivalent = window.searchProducts('6205 DDU');
            assert(equivalent.length && equivalent.every(p => p.searchMeta.equivalent), 'equivalent seal missing');
        } finally { DB.pop(); }
    });
    check('Autocomplete cannot overwrite current result metadata', () => {
        const result = window.searchProducts('6205 DDU');
        window.searchProducts('6205');
        assert(result.every(p => p.searchMeta.equivalent), 'suggestions mutated existing results');
    });
    await checkAsync('Products navigation renders the catalogue on first entry', async () => {
        $('#results-container').innerHTML = '<!-- initial placeholder -->';
        window.clearFilters();
        window.showPage('search');
        assert(await waitFor(() => visible('#page-search') && $('#results-container .card-hover')), 'catalogue not rendered');
    });
    await checkAsync('New text/category/dimension searches do not retain stale filters', async () => {
        window.filterByBrand('SKF');
        await sleep(100);
        window.performSearch('HIWIN');
        assert(await waitFor(() => G('AppState').searchResults.length === 2 && G('AppState').searchResults.every(p => p.brand === 'HIWIN')), 'stale brand filter');
        window.searchByType('gearbox');
        await sleep(100);
        assert(G('AppState').searchResults.length === 4, 'stale text filter in category search');
        $('#dim-d').value = '۲۵'; $('#dim-D').value = '۵۲'; $('#dim-B').value = '۱۵';
        window.searchByDimension();
        await sleep(100);
        assert(G('AppState').searchResults.length === 5 && !G('AppState').textQuery && !G('AppState').categoryFilter, 'stale category in dimensions');
    });
    check('All catalogue brands can be filtered, including non-featured brands', () => {
        const brandInputs = new Set($$('.brand-filter').map(input => input.value));
        assert(G('ProductDatabase').every(p => brandInputs.has(p.brand)), 'missing filter brands');
    });
    check('Search URL round-trip preserves dimensions, filters, sort and table view', () => {
        const AS = G('AppState');
        window.resetProductFilters();
        AS.textQuery = '6205';
        AS.dimensionSearch = { mode: 'exact', unit: 'metric', d: 25, D: 52, B: 15 };
        $('.brand-filter[value="SKF"]').checked = true;
        $('#sort-select').value = 'price-desc'; AS.viewMode = 'table';
        const route = window.getSearchRoute();
        window.restoreSearchRoute(new window.URLSearchParams(route.split('?')[1]));
        window.recomputeResults();
        assert(AS.textQuery === '6205' && AS.dimensionSearch.d === 25 && AS.viewMode === 'table', 'roundtrip lost state');
        assert(AS.searchResults.length === 2 && AS.searchResults.every(p => p.brand === 'SKF'), 'roundtrip lost filters');
        assert($('#sort-select').value === 'price-desc', 'sort not restored');
        assert(!$('#results-table-container').classList.contains('hidden'), 'table not restored');
        window.restoreSearchRoute(new window.URLSearchParams());
        window.recomputeResults();
    });
    check('Sorting persists after filtering and never mutates catalogue order', () => {
        const DB = G('ProductDatabase');
        const before = DB.map(p => p.id).join(',');
        $('#sort-select').value = 'name';
        window.recomputeResults();
        assert(G('AppState').searchResults.map(p => p.code).join(',') === [...DB].sort((a,b) => a.code.localeCompare(b.code)).map(p => p.code).join(','), 'sort not applied');
        assert(DB.map(p => p.id).join(',') === before, 'catalogue mutated');
        $('#sort-select').value = 'relevance';
    });
    check('Invalid dimensional ranges are rejected without destroying results', () => {
        window.clearFilters();
        const before = G('AppState').searchResults;
        $('#filter-d-min').value = '۳۰'; $('#filter-d-max').value = '۲۰';
        window.applyFilters();
        assert($('#filter-d-max').getAttribute('aria-invalid') === 'true', 'invalid range not indicated');
        assert(G('AppState').searchResults === before, 'invalid range applied');
        window.clearFilters();
    });
    await checkAsync('Empty state escapes query markup and never opens an unsolicited modal', async () => {
        window.closeLeadModal();
        const query = '<img src=x onerror=alert(1)>';
        window.performSearch(query);
        await sleep(850);
        assert(!$('#results-container img'), 'query injected as HTML');
        assert(txt('#results-container').includes(query), 'query text missing');
        assert($('#lead-modal').classList.contains('hidden'), 'unsolicited lead modal opened');
        assert($('#results-container').classList.contains('results-empty'), 'empty state layout missing');
        window.clearFilters();
    });
    check('Autocomplete has keyboard selection and Escape cancellation', () => {
        $('#search-input').value = '6205';
        window.executeAutocomplete('6205');
        $('#search-input').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        assert($('#search-input').getAttribute('aria-activedescendant') === 'search-option-0', 'no active suggestion');
        window.closeAutocomplete();
        assert($('#search-input').getAttribute('aria-expanded') === 'false', 'not collapsed');
    });
    check('Fallback viewer controls are disabled instead of pretending to work', () => {
        assert($('#bearingStage').classList.contains('is-fallback'), 'missing fallback state');
        assert($('#bearingZoomIn').disabled && $('#bearingExplodeRange').disabled, 'unavailable 3D controls enabled');
    });
    await checkAsync('Malformed product URLs and missing products do not strand the UI', async () => {
        window.location.hash = '#/product/%E0%A4%A';
        assert(await waitFor(() => visible('#page-home')), 'malformed URL failed to recover');
        window.location.hash = '#/product/not-in-catalogue';
        assert(await waitFor(() => visible('#page-search')), 'missing product left stale view');
    });

    check('No uncaught JS errors during the whole run', () => {
        const real = errors.filter(e => !/Could not parse CSS|Not implemented|Error creating WebGL context/.test(e));
        assert(!real.length, real.slice(0, 4).join(' | '));
        return '0 errors';
    });

    // ---------------------------------------------------------------- report
    const pad = (s, n) => String(s).padEnd(n);
    console.log('\n=== Bearing Online runtime harness (jsdom) ===\n');
    for (const [status, name, detail] of results) {
        console.log(`${status === 'PASS' ? '  ok  ' : ' FAIL '} ${pad(name, 58)} ${detail || ''}`);
    }
    const failed = results.filter(r => r[0] === 'FAIL').length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    if (warnings.length) console.log('warnings: ' + [...new Set(warnings)].slice(0, 5).join(' | '));
    server.close();
    process.exit(failed ? 1 : 0);
})().catch(e => {
    console.error('HARNESS CRASH:', e);
    process.exit(2);
});
