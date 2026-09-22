/* ===== 19-account-dashboard.js — داشبورد حساب کاربری: پیش‌خوان، سفارش‌ها، نشان‌شده‌ها، آدرس‌ها، پروفایل ===== */
// =============================================
// CUSTOMER DASHBOARD
// =============================================

// وضعیت محلی داشبورد (فیلتر و جست‌وجوی سفارش‌ها) — ذخیره نمی‌شود، فقط در همین نشست
const AccountUI = { orderFilter: 'all', orderQuery: '' };

// نگاشت وضعیت سفارش به برچسب فارسی و آیکن، برای خط زمانی پیگیری
const ORDER_STEPS = [
    { key: 'PAID', label: 'پرداخت شد', icon: 'fa-credit-card' },
    { key: 'PICKING', label: 'جمع‌آوری کالا', icon: 'fa-boxes-packing' },
    { key: 'QC_PASSED', label: 'کنترل کیفیت', icon: 'fa-clipboard-check' },
    { key: 'PACKED', label: 'بسته‌بندی', icon: 'fa-box' },
    { key: 'HANDED_TO_CARRIER', label: 'تحویل به باربری', icon: 'fa-dolly' },
    { key: 'SHIPPED', label: 'در مسیر', icon: 'fa-truck-fast' },
    { key: 'DELIVERED', label: 'تحویل شد', icon: 'fa-circle-check' }
];

function accountTabs(activeTab) {
    const c = CustomerAuth.customer || { addresses: [] };
    return [
        { key: 'overview', icon: 'fa-gauge-high', label: 'پیش‌خوان', count: null },
        { key: 'orders', icon: 'fa-box-open', label: 'سفارش‌ها و پیگیری', count: MockDB.orders.length + MockDB.rfqs.length },
        { key: 'saved', icon: 'fa-heart', label: 'محصولات نشان‌شده', count: AppState.wishlist.length },
        { key: 'addresses', icon: 'fa-location-dot', label: 'آدرس‌های تحویل', count: (c.addresses || []).length },
        { key: 'profile', icon: 'fa-id-card', label: 'پروفایل و امنیت', count: null },
        { key: 'logout', icon: 'fa-arrow-right-from-bracket', label: 'خروج از حساب', count: null }
    ].map(t => t.key === 'logout'
        ? `<button class="acct-tab acct-tab-logout" onclick="logoutCustomer()"><i class="fas ${t.icon}"></i><span>${t.label}</span></button>`
        : `<button class="acct-tab ${t.key === activeTab ? 'active' : ''}" onclick="switchAccountTab('${t.key}')"><i class="fas ${t.icon}"></i><span>${t.label}</span>${t.count !== null ? `<span class="count-chip">${formatNumber(t.count)}</span>` : ''}</button>`
    ).join('');
}

// سلام متناسب با ساعت روز — حس زنده‌بودن داشبورد
function accountGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'شب‌تان بخیر';
    if (h < 12) return 'صبح‌تان بخیر';
    if (h < 17) return 'وقت‌تان بخیر';
    return 'عصرتان بخیر';
}

// مجموع خرید و سطح باشگاه مشتریان بر اساس سفارش‌های ثبت‌شده
function accountSpendSummary() {
    const total = MockDB.orders.reduce((s, o) => s + (o.grand_total || 0), 0);
    const count = MockDB.orders.length;
    const tier = typeof clubTier === 'function' ? clubTier(count) : { label: 'برنزی', color: '#b45309' };
    const next = [3, 8, 20].find(n => n > count);
    return { total, count, tier, next, toNext: next ? next - count : 0 };
}

function renderAccountDashboard(tab, highlightOrder = '') {
    const container = document.getElementById('account-content');
    const c = CustomerAuth.customer;
    if (!container || !c) return;
    const phone = CustomerAuth.session;
    const joined = new Date(c.joinedAt || Date.now()).toLocaleDateString('fa-IR');
    const firstName = (c.name || '').split(/\s+/)[0] || 'کاربر';
    const sum = accountSpendSummary();

    container.innerHTML = `
    <div class="acct-wrap py-8 md:py-12">
        <div class="max-w-7xl mx-auto px-4">
            <div class="acct-banner mb-6 acct-rise">
                <div class="acct-banner-dots"></div>
                <div class="acct-banner-ring"></div>
                <div class="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-7">
                    <div class="acct-avatar">${c.name ? escapeHTML(getInitials(c.name)) : '<i class="fas fa-user"></i>'}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <span class="acct-tier-chip"><i class="fas fa-medal"></i>مشتری ${escapeHTML(sum.tier.label)}</span>
                            <span class="acct-badge-soft"><i class="fas fa-circle-check"></i>شماره تأیید شده</span>
                            <span class="acct-badge-soft"><i class="fas fa-calendar-days"></i>عضویت: ${joined}</span>
                        </div>
                        <p class="text-white/65 text-xs font-bold mb-1">${accountGreeting()} 👋</p>
                        <h2 class="text-2xl md:text-3xl font-black">${escapeHTML(c.name || 'کاربر مهم')}</h2>
                        <p class="text-white/70 text-sm mt-1.5">شماره حساب: <b dir="ltr" class="text-white/90">${maskPhone(phone)}</b>${c.company ? ` | ${escapeHTML(c.company)}` : ''}</p>
                        ${sum.next ? `<p class="text-white/60 text-[11.5px] mt-2"><i class="fas fa-arrow-trend-up ml-1"></i>با ${formatNumber(sum.toNext)} سفارش دیگر به سطح بعدی باشگاه مشتریان می‌رسید.</p>` : ''}
                    </div>
                    <div class="acct-banner-actions">
                        <button onclick="switchAccountTab('orders')" class="acct-btn-ghost !bg-white/10 !border-white/30 !text-white hover:!bg-white/20"><i class="fas fa-truck-fast"></i>پیگیری سفارش</button>
                        <button onclick="showPage('search')" class="acct-btn-ghost !bg-white/10 !border-white/30 !text-white hover:!bg-white/20"><i class="fas fa-magnifying-glass"></i>جست‌وجوی کالا</button>
                        <button onclick="logoutCustomer()" class="acct-btn-ghost !bg-transparent !border-white/25 !text-white/85 hover:!bg-white/10"><i class="fas fa-arrow-right-from-bracket"></i>خروج</button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5 mb-6">
                <button type="button" onclick="switchAccountTab('orders')" class="acct-stat acct-rise acct-d1" style="color:#2f6bff"><i style="background:#eef2ff;color:#2f6bff;"><span class="fas fa-box-open"></span></i><b class="text-2xl text-gray-900">${formatNumber(MockDB.orders.length)}</b><span class="text-xs text-gray-400 font-bold">سفارش پرداخت‌شده</span></button>
                <button type="button" onclick="switchAccountTab('orders')" class="acct-stat acct-rise acct-d2" style="color:#e8a81d"><i style="background:#fff7e8;color:#e8a81d;"><span class="fas fa-wallet"></span></i><b class="text-xl md:text-2xl text-gray-900 truncate">${formatToman(sum.total)}</b><span class="text-xs text-gray-400 font-bold">مجموع خرید (تومان)</span></button>
                <button type="button" onclick="switchAccountTab('orders')" class="acct-stat acct-rise acct-d3" style="color:#f43f5e"><i style="background:#fff1f2;color:#f43f5e;"><span class="fas fa-file-circle-question"></span></i><b class="text-2xl text-gray-900">${formatNumber(MockDB.rfqs.length)}</b><span class="text-xs text-gray-400 font-bold">استعلام RFQ</span></button>
                <button type="button" onclick="switchAccountTab('saved')" class="acct-stat acct-rise acct-d4" style="color:#16a34a"><i style="background:#ecfdf5;color:#16a34a;"><span class="fas fa-heart"></span></i><b class="text-2xl text-gray-900">${formatNumber(AppState.wishlist.length)}</b><span class="text-xs text-gray-400 font-bold">محصول نشان‌شده</span></button>
            </div>

            <div class="grid lg:grid-cols-[250px_1fr] gap-6 items-start">
                <div class="acct-tabs">${accountTabs(tab)}</div>
                <div class="min-w-0 acct-rise acct-d2">${accountPanelHTML(tab, highlightOrder)}</div>
            </div>
        </div>
    </div>`;

    if (tab === 'orders') {
        renderAccountComplaints();
        if (highlightOrder) {
            setTimeout(() => {
                const el = document.querySelector(`[data-order="${highlightOrder}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
        }
    }
    if (tab === 'overview') initProfileProgress();
}

function accountPanelHTML(tab, highlightOrder) {
    if (tab === 'orders') return accountOrdersHTML(highlightOrder);
    if (tab === 'saved') return accountSavedHTML();
    if (tab === 'addresses') return accountAddressesHTML();
    if (tab === 'profile') return accountProfileHTML();
    return accountOverviewHTML();
}

// ---------- پیش‌خوان ----------
function profileCompleteness() {
    const c = CustomerAuth.customer || {};
    const checks = [!!c.name, !!c.email, !!c.company, (c.addresses || []).length > 0];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
}

function initProfileProgress() {
    const fill = document.getElementById('acct-profile-progress');
    const label = document.getElementById('acct-profile-progress-label');
    const pct = profileCompleteness();
    // از صفر شروع می‌کنیم تا انیمیشن پرشدن دیده شود
    if (fill) { fill.style.width = '0%'; setTimeout(() => { fill.style.width = pct + '%'; }, 60); }
    if (label) label.textContent = '٪' + formatNumber(pct);
}

// آخرین رویدادهای حساب: سفارش‌ها، استعلام‌ها و شکایت‌ها روی یک خط زمانی
function accountActivityHTML() {
    const items = [];
    MockDB.orders.slice(-4).reverse().forEach(o => items.push({
        title: `سفارش ${o.orderNumber} ثبت و پرداخت شد`,
        meta: `${formatToman(o.grand_total)} تومان | ${o.shippingQuote?.title || 'ارسال'}`,
        muted: false
    }));
    MockDB.rfqs.slice(-2).reverse().forEach(r => items.push({
        title: `استعلام ${r.rfqNumber} در انتظار پاسخ فروش`,
        meta: `${formatNumber(r.items.length)} قلم استعلامی`,
        muted: true
    }));
    (MockDB.complaints || []).slice(0, 2).forEach(cm => items.push({
        title: `شکایت «${cm.subject}» ثبت شد`,
        meta: cm.opsReply ? 'پاسخ پشتیبانی ثبت شده است' : 'در انتظار بررسی پشتیبانی',
        muted: !!cm.opsReply
    }));

    if (!items.length) {
        return `<div class="acct-empty"><i class="fas fa-clock-rotate-left big"></i><b>هنوز فعالیتی ثبت نشده است</b><p>اولین سفارش یا استعلام شما همین‌جا نمایش داده می‌شود.</p></div>`;
    }
    return `<ul class="acct-timeline">${items.slice(0, 6).map(i => `
        <li class="${i.muted ? 'is-muted' : ''}">
            <b>${escapeHTML(i.title)}</b>
            <span>${escapeHTML(i.meta)}</span>
        </li>`).join('')}</ul>`;
}

function accountOverviewHTML() {
    const c = CustomerAuth.customer || {};
    const lastOrder = MockDB.orders[MockDB.orders.length - 1];
    const pct = profileCompleteness();
    const checks = [
        { ok: !!c.name, label: 'نام و نام خانوادگی' },
        { ok: !!c.email, label: 'ایمیل برای ارسال فاکتور' },
        { ok: !!c.company, label: 'نام شرکت / مجموعه' },
        { ok: (c.addresses || []).length > 0, label: 'حداقل یک آدرس تحویل' }
    ];
    return `
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-gauge-high"></i>پیش‌خوان حساب</div>
        <p class="text-sm leading-7 text-gray-500">از این‌جا سفارش‌ها را پیگیری کنید، آدرس‌های تحویل را مدیریت کنید و اطلاعات پروفایل خود را کامل نگه دارید تا صدور فاکتور سریع‌تر انجام شود.</p>
        <div class="mt-5 bg-[#f8faff] border border-[#e6ebf5] rounded-2xl p-4">
            <div class="flex items-center justify-between mb-2.5">
                <span class="text-sm font-extrabold text-gray-700"><i class="fas fa-id-card text-blue-600 ml-1.5"></i>تکمیل پروفایل</span>
                <b id="acct-profile-progress-label" class="text-sm text-blue-700"></b>
            </div>
            <div class="acct-progress-track"><div id="acct-profile-progress" class="acct-progress-fill" style="width:0%"></div></div>
            <ul class="acct-check-list">
                ${checks.map(ch => `<li class="${ch.ok ? 'done' : ''}"><i class="fas ${ch.ok ? 'fa-check' : 'fa-minus'}"></i>${ch.label}</li>`).join('')}
            </ul>
            ${pct < 100 ? `<button onclick="switchAccountTab('profile')" class="text-xs font-bold text-blue-600 mt-3 hover:underline">تکمیل اطلاعات پروفایل <i class="fas fa-arrow-left mr-1"></i></button>` : '<p class="text-xs text-green-700 font-bold mt-3"><i class="fas fa-circle-check ml-1"></i>پروفایل شما کامل است.</p>'}
        </div>
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-truck-fast"></i>آخرین سفارش</div>
        ${lastOrder ? `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[#e6ebf5] rounded-2xl p-4 bg-[#fbfcff]">
                <div>
                    <b class="text-gray-900">${lastOrder.orderNumber}</b>
                    <span class="stock-badge in-stock mr-2">${escapeHTML(orderStatusFa(lastOrder.status))}</span>
                    <p class="text-xs text-gray-400 mt-1.5">مبلغ: ${formatToman(lastOrder.grand_total)} تومان | ارسال: ${lastOrder.shippingQuote.title} | ETA: ${lastOrder.shippingQuote.eta}</p>
                </div>
                <button onclick="switchAccountTab('orders')" class="acct-btn-ghost flex-none">مشاهده وضعیت <i class="fas fa-arrow-left"></i></button>
            </div>`
        : `
            <div class="acct-empty">
                <i class="fas fa-box-open big"></i>
                <b>هنوز سفارشی ثبت نکرده‌اید</b>
                <p>کاتالوگ بیش از ${formatNumber(ProductDatabase.length)} کد کالا آماده سفارش است.</p>
                <button onclick="showPage('search')" class="acct-btn-primary mt-4 !py-2.5 !px-5 text-sm">مشاهده محصولات <i class="fas fa-arrow-left"></i></button>
            </div>`}
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-clock-rotate-left"></i>آخرین فعالیت‌های حساب</div>
        ${accountActivityHTML()}
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-bolt"></i>دسترسی سریع</div>
        <div class="grid sm:grid-cols-2 gap-3">
            <button onclick="switchAccountTab('orders')" class="acct-tile"><i class="fas fa-receipt"></i><span>سفارش‌ها و شکایت‌ها<small>پیگیری وضعیت و ثبت شکایت</small></span><i class="fas fa-arrow-left go"></i></button>
            <button onclick="switchAccountTab('addresses')" class="acct-tile"><i class="fas fa-location-dot" style="background:#fff7e8;color:#e8a81d"></i><span>آدرس‌های تحویل<small>افزودن و ویرایش آدرس</small></span><i class="fas fa-arrow-left go"></i></button>
            <button onclick="switchAccountTab('saved')" class="acct-tile"><i class="fas fa-heart" style="background:#fff1f2;color:#f43f5e"></i><span>محصولات نشان‌شده<small>${formatNumber(AppState.wishlist.length)} کالا در فهرست شما</small></span><i class="fas fa-arrow-left go"></i></button>
            <button onclick="showCart()" class="acct-tile"><i class="fas fa-cart-shopping" style="background:#ecfdf5;color:#16a34a"></i><span>سبد خرید<small>${formatNumber(AppState.cart.reduce((s, i) => s + i.quantity, 0))} قلم در سبد</small></span><i class="fas fa-arrow-left go"></i></button>
        </div>
    </div>`;
}

// ---------- سفارش‌ها ----------
function orderStatusFa(status) {
    const found = ORDER_STEPS.find(s => s.key === status);
    return found ? found.label : 'پرداخت موفق';
}

// فیلتر کارت‌های سفارش (چیپ‌های بالای فهرست)
function setOrderFilter(key) {
    AccountUI.orderFilter = key;
    renderAccountDashboard('orders');
}

function setOrderQuery(value) {
    AccountUI.orderQuery = String(value || '').trim();
    const list = document.getElementById('account-order-list');
    if (!list) return;
    const q = AccountUI.orderQuery.toLowerCase();
    let visible = 0;
    list.querySelectorAll('[data-order]').forEach(card => {
        const hit = !q || card.getAttribute('data-order').toLowerCase().includes(q);
        card.classList.toggle('hidden', !hit);
        if (hit) visible++;
    });
    const empty = document.getElementById('account-order-empty');
    if (empty) empty.classList.toggle('hidden', visible > 0);
}

function orderMatchesFilter(order) {
    const f = AccountUI.orderFilter;
    if (f === 'all') return true;
    if (f === 'delivered') return order.status === 'DELIVERED';
    if (f === 'shipped') return order.status === 'SHIPPED' || order.status === 'HANDED_TO_CARRIER';
    return !['DELIVERED', 'SHIPPED', 'HANDED_TO_CARRIER'].includes(order.status);
}

function orderTrackHTML(order) {
    const currentIndex = Math.max(0, ORDER_STEPS.findIndex(s => s.key === order.status));
    return ORDER_STEPS.map((step, idx) => {
        const state = idx < currentIndex ? 'done' : idx === currentIndex ? 'current' : '';
        const dot = idx < currentIndex ? '<i class="fas fa-check"></i>' : `<i class="fas ${step.icon}"></i>`;
        const line = idx < ORDER_STEPS.length - 1 ? `<span class="acct-track-line ${idx < currentIndex ? 'done' : ''}"></span>` : '';
        return `<div class="acct-track-step ${state}"><span class="dot">${dot}</span><span>${step.label}</span></div>${line}`;
    }).join('');
}

function accountOrdersHTML(highlightOrder = '') {
    const filters = [
        { key: 'all', label: 'همه سفارش‌ها' },
        { key: 'progress', label: 'در حال آماده‌سازی' },
        { key: 'shipped', label: 'در مسیر ارسال' },
        { key: 'delivered', label: 'تحویل‌شده' }
    ];
    const orders = MockDB.orders.filter(orderMatchesFilter);

    const orderCards = orders.map(order => {
        const pf = getProformaByOrder(order.orderNumber);
        const hl = highlightOrder && order.orderNumber === highlightOrder;
        const items = (order.items || []).length;
        return `<div class="acct-order-card ${hl ? 'is-highlight' : ''}" data-order="${order.orderNumber}">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                        <b class="text-lg text-gray-900">${order.orderNumber}</b>
                        <span class="stock-badge in-stock">${escapeHTML(orderStatusFa(order.status))}</span>
                        <span class="stock-badge on-order">${escapeHTML(order.shippingQuote.title)}</span>
                    </div>
                    <p class="text-sm text-gray-500 mt-2">مبلغ: <b class="text-gray-800">${formatToman(order.grand_total)}</b> تومان${items ? ` | ${formatNumber(items)} قلم کالا` : ''} | ETA: ${escapeHTML(order.shippingQuote.eta)}</p>
                    <p class="text-xs text-gray-400 mt-1">پیش‌فاکتور: ${pf?.proforma_number || '-'}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="downloadProforma('${order.orderNumber}')" class="acct-btn-ghost !py-2.5 !px-4 text-sm"><i class="fas fa-file-arrow-down"></i>پیش‌فاکتور</button>
                    <button onclick="copyTracking('${order.orderNumber}')" class="acct-btn-ghost !py-2.5 !px-4 text-sm"><i class="fas fa-link"></i>لینک پیگیری</button>
                    <button onclick="reorderOrder('${order.orderNumber}')" class="acct-btn-primary !py-2.5 !px-4 text-sm"><i class="fas fa-rotate-right"></i>سفارش مجدد</button>
                </div>
            </div>
            <div class="mt-5 overflow-x-auto pb-1"><div class="acct-track">${orderTrackHTML(order)}</div></div>
        </div>`;
    }).join('');

    const rfqCards = MockDB.rfqs.map(rfq => `<div class="acct-order-card" style="background:#fffdf7;border-color:#fde8b5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
                <div class="flex flex-wrap items-center gap-2"><b class="text-lg text-gray-900">${rfq.rfqNumber}</b><span class="stock-badge inquiry">در انتظار تأیید فروش</span></div>
                <p class="text-sm text-gray-500 mt-2">${formatNumber(rfq.items.length)} قلم استعلامی | کارشناس فروش حداکثر تا ۲۴ ساعت کاری پاسخ می‌دهد.</p>
            </div>
            <button onclick="showNotification('در نسخه واقعی، این درخواست به کارتابل فروش وصل می‌شود.', 'info')" class="acct-btn-ghost flex-none"><i class="fas fa-bell"></i>پیگیری استعلام</button>
        </div>
    </div>`).join('');

    return `<div id="account-orders-panel">
        <div class="acct-panel mb-5">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div class="acct-panel-title !mb-0"><i class="fas fa-truck-fast"></i>پیگیری سفارش‌ها</div>
                <div class="relative lg:w-72">
                    <input class="acct-input !py-2.5 !pr-10" placeholder="جست‌وجوی شماره سفارش…" value="${escapeHTML(AccountUI.orderQuery)}" oninput="setOrderQuery(this.value)">
                    <i class="fas fa-magnifying-glass absolute top-1/2 -translate-y-1/2 right-3.5 text-gray-300 text-sm"></i>
                </div>
            </div>
            <div class="acct-chip-row mt-4">
                ${filters.map(f => `<button class="acct-chip ${AccountUI.orderFilter === f.key ? 'active' : ''}" onclick="setOrderFilter('${f.key}')">${f.label}</button>`).join('')}
            </div>
        </div>
        <div class="grid gap-4 mb-8" id="account-order-list">
            ${orderCards || `<div class="acct-empty"><i class="fas fa-box-open big"></i><b>سفارشی با این فیلتر پیدا نشد</b><p>فیلتر دیگری را امتحان کنید یا خرید جدیدی ثبت کنید.</p></div>`}
            <div id="account-order-empty" class="acct-empty hidden"><i class="fas fa-magnifying-glass big"></i><b>نتیجه‌ای برای این جست‌وجو نیست</b><p>شماره سفارش را کامل‌تر وارد کنید.</p></div>
        </div>
        <div class="grid gap-4">
            <h3 class="font-extrabold text-xl text-gray-900"><i class="fas fa-file-circle-question text-amber-500 ml-2"></i>پیش‌فاکتورهای استعلامی</h3>
            ${rfqCards || '<div class="acct-empty"><i class="fas fa-file-circle-question big"></i><b>استعلامی ثبت نشده است</b><p>برای کالاهای غیرموجود، درخواست استعلام ثبت کنید.</p></div>'}
        </div>
    </div>`;
}

// افزودن دوباره اقلام یک سفارش به سبد خرید
function reorderOrder(orderNumber) {
    const order = MockDB.orders.find(o => o.orderNumber === orderNumber);
    if (!order) return;
    let added = 0;
    (order.items || []).forEach(line => {
        const id = line.product_id || line.id;
        if (!id || !ProductDatabase.some(p => p.id === id)) return;
        const qty = Math.max(1, line.quantity || 1);
        for (let i = 0; i < qty; i++) addToCart(id, line.supplier);
        added++;
    });
    if (!added) return showNotification('اقلام این سفارش دیگر در کاتالوگ موجود نیست.', 'error');
    showNotification('اقلام سفارش به سبد خرید اضافه شد.', 'success');
}

// ---------- محصولات نشان‌شده ----------
function accountSavedHTML() {
    const products = AppState.wishlist.map(id => ProductDatabase.find(p => p.id === id)).filter(Boolean);
    if (!products.length) {
        return `<div class="acct-panel">
            <div class="acct-panel-title"><i class="fas fa-heart"></i>محصولات نشان‌شده</div>
            <div class="acct-empty">
                <i class="fas fa-heart big"></i>
                <b>هنوز محصولی نشان نکرده‌اید</b>
                <p>روی آیکن قلب هر محصول بزنید تا برای خرید بعدی این‌جا ذخیره شود.</p>
                <button onclick="showPage('search')" class="acct-btn-primary mt-4 !py-2.5 !px-5 text-sm">مشاهده کاتالوگ <i class="fas fa-arrow-left"></i></button>
            </div>
        </div>`;
    }
    return `<div class="acct-panel">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div class="acct-panel-title !mb-0"><i class="fas fa-heart"></i>محصولات نشان‌شده</div>
            <span class="text-xs font-extrabold text-gray-400">${formatNumber(products.length)} کالا</span>
        </div>
        <div class="grid md:grid-cols-2 gap-4 mt-4">
            ${products.map(p => `
            <div class="acct-address-card">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <span class="px-2 py-1 text-[11px] rounded-lg bg-blue-50 text-blue-700 font-extrabold">${escapeHTML(p.brand)}</span>
                        <h4 class="text-lg font-black text-gray-900 mt-2">${escapeHTML(p.code)}</h4>
                        <p class="text-xs text-gray-400 mt-1">${escapeHTML(productSizeLabel(p))}</p>
                    </div>
                    <button onclick="toggleWishlistFromAccount('${p.id}')" class="text-rose-500 text-lg" title="حذف از نشان‌شده‌ها" aria-label="حذف از نشان‌شده‌ها"><i class="fas fa-heart-crack"></i></button>
                </div>
                <div class="flex items-center justify-between gap-2 mt-auto pt-2">
                    <b class="text-sm text-gray-900">${p.sell_mode === 'instant' ? formatPrice(p.priceUSD) + ' تومان' : 'نیازمند استعلام'}</b>
                    <div class="flex gap-2">
                        <button onclick="showProductDetail('${p.id}')" class="acct-btn-ghost !py-2 !px-3 text-xs">جزئیات</button>
                        ${p.sell_mode === 'instant'
                            ? `<button onclick="addToCart('${p.id}')" class="acct-btn-primary !py-2 !px-3 text-xs"><i class="fas fa-cart-plus"></i>افزودن</button>`
                            : `<button onclick="requestQuote('${p.id}')" class="acct-btn-primary !py-2 !px-3 text-xs"><i class="fas fa-file-invoice"></i>استعلام</button>`}
                    </div>
                </div>
            </div>`).join('')}
        </div>
    </div>`;
}

// حذف از نشان‌شده‌ها داخل داشبورد (بدون پریدن به صفحه جست‌وجو)
function toggleWishlistFromAccount(productId) {
    const idx = AppState.wishlist.indexOf(productId);
    if (idx > -1) AppState.wishlist.splice(idx, 1);
    else AppState.wishlist.push(productId);
    updateWishlistCount();
    persistState();
    showNotification('فهرست نشان‌شده‌ها به‌روزرسانی شد.', 'success');
    renderAccountDashboard('saved');
}

// ---------- آدرس‌ها ----------
function accountAddressesHTML() {
    const c = CustomerAuth.customer;
    const addresses = c.addresses || [];
    const cards = addresses.map(a => `
        <div class="acct-address-card ${a.isDefault ? 'is-default' : ''}">
            <div class="flex flex-wrap items-center gap-2">
                <i class="fas ${a.title === 'محل کار' ? 'fa-briefcase text-blue-600' : a.title === 'خانه' ? 'fa-house text-amber-500' : 'fa-location-dot text-gray-400'}"></i>
                <b class="text-gray-900">${escapeHTML(a.title)}</b>
                ${a.isDefault ? '<span class="acct-address-default-chip"><i class="fas fa-star"></i>پیش‌فرض</span>' : ''}
            </div>
            <p class="text-sm text-gray-600 leading-7">${escapeHTML(a.recipient)} | <span dir="ltr">${escapeHTML(a.phone)}</span>${a.city ? ' | ' + escapeHTML(a.city) : ''}</p>
            <p class="text-sm text-gray-500 leading-7">${escapeHTML(a.details)}${a.postalCode ? ` | کد پستی: <span dir="ltr">${escapeHTML(a.postalCode)}</span>` : ''}</p>
            <div class="flex flex-wrap gap-2 mt-auto pt-1">
                ${a.isDefault ? '' : `<button onclick="setDefaultAddress('${a.id}')" class="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-600 hover:border-amber-400"><i class="fas fa-star ml-1 text-amber-400"></i>انتخاب پیش‌فرض</button>`}
                <button onclick="openAddressForm('${a.id}')" class="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-600 hover:border-blue-400"><i class="fas fa-pen ml-1"></i>ویرایش</button>
                <button onclick="copyAddress('${a.id}')" class="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-600 hover:border-blue-400"><i class="fas fa-copy ml-1"></i>کپی</button>
                <button onclick="deleteAddress('${a.id}')" class="px-3.5 py-2 rounded-xl border border-red-100 text-xs font-extrabold text-red-500 hover:bg-red-50"><i class="fas fa-trash ml-1"></i>حذف</button>
            </div>
        </div>`).join('');

    return `
    <div class="acct-panel">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div class="acct-panel-title !mb-0"><i class="fas fa-location-dot"></i>آدرس‌های تحویل</div>
            <button onclick="openAddressForm()" class="acct-btn-primary !py-2.5 !px-4 text-sm"><i class="fas fa-plus"></i>افزودن آدرس جدید</button>
        </div>
        <p class="text-xs text-gray-400 leading-6">آدرس پیش‌فرض هنگام تسویه‌حساب به‌صورت خودکار انتخاب می‌شود.</p>
        <div id="account-address-form" class="hidden"></div>
        <div class="grid md:grid-cols-2 gap-4 mt-4" id="account-address-list">
            ${cards || '<div class="md:col-span-2 acct-empty"><i class="fas fa-map-location-dot big"></i><b>هنوز آدرسی ثبت نشده است</b><p>برای تحویل سریع‌تر سفارش‌ها، آدرس خود را ذخیره کنید.</p></div>'}
        </div>
    </div>`;
}

// کپی متن آدرس برای ارسال به همکار یا پیک
function copyAddress(id) {
    const a = (CustomerAuth.customer?.addresses || []).find(x => x.id === id);
    if (!a) return;
    const text = `${a.recipient} | ${a.phone}\n${a.city ? a.city + ' — ' : ''}${a.details}${a.postalCode ? '\nکد پستی: ' + a.postalCode : ''}`;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    showNotification('آدرس کپی شد.', 'success');
}

function openAddressForm(editId = '') {
    const holder = document.getElementById('account-address-form');
    if (!holder) return;
    const a = (CustomerAuth.customer?.addresses || []).find(x => x.id === editId);
    holder.classList.remove('hidden');
    holder.innerHTML = `
        <form onsubmit="saveAddress(event, '${editId || ''}')" class="bg-[#f8faff] border border-[#dbe3f3] rounded-2xl p-5 mt-4 grid md:grid-cols-2 gap-3">
            <div class="md:col-span-2 font-extrabold text-gray-800 text-sm"><i class="fas ${editId ? 'fa-pen text-blue-600' : 'fa-plus text-green-600'} ml-1.5"></i>${editId ? 'ویرایش آدرس' : 'آدرس جدید'}</div>
            <select id="addr-title" class="acct-input">
                ${['خانه', 'محل کار', 'سایر'].map(t => `<option ${a?.title === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <input id="addr-recipient" class="acct-input" placeholder="نام گیرنده" value="${escapeHTML(a?.recipient || CustomerAuth.customer?.name || '')}">
            <input id="addr-phone" class="acct-input" dir="ltr" placeholder="شماره تماس گیرنده" value="${escapeHTML(a?.phone || CustomerAuth.session || '')}">
            <input id="addr-city" class="acct-input" placeholder="استان / شهر" value="${escapeHTML(a?.city || '')}">
            <textarea id="addr-details" class="acct-input md:col-span-2" rows="2" placeholder="آدرس کامل: خیابان، کوچه، پلاک، واحد...">${escapeHTML(a?.details || '')}</textarea>
            <input id="addr-postal" class="acct-input" dir="ltr" placeholder="کد پستی (اختیاری)" value="${escapeHTML(a?.postalCode || '')}">
            <label class="flex items-center gap-2 text-sm font-bold text-gray-600 select-none"><input id="addr-default" type="checkbox" ${a?.isDefault ? 'checked' : ''} class="w-4 h-4 accent-blue-600">ذخیره به‌عنوان آدرس پیش‌فرض</label>
            <div class="md:col-span-2 flex flex-wrap gap-2.5">
                <button type="submit" class="acct-btn-primary !py-2.5 text-sm"><i class="fas fa-check"></i>ذخیره آدرس</button>
                <button type="button" onclick="switchAccountTab('addresses')" class="acct-btn-ghost !py-2.5 text-sm">انصراف</button>
            </div>
        </form>`;
    document.getElementById('addr-title')?.focus();
}

function saveAddress(event, editId) {
    event.preventDefault();
    const c = CustomerAuth.customer;
    if (!c) return;
    const get = id => document.getElementById(id)?.value.trim() || '';
    const recipient = get('addr-recipient'), details = get('addr-details'), phone = normalizePhoneInput(get('addr-phone'));
    if (!recipient) return showNotification('نام گیرنده را وارد کنید.', 'error');
    if (!details) return showNotification('آدرس کامل را بنویسید.', 'error');
    if (phone && !isValidIranPhone(phone)) return showNotification('شماره تماس گیرنده معتبر نیست.', 'error');
    const isDefault = !!document.getElementById('addr-default')?.checked;
    const entry = {
        id: editId || 'ADDR-' + Date.now(),
        title: get('addr-title') || 'سایر',
        recipient, phone,
        city: get('addr-city'), details,
        postalCode: get('addr-postal'),
        isDefault
    };
    if (!c.addresses) c.addresses = [];
    if (isDefault) c.addresses.forEach(x => x.isDefault = false);
    const idx = c.addresses.findIndex(x => x.id === editId);
    if (idx >= 0) c.addresses[idx] = entry; else c.addresses.push(entry);
    if (isDefault || (!c.addresses.some(x => x.isDefault) && c.addresses.length)) {
        if (!c.addresses.some(x => x.isDefault)) c.addresses[0].isDefault = true;
    }
    CustomerAuth.persist();
    showNotification('آدرس ذخیره شد.', 'success');
    renderAccountDashboard('addresses');
}

function deleteAddress(id) {
    const c = CustomerAuth.customer;
    if (!c) return;
    c.addresses = (c.addresses || []).filter(a => a.id !== id);
    if (c.addresses.length && !c.addresses.some(a => a.isDefault)) c.addresses[0].isDefault = true;
    CustomerAuth.persist();
    showNotification('آدرس حذف شد.', 'info');
    renderAccountDashboard('addresses');
}

function setDefaultAddress(id) {
    const c = CustomerAuth.customer;
    if (!c) return;
    (c.addresses || []).forEach(a => a.isDefault = a.id === id);
    CustomerAuth.persist();
    renderAccountDashboard('addresses');
}

// ---------- پروفایل ----------
function accountProfileHTML() {
    const c = CustomerAuth.customer || {};
    const prefs = c.prefs || {};
    return `
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-id-card"></i>اطلاعات حساب</div>
        <form onsubmit="saveProfileForm(event)" class="grid md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-bold text-gray-600 mb-2">نام و نام خانوادگی</label>
                <input id="profile-name" class="acct-input" value="${escapeHTML(c.name || '')}" autocomplete="name">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-600 mb-2">شماره موبایل <span class="acct-verified-chip mr-1"><i class="fas fa-circle-check"></i>تأیید شده با پیامک</span></label>
                <input class="acct-input opacity-60" dir="ltr" value="${maskPhone(CustomerAuth.session)}" disabled>
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-600 mb-2">ایمیل <span class="text-gray-400 font-medium">(اختیاری)</span></label>
                <input id="profile-email" class="acct-input" dir="ltr" placeholder="you@company.com" value="${escapeHTML(c.email || '')}" autocomplete="email">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-600 mb-2">نام شرکت / مجموعه <span class="text-gray-400 font-medium">(اختیاری)</span></label>
                <input id="profile-company" class="acct-input" value="${escapeHTML(c.company || '')}" autocomplete="organization">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-600 mb-2">کد اقتصادی / شناسه ملی <span class="text-gray-400 font-medium">(برای فاکتور رسمی)</span></label>
                <input id="profile-taxid" class="acct-input" dir="ltr" value="${escapeHTML(c.taxId || '')}">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-600 mb-2">حوزه فعالیت <span class="text-gray-400 font-medium">(اختیاری)</span></label>
                <input id="profile-industry" class="acct-input" placeholder="مثلاً: صنایع غذایی، فولاد، سیمان" value="${escapeHTML(c.industry || '')}">
            </div>
            <div class="md:col-span-2">
                <button type="submit" class="acct-btn-primary"><i class="fas fa-floppy-disk"></i>ذخیره تغییرات</button>
            </div>
        </form>
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-bell"></i>اطلاع‌رسانی‌ها</div>
        <div class="grid md:grid-cols-2 gap-3">
            <label class="acct-switch">
                <span><b>پیامک وضعیت سفارش</b><small>هر تغییر وضعیت ارسال پیامک شود</small></span>
                <input type="checkbox" ${prefs.smsOrders === false ? '' : 'checked'} onchange="setAccountPref('smsOrders', this.checked)"><span class="track"></span>
            </label>
            <label class="acct-switch">
                <span><b>اعلام موجود شدن کالا</b><small>برای کدهای نشان‌شده اطلاع بده</small></span>
                <input type="checkbox" ${prefs.stockAlerts ? 'checked' : ''} onchange="setAccountPref('stockAlerts', this.checked)"><span class="track"></span>
            </label>
            <label class="acct-switch">
                <span><b>خبرنامه فنی</b><small>مقالات و راهنمای انتخاب بلبرینگ</small></span>
                <input type="checkbox" ${prefs.newsletter ? 'checked' : ''} onchange="setAccountPref('newsletter', this.checked)"><span class="track"></span>
            </label>
            <label class="acct-switch">
                <span><b>پیشنهادهای قیمتی</b><small>اطلاع از تخفیف‌های دوره‌ای</small></span>
                <input type="checkbox" ${prefs.offers ? 'checked' : ''} onchange="setAccountPref('offers', this.checked)"><span class="track"></span>
            </label>
        </div>
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-key"></i>رمز عبور</div>
        ${hasPassword(CustomerAuth.session) ? `
            <div class="acct-msg-success mb-4"><i class="fas fa-circle-check"></i><span>رمز عبور برای این حساب فعال است؛ می‌توانید بدون کد پیامکی وارد شوید.</span></div>
            <form onsubmit="changeAccountPassword(event)" class="grid md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="block text-sm font-bold text-gray-600 mb-2" for="cur-password">رمز فعلی</label>
                    <div class="acct-pw-wrap">
                        <input id="cur-password" class="acct-input" type="password" autocomplete="current-password">
                        <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('cur-password', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-600 mb-2" for="profile-new-password">رمز جدید</label>
                    <div class="acct-pw-wrap">
                        <input id="profile-new-password" class="acct-input" type="password" autocomplete="new-password" oninput="onPasswordInput(this,'profile-pw-meter')">
                        <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('profile-new-password', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                    </div>
                    <div class="acct-pw-meter" id="profile-pw-meter"><i></i><i></i><i></i><i></i><span></span></div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-600 mb-2" for="profile-new-password-2">تکرار رمز جدید</label>
                    <div class="acct-pw-wrap">
                        <input id="profile-new-password-2" class="acct-input" type="password" autocomplete="new-password">
                        <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('profile-new-password-2', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
                <div class="md:col-span-2 flex flex-wrap gap-2.5">
                    <button type="submit" class="acct-btn-primary"><i class="fas fa-floppy-disk"></i>تغییر رمز عبور</button>
                    <button type="button" onclick="removeAccountPassword()" class="acct-btn-danger"><i class="fas fa-trash"></i>حذف رمز (فقط ورود پیامکی)</button>
                </div>
            </form>`
        : `
            <p class="text-sm leading-7 text-gray-500">هنوز رمزی نساخته‌اید. با ساخت رمز، دفعه بعد بدون منتظرماندن برای پیامک وارد می‌شوید.</p>
            <form onsubmit="createAccountPassword(event)" class="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                    <label class="block text-sm font-bold text-gray-600 mb-2" for="profile-new-password">رمز عبور</label>
                    <div class="acct-pw-wrap">
                        <input id="profile-new-password" class="acct-input" type="password" autocomplete="new-password" placeholder="حداقل ۸ کاراکتر شامل حرف و رقم" oninput="onPasswordInput(this,'profile-pw-meter')">
                        <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('profile-new-password', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                    </div>
                    <div class="acct-pw-meter" id="profile-pw-meter"><i></i><i></i><i></i><i></i><span></span></div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-600 mb-2" for="profile-new-password-2">تکرار رمز عبور</label>
                    <div class="acct-pw-wrap">
                        <input id="profile-new-password-2" class="acct-input" type="password" autocomplete="new-password">
                        <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('profile-new-password-2', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
                <div class="md:col-span-2">
                    <button type="submit" class="acct-btn-primary"><i class="fas fa-key"></i>ساخت رمز عبور</button>
                </div>
            </form>`}
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-shield-halved"></i>امنیت و نشست‌ها</div>
        <div class="grid md:grid-cols-2 gap-3">
            <div class="border border-[#e6ebf5] rounded-2xl p-4 bg-[#fbfcff]">
                <b class="text-sm text-gray-800"><i class="fas fa-mobile-screen text-blue-600 ml-1.5"></i>ورود با کد پیامکی</b>
                <p class="text-xs text-gray-500 leading-6 mt-1.5">${hasPassword(CustomerAuth.session) ? 'علاوه بر رمز، همیشه می‌توانید با کد یک‌بارمصرف پیامکی هم وارد شوید.' : 'ورود فعلاً فقط با کد تأیید یک‌بارمصرف پیامکی انجام می‌شود.'}</p>
            </div>
            <div class="border border-[#e6ebf5] rounded-2xl p-4 bg-[#fbfcff]">
                <b class="text-sm text-gray-800"><i class="fas fa-clock-rotate-left text-amber-500 ml-1.5"></i>عضویت از ${new Date(c.joinedAt || Date.now()).toLocaleDateString('fa-IR')}</b>
                <p class="text-xs text-gray-500 leading-6 mt-1.5">در هر زمان می‌توانید از حساب خارج شوید؛ سفارش‌ها و آدرس‌های شما محفوظ می‌مانند.</p>
            </div>
        </div>
        <div class="flex flex-wrap gap-2.5 mt-4">
            <button onclick="downloadAccountData()" class="acct-btn-ghost"><i class="fas fa-download"></i>دریافت نسخه اطلاعات حساب</button>
            <button onclick="logoutCustomer()" class="acct-btn-danger"><i class="fas fa-arrow-right-from-bracket"></i>خروج از حساب کاربری</button>
        </div>
    </div>`;
}

// ذخیره ترجیحات اطلاع‌رسانی
function setAccountPref(key, value) {
    const c = CustomerAuth.customer;
    if (!c) return;
    c.prefs = c.prefs || {};
    c.prefs[key] = !!value;
    CustomerAuth.persist();
    showNotification('تنظیمات اطلاع‌رسانی ذخیره شد.', 'success');
}

// خروجی JSON از داده‌های حساب (شفافیت داده کاربر)
function downloadAccountData() {
    const c = CustomerAuth.customer;
    if (!c) return;
    const payload = {
        phone: CustomerAuth.session,
        profile: { name: c.name, email: c.email, company: c.company, taxId: c.taxId || '', industry: c.industry || '', joinedAt: c.joinedAt },
        addresses: c.addresses || [],
        prefs: c.prefs || {},
        orders: MockDB.orders.map(o => ({ orderNumber: o.orderNumber, total: o.grand_total, status: o.status }))
    };
    const json = JSON.stringify(payload, null, 2);
    if (typeof downloadFile === 'function') downloadFile('bearing-online-account.json', json, 'application/json');
    showNotification('فایل اطلاعات حساب آماده دانلود شد.', 'success');
}

function saveProfileForm(event) {
    event.preventDefault();
    const c = CustomerAuth.customer;
    if (!c) return;
    const name = document.getElementById('profile-name')?.value.trim() || '';
    if (name.length < 3) return showNotification('نام خود را کامل وارد کنید.', 'error');
    const email = document.getElementById('profile-email')?.value.trim() || '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showNotification('فرمت ایمیل درست نیست.', 'error');
    c.name = name;
    c.email = email;
    c.company = document.getElementById('profile-company')?.value.trim() || '';
    c.taxId = document.getElementById('profile-taxid')?.value.trim() || '';
    c.industry = document.getElementById('profile-industry')?.value.trim() || '';
    CustomerAuth.persist();
    updateAccountNav();
    showNotification('پروفایل به‌روزرسانی شد.', 'success');
    renderAccountDashboard('profile');
}

// ---------- مدیریت رمز عبور از داخل حساب ----------
function createAccountPassword(event) {
    event.preventDefault();
    const account = CustomerAuth.customer;
    if (!account) return;
    const pw = document.getElementById('profile-new-password')?.value || '';
    const pw2 = document.getElementById('profile-new-password-2')?.value || '';
    const problem = passwordProblem(pw);
    if (problem) return showNotification(problem, 'error');
    if (pw !== pw2) return showNotification('دو رمز واردشده یکسان نیستند.', 'error');
    account.password = makePasswordRecord(pw);
    CustomerAuth.persist();
    clearPasswordFailures(CustomerAuth.session);
    showNotification('رمز عبور ساخته شد.', 'success');
    renderAccountDashboard('profile');
}

function changeAccountPassword(event) {
    event.preventDefault();
    const account = CustomerAuth.customer;
    if (!account) return;
    const current = document.getElementById('cur-password')?.value || '';
    if (!verifyPassword(account, current)) return showNotification('رمز فعلی درست نیست.', 'error');
    const pw = document.getElementById('profile-new-password')?.value || '';
    const pw2 = document.getElementById('profile-new-password-2')?.value || '';
    const problem = passwordProblem(pw);
    if (problem) return showNotification(problem, 'error');
    if (pw !== pw2) return showNotification('دو رمز واردشده یکسان نیستند.', 'error');
    if (verifyPassword(account, pw)) return showNotification('رمز جدید با رمز فعلی یکسان است.', 'error');
    account.password = makePasswordRecord(pw);
    CustomerAuth.persist();
    clearPasswordFailures(CustomerAuth.session);
    showNotification('رمز عبور تغییر کرد.', 'success');
    renderAccountDashboard('profile');
}

function removeAccountPassword() {
    const account = CustomerAuth.customer;
    if (!account) return;
    account.password = null;
    CustomerAuth.persist();
    clearPasswordFailures(CustomerAuth.session);
    showNotification('رمز حذف شد؛ از این پس ورود فقط با کد پیامکی است.', 'info');
    renderAccountDashboard('profile');
}
