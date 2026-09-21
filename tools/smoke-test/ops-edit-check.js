/** Dev-only verification for the editable ops console (not part of npm test). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function startServer() {
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404); return res.end('not found');
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

(async () => {
    const { server, port } = await startServer();
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { console.error('JSOMERR', e.message); process.exitCode = 1; });
    const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, { resources: 'usable', runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
        beforeParse(window) {
            window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }]); } unobserve() {} disconnect() {} };
            window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
            window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
            for (const fn of ['mark', 'measure', 'clearMarks', 'clearMeasures', 'getEntriesByName']) {
                if (typeof window.performance[fn] !== 'function') {
                    Object.defineProperty(window.performance, fn, { value: () => (fn === 'getEntriesByName' ? [] : undefined), writable: true });
                }
            }
            window.scrollTo = () => {};
            window.HTMLElement.prototype.scrollIntoView = function () {};
            window.HTMLCanvasElement.prototype.getContext = function () { return null; };
            window.open = () => ({ document: { write() {}, close() {} }, print() {}, close() {} });
            window.URL.createObjectURL = () => 'blob:mock';
            window.URL.revokeObjectURL = () => {};
        } });
    const { window } = dom;
    await new Promise(r => {
        if (window.document.readyState === 'complete') return r();
        window.addEventListener('load', r);
        setTimeout(r, 8000);
    });
    await new Promise(r => setTimeout(r, 600));
    const doc = window.document;
    const G = n => window.eval(n);
    const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else console.log('ok:', m); };

    // --- overview + badges render
    window.showAdminPanel();
    window.switchOpsTab('overview');
    assert(doc.querySelectorAll('#ops-overview-kpis .ops-kpi').length === 8, 'overview renders 8 KPI cards');
    assert(doc.getElementById('ops-overview-lowstock').textContent.length > 0, 'low-stock panel renders');
    window.updateOpsBadges();

    // --- pricing preview
    doc.getElementById('admin-exchange-rate').value = '60000';
    doc.getElementById('admin-profit-margin').value = '25';
    window.updatePricingPreview();
    const sample = G('ProductDatabase').find(p => p.sell_mode === 'instant');
    const expected = window.formatToman(Math.round(sample.priceUSD * 60000 * 1.25));
    const pv = doc.getElementById('ops-pricing-preview').textContent;
    assert(pv.includes('پیش‌نمایش زنده') && pv.includes(expected), 'pricing preview reacts to input');
    // restore rates for later assertions
    doc.getElementById('admin-exchange-rate').value = '52000';

    // --- product price edit (manager)
    window.setStaffRole('manager');
    const before = G('ProductDatabase').find(p => p.id === 'SKF-6205').unit_price_toman;
    window.updateProductPrice('SKF-6205', '20');
    const after = G('ProductDatabase').find(p => p.id === 'SKF-6205');
    assert(after.priceUSD === 20 && after.unit_price_toman === Math.round(20 * 52000 * 1.25), 'price edit recalculates toman price');
    assert(before !== after.unit_price_toman, 'price actually changed');

    // --- warehouse cannot edit price
    window.setStaffRole('warehouse');
    window.updateProductPrice('SKF-6205', '99');
    assert(G('ProductDatabase').find(p => p.id === 'SKF-6205').priceUSD === 20, 'warehouse blocked from price edit');

    // --- lead time edit
    window.updateLeadTime('SKF-6205', '7');
    assert(G('ProductDatabase').find(p => p.id === 'SKF-6205').lead_time_days === 7, 'lead time edit works');

    // --- add + delete product (manager)
    window.setStaffRole('manager');
    const n0 = G('ProductDatabase').length;
    doc.getElementById('ops-new-brand').value = 'TEST';
    doc.getElementById('ops-new-code').value = '9999';
    doc.getElementById('ops-new-price').value = '5';
    doc.getElementById('ops-new-stock').value = '3';
    window.addProduct();
    assert(G('ProductDatabase').length === n0 + 1, 'product added to catalogue');
    const added = G('ProductDatabase').find(p => p.brand === 'TEST');
    assert(added && added.sell_mode === 'instant' && added.available_to_sell === 3, 'added product has derived fields');
    assert(JSON.parse(window.localStorage.getItem('prm_custom_products')).length === 1, 'custom product persisted');
    assert(window.searchProducts('9999').some(p => p.brand === 'TEST'), 'new product is searchable');
    window.deleteProduct(added.id);
    assert(G('ProductDatabase').length === n0, 'product deleted from catalogue');
    assert(JSON.parse(window.localStorage.getItem('prm_custom_products')).length === 0, 'custom product removed from storage');

    // --- delete static product persists across rehydrate
    window.deleteProduct('SKF-6205');
    assert(!G('ProductDatabase').some(p => p.id === 'SKF-6205'), 'static product removed');
    assert(JSON.parse(window.localStorage.getItem('prm_deleted_products')).includes('SKF-6205'), 'deleted id persisted');

    // --- supplier edit
    const sup = G('MockDB').suppliers.find(s => s.type === 'shop');
    window.editSupplier(sup.id);
    assert(!!doc.getElementById('ops-edit-name'), 'supplier edit form opens');
    doc.getElementById('ops-edit-phone').value = '09120000000';
    window.saveSupplier(sup.id);
    assert(G('MockDB').suppliers.find(s => s.id === sup.id).phone === '09120000000', 'supplier edit saved');

    // --- lead note + delete
    window.openLeadModal('manual', 'SKF 6205');
    doc.getElementById('lead-name').value = 'مشتری تست';
    doc.getElementById('lead-phone').value = '09120000001';
    doc.getElementById('lead-part').value = '6205';
    window.submitLead({ preventDefault() {} });
    const lead = G('AppState').leads[0];
    window.setStaffRole('technical');
    window.setLeadNote(lead.id, 'معادل FAG موجود است');
    assert(G('AppState').leads[0].techNote === 'معادل FAG موجود است', 'lead note saved');
    window.renderAdminLeads();
    assert(doc.getElementById('admin-lead-list').textContent.includes('معادل FAG'), 'lead note rendered');
    window.deleteLead(lead.id);
    assert(!G('AppState').leads.some(l => l.id === lead.id), 'lead deleted');

    // --- RFQ note + Persian status render + delete
    window.setStaffRole('manager');
    G('MockDB').rfqs.unshift({ rfqNumber: 'RFQ-T1', status: 'waiting_sales', items: [{ brand: 'SKF', code: '6205', quantity: 2 }], createdAt: 'now' });
    window.renderOpsRFQ();
    assert(doc.getElementById('ops-rfq-list').textContent.includes('در انتظار فروش'), 'RFQ Persian status rendered');
    assert(doc.getElementById('ops-rfq-list').textContent.includes('SKF 6205'), 'RFQ items rendered');
    window.setRFQNote('RFQ-T1', 'از اسکوئی تامین شود');
    assert(G('MockDB').rfqs[0].opsNote === 'از اسکوئی تامین شود', 'RFQ note saved');
    window.deleteRFQ('RFQ-T1');
    assert(!G('MockDB').rfqs.some(r => r.rfqNumber === 'RFQ-T1'), 'RFQ deleted');

    // --- order detail + tracking edit
    G('MockDB').orders.unshift({ orderNumber: 'PRM-2026-000001', status: 'PAID', payment_status: 'paid', shipping_status: 'pending', grand_total: 1000000, items: [{ brand: 'SKF', code: '6205', quantity: 1, priceUSD: 8.5 }], address: { recipient_name: 'الف', mobile: '09120000002', province: 'تهران', city: 'تهران', full_address: 'خیابان', postal_code: '1234567890' }, events: [] });
    window.renderOpsOrders();
    window.toggleOrderDetail('PRM-2026-000001');
    assert(doc.getElementById('ops-orders-list').textContent.includes('کد رهگیری'), 'order detail expands');
    window.setOrderField('PRM-2026-000001', 'trackingCode', 'TRACK123');
    window.setOrderField('PRM-2026-000001', 'address.city', 'کرج');
    const ord = G('MockDB').orders[0];
    assert(ord.trackingCode === 'TRACK123' && ord.address.city === 'کرج', 'order tracking + address edited');
    window.setStaffRole('warehouse');
    window.setOrderField('PRM-2026-000001', 'trackingCode', 'HACK');
    assert(G('MockDB').orders[0].trackingCode === 'TRACK123', 'non-manager blocked from order edit');

    // --- complaint reply + delete
    window.setStaffRole('technical');
    G('MockDB').complaints.unshift({ id: 'CMP-T1', subject: 'مغایرت کالا', name: 'ب', phone: '0912', message: 'تست', status: 'new', createdAt: 'now' });
    window.setComplaintReply('CMP-T1', 'تعویض شد');
    assert(G('MockDB').complaints[0].opsReply === 'تعویض شد', 'complaint reply saved');
    window.deleteComplaint('CMP-T1');
    assert(!G('MockDB').complaints.some(c => c.id === 'CMP-T1'), 'complaint deleted');

    // --- activity filter + clear
    window.setStaffRole('manager');
    doc.getElementById('ops-activity-filter').value = 'product.price';
    window.renderOpsActivity();
    assert(doc.getElementById('ops-activity-list').textContent.includes('product.price'), 'activity filter works');
    window.clearOpsActivity();
    assert(G('MockDB').events.length === 0, 'activity cleared');

    // --- badges reflect state
    G('AppState').leads.unshift({ id: 'LEAD-X', part: '6205', quantity: 1, name: 'x', phone: '0912', status: 'new', createdAt: 'now' });
    window.updateOpsBadges();
    assert(doc.getElementById('ops-count-tech').hidden === false, 'tech badge shows for new lead');

    // --- escape check: HTML in user content must not execute
    G('AppState').leads.unshift({ id: 'LEAD-ESC', part: '<img src=x onerror=window.__pwned=1>', quantity: 1, name: 'x', phone: '0912', status: 'new', createdAt: 'now' });
    window.renderAdminLeads();
    assert(window.__pwned !== 1 && doc.getElementById('admin-lead-list').querySelector('img') === null, 'lead content escaped');

    window.closeAdminPanel();
    server.close();
    console.log(process.exitCode ? 'OPS EDIT CHECK: FAILED' : 'OPS EDIT CHECK: ALL PASSED');
    process.exit(process.exitCode || 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
