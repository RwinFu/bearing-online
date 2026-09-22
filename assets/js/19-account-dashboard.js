/* ===== 19-account-dashboard.js — داشبورد حساب کاربری: پیش‌خوان، سفارش‌ها، آدرس‌ها، پروفایل ===== */
// =============================================
// CUSTOMER DASHBOARD
// =============================================
function accountTabs(activeTab) {
    const c = CustomerAuth.customer || { addresses: [] };
    return [
        { key: 'overview', icon: 'fa-gauge-high', label: 'پیش‌خوان', count: null },
        { key: 'orders', icon: 'fa-box-open', label: 'سفارش‌ها و پیگیری', count: MockDB.orders.length + MockDB.rfqs.length },
        { key: 'addresses', icon: 'fa-location-dot', label: 'آدرس‌های تحویل', count: (c.addresses || []).length },
        { key: 'profile', icon: 'fa-id-card', label: 'پروفایل و امنیت', count: null },
        { key: 'logout', icon: 'fa-arrow-right-from-bracket', label: 'خروج از حساب', count: null }
    ].map(t => t.key === 'logout'
        ? `<button class="acct-tab acct-tab-logout" onclick="logoutCustomer()"><i class="fas ${t.icon}"></i><span>${t.label}</span></button>`
        : `<button class="acct-tab ${t.key === activeTab ? 'active' : ''}" onclick="switchAccountTab('${t.key}')"><i class="fas ${t.icon}"></i><span>${t.label}</span>${t.count !== null ? `<span class="count-chip">${formatNumber(t.count)}</span>` : ''}</button>`
    ).join('');
}

function renderAccountDashboard(tab, highlightOrder = '') {
    const container = document.getElementById('account-content');
    const c = CustomerAuth.customer;
    if (!container || !c) return;
    const phone = CustomerAuth.session;
    const joined = new Date(c.joinedAt || Date.now()).toLocaleDateString('fa-IR');
    const firstName = (c.name || '').split(/\s+/)[0] || 'کاربر';

    container.innerHTML = `
    <div class="acct-wrap py-8 md:py-12">
        <div class="max-w-7xl mx-auto px-4">
            <div class="acct-banner mb-6">
                <div class="acct-banner-dots"></div>
                <div class="acct-banner-ring"></div>
                <div class="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-7">
                    <div class="acct-avatar">${c.name ? escapeHTML(getInitials(c.name)) : '<i class="fas fa-user"></i>'}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <span class="acct-badge-soft"><i class="fas fa-circle-check"></i>شماره تأیید شده</span>
                            <span class="acct-badge-soft"><i class="fas fa-calendar-days"></i>عضویت: ${joined}</span>
                        </div>
                        <h2 class="text-2xl md:text-3xl font-black">${escapeHTML(c.name || 'کاربر مهم')}</h2>
                        <p class="text-white/70 text-sm mt-1.5">شماره حساب: <b dir="ltr" class="text-white/90">${maskPhone(phone)}</b>${c.company ? ` | ${escapeHTML(c.company)}` : ''}</p>
                    </div>
                    <div class="flex flex-wrap gap-2.5">
                        <button onclick="switchAccountTab('orders')" class="acct-btn-ghost !bg-white/10 !border-white/30 !text-white hover:!bg-white/20"><i class="fas fa-truck-fast"></i>پیگیری سفارش</button>
                        <button onclick="logoutCustomer()" class="acct-btn-ghost !bg-transparent !border-white/25 !text-white/85 hover:!bg-white/10"><i class="fas fa-arrow-right-from-bracket"></i>خروج</button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5 mb-6">
                <div class="acct-stat"><i style="background:#eef2ff;color:#2f6bff;"><span class="fas fa-box-open"></span></i><b class="text-2xl text-gray-900">${formatNumber(MockDB.orders.length)}</b><span class="text-xs text-gray-400 font-bold">سفارش پرداخت‌شده</span></div>
                <div class="acct-stat"><i style="background:#fff7e8;color:#e8a81d;"><span class="fas fa-file-invoice"></span></i><b class="text-2xl text-gray-900">${formatNumber(MockDB.proformas.length)}</b><span class="text-xs text-gray-400 font-bold">پیش‌فاکتور</span></div>
                <div class="acct-stat"><i style="background:#fff1f2;color:#f43f5e;"><span class="fas fa-file-circle-question"></span></i><b class="text-2xl text-gray-900">${formatNumber(MockDB.rfqs.length)}</b><span class="text-xs text-gray-400 font-bold">استعلام RFQ</span></div>
                <div class="acct-stat"><i style="background:#ecfdf5;color:#16a34a;"><span class="fas fa-heart"></span></i><b class="text-2xl text-gray-900">${formatNumber(AppState.wishlist.length)}</b><span class="text-xs text-gray-400 font-bold">محصول نشان‌شده</span></div>
            </div>

            <div class="grid lg:grid-cols-[250px_1fr] gap-6 items-start">
                <div class="acct-tabs">${accountTabs(tab)}</div>
                <div class="min-w-0">${accountPanelHTML(tab, highlightOrder)}</div>
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
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = '٪' + formatNumber(pct);
}

function accountOverviewHTML() {
    const c = CustomerAuth.customer || {};
    const lastOrder = MockDB.orders[MockDB.orders.length - 1];
    const pct = profileCompleteness();
    return `
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-gauge-high"></i>پیش‌خوان حساب</div>
        <p class="text-sm leading-7 text-gray-500">از این‌جا می‌توانید سفارش‌ها را پیگیری کنید، آدرس‌های تحویل را مدیریت کنید و اطلاعات پروفایل خود را به‌روز نگه دارید.</p>
        <div class="mt-5 bg-[#f8faff] border border-[#e6ebf5] rounded-2xl p-4">
            <div class="flex items-center justify-between mb-2.5">
                <span class="text-sm font-extrabold text-gray-700"><i class="fas fa-id-card text-blue-600 ml-1.5"></i>تکمیل پروفایل</span>
                <b id="acct-profile-progress-label" class="text-sm text-blue-700"></b>
            </div>
            <div class="acct-progress-track"><div id="acct-profile-progress" class="acct-progress-fill" style="width:${pct}%"></div></div>
            ${pct < 100 ? `<button onclick="switchAccountTab('profile')" class="text-xs font-bold text-blue-600 mt-3 hover:underline">تکمیل اطلاعات پروفایل <i class="fas fa-arrow-left mr-1"></i></button>` : '<p class="text-xs text-green-700 font-bold mt-2.5"><i class="fas fa-circle-check ml-1"></i>پروفایل شما کامل است.</p>'}
        </div>
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-truck-fast"></i>آخرین سفارش</div>
        ${lastOrder ? `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[#e6ebf5] rounded-2xl p-4 bg-[#fbfcff]">
                <div>
                    <b class="text-gray-900">${lastOrder.orderNumber}</b>
                    <span class="stock-badge in-stock mr-2">پرداخت موفق</span>
                    <p class="text-xs text-gray-400 mt-1.5">مبلغ: ${formatToman(lastOrder.grand_total)} تومان | ارسال: ${lastOrder.shippingQuote.title} | ETA: ${lastOrder.shippingQuote.eta}</p>
                </div>
                <button onclick="switchAccountTab('orders')" class="acct-btn-ghost flex-none">مشاهده وضعیت <i class="fas fa-arrow-left"></i></button>
            </div>`
        : `
            <div class="text-center py-8">
                <i class="fas fa-box-open text-4xl text-gray-200"></i>
                <p class="text-gray-400 mt-3 font-bold">هنوز سفارشی ثبت نکرده‌اید.</p>
                <button onclick="showPage('search')" class="acct-btn-primary mt-4 !py-2.5 !px-5 text-sm">مشاهده محصولات <i class="fas fa-arrow-left"></i></button>
            </div>`}
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-bolt"></i>دسترسی سریع</div>
        <div class="grid sm:grid-cols-3 gap-3">
            <button onclick="switchAccountTab('orders')" class="acct-btn-ghost !justify-start"><i class="fas fa-receipt text-blue-600"></i>سفارش‌ها و شکایت‌ها</button>
            <button onclick="switchAccountTab('addresses')" class="acct-btn-ghost !justify-start"><i class="fas fa-location-dot text-amber-500"></i>افزودن آدرس تحویل</button>
            <button onclick="showWishlist()" class="acct-btn-ghost !justify-start"><i class="fas fa-heart text-rose-500"></i>محصولات نشان‌شده</button>
        </div>
    </div>`;
}

// ---------- سفارش‌ها (همان کارت‌های قبلی سفارش/RFQ) ----------
function accountOrdersHTML(highlightOrder = '') {
    const orderCards = MockDB.orders.map(order => {
        const pf = getProformaByOrder(order.orderNumber);
        const timeline = ['PAID', 'PICKING', 'QC_PASSED', 'PACKED', 'HANDED_TO_CARRIER', 'SHIPPED', 'DELIVERED'];
        const currentIndex = Math.max(0, timeline.indexOf(order.status));
        const hl = highlightOrder && order.orderNumber === highlightOrder;
        return `<div class="bg-white rounded-2xl p-5 shadow-sm border ${hl ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}" data-order="${order.orderNumber}">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div class="flex flex-wrap items-center gap-2"><b class="text-lg text-gray-900">${order.orderNumber}</b><span class="stock-badge in-stock">پرداخت موفق</span><span class="stock-badge on-order">${order.shippingQuote.title}</span></div>
                    <p class="text-sm text-gray-500 mt-2">مبلغ: ${formatToman(order.grand_total)} تومان | ETA: ${order.shippingQuote.eta}</p>
                    <p class="text-xs text-gray-400 mt-1">پیش‌فاکتور: ${pf?.proforma_number || '-'}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="downloadProforma('${order.orderNumber}')" class="px-4 py-2 rounded-xl border border-gray-200 font-bold">دانلود پیش‌فاکتور</button>
                    <button onclick="copyTracking('${order.orderNumber}')" class="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold">کپی لینک پیگیری</button>
                </div>
            </div>
            <div class="mt-5 overflow-x-auto"><div class="flex min-w-max items-center gap-3 text-xs text-gray-500">
                ${timeline.map((step, idx) => `<div class="flex items-center gap-2 ${idx <= currentIndex ? 'text-blue-700 font-bold' : 'text-gray-400'}"><span class="tracking-dot" style="${idx <= currentIndex ? '' : 'background:#cbd5e1;box-shadow:0 0 0 5px #f1f5f9'}"></span>${step}</div>`).join('<span class="w-8 h-px bg-gray-200"></span>')}
            </div></div>
        </div>`;
    }).join('');

    const rfqCards = MockDB.rfqs.map(rfq => `<div class="bg-orange-50 border border-orange-100 rounded-2xl p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><b>${rfq.rfqNumber}</b><p class="text-sm text-orange-800 mt-1">${rfq.items.length} قلم استعلامی | وضعیت: در انتظار تایید فروش</p></div><button onclick="showNotification('در نسخه واقعی، این درخواست به کارتابل فروش وصل می‌شود.', 'info')" class="px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-700 font-bold">درخواست تمدید/پیگیری</button></div>
    </div>`).join('');

    return `<div id="account-orders-panel">
        <div class="grid gap-4 mb-8">
            <h3 class="font-extrabold text-xl text-gray-900"><i class="fas fa-truck-fast text-blue-600 ml-2"></i>پیگیری سفارش‌ها</h3>
            ${orderCards || '<div class="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100">سفارشی ثبت نشده است.</div>'}
        </div>
        <div class="grid gap-4">
            <h3 class="font-extrabold text-xl text-gray-900"><i class="fas fa-file-circle-question text-amber-500 ml-2"></i>پیش‌فاکتورهای استعلامی</h3>
            ${rfqCards || '<div class="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100">RFQ ثبت نشده است.</div>'}
        </div>
    </div>`;
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
                <button onclick="deleteAddress('${a.id}')" class="px-3.5 py-2 rounded-xl border border-red-100 text-xs font-extrabold text-red-500 hover:bg-red-50"><i class="fas fa-trash ml-1"></i>حذف</button>
            </div>
        </div>`).join('');

    return `
    <div class="acct-panel">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div class="acct-panel-title !mb-0"><i class="fas fa-location-dot"></i>آدرس‌های تحویل</div>
            <button onclick="openAddressForm()" class="acct-btn-primary !py-2.5 !px-4 text-sm"><i class="fas fa-plus"></i>افزودن آدرس جدید</button>
        </div>
        <div id="account-address-form" class="hidden"></div>
        <div class="grid md:grid-cols-2 gap-4 mt-4" id="account-address-list">
            ${cards || '<div class="md:col-span-2 text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-2xl"><i class="fas fa-map-location-dot text-3xl mb-3"></i><p class="font-bold">هنوز آدرسی ثبت نشده است.</p><p class="text-xs mt-1">برای تحویل سریع‌تر سفارش‌ها، آدرس خود را ذخیره کنید.</p></div>'}
        </div>
    </div>`;
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
            <div class="md:col-span-2">
                <button type="submit" class="acct-btn-primary"><i class="fas fa-floppy-disk"></i>ذخیره تغییرات</button>
            </div>
        </form>
    </div>
    <div class="acct-panel">
        <div class="acct-panel-title"><i class="fas fa-shield-halved"></i>امنیت و نشست‌ها</div>
        <div class="grid md:grid-cols-2 gap-3">
            <div class="border border-[#e6ebf5] rounded-2xl p-4 bg-[#fbfcff]">
                <b class="text-sm text-gray-800"><i class="fas fa-mobile-screen text-blue-600 ml-1.5"></i>ورود با کد پیامکی</b>
                <p class="text-xs text-gray-500 leading-6 mt-1.5">حساب شما رمز عبور ندارد؛ هر بار ورود فقط با کد تأیید یک‌بارمصرف پیامکی انجام می‌شود.</p>
            </div>
            <div class="border border-[#e6ebf5] rounded-2xl p-4 bg-[#fbfcff]">
                <b class="text-sm text-gray-800"><i class="fas fa-clock-rotate-left text-amber-500 ml-1.5"></i>عضویت از ${new Date(c.joinedAt || Date.now()).toLocaleDateString('fa-IR')}</b>
                <p class="text-xs text-gray-500 leading-6 mt-1.5">در هر زمان می‌توانید از حساب خارج شوید؛ سفارش‌ها و آدرس‌های شما محفوظ می‌مانند.</p>
            </div>
        </div>
        <button onclick="logoutCustomer()" class="acct-btn-danger mt-4"><i class="fas fa-arrow-right-from-bracket"></i>خروج از حساب کاربری</button>
    </div>`;
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
    CustomerAuth.persist();
    updateAccountNav();
    showNotification('پروفایل به‌روزرسانی شد.', 'success');
    renderAccountDashboard('profile');
}
