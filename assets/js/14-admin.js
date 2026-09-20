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
}

function opsLog(action, detail = '') {
    MockDB.events.unshift({ at: new Date().toLocaleString('fa-IR'), role: AppState.staffRole, staff: AppState.staffName || '-', action, detail });
    persistState();
    renderOpsActivity();
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
    if (!document.querySelector('[data-ops-tab].ops-tab-active')) switchOpsTab('pricing');
    renderAdminLeads();
    renderOpsStock();
    renderOpsSuppliers();
    renderOpsRFQ();
    renderOpsOrders();
    renderOpsComplaints();
    renderOpsActivity();
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
    closeAdminPanel();
    showNotification(AppState.language === 'en' ? 'Settings saved successfully!' : 'تنظیمات با موفقیت ذخیره شد!', 'success');

    // Re-render current page to update prices
    renderSearchResults();
}

function supplierName(id) {
    if (!id || id === 'own') return 'انبار خودمان';
    const s = MockDB.suppliers.find(x => x.id === id);
    return s ? s.name : 'تامین‌کننده حذف‌شده';
}

function renderOpsStock() {
    const container = document.getElementById('ops-stock-list');
    if (!container) return;
    const q = normalizeSearchValue(document.getElementById('ops-stock-search')?.value || '');
    const editable = can('stock.write');
    const rows = ProductDatabase.filter(p => !q || normalizeSearchValue(`${p.brand} ${p.code} ${p.id}`).includes(q)).slice(0, 60);
    const suppliers = MockDB.suppliers.filter(s => s.type !== 'own');
    container.innerHTML = rows.map(p => {
        const src = p.stockSource || 'own';
        return `
        <div class="p-3 bg-white rounded-xl border border-gray-100 grid md:grid-cols-6 gap-3 items-center">
            <div class="md:col-span-2"><b>${p.brand} ${p.code}</b><div class="text-xs text-gray-400">قابل فروش: ${p.available_to_sell} | ${p.sell_mode === 'instant' ? 'خرید آنلاین' : 'استعلامی'}</div><div class="text-xs text-blue-600 mt-1">منبع: ${src === 'own' ? 'انبار خودمان' : supplierName(p.supplierId)}</div></div>
            <label class="text-xs text-gray-500">موجودی<input type="number" min="0" value="${p.stock_on_hand}" ${editable ? '' : 'disabled'} onchange="updateStock('${p.id}','stock_on_hand',this.value)" class="compact-input mt-1 ${editable ? '' : 'ops-locked'}"></label>
            <label class="text-xs text-gray-500">رزرو<input type="number" min="0" value="${p.stock_reserved}" ${editable ? '' : 'disabled'} onchange="updateStock('${p.id}','stock_reserved',this.value)" class="compact-input mt-1 ${editable ? '' : 'ops-locked'}"></label>
            <label class="text-xs text-gray-500">منبع تامین<select ${editable ? '' : 'disabled'} onchange="setProductSource('${p.id}',this.value)" class="compact-input mt-1 ${editable ? '' : 'ops-locked'}">
                <option value="own" ${src === 'own' ? 'selected' : ''}>انبار خودمان</option>
                ${suppliers.map(s => `<option value="${s.id}" ${p.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select></label>
            <div class="text-xs ${editable ? 'text-green-700' : 'text-gray-400'}">${editable ? 'قابل ویرایش' : 'فقط مدیر/انباردار'}</div>
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400">محصولی پیدا نشد.</p>';
}

function setProductSource(productId, value) {
    if (!can('stock.write')) { showNotification('این نقش اجازه تغییر منبع تامین را ندارد.', 'error'); renderOpsStock(); return; }
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    if (value === 'own') { product.stockSource = 'own'; product.supplierId = ''; }
    else { product.stockSource = 'supplier'; product.supplierId = value; }
    opsLog('stock.source', `${product.brand} ${product.code}: منبع=${supplierName(product.supplierId)}`);
    persistState();
    renderOpsStock();
    showNotification('منبع تامین ثبت شد.', 'success');
}

function renderOpsSuppliers() {
    const container = document.getElementById('ops-supplier-list');
    if (!container) return;
    const editable = can('suppliers.write');
    container.innerHTML = MockDB.suppliers.map(s => {
        const count = ProductDatabase.filter(p => p.supplierId === s.id).length;
        return `
        <div class="p-3 bg-white rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div><b>${s.name}</b> ${s.type === 'own' ? '<span class="text-xs text-green-700">(انبار خودمان)</span>' : '<span class="text-xs text-blue-600">(مغازه/تامین‌کننده)</span>'}<div class="text-xs text-gray-400 mt-1">${s.phone || '-'} | ${s.address || '-'}${s.note ? ' | ' + s.note : ''}</div><div class="text-xs text-gray-500 mt-1">${count} کالا از این منبع تامین می‌شود</div></div>
            ${s.type === 'own' || !editable ? `<span class="text-xs text-gray-400">${s.type === 'own' ? 'پیش‌فرض سیستم' : 'فقط مدیر/انباردار'}</span>` : `<button onclick="deleteSupplier('${s.id}')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold">حذف</button>`}
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400">تامین‌کننده‌ای ثبت نشده است.</p>';
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
    ProductDatabase.forEach(p => { if (p.supplierId === id) { p.stockSource = 'own'; p.supplierId = ''; } });
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
}

function renderOpsRFQ() {
    const container = document.getElementById('ops-rfq-list');
    if (!container) return;
    const editable = can('rfq.write');
    container.innerHTML = MockDB.rfqs.map(rfq => `
        <div class="p-4 bg-white rounded-xl border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div><b>${rfq.rfqNumber}</b><div class="text-xs text-gray-400">${rfq.items?.length || 0} قلم | وضعیت: ${rfq.status}</div></div>
                <select ${editable ? '' : 'disabled'} onchange="setRFQStatus('${rfq.rfqNumber}',this.value)" class="compact-input md:w-48 ${editable ? '' : 'ops-locked'}">
                    ${['waiting_sales','quoted','approved','rejected'].map(s => `<option value="${s}" ${rfq.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="grid md:grid-cols-3 gap-3 mt-3">
                <input ${editable ? '' : 'disabled'} value="${rfq.quotedPrice || ''}" oninput="setRFQField('${rfq.rfqNumber}','quotedPrice',this.value)" class="compact-input ${editable ? '' : 'ops-locked'}" placeholder="قیمت تاییدشده">
                <input ${editable ? '' : 'disabled'} value="${rfq.leadTime || ''}" oninput="setRFQField('${rfq.rfqNumber}','leadTime',this.value)" class="compact-input ${editable ? '' : 'ops-locked'}" placeholder="زمان تحویل">
                <div class="text-xs ${editable ? 'text-green-700' : 'text-gray-400'}">${editable ? 'قابل ویرایش' : 'فقط مدیر/مشاور استعلام'}</div>
            </div>
        </div>
    `).join('') || '<p class="text-sm text-gray-400">RFQ ثبت نشده است.</p>';
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
}

function setRFQField(rfqNumber, field, value) {
    if (!can('rfq.write')) return;
    const rfq = MockDB.rfqs.find(item => item.rfqNumber === rfqNumber);
    if (!rfq) return;
    rfq[field] = value;
    persistState();
}

function renderOpsOrders() {
    const container = document.getElementById('ops-orders-list');
    if (!container) return;
    const editable = AppState.staffRole === 'manager';
    const statusFa = { PAID: 'پرداخت شد', PACKED: 'بسته‌بندی شد', SHIPPED: 'ارسال شد', DELIVERED: 'تحویل شد', CANCELLED: 'لغو شد' };
    container.innerHTML = MockDB.orders.map(order => `
        <div class="p-4 bg-white rounded-xl border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <b>${order.orderNumber}</b>
                    <div class="text-xs text-gray-400 mt-1">${order.items?.length || 0} قلم | ${formatToman(order.grand_total)} تومان | ${order.address?.city || ''}</div>
                </div>
                <select ${editable ? '' : 'disabled'} onchange="setOrderStatus('${order.orderNumber}',this.value)" class="compact-input md:w-48 text-sm ${editable ? '' : 'ops-locked'}">
                    ${Object.keys(statusFa).map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${statusFa[s]}</option>`).join('')}
                </select>
            </div>
            <div class="text-xs text-gray-400 mt-2">پرداخت: ${order.payment_status} | ارسال: ${order.shipping_status}${editable ? '' : ' | فقط مدیر'}</div>
        </div>
    `).join('') || '<p class="text-sm text-gray-400">سفارشی ثبت نشده است.</p>';
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
    container.innerHTML = MockDB.events.map(event => `
        <div class="p-3 bg-white rounded-lg border border-gray-100">
            <b>${event.action}</b>
            <div class="text-xs text-gray-500">${event.staff} | ${event.role} | ${event.at}</div>
            ${event.detail ? `<div class="text-xs text-gray-400 mt-1">${event.detail}</div>` : ''}
        </div>
    `).join('') || '<p>فعالیتی ثبت نشده است.</p>';
}
