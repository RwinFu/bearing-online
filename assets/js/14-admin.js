/* ===== 14-admin.js — پنل عملیات و نقش‌ها (RBAC نمونه) ===== */
// =============================================
// ADMIN / OPERATIONS BACKEND (prototype RBAC)
// =============================================
const STAFF_ROLES = {
    manager: { fa: 'مدیر', permissions: ['pricing.write', 'stock.write', 'suppliers.write', 'tech.write', 'rfq.write', 'complaints.write', 'orders.view', 'staff.view'] },
    warehouse: { fa: 'انباردار', permissions: ['stock.write', 'suppliers.write', 'orders.view'] },
    technical: { fa: 'مشاور فنی', permissions: ['tech.write', 'complaints.write', 'orders.view'] },
    inquiry: { fa: 'مشاور استعلام', permissions: ['rfq.write', 'orders.view'] },
    customer: { fa: 'مشتری', permissions: [] }
};

function can(permission) {
    return (STAFF_ROLES[AppState.staffRole]?.permissions || []).includes(permission);
}

function setStaffRole(role) {
    if (!STAFF_ROLES[role]) return;
    AppState.staffRole = role;
    persistState();
    renderOpsConsole();
    showNotification(`نقش فعال: ${STAFF_ROLES[role].fa}`, 'success');
}

function switchOpsTab(name) {
    document.querySelectorAll('.ops-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`ops-${name}`)?.classList.remove('hidden');
    document.querySelectorAll('[data-ops-tab]').forEach(btn => btn.classList.toggle('ops-tab-active', btn.dataset.opsTab === name));
    refreshOpsTab(name);
}

function refreshOpsTab(name) {
    if (name === 'overview') renderOpsOverview();
    else if (name === 'pricing') updatePricingPreview();
    else if (name === 'stock') renderOpsStock();
    else if (name === 'tech') renderAdminLeads();
    else if (name === 'rfq') renderOpsRFQ();
    else if (name === 'suppliers') renderOpsSuppliers();
    else if (name === 'orders') renderOpsOrders();
    else if (name === 'complaints') renderOpsComplaints();
    else if (name === 'activity') renderOpsActivity();
    else if (name === 'club') renderCustomerClub();
    else if (name === 'daily') { const d = document.getElementById('dailyDay'); if (d && !d.value) d.value = new Date().toLocaleDateString('en-CA'); }
    updateOpsBadges();
}

function setOpsBadge(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n > 99 ? '99+' : n;
    el.hidden = !(n > 0);
}

function updateOpsBadges() {
    setOpsBadge('ops-count-tech', AppState.leads.filter(l => l.status === 'new').length);
    setOpsBadge('ops-count-rfq', MockDB.rfqs.filter(r => r.status === 'waiting_sales').length);
    setOpsBadge('ops-count-complaints', MockDB.complaints.filter(c => c.status === 'new').length);
    setOpsBadge('ops-count-orders', MockDB.orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length);
}

function opsLog(action, detail = '') {
    MockDB.events.unshift({ at: new Date().toLocaleString('fa-IR'), role: AppState.staffRole, staff: AppState.staffName || '-', action, detail });
    persistState();
    renderOpsActivity();
    updateOpsBadges();
}

function renderOpsConsole() {
    const roleSelect = document.getElementById('ops-role');
    if (roleSelect) roleSelect.value = AppState.staffRole;
    const nameInput = document.getElementById('ops-staff-name');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = AppState.staffName || '';
    const note = document.getElementById('ops-permission-note');
    if (note) {
        const access = [];
        if (can('pricing.write')) access.push('نرخ دلار');
        if (can('stock.write')) access.push('انبار');
        if (can('tech.write')) access.push('مشاوره فنی');
        if (can('rfq.write')) access.push('استعلام');
        if (can('suppliers.write')) access.push('تامین‌کنندگان');
        if (can('complaints.write')) access.push('شکایات');
        note.textContent = `نقش فعال: ${STAFF_ROLES[AppState.staffRole].fa}${AppState.staffName ? ' | ' + AppState.staffName : ''} — دسترسی: ${access.join('، ') || 'فقط مشاهده'}`;
    }
    const rate = document.getElementById('admin-exchange-rate');
    const margin = document.getElementById('admin-profit-margin');
    if (rate) rate.disabled = !can('pricing.write');
    if (margin) margin.disabled = !can('pricing.write');
    if (!document.querySelector('[data-ops-tab].ops-tab-active')) switchOpsTab('overview');
    renderOpsOverview();
    updatePricingPreview();
    updateOpsBadges();
    renderAdminLeads();
    renderOpsStock();
    renderOpsSuppliers();
    renderOpsRFQ();
    renderOpsOrders();
    renderOpsComplaints();
    renderOpsActivity();
}

function renderOpsOverview() {
    const kpis = document.getElementById('ops-overview-kpis');
    const low = document.getElementById('ops-overview-lowstock');
    const recent = document.getElementById('ops-overview-recent');
    if (!kpis || !low || !recent) return;
    const instant = ProductDatabase.filter(p => p.sell_mode === 'instant').length;
    const stockValue = ProductDatabase.reduce((s, p) => s + (p.unit_price_toman || 0) * (p.stock_on_hand || 0), 0);
    const openOrders = MockDB.orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
    const waitingRFQ = MockDB.rfqs.filter(r => r.status === 'waiting_sales').length;
    const newLeads = AppState.leads.filter(l => l.status === 'new').length;
    const newComplaints = MockDB.complaints.filter(c => c.status === 'new').length;
    kpis.innerHTML = `
        <button class="ops-kpi" onclick="switchOpsTab('stock')"><b>${ProductDatabase.length}</b><span>کالای کاتالوگ</span></button>
        <button class="ops-kpi" onclick="switchOpsTab('stock')"><b>${instant}</b><span>قابل خرید آنلاین</span></button>
        <button class="ops-kpi" onclick="switchOpsTab('orders')"><b>${openOrders}</b><span>سفارش باز</span></button>
        <button class="ops-kpi" onclick="switchOpsTab('rfq')"><b>${waitingRFQ}</b><span>استعلام در انتظار</span></button>
        <button class="ops-kpi" onclick="switchOpsTab('tech')"><b>${newLeads}</b><span>لید جدید</span></button>
        <button class="ops-kpi" onclick="switchOpsTab('complaints')"><b>${newComplaints}</b><span>شکایت جدید</span></button>
        <div class="ops-kpi"><b>${formatToman(stockValue)}</b><span>ارزش موجودی (تومان)</span></div>
        <div class="ops-kpi"><b>${MockDB.suppliers.length}</b><span>تامین‌کننده</span></div>`;
    const lowItems = ProductDatabase.filter(p => (p.available_to_sell || 0) <= 2).slice(0, 8);
    low.innerHTML = lowItems.map(p => `<div class="flex items-center justify-between gap-2 p-2 rounded-lg ${p.available_to_sell === 0 ? 'bg-red-50' : 'bg-orange-50'}"><span class="font-bold text-gray-700">${escapeHTML(p.brand)} ${escapeHTML(p.code)}</span><span class="text-xs ${p.available_to_sell === 0 ? 'text-red-600' : 'text-orange-600'} font-bold">${p.available_to_sell === 0 ? 'ناموجود' : 'فقط ' + p.available_to_sell + ' عدد'}</span></div>`).join('') || '<p class="text-xs text-gray-400">موجودی همه کالاها مناسب است.</p>';
    recent.innerHTML = MockDB.events.slice(0, 5).map(e => `<div class="text-xs text-gray-500"><b class="text-gray-700">${escapeHTML(e.action)}</b>${e.detail ? ' — ' + escapeHTML(e.detail) : ''} <span class="text-gray-400">(${escapeHTML(e.staff)} | ${escapeHTML(e.at)})</span></div>`).join('') || '<p class="text-xs text-gray-400">فعالیتی ثبت نشده است.</p>';
}

function updatePricingPreview() {
    const box = document.getElementById('ops-pricing-preview');
    if (!box) return;
    const rate = parseFloat(document.getElementById('admin-exchange-rate')?.value) || 0;
    const margin = parseFloat(document.getElementById('admin-profit-margin')?.value) || 0;
    const sample = ProductDatabase.find(p => p.sell_mode === 'instant') || ProductDatabase[0];
    if (!sample || rate <= 0) {
        box.innerHTML = '<span class="text-gray-400">نرخ معتبر وارد کنید تا پیش‌نمایش محاسبه شود.</span>';
        return;
    }
    const next = Math.round(sample.priceUSD * rate * (1 + margin / 100));
    box.innerHTML = `<b>پیش‌نمایش زنده:</b> ${escapeHTML(sample.brand)} ${escapeHTML(sample.code)} <span class="text-gray-400">(${sample.priceUSD}$)</span><br>فعلی: <b>${formatToman(sample.unit_price_toman)} تومان</b> ← با نرخ جدید: <b class="text-blue-700">${formatToman(next)} تومان</b><br><span class="text-xs text-gray-400">پس از ذخیره روی همه ${ProductDatabase.length} قلم کاتالوگ اعمال می‌شود.</span>`;
}

function showAdminPanel() {
    document.getElementById('admin-exchange-rate').value = AppState.exchangeRate;
    document.getElementById('admin-profit-margin').value = AppState.profitMargin;
    renderOpsConsole();
    document.getElementById('admin-modal').classList.remove('hidden');
}

function closeAdminPanel() {
    document.getElementById('admin-modal').classList.add('hidden');
}

function saveAdminSettings() {
    if (!can('pricing.write')) {
        showNotification('این نقش اجازه تغییر نرخ دلار را ندارد.', 'error');
        return;
    }
    AppState.exchangeRate = parseFloat(document.getElementById('admin-exchange-rate').value) || 52000;
    AppState.profitMargin = parseFloat(document.getElementById('admin-profit-margin').value) || 25;
    ProductDatabase.forEach(product => {
        product.unit_price_toman = Math.round(product.priceUSD * AppState.exchangeRate * (1 + AppState.profitMargin / 100));
        product.pricing_updated_at = new Date().toISOString();
    });
    opsLog('pricing.update', `نرخ=${AppState.exchangeRate} حاشیه=${AppState.profitMargin}%`);
    showNotification(AppState.language === 'en' ? 'Settings saved successfully!' : 'تنظیمات با موفقیت ذخیره شد!', 'success');

    // Re-render prices everywhere; keep the panel open for continued work
    updatePricingPreview();
    renderOpsStock();
    renderOpsOverview();
    renderSearchResults();
}

function supplierList() {
    return MockDB.suppliers || [];
}

function supplierName(id) {
    if (!id || id === 'own') return 'انبار خودمان';
    const s = supplierList().find(x => x.id === id);
    return s ? s.name : 'تامین‌کننده حذف‌شده';
}

// Toggle one supplier for a product. Used by the detailed multi-supplier chips
// in the stock tab; the numbered dropdown in the same row keeps working as a
// shortcut that ADDS to (never wipes) the product's supplier list.
function toggleProductSupplier(productId, supplierId) {
    if (!can('stock.write')) {
        showNotification('این نقش اجازه تغییر منبع تامین را ندارد.', 'error');
        renderOpsStock();
        return;
    }
    if (!supplierId || supplierId === 'own') {
        showNotification('برای حذف منبع، از همان تامین‌کننده در لیست استفاده کنید.', 'info');
        return;
    }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    supplierBookkeeping(product);
    const add = !product.supplierIds.includes(supplierId);
    if (add) product.supplierIds.push(supplierId);
    else product.supplierIds = product.supplierIds.filter(id => id !== supplierId);
    // A product with any external supplier becomes "supplier"-sourced; an empty
    // list falls back to the in-house warehouse.
    product.stockSource = product.supplierIds.length ? 'supplier' : 'own';
    // Keep legacy fields in sync for anything that still reads supplierId.
    product.supplierId = product.supplierIds[0] || '';
    opsLog('stock.supplier', `${product.brand} ${product.code}: ${add ? '+' : '−'}${supplierName(supplierId)}`);
    persistState();
    renderOpsStock();
    showNotification('منابع تامین به‌روز شد.', 'success');
}

function productSuppliers(product) {
    supplierBookkeeping(product);
    if (product.stockSource === 'own' && !product.supplierIds.length) {
        return [{ id: 'own', name: 'انبار خودمان', type: 'own' }];
    }
    const ids = product.supplierIds.length ? product.supplierIds : (product.supplierId ? [product.supplierId] : []);
    return ids
        .filter(id => id !== 'own')
        .map(id => supplierList().find(s => s.id === id))
        .filter(Boolean)
        .map(s => ({ id: s.id, name: s.name, type: s.type }));
}

function renderOpsStock() {
    const container = document.getElementById('ops-stock-list');
    if (!container) return;
    const st = container.scrollTop;
    const q = normalizeSearchValue(document.getElementById('ops-stock-search')?.value || '');
    const stockEditable = can('stock.write');
    const priceEditable = can('pricing.write');
    const manager = AppState.staffRole === 'manager';
    const all = ProductDatabase.filter(p => !q || normalizeSearchValue(`${p.brand} ${p.code} ${p.id}`).includes(q));
    const rows = all.slice(0, 60);
    const suppliers = MockDB.suppliers.filter(s => s.type !== 'own');
    const countEl = document.getElementById('ops-stock-count');
    if (countEl) countEl.textContent = `نمایش ${rows.length} از ${all.length} کالا (کل کاتالوگ: ${ProductDatabase.length})`;
    container.innerHTML = rows.map(p => {
        const src = p.stockSource || 'own';
        supplierBookkeeping(p);
        const pSuppliers = productSuppliers(p);
        return `
        <div class="p-3 bg-white rounded-xl border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div><b>${escapeHTML(p.brand)} ${escapeHTML(p.code)}</b>
                    <div class="text-xs text-gray-400">قابل فروش: ${p.available_to_sell} | ${p.sell_mode === 'instant' ? 'خرید آنلاین' : 'استعلامی'} | ${formatToman(p.unit_price_toman)} تومان</div>
                    <div class="text-xs text-blue-600 mt-1">منابع تامین: ${src === 'own' ? 'انبار خودمان' : escapeHTML(pSuppliers.map(s => s.name).join('، ') || supplierName(p.supplierId))}</div>
                </div>
                ${manager ? `<button onclick="deleteProduct('${p.id}')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold self-start" title="حذف کالا از کاتالوگ"><i class="fas fa-trash ml-1"></i>حذف</button>` : ''}
            </div>
            ${stockEditable ? `<div class="flex flex-wrap items-center gap-1.5 mt-3">
                <span class="text-xs text-gray-500">منابع تامین:</span>
                ${suppliers.map(s => {
                    const on = pSuppliers.some(ps => ps.id === s.id);
                    return `<button type="button" onclick="toggleProductSupplier('${p.id}','${s.id}')" aria-pressed="${on}" class="ops-sup-toggle ${on ? 'on' : ''}">${on ? '×' : '+'} ${escapeHTML(s.name)}</button>`;
                }).join('')}
                ${pSuppliers.length ? `<button type="button" onclick="replaceProductSuppliers('${p.id}')" class="ops-sup-toggle ops-sup-clear">برگشت به انبار خودمان</button>` : ''}
                <span class="text-[11px] text-gray-400">برای حذف یک منبع، روی نشان فعال (×) بزنید.</span>
            </div>` : ''}
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                <label class="text-xs text-gray-500">موجودی<input type="number" min="0" value="${p.stock_on_hand}" ${stockEditable ? '' : 'disabled'} onchange="updateStock('${p.id}','stock_on_hand',this.value)" class="compact-input mt-1 ${stockEditable ? '' : 'ops-locked'}"></label>
                <label class="text-xs text-gray-500">رزرو<input type="number" min="0" value="${p.stock_reserved}" ${stockEditable ? '' : 'disabled'} onchange="updateStock('${p.id}','stock_reserved',this.value)" class="compact-input mt-1 ${stockEditable ? '' : 'ops-locked'}"></label>
                <label class="text-xs text-gray-500">قیمت دلاری ($)<input type="number" min="0" step="any" value="${p.priceUSD}" ${priceEditable ? '' : 'disabled'} onchange="updateProductPrice('${p.id}',this.value)" class="compact-input mt-1 ${priceEditable ? '' : 'ops-locked'}"></label>
                <label class="text-xs text-gray-500">تحویل (روز)<input type="number" min="0" step="1" value="${p.lead_time_days ?? ''}" ${stockEditable ? '' : 'disabled'} onchange="updateLeadTime('${p.id}',this.value)" class="compact-input mt-1 ${stockEditable ? '' : 'ops-locked'}"></label>
                <label class="text-xs text-gray-500">افزودن منبع<select ${stockEditable ? '' : 'disabled'} onchange="setProductSource('${p.id}',this.value);this.value=''" class="compact-input mt-1 ${stockEditable ? '' : 'ops-locked'}">
                    <option value="">+ افزودن…</option>
                    ${suppliers.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('')}
                </select></label>
            </div>
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400">محصولی پیدا نشد.</p>';
    container.scrollTop = st;
}

function replaceProductSuppliers(productId) {
    if (!can('stock.write')) {
        showNotification('این نقش اجازه تغییر منبع تامین را ندارد.', 'error');
        renderOpsStock();
        return;
    }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    product.supplierIds = [];
    product.supplierId = '';
    product.stockSource = 'own';
    opsLog('stock.supplier', `${product.brand} ${product.code}: منبع=انبار خودمان`);
    persistState();
    renderOpsStock();
    showNotification('منابع تامین به انبار خودمان برگشت.', 'success');
}

function updateProductPrice(productId, value) {
    if (!can('pricing.write')) {
        showNotification('فقط مدیر می‌تواند قیمت کالا را تغییر دهد.', 'error');
        renderOpsStock();
        return;
    }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    const v = parseFloat(value);
    if (!isFinite(v) || v < 0) {
        showNotification('قیمت دلاری معتبر نیست.', 'error');
        renderOpsStock();
        return;
    }
    product.priceUSD = v;
    product.unit_price_toman = moneyTomanFromUSD(v);
    product.pricing_updated_at = new Date().toISOString();
    opsLog('product.price', `${product.brand} ${product.code}: ${v}$`);
    persistState();
    renderOpsStock();
    renderOpsOverview();
    renderSearchResults();
    showNotification('قیمت کالا به‌روز شد.', 'success');
}

function updateLeadTime(productId, value) {
    if (!can('stock.write')) {
        showNotification('این نقش اجازه تغییر زمان تحویل را ندارد.', 'error');
        renderOpsStock();
        return;
    }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    const v = parseInt(value);
    if (!isFinite(v) || v < 0) {
        showNotification('زمان تحویل معتبر نیست.', 'error');
        renderOpsStock();
        return;
    }
    product.lead_time_days = v;
    opsLog('product.leadtime', `${product.brand} ${product.code}: ${v} روز`);
    persistState();
    renderOpsStock();
    showNotification('زمان تحویل ثبت شد.', 'success');
}

function addProduct() {
    if (AppState.staffRole !== 'manager') {
        showNotification('فقط مدیر می‌تواند کالا اضافه کند.', 'error');
        return;
    }
    const brand = document.getElementById('ops-new-brand')?.value.trim() || '';
    const code = document.getElementById('ops-new-code')?.value.trim() || '';
    const price = parseFloat(document.getElementById('ops-new-price')?.value);
    if (!brand || !code) {
        showNotification('برند و کد قطعه الزامی است.', 'error');
        return;
    }
    if (!isFinite(price) || price < 0) {
        showNotification('قیمت دلاری معتبر نیست.', 'error');
        return;
    }
    const num = id => {
        const v = parseFloat(document.getElementById(id)?.value);
        return isFinite(v) && v >= 0 ? v : 0;
    };
    const stock = Math.max(0, parseInt(document.getElementById('ops-new-stock')?.value) || 0);
    const d = num('ops-new-d'), D = num('ops-new-D'), B = num('ops-new-B');
    const type = document.getElementById('ops-new-type')?.value || 'bearing';
    const origin = document.getElementById('ops-new-origin')?.value.trim() || '';
    const supplierIds = [...(document.getElementById('ops-new-suppliers')?.selectedOptions || [])]
        .map(option => option.value)
        .filter(id => id && id !== 'own');
    const product = {
        id: 'CUSTOM-' + Date.now(),
        code: typeof normalizePartCodeDisplay === 'function' ? normalizePartCodeDisplay(code) : code,
        brand, type, subtype: 'standard', d, D, B,
        priceUSD: price, speedRating: 0, loadRating: 0, weight: 0.1, origin,
        seal: 'Open', clearance: 'C0', image: type,
        stock_on_hand: stock, stock_reserved: 0,
        unit_price_toman: moneyTomanFromUSD(price),
        pricing_updated_at: new Date().toISOString(),
        package_length_cm: Math.max(8, Math.ceil(D / 10) + 6),
        package_width_cm: Math.max(8, Math.ceil(D / 10) + 6),
        package_height_cm: Math.max(5, Math.ceil(B / 10) + 4),
        lead_time_days: stock > 0 ? 1 : 21,
        tax_class: 'standard',
        cageType: 'Steel', sealType: 'Open', lubrication: 'Grease',
        internalClearance: 'C0', accuracyClass: 'P0',
        leadTimeFa: stock > 0 ? 'ارسال امروز' : 'استعلام',
        stockSource: supplierIds.length ? 'supplier' : 'own',
        supplierId: supplierIds[0] || '',
        supplierIds,
        searchMeta: { equivalent: false, suffixMatch: '' }
    };
    refreshProductAvailability(product);
    ProductDatabase.push(product);
    MockDB.customProducts.push(product);
    ['ops-new-brand', 'ops-new-code', 'ops-new-d', 'ops-new-D', 'ops-new-B', 'ops-new-price', 'ops-new-stock', 'ops-new-origin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const supSel = document.getElementById('ops-new-suppliers');
    if (supSel) supSel.selectedIndex = -1;
    const det = document.getElementById('ops-add-product');
    if (det) det.open = false;
    opsLog('product.add', `${brand} ${code}`);
    persistState();
    updateFilterCounts();
    updateHomeStats();
    renderSearchResults();
    renderOpsStock();
    renderOpsOverview();
    updateOpsBadges();
    showNotification('کالا به کاتالوگ اضافه شد.', 'success');
}

function deleteProduct(productId) {
    if (AppState.staffRole !== 'manager') {
        showNotification('فقط مدیر می‌تواند کالا را حذف کند.', 'error');
        return;
    }
    const idx = ProductDatabase.findIndex(p => p.id === productId);
    if (idx < 0) return;
    const removed = ProductDatabase.splice(idx, 1)[0];
    if (String(productId).startsWith('CUSTOM-')) {
        MockDB.customProducts = MockDB.customProducts.filter(p => p.id !== productId);
    } else if (!MockDB.deletedProducts.includes(productId)) {
        MockDB.deletedProducts.push(productId);
    }
    opsLog('product.delete', `${removed.brand} ${removed.code}`);
    persistState();
    updateFilterCounts();
    updateHomeStats();
    renderSearchResults();
    renderOpsStock();
    renderOpsOverview();
    updateOpsBadges();
    showNotification('کالا از کاتالوگ حذف شد.', 'success');
}

function setProductSource(productId, value) {
    if (!can('stock.write')) { showNotification('این نقش اجازه تغییر منبع تامین را ندارد.', 'error'); renderOpsStock(); return; }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    supplierBookkeeping(product);
    if (value === 'own') {
        product.stockSource = 'own';
        product.supplierIds = [];
        product.supplierId = '';
    } else if (!product.supplierIds.includes(value)) {
        // Adds to the product's supplier list instead of replacing it, so one
        // product can be sourced from several suppliers at once.
        product.supplierIds.push(value);
        product.stockSource = 'supplier';
        product.supplierId = product.supplierIds[0] || value;
    }
    opsLog('stock.source', `${product.brand} ${product.code}: منبع=${value === 'own' ? 'انبار خودمان' : supplierName(value)}`);
    persistState();
    renderOpsStock();
    showNotification('منبع تامین ثبت شد.', 'success');
}

function renderOpsSuppliers(editId = '') {
    const container = document.getElementById('ops-supplier-list');
    if (!container) return;
    const st = container.scrollTop;
    const editable = can('suppliers.write');
    // Keep the add-product multi-select in sync with the current supplier list.
    const newSup = document.getElementById('ops-new-suppliers');
    if (newSup) {
        const selected = [...newSup.selectedOptions].map(o => o.value);
        newSup.innerHTML = `<option value="">— انبار خودمان (خالی بماند) —</option>` +
            MockDB.suppliers.filter(s => s.type !== 'own').map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
        [...newSup.options].forEach(o => { if (selected.includes(o.value)) o.selected = true; });
    }
    container.innerHTML = MockDB.suppliers.map(s => {
        const count = ProductDatabase.filter(p =>
            Array.isArray(p.supplierIds) && p.supplierIds.includes(s.id)
        ).length;
        if (s.id === editId && editable) {
            return `
            <div class="p-3 bg-blue-50/50 rounded-xl border border-blue-200 grid md:grid-cols-4 gap-2">
                <label class="text-xs text-gray-500">نام *<input id="ops-edit-name" value="${escapeHTML(s.name)}" class="compact-input mt-1"></label>
                <label class="text-xs text-gray-500">تلفن<input id="ops-edit-phone" value="${escapeHTML(s.phone || '')}" class="compact-input mt-1"></label>
                <label class="text-xs text-gray-500">آدرس / بازار<input id="ops-edit-address" value="${escapeHTML(s.address || '')}" class="compact-input mt-1"></label>
                <label class="text-xs text-gray-500">توضیح<input id="ops-edit-note" value="${escapeHTML(s.note || '')}" class="compact-input mt-1"></label>
                <div class="md:col-span-4 flex gap-2">
                    <button onclick="saveSupplier('${s.id}')" class="btn-primary text-white px-4 py-2 rounded-xl font-bold text-sm">ذخیره</button>
                    <button onclick="renderOpsSuppliers()" class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">انصراف</button>
                </div>
            </div>`;
        }
        return `
        <div class="p-3 bg-white rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div><b>${escapeHTML(s.name)}</b> ${s.type === 'own' ? '<span class="text-xs text-green-700">(انبار خودمان)</span>' : '<span class="text-xs text-blue-600">(مغازه/تامین‌کننده)</span>'}<div class="text-xs text-gray-400 mt-1">${escapeHTML(s.phone) || '-'} | ${escapeHTML(s.address) || '-'}${s.note ? ' | ' + escapeHTML(s.note) : ''}</div><div class="text-xs text-gray-500 mt-1">${count} کالا از این منبع تامین می‌شود</div></div>
            ${!editable ? '<span class="text-xs text-gray-400">فقط مدیر/انباردار</span>' : `<div class="flex gap-2">
                <button onclick="editSupplier('${s.id}')" class="px-3 py-2 rounded-xl border border-blue-200 text-blue-700 text-sm font-bold">ویرایش</button>
                ${s.type === 'own' ? '' : `<button onclick="deleteSupplier('${s.id}')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold">حذف</button>`}
            </div>`}
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400">تامین‌کننده‌ای ثبت نشده است.</p>';
    container.scrollTop = st;
}

function editSupplier(id) {
    if (!can('suppliers.write')) {
        showNotification('این نقش اجازه ویرایش تامین‌کننده را ندارد.', 'error');
        return;
    }
    renderOpsSuppliers(id);
}

function saveSupplier(id) {
    if (!can('suppliers.write')) {
        showNotification('این نقش اجازه ویرایش تامین‌کننده را ندارد.', 'error');
        renderOpsSuppliers();
        return;
    }
    const s = MockDB.suppliers.find(x => x.id === id);
    if (!s) return;
    const name = document.getElementById('ops-edit-name')?.value.trim() || '';
    if (!name) {
        showNotification('نام تامین‌کننده را وارد کنید.', 'error');
        return;
    }
    s.name = name;
    s.phone = document.getElementById('ops-edit-phone')?.value.trim() || '';
    s.address = document.getElementById('ops-edit-address')?.value.trim() || '';
    s.note = document.getElementById('ops-edit-note')?.value.trim() || '';
    opsLog('supplier.edit', name);
    persistState();
    renderOpsSuppliers();
    renderOpsStock();
    renderOpsOverview();
    showNotification('تامین‌کننده به‌روز شد.', 'success');
}

function addSupplier() {
    if (!can('suppliers.write')) { showNotification('این نقش اجازه افزودن تامین‌کننده را ندارد.', 'error'); return; }
    const name = document.getElementById('ops-sup-name')?.value.trim();
    if (!name) { showNotification('نام تامین‌کننده را وارد کنید.', 'error'); return; }
    MockDB.suppliers.push({ id: 'SUP-' + Date.now(), name, type: 'shop', phone: document.getElementById('ops-sup-phone')?.value.trim() || '', address: document.getElementById('ops-sup-address')?.value.trim() || '', note: document.getElementById('ops-sup-note')?.value.trim() || '' });
    ['ops-sup-name','ops-sup-phone','ops-sup-address','ops-sup-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    opsLog('supplier.add', name);
    persistState();
    renderOpsSuppliers();
    renderOpsStock();
    showNotification('تامین‌کننده اضافه شد.', 'success');
}

function deleteSupplier(id) {
    if (!can('suppliers.write')) { showNotification('این نقش اجازه حذف تامین‌کننده را ندارد.', 'error'); return; }
    MockDB.suppliers = MockDB.suppliers.filter(s => s.id !== id || s.type === 'own');
    ProductDatabase.forEach(p => {
        if (Array.isArray(p.supplierIds) && p.supplierIds.includes(id)) p.supplierIds = p.supplierIds.filter(sid => sid !== id);
        if (p.supplierId === id) { p.supplierId = p.supplierIds[0] || ''; p.stockSource = p.supplierIds.length ? 'supplier' : 'own'; }
    });
    opsLog('supplier.delete', id);
    persistState();
    renderOpsSuppliers();
    renderOpsStock();
    showNotification('تامین‌کننده حذف و کالاها به انبار خودمان برگشتند.', 'success');
}

function updateStock(productId, field, value) {
    if (!can('stock.write')) {
        showNotification('این نقش اجازه تغییر موجودی را ندارد.', 'error');
        renderOpsStock();
        return;
    }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    product[field] = Math.max(0, parseInt(value) || 0);
    product.stock = product.stock_on_hand;
    product.available_to_sell = Math.max(0, product.stock_on_hand - product.stock_reserved);
    product.sell_mode = product.available_to_sell > 0 ? 'instant' : 'quote';
    product.stockStatus = product.available_to_sell > 0 ? 'in-stock' : 'inquiry';
    opsLog('stock.update', `${product.brand} ${product.code}: موجودی=${product.stock_on_hand} رزرو=${product.stock_reserved}`);
    persistState();
    updateFilterCounts();
    renderOpsStock();
    renderOpsOverview();
    renderSearchResults();
}

function setLeadStatus(leadId, status) {
    if (!can('tech.write')) {
        showNotification('این نقش اجازه تغییر وضعیت مشاوره را ندارد.', 'error');
        renderAdminLeads();
        return;
    }
    const lead = AppState.leads.find(item => item.id === leadId);
    if (!lead) return;
    lead.status = status;
    opsLog('lead.status', `${lead.part}: ${status}`);
    persistState();
    renderAdminLeads();
    renderAccountRequests();
}

const RFQ_STATUS_FA = { waiting_sales: 'در انتظار فروش', quoted: 'قیمت اعلام شد', approved: 'تایید شد', rejected: 'رد شد' };

function rfqItemsText(rfq) {
    return (rfq.items || []).map(it => `${it.brand || ''} ${it.code || it.id || ''} × ${it.quantity || 1}`).join('، ');
}

function setRFQNote(rfqNumber, value) {
    if (!can('rfq.write')) {
        showNotification('این نقش اجازه ثبت یادداشت استعلام را ندارد.', 'error');
        renderOpsRFQ();
        return;
    }
    const rfq = MockDB.rfqs.find(item => item.rfqNumber === rfqNumber);
    if (!rfq) return;
    rfq.opsNote = value.trim();
    opsLog('rfq.note', rfqNumber);
    persistState();
    showNotification('یادداشت استعلام ذخیره شد.', 'success');
    renderAccountRequests();
}

function deleteRFQ(rfqNumber) {
    if (!can('rfq.write')) {
        showNotification('این نقش اجازه حذف استعلام را ندارد.', 'error');
        return;
    }
    MockDB.rfqs = MockDB.rfqs.filter(item => item.rfqNumber !== rfqNumber);
    opsLog('rfq.delete', rfqNumber);
    persistState();
    renderOpsRFQ();
    renderOpsOverview();
    updateOpsBadges();
    showNotification('استعلام حذف شد.', 'success');
}

function renderOpsRFQ() {
    const container = document.getElementById('ops-rfq-list');
    if (!container) return;
    const st = container.scrollTop;
    const editable = can('rfq.write');
    container.innerHTML = MockDB.rfqs.map(rfq => `
        <div class="p-4 bg-white rounded-xl border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div><b>${escapeHTML(rfq.rfqNumber)}</b><div class="text-xs text-gray-400">${rfq.items?.length || 0} قلم${rfq.createdAt ? ' | ' + escapeHTML(rfq.createdAt) : ''}${rfq.linkedOrder ? ' | سفارش ' + escapeHTML(rfq.linkedOrder) : ''}</div></div>
                <div class="flex gap-2">
                    <select ${editable ? '' : 'disabled'} onchange="setRFQStatus('${rfq.rfqNumber}',this.value)" class="compact-input md:w-48 ${editable ? '' : 'ops-locked'}">
                        ${Object.keys(RFQ_STATUS_FA).map(s => `<option value="${s}" ${rfq.status === s ? 'selected' : ''}>${RFQ_STATUS_FA[s]}</option>`).join('')}
                    </select>
                    ${editable ? `<button onclick="deleteRFQ('${rfq.rfqNumber}')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold" title="حذف استعلام"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mt-2">اقلام: ${escapeHTML(rfqItemsText(rfq)) || '-'}</div>
            <div class="grid md:grid-cols-2 gap-3 mt-3">
                <label class="text-xs text-gray-500">قیمت تاییدشده (تومان) — نمایش به مشتری<input ${editable ? '' : 'disabled'} value="${escapeHTML(rfq.quotedPrice || '')}" oninput="setRFQField('${rfq.rfqNumber}','quotedPrice',this.value)" class="compact-input mt-1 ${editable ? '' : 'ops-locked'}" placeholder="مثلاً ۲٬۵۰۰٬۰۰۰"></label>
                <label class="text-xs text-gray-500">زمان تحویل — نمایش به مشتری<input ${editable ? '' : 'disabled'} value="${escapeHTML(rfq.leadTime || '')}" oninput="setRFQField('${rfq.rfqNumber}','leadTime',this.value)" class="compact-input mt-1 ${editable ? '' : 'ops-locked'}" placeholder="مثلاً ۲ تا ۳ هفته"></label>
            </div>
            <label class="block text-xs text-gray-500 mt-2">یادداشت داخلی (فقط داخلی)<textarea ${editable ? '' : 'disabled'} onchange="setRFQNote('${rfq.rfqNumber}',this.value)" rows="2" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}" placeholder="منبع تامین، مذاکره با مشتری...">${escapeHTML(rfq.opsNote || '')}</textarea></label>
            ${editable ? '' : '<div class="text-xs text-gray-400 mt-1">فقط مدیر/مشاور استعلام</div>'}
        </div>
    `).join('') || '<p class="text-sm text-gray-400">RFQ ثبت نشده است.</p>';
    container.scrollTop = st;
}

function setRFQStatus(rfqNumber, status) {
    if (!can('rfq.write')) {
        showNotification('این نقش اجازه تغییر RFQ را ندارد.', 'error');
        renderOpsRFQ();
        return;
    }
    const rfq = MockDB.rfqs.find(item => item.rfqNumber === rfqNumber);
    if (!rfq) return;
    rfq.status = status;
    opsLog('rfq.status', `${rfqNumber}: ${status}`);
    persistState();
    renderOpsRFQ();
    renderAccountRequests();
}

function setRFQField(rfqNumber, field, value) {
    if (!can('rfq.write')) return;
    const rfq = MockDB.rfqs.find(item => item.rfqNumber === rfqNumber);
    if (!rfq) return;
    rfq[field] = value;
    persistState();
    renderAccountRequests();
}

const opsOpenOrders = new Set();

function toggleOrderDetail(orderNumber) {
    if (opsOpenOrders.has(orderNumber)) opsOpenOrders.delete(orderNumber);
    else opsOpenOrders.add(orderNumber);
    renderOpsOrders();
}

function setOrderField(orderNumber, field, value) {
    if (AppState.staffRole !== 'manager') {
        showNotification('فقط مدیر می‌تواند سفارش را ویرایش کند.', 'error');
        renderOpsOrders();
        return;
    }
    const order = MockDB.orders.find(item => item.orderNumber === orderNumber);
    if (!order) return;
    const v = String(value || '').trim();
    if (field.startsWith('address.')) {
        order.address = order.address || {};
        order.address[field.slice(8)] = v;
    } else {
        order[field] = v;
    }
    opsLog('order.edit', `${orderNumber}: ${field}`);
    persistState();
    showNotification('سفارش به‌روز شد.', 'success');
}

function renderOpsOrders() {
    const container = document.getElementById('ops-orders-list');
    if (!container) return;
    const st = container.scrollTop;
    const editable = AppState.staffRole === 'manager';
    const statusFa = { PAID: 'پرداخت شد', PACKED: 'بسته‌بندی شد', SHIPPED: 'ارسال شد', DELIVERED: 'تحویل شد', CANCELLED: 'لغو شد' };
    container.innerHTML = MockDB.orders.map(order => {
        const open = opsOpenOrders.has(order.orderNumber);
        const items = (order.items || []).map(it => {
            const unit = moneyTomanFromUSD(it.priceUSD || 0);
            return `<tr class="border-t"><td class="p-2"><b>${escapeHTML(it.brand || '')} ${escapeHTML(it.code || '')}</b></td><td class="p-2">${it.quantity || 1}</td><td class="p-2">${formatToman(unit)}</td><td class="p-2 font-bold">${formatToman(unit * (it.quantity || 1))}</td></tr>`;
        }).join('');
        const events = (order.events || []).slice(-4).map(e => `<div class="text-xs text-gray-500">${escapeHTML(e.type)} — ${escapeHTML(e.actor || '')} <span class="text-gray-400">${escapeHTML(e.at || '')}</span></div>`).join('');
        return `
        <div class="p-4 bg-white rounded-xl border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <b>${escapeHTML(order.orderNumber)}</b>
                    <div class="text-xs text-gray-400 mt-1">${order.items?.length || 0} قلم | ${formatToman(order.grand_total)} تومان | ${escapeHTML(order.address?.city || '')}</div>
                </div>
                <div class="flex gap-2">
                    <select ${editable ? '' : 'disabled'} onchange="setOrderStatus('${order.orderNumber}',this.value)" class="compact-input md:w-44 text-sm ${editable ? '' : 'ops-locked'}">
                        ${Object.keys(statusFa).map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${statusFa[s]}</option>`).join('')}
                    </select>
                    <button onclick="toggleOrderDetail('${order.orderNumber}')" class="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 whitespace-nowrap">${open ? 'بستن ▲' : 'جزئیات ▼'}</button>
                </div>
            </div>
            <div class="text-xs text-gray-400 mt-2">پرداخت: ${escapeHTML(order.payment_status)} | ارسال: ${escapeHTML(order.shipping_status)}${order.trackingCode ? ' | رهگیری: ' + escapeHTML(order.trackingCode) : ''}${editable ? '' : ' | فقط مدیر'}</div>
            ${open ? `
            <div class="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <div class="overflow-x-auto"><table class="w-full text-xs"><thead class="bg-gray-50"><tr><th class="p-2 text-right">کالا</th><th class="p-2 text-right">تعداد</th><th class="p-2 text-right">واحد (تومان)</th><th class="p-2 text-right">جمع (تومان)</th></tr></thead><tbody>${items}</tbody></table></div>
                <div class="text-xs text-gray-500">گیرنده: <b>${escapeHTML(order.address?.recipient_name || '-')}</b> | <span dir="ltr">${escapeHTML(order.address?.mobile || '')}</span> | ${escapeHTML(order.address?.province || '')}، ${escapeHTML(order.address?.city || '')}، ${escapeHTML(order.address?.full_address || '')} | کدپستی: ${escapeHTML(order.address?.postal_code || '-')}</div>
                <div class="grid md:grid-cols-4 gap-2">
                    <label class="text-xs text-gray-500">کد رهگیری مرسوله<input value="${escapeHTML(order.trackingCode || '')}" ${editable ? '' : 'disabled'} onchange="setOrderField('${order.orderNumber}','trackingCode',this.value)" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}" placeholder="کد تیپاکس / پیک"></label>
                    <label class="text-xs text-gray-500">شرکت حمل<input value="${escapeHTML(order.carrier || '')}" ${editable ? '' : 'disabled'} onchange="setOrderField('${order.orderNumber}','carrier',this.value)" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}" placeholder="تیپاکس، پیک..."></label>
                    <label class="text-xs text-gray-500">موبایل گیرنده<input value="${escapeHTML(order.address?.mobile || '')}" ${editable ? '' : 'disabled'} onchange="setOrderField('${order.orderNumber}','address.mobile',this.value)" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}"></label>
                    <label class="text-xs text-gray-500">شهر<input value="${escapeHTML(order.address?.city || '')}" ${editable ? '' : 'disabled'} onchange="setOrderField('${order.orderNumber}','address.city',this.value)" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}"></label>
                </div>
                <label class="block text-xs text-gray-500">آدرس کامل<input value="${escapeHTML(order.address?.full_address || '')}" ${editable ? '' : 'disabled'} onchange="setOrderField('${order.orderNumber}','address.full_address',this.value)" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}"></label>
                <label class="block text-xs text-gray-500">یادداشت داخلی سفارش<textarea ${editable ? '' : 'disabled'} onchange="setOrderField('${order.orderNumber}','opsNote',this.value)" rows="2" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}" placeholder="توضیح بسته‌بندی، هماهنگی ارسال...">${escapeHTML(order.opsNote || '')}</textarea></label>
                ${events ? `<div class="bg-gray-50 rounded-lg p-2 space-y-1">${events}</div>` : ''}
            </div>` : ''}
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400">سفارشی ثبت نشده است.</p>';
    container.scrollTop = st;
}

function setOrderStatus(orderNumber, status) {
    if (AppState.staffRole !== 'manager') {
        showNotification('فقط مدیر می‌تواند وضعیت سفارش را تغییر دهد.', 'error');
        renderOpsOrders();
        return;
    }
    const order = MockDB.orders.find(item => item.orderNumber === orderNumber);
    if (!order) return;
    const shipMap = { PAID: 'pending', PACKED: 'packed', SHIPPED: 'shipped', DELIVERED: 'delivered', CANCELLED: 'cancelled' };
    order.status = status;
    order.shipping_status = shipMap[status] || order.shipping_status;
    order.events = order.events || [];
    order.events.push({ type: 'STATUS_' + status, actor: AppState.staffName || 'manager', at: new Date().toLocaleString('fa-IR') });
    opsLog('order.status', `${orderNumber}: ${status}`);
    persistState();
    renderOpsOrders();
}

function renderOpsActivity() {
    const container = document.getElementById('ops-activity-list');
    if (!container) return;
    const st = container.scrollTop;
    const q = normalizeSearchValue(document.getElementById('ops-activity-filter')?.value || '');
    const events = MockDB.events.filter(e => !q || normalizeSearchValue(`${e.action} ${e.detail || ''} ${e.staff} ${e.role}`).includes(q));
    container.innerHTML = events.map(event => `
        <div class="p-3 bg-white rounded-lg border border-gray-100">
            <b>${escapeHTML(event.action)}</b>
            <div class="text-xs text-gray-500">${escapeHTML(event.staff)} | ${escapeHTML(event.role)} | ${escapeHTML(event.at)}</div>
            ${event.detail ? `<div class="text-xs text-gray-400 mt-1">${escapeHTML(event.detail)}</div>` : ''}
        </div>
    `).join('') || '<p>فعالیتی ثبت نشده است.</p>';
    container.scrollTop = st;
}

function clearOpsActivity() {
    if (AppState.staffRole !== 'manager') {
        showNotification('فقط مدیر می‌تواند گزارش فعالیت را پاک کند.', 'error');
        return;
    }
    MockDB.events = [];
    persistState();
    renderOpsActivity();
    renderOpsOverview();
    showNotification('گزارش فعالیت پاک شد.', 'success');
}

// =============================================
// CUSTOMER CLUB + DAILY EXCEL EXPORT
// =============================================
// A lightweight loyalty ledger: every paying customer gets a record (keyed by
// mobile number). Their lifetime orders/sums are kept and both the club list
// and the daily report are exported to a real .xlsx-compatible file.
const CUSTOMER_CLUB_STORAGE = 'bo_customer_club';
const CLUB_TIERS = [
    { min: 0, label: 'برنزی', color: '#b45309' },
    { min: 3, label: 'نقره‌ای', color: '#64748b' },
    { min: 8, label: 'طلایی', color: '#b45309' },
    { min: 20, label: 'الماسی', color: '#0e7490' }
];

function readCustomerClub() {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_CLUB_STORAGE) || '[]'); }
    catch (e) { return []; }
}

function clubTier(count) {
    let tier = CLUB_TIERS[0];
    CLUB_TIERS.forEach(t => { if (count >= t.min) tier = t; });
    return tier;
}

function syncCustomerClub() {
    const club = readCustomerClub();
    MockDB.orders.forEach(order => {
        if (!order.address?.mobile) return;
        const key = String(order.address.mobile).replace(/\D/g, '');
        if (!key) return;
        let member = club.find(m => m.mobile === key);
        if (!member) {
            member = {
                mobile: key,
                name: order.address.recipient_name || order.address.company || '—',
                company: order.address.company || '',
                orderCount: 0,
                ordersTotal: 0,
                firstOrder: null,
                lastOrder: null,
                createdAt: new Date().toISOString()
            };
            club.push(member);
        }
        member.orderCount += 1;
        member.ordersTotal += order.grand_total || 0;
        member.name = member.name === '—' ? (order.address.recipient_name || order.address.company || '—') : member.name;
        member.company = order.address.company || member.company;
        const at = order.events?.find(e => e.type === 'ORDER_PAID')?.at || order.paidAt || new Date().toLocaleString('fa-IR');
        if (!member.firstOrder) member.firstOrder = at;
        member.lastOrder = at;
        member.tier = clubTier(member.orderCount).label;
    });
    try { localStorage.setItem(CUSTOMER_CLUB_STORAGE, JSON.stringify(club)); } catch (e) {}
    return club;
}

function renderCustomerClub() {
    const container = document.getElementById('club-list');
    const stats = document.getElementById('club-stats');
    if (!container) return;
    const club = syncCustomerClub().slice().sort((a, b) => b.ordersTotal - a.ordersTotal);
    if (stats) stats.textContent = `${club.length} عضو | مجموع سفارش‌ها: ${club.reduce((s, m) => s + m.orderCount, 0)} | مجموع فروش: ${formatToman(club.reduce((s, m) => s + m.ordersTotal, 0))} تومان`;
    if (!club.length) {
        container.innerHTML = '<p class="text-sm text-gray-400">هنوز عضوی ثبت نشده است؛ با اولین پرداختِ هر مشتری، عضو باشگاه می‌شود.</p>';
        return;
    }
    container.innerHTML = club.map(m => {
        const tier = clubTier(m.orderCount);
        return `<div class="p-3 bg-white rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
                <div class="flex items-center gap-2 flex-wrap"><b>${escapeHTML(m.name || '—')}</b><span class="club-tier" style="background:${tier.color}1a;color:${tier.color};border-color:${tier.color}55">${tier.label}</span>${m.company ? `<span class="text-xs text-gray-400">${escapeHTML(m.company)}</span>` : ''}</div>
                <div class="text-xs text-gray-500 mt-1" dir="ltr">${escapeHTML(m.mobile)} | ${escapeHTML(m.lastOrder || '—')}</div>
            </div>
            <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-500">سفارش: <b class="text-gray-800">${m.orderCount}</b></span>
                <span class="text-gray-500">جمع خرید: <b class="text-gray-800">${formatToman(m.ordersTotal)} تومان</b></span>
            </div>
        </div>`;
    }).join('');
}

// -----------------------------------------------------------------------------
// Excel export (no libraries). Builds a real SpreadsheetML 2003 workbook —
// Excel and LibreOffice open it directly, and it keeps Persian + digits intact.
// -----------------------------------------------------------------------------
function xlsxEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildWorkbookXML(sheets) {
    const sheetXml = sheets.map(sheet => {
        const rows = sheet.rows.map(row =>
            '<Row>' + row.map(cell => {
                const type = typeof cell === 'number' ? 'Number' : 'String';
                return `<Cell><Data ss:Type="${type}">${type === 'Number' ? cell : xlsxEscape(cell)}</Data></Cell>`;
            }).join('') + '</Row>'
        ).join('');
        return `<Worksheet ss:Name="${xlsxEscape(sheet.name)}"><Table>${rows}</Table></Worksheet>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="1"><Font ss:Bold="1"/><Interior ss:Color="#E2EFDA" ss:Pattern="Solid"/></Style></Styles>
${sheetXml}</Workbook>`;
}

function downloadFile(filename, content, mime) {
    const blob = new Blob(['\ufeff' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportDailyReport() {
    const day = document.getElementById('dailyDay')?.value;
    if (!day) {
        showNotification('تاریخ را انتخاب کنید.', 'error');
        return;
    }
    const faDay = new Date(day + 'T00:00:00').toLocaleDateString('fa-IR');
    const jenDay = new Date(day + 'T00:00:00').toLocaleDateString('en-CA');
    const orders = MockDB.orders.filter(o => {
        if (o.paidAtISO) return o.paidAtISO.slice(0, 10) === day;
        const at = o.paidAt || o.events?.find(e => e.type === 'ORDER_PAID')?.at || o.createdAt || '';
        return String(at).includes(faDay);
    });
    const club = readCustomerClub();
    const sheets = [];
    const now = new Date().toLocaleString('fa-IR');

    // Sheet 1 — raw source (sales): who sold, what, where from, how much.
    sheets.push({
        name: 'خلاصه-فروش',
        rows: [
            [`گزارش فروش روز ${faDay}`, '', '', ''], [`صدور: ${now}`, '', '', ''],
            ['سفارش', 'مشتری', 'تامین‌کننده', 'مبلغ (تومان)']
        ].concat(orders.map(o => [
            o.orderNumber,
            (o.address?.recipient_name || o.address?.company || '—') + ' ' + (o.address?.mobile || ''),
            o.shippingQuote?.title || '—',
            o.grand_total || 0
        ])).concat([
            ['جمع کل', '', '', orders.reduce((s, o) => s + (o.grand_total || 0), 0)],
            ['تعداد سفارش', '', '', orders.length]
        ])
    });

    // Sheet 2 — order items.
    const itemRows = [['سفارش', 'کد', 'برند', 'تعداد', 'مبلغ واحد (تومان)', 'مبلغ کل (تومان)']];
    orders.forEach(o => (o.items || []).forEach(it => {
        const unit = moneyTomanFromUSD(it.priceUSD || 0);
        itemRows.push([o.orderNumber, it.code || it.id || '', it.brand || '', it.quantity || 1, unit, unit * (it.quantity || 1)]);
    }));
    sheets.push({ name: 'اقلام-فروش', rows: itemRows });

    // Sheet 3 — customer club ledger.
    sheets.push({
        name: 'باشگاه-مشتریان',
        rows: [
            ['باشگاه مشتریان برینگ آنلاین', '', '', '', ''], [`بروزرسانی: ${now}`, '', '', '', ''],
            ['موبایل', 'نام', 'شرکت', 'تعداد سفارش', 'جمع خرید (تومان)']
        ].concat(club.map(m => [m.mobile, m.name, m.company, m.orderCount, m.ordersTotal]))
    });

    downloadFile(`report-${jenDay}.xls`, buildWorkbookXML(sheets), 'application/vnd.ms-excel');
    showNotification('فایل اکسل گزارش روز ساخته شد.', 'success');
}

function exportCustomerClub() {
    const club = syncCustomerClub();
    if (!club.length) {
        showNotification('هنوز عضوی در باشگاه نیست.', 'info');
        return;
    }
    const now = new Date().toLocaleString('fa-IR');
    const sheets = [{
        name: 'باشگاه-مشتریان',
        rows: [
            ['باشگاه مشتریان برینگ آنلاین', '', '', '', '', ''],
            [`صدور: ${now}`, '', '', '', '', ''],
            ['موبایل', 'نام', 'شرکت', 'تعداد سفارش', 'جمع خرید (تومان)', 'سطح'],
            ...club.map(m => [m.mobile, m.name, m.company, m.orderCount, m.ordersTotal, clubTier(m.orderCount).label])
        ]
    }];
    downloadFile('customer-club.xls', buildWorkbookXML(sheets), 'application/vnd.ms-excel');
    showNotification('فایل اکسل باشگاه مشتریان ساخته شد.', 'success');
}
