/* ===== 10-checkout-mock.js — بک‌اند شبیه‌سازی‌شده: سفارش، RFQ، پیش‌فاکتور، پرداخت ===== */
// =============================================
// MOCK CHECKOUT BACKEND SERVICES
// =============================================
const MockDB = { orders: [], rfqs: [], proformas: [], payments: [], events: [], shipments: [], suppliers: [], complaints: [], customProducts: [], deletedProducts: [] };

// Move a product's default/legacy single-supplier data onto supplierIds so the
// rest of the app only ever reads the canonical `supplierIds` list (a product
// can be supplied by several suppliers at once).
function supplierBookkeeping(p) {
    if (!p) return;
    if (!Array.isArray(p.supplierIds)) p.supplierIds = [];
    if (p.supplierId && !p.supplierIds.includes(p.supplierId)) p.supplierIds.unshift(p.supplierId);
    if (p.stockSource === 'supplier' && !p.supplierIds.length && p.supplierId) p.supplierIds.push(p.supplierId);
    if (p.stockSource === 'supplier' && !p.supplierIds.length) p.stockSource = 'own';
    if (p.stockSource === 'own' && p.supplierIds.length) delete p.stockSource;
}

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
}

function persistState() {
    saveJSON('prm_cart', AppState.cart);
    saveJSON('prm_compare', AppState.compareList);
    saveJSON('prm_wishlist', AppState.wishlist);
    saveJSON('prm_orders', MockDB.orders);
    saveJSON('prm_rfqs', MockDB.rfqs);
    saveJSON('prm_proformas', MockDB.proformas);
    saveJSON('prm_payments', MockDB.payments);
    saveJSON('prm_leads', AppState.leads);
    saveJSON('prm_events', MockDB.events);
    saveJSON('prm_suppliers', MockDB.suppliers);
    saveJSON('prm_complaints', MockDB.complaints);
    try {
        if (typeof CustomerAuth !== 'undefined' && CustomerAuth) {
            CustomerAuth.persist();
        }
    } catch (e) {}
    const productOverrides = {};
    ProductDatabase.forEach(p => {
        if (String(p.id || '').startsWith('CUSTOM-')) return;
        supplierBookkeeping(p);
        productOverrides[p.id] = { stock_on_hand: p.stock_on_hand, stock_reserved: p.stock_reserved, stockSource: p.stockSource || 'own', supplierId: p.supplierId || '', supplierIds: p.supplierIds || [], priceUSD: p.priceUSD, lead_time_days: p.lead_time_days };
    });
    saveJSON('prm_products', productOverrides);
    MockDB.customProducts.forEach(cp => {
        const live = ProductDatabase.find(p => p.id === cp.id);
        if (live) { cp.supplierIds = live.supplierIds || []; cp.supplierId = live.supplierId || ''; cp.stockSource = live.stockSource || 'own'; }
    });
    saveJSON('prm_custom_products', MockDB.customProducts);
    saveJSON('prm_deleted_products', MockDB.deletedProducts);
    saveJSON('prm_staff', { role: AppState.staffRole, name: AppState.staffName });
    saveJSON('prm_rates', { exchangeRate: AppState.exchangeRate, profitMargin: AppState.profitMargin });
}

function seedDefaultSuppliers() {
    if (!MockDB.suppliers.length) {
        MockDB.suppliers = [
            { id: 'SUP-OWN', name: 'انبار مرکزی برینگ آنلاین', type: 'own', phone: '021-88709158', address: 'تهران', note: 'موجودی خود انبار' },
            { id: 'SUP-ASKOUEI', name: 'آقای اسکوئی', type: 'shop', phone: '', address: 'بازار', note: 'موجودی مغازه؛ انباردار می‌تواند از ایشان تامین کند' }
        ];
    }
}

function applyProductOverrides() {
    const overrides = loadJSON('prm_products', {});
    // Drop catalogue products the manager deleted from the ops panel.
    for (let i = ProductDatabase.length - 1; i >= 0; i--) {
        if (MockDB.deletedProducts.includes(ProductDatabase[i].id)) ProductDatabase.splice(i, 1);
    }
    ProductDatabase.forEach(p => {
        const o = overrides[p.id];
        if (o) {
            if (typeof o.stock_on_hand === 'number') p.stock_on_hand = o.stock_on_hand;
            if (typeof o.stock_reserved === 'number') p.stock_reserved = o.stock_reserved;
            if (typeof o.priceUSD === 'number' && o.priceUSD >= 0) p.priceUSD = o.priceUSD;
            if (typeof o.lead_time_days === 'number' && o.lead_time_days >= 0) p.lead_time_days = o.lead_time_days;
            p.stockSource = o.stockSource || 'own';
            p.supplierId = o.supplierId || '';
            p.supplierIds = Array.isArray(o.supplierIds) ? o.supplierIds.slice() : [];
        } else if (!p.stockSource) {
            p.stockSource = 'own';
        }
        supplierBookkeeping(p);
        refreshProductAvailability(p);
    });
    // Merge products added from the ops panel.
    (MockDB.customProducts || []).forEach(p => {
        if (!ProductDatabase.some(x => x.id === p.id)) {
            if (typeof p.unit_price_toman !== 'number') p.unit_price_toman = moneyTomanFromUSD(p.priceUSD || 0);
            supplierBookkeeping(p);
            refreshProductAvailability(p);
            ProductDatabase.push(p);
        }
    });
}

function refreshProductAvailability(p) {
    p.stock = p.stock_on_hand;
    p.available_to_sell = Math.max(0, (p.stock_on_hand || 0) - (p.stock_reserved || 0));
    p.sell_mode = p.available_to_sell > 0 ? 'instant' : 'quote';
    // A zero-stock product that is on order must keep its 'on-order' badge
    // (with the lead-time text) instead of degrading to a generic inquiry.
    p.stockStatus = p.available_to_sell > 0 ? 'in-stock' : (p.stockStatus === 'on-order' ? 'on-order' : 'inquiry');
}

// Debounced persist for high-frequency writers (per-keystroke inputs): writing
// the whole state to localStorage on every keystroke janks typing.
let persistStateSoonTimer = 0;
function persistStateSoon(delay = 400) {
    clearTimeout(persistStateSoonTimer);
    persistStateSoonTimer = setTimeout(persistState, delay);
}

function hydrateState() {
    AppState.cart = loadJSON('prm_cart', []);
    AppState.compareList = loadJSON('prm_compare', []);
    AppState.wishlist = loadJSON('prm_wishlist', []);
    MockDB.orders = loadJSON('prm_orders', []);
    MockDB.rfqs = loadJSON('prm_rfqs', []);
    MockDB.proformas = loadJSON('prm_proformas', []);
    MockDB.payments = loadJSON('prm_payments', []);
    AppState.leads = loadJSON('prm_leads', []);
    MockDB.events = loadJSON('prm_events', []);
    MockDB.suppliers = loadJSON('prm_suppliers', []);
    MockDB.complaints = loadJSON('prm_complaints', []);
    MockDB.customProducts = loadJSON('prm_custom_products', []);
    MockDB.deletedProducts = loadJSON('prm_deleted_products', []);
    sanitizeStoredState();
    try {
        if (typeof CustomerAuth !== 'undefined' && CustomerAuth.hydrate) CustomerAuth.hydrate();
    } catch (e) {}
    seedDefaultSuppliers();
    applyProductOverrides();
    const staff = loadJSON('prm_staff', null);
    if (staff && STAFF_ROLES[staff.role]) {
        AppState.staffRole = staff.role;
        AppState.staffName = staff.name || '';
    }
    const rates = loadJSON('prm_rates', null);
    if (rates) {
        // Stored rates can be tampered with (or from an older schema); never
        // let a non-number slip in or every price on the site becomes NaN.
        const rate = Number(rates.exchangeRate);
        const margin = Number(rates.profitMargin);
        AppState.exchangeRate = Number.isFinite(rate) && rate > 0 ? rate : 52000;
        AppState.profitMargin = Number.isFinite(margin) && margin >= 0 ? margin : 25;
        ProductDatabase.forEach(product => {
            product.unit_price_toman = Math.round(product.priceUSD * AppState.exchangeRate * (1 + AppState.profitMargin / 100));
        });
    }
    updateCartCount();
    updateCompareCount();
    updateWishlistCount();
}

// localStorage is user-tamperable: coerce stored shapes back to what the
// renderers expect (numbers stay numbers, machine ids stay identifier-safe)
// so a hand-edited store can neither break math nor inject markup.
function sanitizeStoredState() {
    const cleanId = v => String(v == null ? '' : v).replace(/[^A-Za-z0-9\-.]/g, '').slice(0, 80);
    if (!Array.isArray(AppState.cart)) AppState.cart = [];
    AppState.cart = AppState.cart.filter(i => i && typeof i === 'object').map(i => ({
        id: cleanId(i.id),
        quantity: Math.max(1, Math.min(999, parseInt(i.quantity, 10) || 1)),
        supplier: String(i.supplier == null ? '' : i.supplier).slice(0, 120)
    })).filter(i => i.id);
    ['compareList', 'wishlist'].forEach(key => {
        if (!Array.isArray(AppState[key])) AppState[key] = [];
        AppState[key] = AppState[key].map(cleanId).filter(Boolean).slice(0, 50);
    });
    if (!Array.isArray(MockDB.orders)) MockDB.orders = [];
    MockDB.orders.forEach(o => {
        if (!o || typeof o !== 'object') return;
        o.orderNumber = cleanId(o.orderNumber);
        if (!Array.isArray(o.items)) o.items = [];
        o.items.forEach(it => { if (it && typeof it === 'object') it.quantity = Math.max(1, parseInt(it.quantity, 10) || 1); });
    });
    if (!Array.isArray(MockDB.rfqs)) MockDB.rfqs = [];
    MockDB.rfqs.forEach(r => { if (r && typeof r === 'object') r.rfqNumber = cleanId(r.rfqNumber); });
    if (!Array.isArray(MockDB.complaints)) MockDB.complaints = [];
    MockDB.complaints.forEach(c => { if (c && typeof c === 'object') c.id = cleanId(c.id); });
    if (!Array.isArray(AppState.leads)) AppState.leads = [];
    AppState.leads.forEach(l => {
        if (!l || typeof l !== 'object') return;
        l.id = cleanId(l.id);
        l.quantity = Math.max(1, parseInt(l.quantity, 10) || 1);
    });
}

function getCartProducts() {
    return AppState.cart.map(item => {
        const product = ProductDatabase.find(p => p.id === item.id);
        return product ? { ...product, quantity: item.quantity, supplier: item.supplier || (productSupplierNames(product) || [])[0] || 'انبار خودمان' } : null;
    }).filter(Boolean);
}

function splitCartBySellMode() {
    const items = getCartProducts();
    return {
        instant: items.filter(item => item.sell_mode === 'instant'),
        quote: items.filter(item => item.sell_mode !== 'instant')
    };
}

function moneyTomanFromUSD(priceUSD) {
    return Math.round(priceUSD * AppState.exchangeRate * (1 + AppState.profitMargin / 100));
}

function formatToman(amount) {
    return cachedNumberFormatter('fa-IR').format(Math.round(amount || 0));
}

function validateInstantStock(items) {
    const invalid = items.find(item => item.quantity > item.available_to_sell);
    if (invalid) return `${invalid.brand} ${invalid.code}: موجودی قابل فروش ${invalid.available_to_sell} عدد است.`;
    return '';
}

// مشتریِ واردشده: اطلاعات خریدار و آدرس پیش‌فرض خودکار پر می‌شود.
function applyCheckoutAutofill() {
    const holder = document.getElementById('checkout-autofill');
    if (holder) holder.innerHTML = '';
    const contact = typeof customerContact === 'function' ? customerContact() : null;
    if (!contact) {
        clearAutofilled(['co-name', 'co-mobile', 'co-company', 'co-email', 'co-postal', 'co-address']);
        return;
    }

    fillIfEmpty('co-name', contact.name);
    fillIfEmpty('co-mobile', contact.phone);
    fillIfEmpty('co-company', contact.company);
    fillIfEmpty('co-email', contact.email);

    const addr = contact.address;
    if (addr) {
        // استان/شهر پیش‌فرض «تهران» است؛ اگر آدرس ذخیره‌شده شهر دارد جایگزین می‌شود.
        const cityEl = document.getElementById('co-city');
        const provEl = document.getElementById('co-province');
        const parts = String(addr.city || '').split(/[\/،,-]/).map(x => x.trim()).filter(Boolean);
        if (parts.length && provEl) provEl.value = parts[0];
        if (cityEl) cityEl.value = parts[1] || parts[0] || cityEl.value;
        fillIfEmpty('co-address', addr.details);
        fillIfEmpty('co-postal', addr.postalCode);
        if (addr.recipient) { const n = document.getElementById('co-name'); if (n && !n.value.trim()) n.value = addr.recipient; }
    }

    markAutofilled(['co-name', 'co-mobile', 'co-company', 'co-email', 'co-province', 'co-city', 'co-postal', 'co-address']);

    if (holder) {
        const list = (CustomerAuth.customer?.addresses || []);
        const picker = list.length > 1
            ? `<div class="acct-autofill-addresses">${list.map(a => `<button type="button" class="acct-chip ${a.isDefault ? 'active' : ''}" onclick="useSavedAddress('${a.id}', this)">${escapeHTML(a.title)}${a.city ? ' — ' + escapeHTML(a.city) : ''}</button>`).join('')}</div>`
            : '';
        const extra = addr
            ? `آدرس «${escapeHTML(addr.title)}» انتخاب شد.`
            : 'برای دفعه بعد می‌توانید آدرس را در حساب خود ذخیره کنید.';
        holder.innerHTML = autofillNoticeHTML(contact, extra) + picker;
    }
}

// انتخاب یکی دیگر از آدرس‌های ذخیره‌شده در حساب
function useSavedAddress(addressId, btn) {
    const a = (CustomerAuth.customer?.addresses || []).find(x => x.id === addressId);
    if (!a) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
    const parts = String(a.city || '').split(/[\/،,-]/).map(x => x.trim()).filter(Boolean);
    if (parts.length) { set('co-province', parts[0]); set('co-city', parts[1] || parts[0]); }
    set('co-address', a.details || '');
    set('co-postal', a.postalCode || '');
    if (a.recipient) set('co-name', a.recipient);
    if (a.phone) set('co-mobile', a.phone);
    document.querySelectorAll('#checkout-autofill .acct-chip').forEach(b => b.classList.remove('active'));
    // The clicked chip is passed explicitly; the legacy global `event` is
    // unreliable (and undefined when called programmatically).
    if (btn && btn.classList) btn.classList.add('active');
    showNotification(`آدرس «${a.title}» اعمال شد.`, 'success');
}

function getCheckoutAddress() {
    return {
        recipient_name: document.getElementById('co-name')?.value.trim() || '',
        company: document.getElementById('co-company')?.value.trim() || '',
        mobile: document.getElementById('co-mobile')?.value.trim() || '',
        email: document.getElementById('co-email')?.value.trim() || '',
        province: document.getElementById('co-province')?.value.trim() || '',
        city: document.getElementById('co-city')?.value.trim() || '',
        full_address: document.getElementById('co-address')?.value.trim() || '',
        postal_code: document.getElementById('co-postal')?.value.trim() || '',
        plaque: document.getElementById('co-plaque')?.value.trim() || ''
    };
}

function validateAddress(address) {
    if (!address.recipient_name || !address.mobile || !address.province || !address.city || !address.full_address || !address.postal_code) {
        return 'نام، موبایل، استان، شهر، آدرس و کدپستی الزامی است.';
    }
    if (!/^09\d{9}$/.test(address.mobile)) return 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.';
    if (!/^\d{10}$/.test(address.postal_code)) return 'کدپستی باید ۱۰ رقم باشد.';
    return '';
}

function getShippingQuotes(cartItems, address, now = new Date()) {
    const realWeight = cartItems.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const volumetric = cartItems.reduce((sum, item) => sum + ((item.package_length_cm * item.package_width_cm * item.package_height_cm) / 5000) * item.quantity, 0);
    const chargeable = Math.max(realWeight, volumetric);
    const tehran = normalizeSearchValue(address.city).includes('tehran') || address.city.includes('تهران');
    const hour = now.getHours();
    const quotes = [];
    if (tehran && hour < 17) {
        quotes.push({ id: 'courier-' + Date.now(), method: 'courier', title: 'پیک تهران', price: Math.max(85000, 65000 + chargeable * 18000), eta: 'امروز تا پایان ساعت کاری', etaMin: 0, etaMax: 1, disabled: false, note: 'برآورد rule-based؛ پس از بسته‌بندی نهایی می‌شود.', expires: Date.now() + 10 * 60 * 1000, chargeable, source: 'rules' });
    } else {
        quotes.push({ id: 'courier-disabled', method: 'courier', title: 'پیک تهران', price: 0, eta: '-', disabled: true, reason: tehran ? 'بعد از ساعت مجاز ثبت پیک' : 'آدرس خارج از محدوده پیک تهران', note: 'در صورت نیاز درخواست هماهنگی ارسال ثبت کنید.', chargeable, source: 'rules' });
    }
    quotes.push({ id: 'tipax-' + Date.now(), method: 'tipax', title: 'تیپاکس', price: Math.max(120000, 95000 + chargeable * 32000), eta: tehran ? '۱ تا ۲ روز کاری' : '۲ تا ۴ روز کاری', etaMin: tehran ? 1 : 2, etaMax: tehran ? 2 : 4, disabled: false, note: 'برآورد بر اساس وزن واقعی/حجمی؛ رهگیری پس از تحویل به تیپاکس ثبت می‌شود.', expires: Date.now() + 10 * 60 * 1000, chargeable, source: 'rules' });
    return quotes;
}

function showCheckout() {
    // renderCheckout → showPage('checkout') already pushes the #/checkout hash;
    // calling updateHashRoute here would re-render the whole checkout twice.
    renderCheckout();
}

function renderCheckout() {
    const container = document.getElementById('checkout-content');
    // Rebuilding the form (e.g. after registering the quote-items RFQ) must
    // not wipe the address the buyer already typed.
    const typedAddress = (() => {
        try { return getCheckoutAddress(); } catch (e) { return null; }
    })();
    const hadTypedAddress = typedAddress && Object.values(typedAddress).some(v => v);
    selectedShippingQuote = null;
    const { instant, quote } = splitCartBySellMode();
    if (!AppState.cart.length) {
        container.innerHTML = `<div class="bg-white rounded-2xl p-10 text-center shadow-sm">سبد خرید خالی است.</div>`;
        showPage('checkout');
        return;
    }
    const instantSubtotal = instant.reduce((sum, item) => sum + moneyTomanFromUSD(item.priceUSD) * item.quantity, 0);
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <div class="checkout-step-card overflow-hidden">
                    <div class="p-5 border-b border-gray-100 flex items-center gap-3"><span class="step-dot">۱</span><h3 class="font-extrabold">سبد خرید</h3></div>
                    <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-3 text-right">کالا</th><th class="p-3">موجودی</th><th class="p-3">تعداد</th><th class="p-3">جمع</th></tr></thead><tbody>
                        ${getCartProducts().map(item => `<tr class="border-t"><td class="p-3"><b>${item.brand} ${item.code}</b><div class="text-gray-400">${item.sell_mode === 'instant' ? 'خرید آنلاین' : 'نیازمند استعلام'}${item.supplier ? ' · ' + escapeHTML(item.supplier) : ''}</div></td><td class="p-3">${getStockBadge(item)}</td><td class="p-3">${item.quantity}</td><td class="p-3 font-bold">${item.sell_mode === 'instant' ? formatToman(moneyTomanFromUSD(item.priceUSD) * item.quantity) + ' تومان' : 'RFQ'}</td></tr>`).join('')}
                    </tbody></table></div>
                </div>
                ${quote.length ? `<div class="bg-orange-50 border border-orange-100 rounded-2xl p-5"><b>RFQ جداگانه</b><p class="text-sm text-orange-800 mt-2">${quote.length} قلم استعلامی از پرداخت فوری جدا شد و به پیش‌فاکتور/تأیید فروش متصل می‌شود. برای این اقلام قیمت حدس زده نمی‌شود.</p><button onclick="createRFQFromQuoteItems()" class="mt-4 btn-accent text-white px-5 py-3 rounded-xl font-bold">ثبت RFQ اقلام استعلامی</button></div>` : ''}
                <div class="checkout-step-card p-5">
                    <div class="flex items-center gap-3 mb-5"><span class="step-dot">۲</span><h3 class="font-extrabold">اطلاعات خریدار و تحویل</h3></div>
                    <div id="checkout-autofill"></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input id="co-name" class="compact-input" placeholder="نام و نام خانوادگی">
                        <input id="co-company" class="compact-input" placeholder="نام شرکت (اختیاری)">
                        <input id="co-mobile" class="compact-input" placeholder="موبایل 0912...">
                        <input id="co-email" class="compact-input" placeholder="ایمیل">
                        <input id="co-province" class="compact-input" placeholder="استان" value="تهران">
                        <input id="co-city" class="compact-input" placeholder="شهر" value="تهران">
                        <input id="co-postal" class="compact-input" placeholder="کدپستی ۱۰ رقمی">
                        <input id="co-plaque" class="compact-input" placeholder="پلاک / واحد / طبقه">
                        <textarea id="co-address" class="compact-input md:col-span-2" rows="3" placeholder="آدرس کامل"></textarea>
                    </div>
                    <button onclick="refreshShippingQuotes()" class="mt-4 btn-primary text-white px-5 py-3 rounded-xl font-bold">محاسبه ارسال</button>
                </div>
                <div class="checkout-step-card p-5">
                    <div class="flex items-center gap-3 mb-5"><span class="step-dot">۳</span><h3 class="font-extrabold">ارسال و پرداخت</h3></div>
                    <div id="shipping-quotes" class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="text-gray-400">ابتدا آدرس را وارد کنید.</div></div>
                </div>
            </div>
            <aside class="checkout-summary lg:sticky lg:top-24 h-max bg-white rounded-2xl shadow-lg p-6">
                <h3 class="font-extrabold text-lg mb-5">خلاصه مالی</h3>
                <div class="space-y-3 text-sm"><div class="flex justify-between"><span>جمع اقلام</span><b>${formatToman(instantSubtotal)} تومان</b></div><div class="flex justify-between"><span>تخفیف</span><b>۰</b></div><div class="flex justify-between"><span>هزینه ارسال</span><b id="co-shipping-fee">پس از انتخاب</b></div><div class="flex justify-between"><span>مالیات/عوارض</span><b id="co-tax">${formatToman(instantSubtotal * 0.09)} تومان</b></div><hr><div class="flex justify-between text-lg"><span>مبلغ قابل پرداخت</span><b id="co-grand-total">${formatToman(instantSubtotal * 1.09)} تومان</b></div></div>
                <p class="desktop-only text-xs text-gray-400 mt-4">جمع اقلام − تخفیف + هزینه ارسال + مالیات/عوارض = مبلغ قابل پرداخت</p>
                <button onclick="createOrderAndPay()" class="w-full mt-5 btn-accent text-white py-4 rounded-xl font-extrabold ${instant.length ? '' : 'opacity-50'}" ${instant.length ? '' : 'disabled'}>تأیید و پرداخت آنلاین</button>
                <button onclick="downloadLatestProforma()" class="w-full mt-3 border border-gray-200 py-3 rounded-xl font-bold text-gray-700">دانلود پیش‌فاکتور</button>
            </aside>
        </div>`;
    if (hadTypedAddress) {
        const restore = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
        restore('co-name', typedAddress.recipient_name);
        restore('co-company', typedAddress.company);
        restore('co-mobile', typedAddress.mobile);
        restore('co-email', typedAddress.email);
        restore('co-province', typedAddress.province);
        restore('co-city', typedAddress.city);
        restore('co-address', typedAddress.full_address);
        restore('co-postal', typedAddress.postal_code);
        restore('co-plaque', typedAddress.plaque);
    }
    applyCheckoutAutofill();
    showPage('checkout');
}

let selectedShippingQuote = null;
function refreshShippingQuotes() {
    const address = getCheckoutAddress();
    const err = validateAddress(address);
    if (err) return showNotification(err, 'error');
    const { instant } = splitCartBySellMode();
    const stockErr = validateInstantStock(instant);
    if (stockErr) return showNotification(stockErr, 'error');
    const quotes = getShippingQuotes(instant, address);
    document.getElementById('shipping-quotes').innerHTML = quotes.map(q => `<button ${q.disabled ? 'disabled' : ''} onclick='selectShippingQuote(${JSON.stringify(q)})' class="text-right rounded-2xl border ${q.disabled ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-blue-100 hover:border-blue-500 bg-white'} p-4 transition"><div class="flex justify-between gap-3"><b>${q.title}</b>${!q.disabled ? '<span class="stock-badge on-order">برآورد</span>' : '<span class="stock-badge inquiry">غیرفعال</span>'}</div><div class="text-sm text-gray-500 mt-2">${q.disabled ? q.reason : formatToman(q.price) + ' تومان'}</div><div class="text-sm text-gray-500">${q.eta}</div><p class="text-xs text-gray-400 mt-2">${q.note}</p></button>`).join('');
}

function selectShippingQuote(q) {
    selectedShippingQuote = q;
    const { instant } = splitCartBySellMode();
    const subtotal = instant.reduce((sum, item) => sum + moneyTomanFromUSD(item.priceUSD) * item.quantity, 0);
    const tax = subtotal * 0.09;
    document.getElementById('co-shipping-fee').textContent = formatToman(q.price) + ' تومان';
    document.getElementById('co-grand-total').textContent = formatToman(subtotal + tax + q.price) + ' تومان';
    showNotification('روش ارسال انتخاب شد.', 'success');
}

function createRFQFromQuoteItems() {
    const { quote } = splitCartBySellMode();
    if (!quote.length) return;
    const rfq = { rfqNumber: 'RFQ-' + Date.now(), status: 'waiting_sales', items: quote, createdAt: new Date().toLocaleString('fa-IR') };
    MockDB.rfqs.unshift(rfq);
    AppState.cart = AppState.cart.filter(cartItem => !quote.some(item => item.id === cartItem.id));
    persistState();
    updateCartCount();
    renderCheckout();
    showNotification('RFQ اقلام استعلامی ثبت شد.', 'success');
}

function createOrderAndPay() {
    const address = getCheckoutAddress();
    const err = validateAddress(address);
    if (err) return showNotification(err, 'error');
    if (!selectedShippingQuote || selectedShippingQuote.disabled) return showNotification('روش ارسال را انتخاب کنید.', 'error');
    const { instant, quote } = splitCartBySellMode();
    const stockErr = validateInstantStock(instant);
    if (stockErr) return showNotification(stockErr, 'error');
    const subtotal = instant.reduce((sum, item) => sum + moneyTomanFromUSD(item.priceUSD) * item.quantity, 0);
    const tax = Math.round(subtotal * 0.09);
    const grand = Math.round(subtotal + tax + selectedShippingQuote.price);
    // Two rapid orders (double-click) must not share one number: 4 time digits
    // plus 2 random digits keep the PRM-YYYY-NNNNNN shape unique enough.
    const order = { orderNumber: 'PRM-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4) + Math.floor(Math.random() * 90 + 10), status: 'PAID', payment_status: 'paid', shipping_status: 'pending', address, items: instant, subtotal, tax, shipping_fee: Math.round(selectedShippingQuote.price), grand_total: grand, shippingQuote: selectedShippingQuote, paidAt: new Date().toLocaleString('fa-IR'), paidAtISO: new Date().toISOString(), events: [{ type: 'ORDER_PAID', actor: 'mock-gateway', at: new Date().toLocaleString('fa-IR') }] };
    // Where did today's sale physically come from? Snapshot each item's supplier
    // onto the order so the daily report can answer "we sold from where".
    order.suppliers = {};
    instant.forEach(it => {
        // The buyer's supplier choice from the cart wins; for legacy carts with
        // no supplier line we fall back to the product's canonical supplier list.
        order.suppliers[it.id] = it.supplier
            || (() => {
                const p = ProductDatabase.find(product => product.id === it.id);
                if (!p) return 'انبار خودمان';
                supplierBookkeeping(p);
                return p.stockSource === 'own' || !p.supplierIds.length
                    ? 'انبار خودمان'
                    : p.supplierIds.map(id => supplierName(id)).join('، ');
            })();
    });
    instant.forEach(item => { const p = ProductDatabase.find(product => product.id === item.id); if (p) { p.stock_reserved += item.quantity; refreshProductAvailability(p); } });
    MockDB.orders.unshift(order);
    MockDB.payments.unshift({ order_id: order.orderNumber, gateway: 'MockPaymentAdapter', amount: grand, status: 'paid', idempotency_key: order.orderNumber, verified_at: new Date().toISOString() });
    createProforma(order, 'issued');
    if (quote.length) {
        MockDB.rfqs.unshift({ rfqNumber: 'RFQ-' + Date.now(), status: 'waiting_sales', items: quote, linkedOrder: order.orderNumber, createdAt: new Date().toLocaleString('fa-IR') });
    }
    AppState.cart = AppState.cart.filter(cartItem => ![...instant, ...quote].some(item => item.id === cartItem.id));
    persistState();
    updateCartCount();
    showNotification('پرداخت mock با موفقیت verify شد.', 'success');
    renderCheckoutSuccess(order);
    // pushState (not location.hash) so the success view renders exactly once;
    // Back still works because popstate routes through routeFromHash.
    if (location.hash !== '#/checkout/success/' + order.orderNumber) {
        history.pushState(null, '', '#/checkout/success/' + order.orderNumber);
    }
}

function createProforma(order, status = 'draft') {
    const pf = { proforma_number: 'PF-1405-' + String(MockDB.proformas.length + 1).padStart(6, '0'), order_id: order.orderNumber, status, issued_at: new Date().toLocaleString('fa-IR'), valid_until: new Date(Date.now() + 3 * 86400000).toLocaleDateString('fa-IR'), snapshot_json: JSON.stringify(order) };
    MockDB.proformas.unshift(pf);
    return pf;
}

function getProformaByOrder(orderNumber) {
    // Never fall back to another order's proforma: showing/sending the wrong
    // invoice is worse than showing an explicit "not found" error.
    return MockDB.proformas.find(pf => pf.order_id === orderNumber);
}

function buildProformaHtml(order, pf) {
    const trackUrl = `${location.origin}${location.pathname}#/account/orders/${order.orderNumber}`;
    const boLogoAssets = document.getElementById('boLogoAssets')?.outerHTML || '';
    // Everything below is buyer- or staff-entered text rendered into a document
    // that gets downloaded and opened in a new window: escape it all.
    const addr = order.address || {};
    const rows = (order.items || []).map((item, i) => {
        const unit = moneyTomanFromUSD(item.priceUSD);
        const qty = Math.max(0, Number(item.quantity) || 0);
        return `<tr><td>${i + 1}</td><td><b>${escapeHTML(item.code)}</b><small>${escapeHTML(item.id || '')}</small></td><td>${escapeHTML(item.brand)}</td><td>${qty}</td><td>${formatToman(unit)}</td><td>۰</td><td>${formatToman(Math.round(unit * 0.09))}</td><td><b>${formatToman(unit * qty)}</b></td></tr>`;
    }).join('');
    return `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${pf.proforma_number}</title><style>
        @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#e5e7eb;font-family:Tahoma,Arial,sans-serif;color:#0f172a}.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;position:relative;overflow:hidden;padding:26px 30px}.topbar{height:10px;background:linear-gradient(90deg,#05173d,#1348c8,#e8a81d);margin:-26px -30px 24px}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.brand{display:flex;gap:14px;align-items:center}.logo{width:76px;height:76px;border:1px solid #e2e8f0;border-radius:18px;padding:8px;object-fit:contain}.print-logo{width:220px;max-width:100%;height:auto;padding:8px 10px;direction:ltr}.logo{direction:ltr}.seller h1{font-size:22px;margin:0 0 6px;color:#071426}.seller p,.muted{color:#64748b;font-size:12px;line-height:1.8;margin:0}.docbox{border:1px solid #dbeafe;background:#eff6ff;border-radius:18px;padding:14px 16px;min-width:210px}.docbox h2{margin:0 0 10px;font-size:24px;color:#1348c8}.badge{display:inline-block;border-radius:999px;padding:5px 10px;background:#dcfce7;color:#166534;font-weight:700;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}.panel{border:1px solid #e2e8f0;border-radius:18px;padding:15px;background:#fff}.panel h3{margin:0 0 10px;font-size:15px;color:#071426}.kv{display:grid;grid-template-columns:120px 1fr;gap:7px;font-size:12px;line-height:1.9}.table-wrap{margin-top:24px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#071b43;color:#fff;padding:11px 8px;text-align:right}td{padding:10px 8px;border-bottom:1px solid #edf2f7}td small{display:block;color:#94a3b8;margin-top:3px}.totals{width:310px;margin-right:auto;margin-top:20px;border:1px solid #e2e8f0;border-radius:18px;padding:14px}.line{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed #e2e8f0;font-size:13px}.line:last-child{border:0}.grand{font-size:18px;font-weight:900;color:#9d6506}.terms{margin-top:18px;background:#f8fafc;border-radius:18px;padding:14px;font-size:11px;color:#475569;line-height:2}.watermark{position:absolute;top:45%;right:8%;font-size:34px;font-weight:900;color:#0714260d;transform:rotate(-18deg);white-space:nowrap}.footer{position:absolute;bottom:18px;right:30px;left:30px;display:flex;justify-content:space-between;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:10px}.qr{width:86px;height:86px;border:1px solid #e2e8f0;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;color:#64748b;padding:8px}.actions{position:fixed;top:18px;left:18px;display:flex;gap:8px}.actions button{border:0;border-radius:12px;background:#0a5cc4;color:white;padding:10px 14px;font-weight:700}@media print{body{background:#fff}.page{margin:0;box-shadow:none}.actions{display:none}}
    </style></head><body><div class="actions"><button onclick="window.print()">چاپ / ذخیره PDF</button></div><main class="page"><div class="topbar"></div><div class="watermark">این سند پیش‌فاکتور است و فاکتور رسمی نهایی نیست</div><section class="header"><div class="brand"><img src="https://bearingonline.ir/images/thumbs/001/0015751_300x300.webp" alt="برینگ آنلاین" class="logo print-logo" onload="this.style.display='block'" onerror="this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.style.display='block';}"><svg class="logo print-logo" style="display:none" viewBox="0 0 360 116" role="img" aria-label="برینگ آنلاین">${boLogoAssets}<use href="#boLogoLockup"></use></svg><svg class="logo" viewBox="0 0 84 84" style="display:none" role="img" aria-label="برینگ آنلاین"><defs><linearGradient id="boBluePf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#163ca5"></stop><stop offset="1" stop-color="#2f6bff"></stop></linearGradient><linearGradient id="boGoldPf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"></stop><stop offset="0.55" stop-color="#e8a81d"></stop><stop offset="1" stop-color="#8a5a06"></stop></linearGradient><radialGradient id="boSteelPf" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"></stop><stop offset="0.55" stop-color="#c9d3e6"></stop><stop offset="1" stop-color="#7c8aa3"></stop></radialGradient></defs><path d="M10 58 A31 31 0 0 1 58 24" fill="none" stroke="url(#boBluePf)" stroke-width="7" stroke-linecap="round"></path><path d="M18 60 A25 25 0 0 1 60 38" fill="none" stroke="url(#boGoldPf)" stroke-width="5" stroke-linecap="round" opacity="0.9"></path><circle cx="42" cy="42" r="24" fill="url(#boSteelPf)"></circle><circle cx="42" cy="42" r="24" fill="none" stroke="#0a2358" stroke-width="2" opacity="0.28"></circle><circle cx="42" cy="42" r="16" fill="#071b43"></circle><circle cx="42" cy="42" r="16" fill="none" stroke="url(#boGoldPf)" stroke-width="2"></circle><g fill="url(#boGoldPf)" stroke="#6d4a05" stroke-width="0.6"><circle cx="53" cy="42" r="3.2"></circle><circle cx="49.8" cy="49.8" r="3.2"></circle><circle cx="42" cy="53" r="3.2"></circle><circle cx="34.2" cy="49.8" r="3.2"></circle><circle cx="31" cy="42" r="3.2"></circle><circle cx="34.2" cy="34.2" r="3.2"></circle><circle cx="42" cy="31" r="3.2"></circle><circle cx="49.8" cy="34.2" r="3.2"></circle></g><circle cx="42" cy="42" r="5.4" fill="#0b2560" stroke="#ffd166" stroke-width="1.6"></circle><path d="M30 31 A17 17 0 0 1 45 27" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.65"></path></svg>
<div class="seller"><h1>برینگ آنلاین | Bearing Online</h1><p>تامین تجهیزات و قطعات یدکی صنایع سنگین</p><p>021-88709158 | info@persiarobot.com</p><p>تهران، سعدی جنوبی، خیابان اکباتان، مرکز تجاری معصومی</p></div></div><div class="docbox"><h2>پیش‌فاکتور</h2><div class="badge">${pf.status === 'issued' ? 'صادر شده' : 'پیش‌نویس'}</div><div class="kv" style="margin-top:10px"><span>شماره:</span><b>${pf.proforma_number}</b><span>سفارش:</span><b>${escapeHTML(order.orderNumber)}</b><span>صدور:</span><b>${pf.issued_at}</b><span>اعتبار:</span><b>${pf.valid_until}</b></div></div></section><section class="grid"><div class="panel"><h3>مشخصات خریدار</h3><div class="kv"><span>نام:</span><b>${escapeHTML(addr.recipient_name) || '-'}</b><span>شرکت:</span><b>${escapeHTML(addr.company) || '-'}</b><span>موبایل:</span><b>${escapeHTML(addr.mobile) || '-'}</b><span>ایمیل:</span><b>${escapeHTML(addr.email) || '-'}</b></div></div><div class="panel"><h3>آدرس تحویل</h3><p class="muted">${escapeHTML(addr.province)}، ${escapeHTML(addr.city)}، ${escapeHTML(addr.full_address)}</p><p class="muted">کدپستی: ${escapeHTML(addr.postal_code) || '-'} | پلاک/واحد: ${escapeHTML(addr.plaque) || '-'}</p></div></section><section class="table-wrap"><table><thead><tr><th>ردیف</th><th>کد/SKU</th><th>برند</th><th>تعداد</th><th>قیمت واحد</th><th>تخفیف</th><th>مالیات</th><th>مبلغ</th></tr></thead><tbody>${rows}</tbody></table></section><section class="grid"><div class="panel"><h3>ارسال</h3><div class="kv"><span>روش:</span><b>${escapeHTML(order.shippingQuote.title)}</b><span>هزینه:</span><b>${formatToman(order.shipping_fee)} تومان</b><span>بازه تحویل:</span><b>${escapeHTML(order.shippingQuote.eta)}</b><span>منبع نرخ:</span><b>${order.shippingQuote.source === 'rules' ? 'برآورد rule-based' : escapeHTML(order.shippingQuote.source)}</b></div></div><div class="panel"><h3>پیگیری</h3><div class="qr" style="text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=8&color=0b2560&data=${encodeURIComponent(trackUrl)}" alt="QR پیگیری سفارش ${escapeHTML(order.orderNumber)}" style="width:150px;height:150px;border:1px solid #dbeafe;border-radius:12px;padding:6px;background:#fff" onerror="this.style.display='none'"><div style="font-size:11px;font-weight:800;color:#0b2560;margin-top:6px">با دوربین گوشی اسکن کنید</div><div style="font-size:10px;color:#94a3b8;word-break:break-all;margin-top:2px" dir="ltr">${escapeHTML(trackUrl)}</div><div style="font-size:11px;color:#475569;margin-top:4px">کد پیگیری: <b>${escapeHTML(order.orderNumber)}</b></div></div></div></section><section class="panel" style="margin-top:14px"><h3>تعهدنامه مرجوعی کالا</h3><div style="font-size:12px;line-height:2.1;color:#334155">برینگ آنلاین در موارد زیر کالا را پس می‌گیرد:<br>۱. <b>مغایرت کالا:</b> اگر کد، برند یا مشخصات کالای ارسالی با پیش‌فاکتور یکی نباشد.<br>۲. <b>خرابی یا ایراد:</b> کالای دارای ایراد فنی یا ظاهری، پس از تایید کارشناسی، تعویض یا عودت وجه می‌شود.<br>۳. <b>آسیب حین حمل:</b> با صورت‌جلسه مامور حمل و عکس بسته‌بندی، کالا جایگزین می‌شود.<br>مهلت اعلام مرجوعی <b>۴۸ ساعت پس از تحویل</b> است؛ کالا نباید نصب یا مصرف شده باشد و بسته‌بندی آن حفظ شود. پس از تایید، تعویض یا عودت مبلغ حداکثر ظرف <b>۷ روز کاری</b> انجام می‌شود. کالای سفارشی و RFQ خاص، به‌جز مغایرت یا خرابی، مرجوع نمی‌شود.</div></section><section class="totals"><div class="line"><span>جمع اقلام</span><b>${formatToman(order.subtotal)} تومان</b></div><div class="line"><span>تخفیف</span><b>۰ تومان</b></div><div class="line"><span>هزینه ارسال</span><b>${formatToman(order.shipping_fee)} تومان</b></div><div class="line"><span>مالیات/عوارض</span><b>${formatToman(order.tax)} تومان</b></div><div class="line grand"><span>مبلغ نهایی</span><b>${formatToman(order.grand_total)} تومان</b></div></section><section class="terms"><b>شرایط:</b> اعتبار قیمت و موجودی تا تاریخ درج‌شده است. زمان حمل تخمینی است و پس از تحویل به حمل‌کننده، کد رهگیری ثبت می‌شود. تغییرات بعدی قیمت محصولات روی این پیش‌فاکتور اثر ندارد.</section><footer class="footer"><span>Persia Robot Machine - PRM</span><span>${pf.proforma_number}</span></footer></main></body></html>`;
}

function downloadProforma(orderNumber) {
    const pf = getProformaByOrder(orderNumber);
    if (!pf) return showNotification('برای این سفارش پیش‌فاکتور ثبت نشده است.', 'error');
    let order;
    try {
        order = JSON.parse(pf.snapshot_json);
    } catch (e) {
        return showNotification('پیش‌فاکتور ذخیره‌شده خراب است و قابل دانلود نیست.', 'error');
    }
    if (!order || !order.orderNumber) return showNotification('پیش‌فاکتور ذخیره‌شده خراب است و قابل دانلود نیست.', 'error');
    const html = buildProformaHtml(order, pf);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pf.proforma_number}-print-ready.html`;
    a.click();
    URL.revokeObjectURL(url);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}

function downloadLatestProforma() {
    const pf = MockDB.proformas[0];
    if (!pf) return showNotification('ابتدا سفارش یا پیش‌فاکتور بسازید.', 'error');
    downloadProforma(pf.order_id);
}

function renderCheckoutSuccess(order) {
    document.getElementById('checkout-content').innerHTML = `<div class="bg-white rounded-2xl shadow-lg p-10 text-center"><i class="fas fa-circle-check text-6xl text-green-600 mb-5"></i><h3 class="text-3xl font-extrabold mb-3">سفارش پرداخت شد</h3><p class="text-gray-500">شماره سفارش: <b>${escapeHTML(order.orderNumber)}</b></p><p class="text-gray-500 mt-2">ارسال: ${escapeHTML(order.shippingQuote.title)} | ${escapeHTML(order.shippingQuote.eta)}</p><div class="flex flex-col md:flex-row justify-center gap-3 mt-8"><button onclick="downloadLatestProforma()" class="btn-primary text-white px-6 py-3 rounded-xl font-bold">دانلود پیش‌فاکتور</button><button onclick="showAccount()" class="btn-accent text-white px-6 py-3 rounded-xl font-bold">پیگیری سفارش</button></div></div>`;
    showPage('checkout');
}



function complaintStatusFa(s) {
    return { new: 'جدید', 'in-review': 'در حال بررسی', resolved: 'حل شد', rejected: 'رد شد' }[s] || s;
}

function submitComplaint(event) {
    event.preventDefault();
    const message = document.getElementById('cmp-message')?.value.trim() || '';
    if (!message) { showNotification('متن شکایت را بنویسید.', 'error'); return; }
    MockDB.complaints.unshift({
        id: 'CMP-' + Date.now(),
        orderNumber: document.getElementById('cmp-order')?.value || '',
        name: document.getElementById('cmp-name')?.value.trim() || '',
        phone: document.getElementById('cmp-phone')?.value.trim() || '',
        subject: document.getElementById('cmp-subject')?.value || 'مغایرت کالا',
        message,
        status: 'new',
        createdAt: new Date().toLocaleString('fa-IR')
    });
    opsLog('complaint.new', document.getElementById('cmp-subject')?.value || '');
    persistState();
    renderAccountComplaints();
    renderOpsComplaints();
    showNotification('شکایت شما ثبت شد و پیگیری می‌شود.', 'success');
}

function setComplaintStatus(id, status) {
    if (!can('complaints.write')) { showNotification('این نقش اجازه تغییر وضعیت شکایت را ندارد.', 'error'); renderOpsComplaints(); return; }
    const c = MockDB.complaints.find(x => x.id === id);
    if (!c) return;
    c.status = status;
    opsLog('complaint.status', `${id}: ${status}`);
    persistState();
    renderOpsComplaints();
    renderAccountComplaints();
}

function setComplaintReply(id, value) {
    if (!can('complaints.write')) { showNotification('این نقش اجازه ثبت پاسخ شکایت را ندارد.', 'error'); renderOpsComplaints(); return; }
    const c = MockDB.complaints.find(x => x.id === id);
    if (!c) return;
    c.opsReply = value.trim();
    opsLog('complaint.reply', `${id}`);
    persistState();
    showNotification('پاسخ داخلی شکایت ذخیره شد.', 'success');
}

function deleteComplaint(id) {
    if (!can('complaints.write')) { showNotification('این نقش اجازه حذف شکایت را ندارد.', 'error'); return; }
    MockDB.complaints = MockDB.complaints.filter(x => x.id !== id);
    opsLog('complaint.delete', id);
    persistState();
    renderOpsComplaints();
    renderAccountComplaints();
    updateOpsBadges();
    showNotification('شکایت حذف شد.', 'success');
}

function renderOpsComplaints() {
    const container = document.getElementById('ops-complaint-list');
    const count = document.getElementById('admin-complaint-count');
    if (count) count.textContent = MockDB.complaints.length;
    if (!container) return;
    const st = container.scrollTop;
    const editable = can('complaints.write');
    container.innerHTML = MockDB.complaints.map(c => `
        <div class="p-3 bg-white rounded-xl border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div class="font-bold text-gray-800">${escapeHTML(c.subject)} <span class="text-xs text-gray-400">${escapeHTML(c.id)}${c.orderNumber ? ' | سفارش ' + escapeHTML(c.orderNumber) : ''}</span></div>
                <div class="flex gap-2">
                    <select ${editable ? '' : 'disabled'} onchange="setComplaintStatus('${c.id}',this.value)" class="compact-input md:w-40 text-sm ${editable ? '' : 'ops-locked'}">
                        ${['new','in-review','resolved','rejected'].map(s => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${complaintStatusFa(s)}</option>`).join('')}
                    </select>
                    ${editable ? `<button onclick="deleteComplaint('${c.id}')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold" title="حذف شکایت"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">${escapeHTML(c.name)} | <span dir="ltr">${escapeHTML(c.phone)}</span> | ${escapeHTML(c.createdAt)}</div>
            <div class="text-xs text-gray-600 mt-1">${escapeHTML(c.message)}</div>
            <label class="block text-xs text-gray-500 mt-2">پاسخ / یادداشت داخلی
                <textarea ${editable ? '' : 'disabled'} onchange="setComplaintReply('${c.id}',this.value)" rows="2" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}" placeholder="نتیجه بررسی، تصمیم و اقدام انجام‌شده...">${escapeHTML(c.opsReply || '')}</textarea>
            </label>
            ${editable ? '' : '<div class="text-xs text-gray-400 mt-1">فقط مدیر/مشاور فنی</div>'}
        </div>`).join('') || '<p>هنوز شکایتی ثبت نشده است.</p>';
    container.scrollTop = st;
}

function renderAccountComplaints() {
    const content = document.getElementById('account-content');
    if (!content) return;
    const ordersPanel = document.getElementById('account-orders-panel');
    const container = ordersPanel || content;
    document.getElementById('account-complaints')?.remove();
    const orders = MockDB.orders.map(o => `<option value="${o.orderNumber}">${o.orderNumber}</option>`).join('');
    // کاربر واردشده نام و موبایل را دوباره وارد نمی‌کند
    const cmpContact = typeof customerContact === 'function' ? customerContact() : null;
    const div = document.createElement('div');
    div.id = 'account-complaints';
    div.className = ordersPanel ? 'grid gap-4 mt-8' : 'grid gap-4 mt-8';
    const acctWrapper = ordersPanel ? '' : '';
    div.innerHTML = `
        <div class="${ordersPanel ? 'acct-panel' : 'bg-white rounded-2xl p-5 shadow-sm border border-gray-100'}">
            <h3 class="font-extrabold text-xl ${ordersPanel ? 'acct-panel-title' : 'mb-4'}">${ordersPanel ? '<i class="fas fa-triangle-exclamation"></i>' : ''}ثبت و پیگیری شکایت</h3>
            ${cmpContact ? `<div class="md:col-span-2">${autofillNoticeHTML(cmpContact, 'پاسخ پشتیبانی به همین شماره اطلاع داده می‌شود.').replace('<button type="button" class="acct-autofill-edit" onclick="unlockAutofill(this)">ویرایش</button>', '')}</div>` : ''}
            <form id="complaint-form" onsubmit="submitComplaint(event)" class="grid md:grid-cols-2 gap-3 ${ordersPanel ? '' : 'mt-4'}">
                <select id="cmp-order" class="compact-input ${ordersPanel ? 'acct-input' : ''}"><option value="">بدون شماره سفارش</option>${orders}</select>
                <select id="cmp-subject" class="compact-input ${ordersPanel ? 'acct-input' : ''}"><option>مغایرت کالا</option><option>خرابی / ایراد فنی</option><option>آسیب حین حمل</option><option>تاخیر در تحویل</option><option>سایر</option></select>
                ${cmpContact
                    ? `<input type="hidden" id="cmp-name" value="${escapeHTML(cmpContact.name)}"><input type="hidden" id="cmp-phone" value="${escapeHTML(cmpContact.phone)}">`
                    : `<input id="cmp-name" class="compact-input ${ordersPanel ? 'acct-input' : ''}" placeholder="نام شما">
                       <input id="cmp-phone" class="compact-input ${ordersPanel ? 'acct-input' : ''}" dir="ltr" placeholder="موبایل">`}
                <textarea id="cmp-message" class="compact-input ${ordersPanel ? 'acct-input' : ''} md:col-span-2" rows="3" placeholder="شرح شکایت..."></textarea>
                <button class="${ordersPanel ? 'acct-btn-primary' : 'btn-accent text-white px-5 py-3 rounded-xl font-bold'} md:col-span-2">${ordersPanel ? '<i class=\"fas fa-paper-plane\"></i>ثبت شکایت' : 'ثبت شکایت'}</button>
            </form>
        </div>
        <div class="grid gap-3">${MockDB.complaints.map(c => `
            <div class="${ordersPanel ? 'acct-panel !p-4' : 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100'} flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div><b>${escapeHTML(c.subject)}</b><div class="text-xs text-gray-400 mt-1">${escapeHTML(c.id)}${c.orderNumber ? ' | سفارش ' + escapeHTML(c.orderNumber) : ''} | ${escapeHTML(c.createdAt)}</div><div class="text-xs text-gray-600 mt-1">${escapeHTML(c.message)}</div>${c.opsReply ? `<div class="text-xs text-green-700 mt-1">پاسخ پشتیبانی: ${escapeHTML(c.opsReply)}</div>` : ''}</div>
                <span class="stock-badge ${c.status === 'resolved' ? 'in-stock' : c.status === 'new' ? 'inquiry' : 'on-order'}">${complaintStatusFa(c.status)}</span>
            </div>`).join('') || `<div class="${ordersPanel ? 'acct-panel text-center text-gray-400 text-sm' : 'bg-white rounded-2xl p-6 text-center text-gray-400 text-sm'}">شکایتی ثبت نشده است.</div>`}
        </div>`;
    container.appendChild(div);
}

function copyTracking(orderNumber) {
    const url = `${location.origin}${location.pathname}#/account/orders/${orderNumber}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
    }
    showNotification('لینک پیگیری کپی شد.', 'success');
}

function requestQuote(productId) {
    const product = ProductDatabase.find(p => p.id === productId);
    openLeadModal('product-quote', product ? `${product.brand} ${product.code}` : '');
}
