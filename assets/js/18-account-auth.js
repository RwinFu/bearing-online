/* ===== 18-account-auth.js — حساب کاربری: ورود با کد تأیید پیامکی + داشبورد مشتری ===== */
// =============================================
// CUSTOMER ACCOUNT & SMS-OTP LOGIN (mock SMS gateway)
// =============================================
const CustomerAuth = {
    accounts: {},          // { '09123456789': { name, email, company, joinedAt, addresses: [] } }
    session: null,         // phone number of the logged-in customer
    otp: null,             // { phone, code, expiresAt, attempts, sentAt }
    pendingTab: '',
    pendingHighlight: '',
    resendAt: 0,
    timers: {},

    isLoggedIn() { return !!(this.session && this.accounts[this.session]); },

    get customer() { return this.isLoggedIn() ? this.accounts[this.session] : null; },

    persist() {
        saveJSON('prm_customer_accounts', this.accounts);
        saveJSON('prm_customer_session', this.session);
    },

    hydrate() {
        this.accounts = loadJSON('prm_customer_accounts', {}) || {};
        this.session = loadJSON('prm_customer_session', null);
        if (this.session && !this.accounts[this.session]) this.session = null;
    },

    accountFor(phone) {
        if (!this.accounts[phone]) {
            this.accounts[phone] = { name: '', email: '', company: '', joinedAt: new Date().toISOString(), addresses: [] };
        }
        return this.accounts[phone];
    }
};

// ---------- ابزارهای شماره موبایل ----------
function normalizePhoneInput(raw) {
    const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
    let s = String(raw || '').trim();
    s = s.replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => AR.indexOf(d));
    s = s.replace(/[\s\-().]/g, '');
    if (s.startsWith('+98')) s = '0' + s.slice(3);
    else if (/^0098/.test(s)) s = '0' + s.slice(4);
    else if (/^98\d{10}$/.test(s)) s = '0' + s.slice(2);
    else if (/^9\d{9}$/.test(s)) s = '0' + s;
    return s;
}

function isValidIranPhone(s) { return /^09\d{9}$/.test(s); }

function maskPhone(p) { return p ? p.slice(0, 4) + '***' + p.slice(7) : ''; }

function getInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    return parts.length > 1 ? parts[0][0] + '‌' + parts[1][0] : parts[0][0];
}

// ---------- چرخه ورود با پیامک ----------
function clearAccountTimers() {
    Object.values(CustomerAuth.timers).forEach(t => clearInterval(t));
    CustomerAuth.timers = {};
}

function removeSmsSimulator() {
    document.getElementById('sms-sim-container')?.remove();
}

// در نسخه نمایشی، پیامک واقعی ارسال نمی‌شود؛ کد در یک حباب «پیامک دریافتی» شبیه‌سازی می‌شود.
function simulateIncomingSms(phone, code) {
    removeSmsSimulator();
    const holder = document.createElement('div');
    holder.id = 'sms-sim-container';
    holder.innerHTML = `
        <div class="sms-sim" role="status" aria-live="polite">
            <div class="sms-sim-head">
                <i class="fas fa-message"></i>
                <span>پیامک شبیه‌سازی‌شده | <span dir="ltr">BearingOnline</span></span>
                <button class="sms-sim-close" onclick="removeSmsSimulator()" aria-label="بستن پیامک شبیه‌سازی‌شده"><i class="fas fa-times"></i></button>
            </div>
            <div class="sms-sim-body">
                کاربر گرامی، کد تأیید شما:
                <br>
                <span class="sms-sim-code" dir="ltr">${code}</span>
                <br>
                <span class="text-xs text-gray-400">برای <span dir="ltr">${maskPhone(phone)}</span> ارسال شد.</span>
            </div>
        </div>`;
    document.body.appendChild(holder);
}

function sendOtp(phone) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    CustomerAuth.otp = { phone, code, expiresAt: Date.now() + 120000, attempts: 0, sentAt: Date.now() };
    CustomerAuth.resendAt = Date.now() + 90000;
    simulateIncomingSms(phone, code);
    showNotification('کد تأیید پیامک شد (شبیه‌سازی).', 'success');
    renderAccountLogin('otp', phone);
}

function accountHash(tab, highlight) {
    if (!tab || tab === 'overview') return '#/account';
    let h = '#/account/' + tab;
    if (tab === 'orders' && highlight) h += '/' + encodeURIComponent(highlight);
    return h;
}

// نقطه ورود صفحه حساب: بدون نشست → صفحه ورود، با نشست → داشبورد
function showAccount(tab = '', highlightOrder = '') {
    clearAccountTimers();
    const TABS = ['overview', 'orders', 'addresses', 'profile'];
    if (tab === 'security') tab = 'profile';
    if (tab && !TABS.includes(tab)) { // سازگاری با لینک‌های قدیمی شماره سفارش
        highlightOrder = tab;
        tab = 'orders';
    }
    if (!CustomerAuth.isLoggedIn()) {
        CustomerAuth.pendingTab = tab || '';
        CustomerAuth.pendingHighlight = highlightOrder || '';
        removeSmsSimulator();
        renderAccountLogin('phone', '');
    } else {
        removeSmsSimulator();
        renderAccountDashboard(tab || 'overview', highlightOrder);
    }
    try {
        const hash = accountHash(tab, highlightOrder);
        if (!AppState.routing && location.hash !== hash) history.pushState(null, '', hash);
    } catch (e) {}
    showPage('account');
}

function switchAccountTab(tab) { showAccount(tab); }

// ---------- نمایش صفحه ورود ----------
function accountStepsHTML(step) {
    const steps = [
        { key: 'phone', label: 'شماره موبایل' },
        { key: 'otp', label: 'کد تأیید' },
        { key: 'name', label: 'تکمیل پروفایل' }
    ];
    const idx = steps.findIndex(s => s.key === step);
    return `<div class="acct-steps">${steps.map((s, i) => {
        const cls = i < idx ? 'done' : i === idx ? 'active' : '';
        const icon = i < idx ? '<i class="fas fa-check"></i>' : (i + 1);
        return `<span class="acct-step ${cls}"><b>${icon}</b>${s.label}</span>${i < steps.length - 1 ? '<span class="acct-step-line"></span>' : ''}`;
    }).join('')}</div>`;
}

function accountHeroHTML() {
    return `
    <aside class="acct-hero">
        <div class="acct-hero-dots"></div>
        <svg class="acct-hero-bearing" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
                <linearGradient id="acctSteel" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#ffffff"></stop>
                    <stop offset="1" stop-color="#8fa4c8"></stop>
                </linearGradient>
                <linearGradient id="acctGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#ffe08a"></stop>
                    <stop offset="1" stop-color="#e8a81d"></stop>
                </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="86" fill="none" stroke="url(#acctSteel)" stroke-width="14"></circle>
            <circle cx="100" cy="100" r="76" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5"></circle>
            <g fill="url(#acctGold)" stroke="#7d5204" stroke-width="1">
                <circle cx="160" cy="100" r="11"></circle>
                <circle cx="142.4" cy="142.4" r="11"></circle>
                <circle cx="100" cy="160" r="11"></circle>
                <circle cx="57.6" cy="142.4" r="11"></circle>
                <circle cx="40" cy="100" r="11"></circle>
                <circle cx="57.6" cy="57.6" r="11"></circle>
                <circle cx="100" cy="40" r="11"></circle>
                <circle cx="142.4" cy="57.6" r="11"></circle>
            </g>
            <circle cx="100" cy="100" r="36" fill="none" stroke="url(#acctSteel)" stroke-width="12"></circle>
            <circle cx="100" cy="100" r="21" fill="#0b2560" stroke="#ffd166" stroke-width="2.5"></circle>
        </svg>
        <div class="relative">
            <h3>حساب کاربری برینگ آنلاین</h3>
            <p>با شماره موبایل وارد شوید؛ بدون رمز عبور، فقط با کد تأیید پیامکی.</p>
        </div>
        <ul class="acct-hero-features relative">
            <li><i class="fas fa-truck-fast"></i>پیگیری لحظه‌ای سفارش‌ها و وضعیت ارسال</li>
            <li><i class="fas fa-file-invoice"></i>دانلود پیش‌فاکتورها و اسناد خرید</li>
            <li><i class="fas fa-location-dot"></i>مدیریت آدرس‌های تحویل</li>
            <li><i class="fas fa-headset"></i>ثبت و پیگیری شکایت با پاسخ پشتیبانی</li>
        </ul>
    </aside>`;
}

function renderAccountLogin(step, phone, message = '') {
    clearAccountTimers();
    const container = document.getElementById('account-content');
    if (!container) return;

    let formHTML = '';

    if (step === 'phone') {
        formHTML = `
            ${accountStepsHTML('phone')}
            <h2 class="text-2xl font-black text-gray-900" data-en="Login / Register" data-fa="ورود یا ثبت‌نام">ورود یا ثبت‌نام</h2>
            <p class="text-sm text-gray-500 mt-2 mb-6">شماره موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود.</p>
            ${message ? `<div class="acct-msg-error mb-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <form onsubmit="submitPhoneForm(event)" novalidate>
                <label class="block text-sm font-bold text-gray-600 mb-2" for="login-phone">شماره موبایل</label>
                <div class="acct-phone-field" id="login-phone-field">
                    <input id="login-phone" type="tel" inputmode="numeric" autocomplete="tel" dir="ltr"
                           placeholder="9123456789" value="${escapeHTML(phone || '')}"
                           onkeydown="if(event.key==='Enter'){event.preventDefault();submitPhoneForm(event);}">
                    <span class="acct-phone-prefix"><i class="fas fa-mobile-screen ml-1"></i> +98</span>
                </div>
                <div id="login-phone-error" class="hidden acct-msg-error mt-3"><i class="fas fa-circle-exclamation"></i><span></span></div>
                <button type="submit" class="acct-btn-primary w-full mt-6">
                    <i class="fas fa-paper-plane"></i>
                    دریافت کد تأیید
                </button>
            </form>
            <div class="acct-demo-note mt-5">
                <i class="fas fa-flask mt-1"></i>
                <span>نسخه نمایشی: پیامک واقعی ارسال نمی‌شود؛ کد تأیید به‌صورت شبیه‌سازی‌شده در یک پیامک روی صفحه نمایش داده می‌شود.</span>
            </div>
            <p class="text-[11.5px] leading-6 text-gray-400 mt-5">
                ورود شما به معنای پذیرش شرایط استفاده و حریم خصوصی برینگ آنلاین است.
            </p>`;
    } else if (step === 'otp') {
        const otp = CustomerAuth.otp;
        formHTML = `
            ${accountStepsHTML('otp')}
            <h2 class="text-2xl font-black text-gray-900">کد تأیید را وارد کنید</h2>
            <p class="text-sm text-gray-500 mt-2">کد ۵ رقمی ارسال‌شده به <b class="text-gray-800" dir="ltr">${maskPhone(phone)}</b> را وارد کنید.</p>
            <button onclick="renderAccountLogin('phone','${escapeHTML(phone)}')" class="text-xs font-bold text-blue-600 mt-1 hover:underline">
                <i class="fas fa-pen ml-1"></i>ویرایش شماره
            </button>
            ${message ? `<div class="acct-msg-error mb-1 mt-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <div class="otp-row" id="otp-row">
                ${[0, 1, 2, 3, 4].map(i => `<input class="otp-box" inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="رقم ${i + 1} کد تأیید">`).join('')}
            </div>
            <div class="otp-meta">
                <span><i class="fas fa-stopwatch ml-1"></i>اعتبار کد: <b id="otp-expiry">۲:۰۰</b></span>
                <button id="otp-resend" class="otp-resend" onclick="resendOtp()" disabled>ارسال مجدد کد</button>
            </div>
            <button onclick="verifyOtp()" class="acct-btn-primary w-full mt-5"><i class="fas fa-shield-halved"></i>تأیید کد و ورود</button>
            <div class="acct-demo-note mt-5">
                <i class="fas fa-flask mt-1"></i>
                <span>پیامک شبیه‌سازی‌شده حاوی کد، پایین صفحه نمایش داده شده است.</span>
            </div>`;
    } else if (step === 'name') {
        formHTML = `
            ${accountStepsHTML('name')}
            <div class="flex items-center gap-3 mb-5">
                <div class="acct-avatar" style="width:58px;height:58px;border-radius:18px;font-size:22px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#123a92;border-color:#bfdbfe;">
                    <i class="fas fa-user-check"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-gray-900">شماره تأیید شد!</h2>
                    <p class="text-sm text-gray-500 mt-1">خوش آمدید؛ برای تکمیل حساب، نام خود را بنویسید.</p>
                </div>
            </div>
            ${message ? `<div class="acct-msg-error mb-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <form onsubmit="submitNameForm(event)" novalidate>
                <label class="block text-sm font-bold text-gray-600 mb-2" for="welcome-name">نام و نام خانوادگی</label>
                <input id="welcome-name" class="acct-input" placeholder="مثلاً: رضا محمدی" autocomplete="name">
                <label class="block text-sm font-bold text-gray-600 mb-2 mt-4" for="welcome-company">نام شرکت / مجموعه <span class="text-gray-400 font-medium">(اختیاری)</span></label>
                <input id="welcome-company" class="acct-input" placeholder="مثلاً: صنعت‌بلبرینگ تهران">
                <button type="submit" class="acct-btn-primary w-full mt-6"><i class="fas fa-user-check"></i>ورود به حساب کاربری</button>
            </form>`;
    }

    container.innerHTML = `
        <div class="acct-wrap acct-login-wrap">
            <div class="acct-login-card">
                <div class="acct-form-side">${formHTML}</div>
                ${accountHeroHTML()}
            </div>
        </div>`;

    if (step === 'otp') initOtpInputs();
    const focusTarget = container.querySelector(step === 'phone' ? '#login-phone' : step === 'otp' ? '.otp-box' : '#welcome-name');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 300);
}

// ---------- گام ۱: شماره موبایل ----------
function submitPhoneForm(event) {
    event.preventDefault();
    const input = document.getElementById('login-phone');
    const field = document.getElementById('login-phone-field');
    const errorBox = document.getElementById('login-phone-error');
    const raw = input ? input.value : '';
    const phone = normalizePhoneInput(raw);
    const fail = msg => {
        field?.classList.add('input-error');
        if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.querySelector('span').textContent = msg;
        }
        input?.focus();
    };
    if (!raw.trim()) return fail('شماره موبایل را وارد کنید.');
    if (!isValidIranPhone(phone)) return fail('شماره موبایل معتبر نیست؛ مثال: 09123456789');
    field?.classList.remove('input-error');
    sendOtp(phone);
}

// ---------- گام ۲: کد تأیید ----------
function initOtpInputs() {
    const boxes = [...document.querySelectorAll('#otp-row .otp-box')];
    if (!boxes.length) return;

    boxes.forEach((box, i) => {
        box.addEventListener('input', () => {
            box.value = box.value.replace(/\D/g, '').slice(-1);
            box.classList.remove('otp-error');
            if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
        });
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
            if (e.key === 'Enter') { e.preventDefault(); verifyOtp(); }
        });
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 5);
            digits.split('').forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
            boxes[Math.min(digits.length, 4)]?.focus();
        });
    });

    const expiryEl = document.getElementById('otp-expiry');
    const resendBtn = document.getElementById('otp-resend');
    CustomerAuth.timers.otp = setInterval(() => {
        const otp = CustomerAuth.otp;
        if (!otp) return clearInterval(CustomerAuth.timers.otp);
        if (!document.getElementById('otp-row')) return clearInterval(CustomerAuth.timers.otp);

        const remain = Math.max(0, otp.expiresAt - Date.now());
        if (expiryEl) {
            if (remain <= 0) expiryEl.textContent = 'منقضی شد';
            else expiryEl.textContent = `${Math.floor(remain / 60000)}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, '0')}`;
        }
        const wait = Math.max(0, CustomerAuth.resendAt - Date.now());
        if (resendBtn) {
            if (wait <= 0) { resendBtn.disabled = false; resendBtn.textContent = 'ارسال مجدد کد'; }
            else { resendBtn.disabled = true; resendBtn.textContent = `ارسال مجدد کد (${Math.floor(wait / 60000)}:${String(Math.floor((wait % 60000) / 1000)).padStart(2, '0')})`; }
        }
    }, 400);
}

function readOtpCode() {
    return [...document.querySelectorAll('#otp-row .otp-box')].map(b => b.value).join('');
}

function resendOtp() {
    if (!CustomerAuth.otp) return;
    sendOtp(CustomerAuth.otp.phone);
}

function verifyOtp() {
    const otp = CustomerAuth.otp;
    if (!otp) return renderAccountLogin('phone', '');
    const boxes = [...document.querySelectorAll('#otp-row .otp-box')];
    const entered = readOtpCode();
    const fail = msg => {
        boxes.forEach(b => b.classList.add('otp-error'));
        renderAccountLogin('otp', otp.phone, msg);
    };
    if (entered.length < 5) return fail('کد ۵ رقمی را کامل وارد کنید.');
    if (Date.now() > otp.expiresAt) return fail('کد تأیید منقضی شده است؛ کد جدید دریافت کنید.');
    if (entered !== otp.code) {
        otp.attempts += 1;
        const remain = 5 - otp.attempts;
        if (remain <= 0) {
            CustomerAuth.otp = null;
            removeSmsSimulator();
            return renderAccountLogin('phone', otp.phone, 'تعداد تلاش‌ها بیش از حد مجاز بود؛ دوباره کد دریافت کنید.');
        }
        return fail(`کد وارد شده درست نیست. ${remain} تلاش باقی مانده است.`);
    }
    // موفق
    boxes.forEach(b => { b.classList.remove('otp-error'); b.classList.add('otp-ok'); });
    clearAccountTimers();
    removeSmsSimulator();
    const account = CustomerAuth.accountFor(otp.phone);
    CustomerAuth.session = otp.phone;
    CustomerAuth.otp = null;
    CustomerAuth.persist();
    updateAccountNav();
    if (!account.name) return renderAccountLogin('name', otp.phone);
    finishLogin();
}

// ---------- گام ۳: نام (اولین ورود) ----------
function submitNameForm(event) {
    event.preventDefault();
    const name = document.getElementById('welcome-name')?.value.trim() || '';
    if (name.length < 3) return renderAccountLogin('name', CustomerAuth.session, 'نام خود را کامل وارد کنید (حداقل ۳ حرف).');
    const account = CustomerAuth.customer;
    if (!account) return renderAccountLogin('phone', '');
    account.name = name;
    account.company = document.getElementById('welcome-company')?.value.trim() || '';
    CustomerAuth.persist();
    updateAccountNav();
    showNotification(`خوش آمدید ${name}!`, 'success');
    finishLogin();
}

function finishLogin() {
    const tab = CustomerAuth.pendingTab || 'overview';
    const highlight = CustomerAuth.pendingHighlight || '';
    CustomerAuth.pendingTab = '';
    CustomerAuth.pendingHighlight = '';
    renderAccountDashboard(tab, highlight);
    try {
        const hash = accountHash(tab, highlight);
        if (location.hash !== hash) history.pushState(null, '', hash);
    } catch (e) {}
}

function logoutCustomer() {
    const name = CustomerAuth.customer?.name || '';
    CustomerAuth.session = null;
    CustomerAuth.persist();
    clearAccountTimers();
    removeSmsSimulator();
    updateAccountNav();
    showNotification(name ? `${name} عزیز، از حساب خارج شدید.` : 'از حساب خارج شدید.', 'info');
    renderAccountLogin('phone', '');
}

// ---------- دکمه حساب در نوار بالا ----------
function updateAccountNav() {
    const btn = document.getElementById('account-nav-button');
    if (!btn) return;
    const c = CustomerAuth.customer;
    if (c && c.name) {
        btn.innerHTML = `<span class="acct-nav-avatar">${escapeHTML(getInitials(c.name))}</span><span class="acct-nav-dot"></span>`;
        btn.setAttribute('aria-label', 'حساب کاربری: ' + c.name);
        btn.setAttribute('title', 'حساب کاربری: ' + c.name);
    } else {
        btn.innerHTML = '<i class="fas fa-user text-xl"></i>';
        btn.setAttribute('aria-label', 'ورود / حساب کاربری');
        btn.setAttribute('title', 'ورود / حساب کاربری');
    }
}

// Auto-hydrate if DOM already loaded and init already ran
try {
    if (typeof CustomerAuth !== 'undefined') {
        CustomerAuth.hydrate();
        if (document.readyState !== 'loading' && typeof updateAccountNav === 'function') updateAccountNav();
    }
} catch(e){}

try { window.CustomerAuth = CustomerAuth; } catch(e){}
