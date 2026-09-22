/* ===== 18-account-auth.js — حساب کاربری: ورود با کد تأیید پیامکی + داشبورد مشتری ===== */
// =============================================
// CUSTOMER ACCOUNT & SMS-OTP LOGIN (mock SMS gateway)
// =============================================
const CustomerAuth = {
    accounts: {},          // { '09123456789': { name, email, company, joinedAt, addresses: [] } }
    session: null,         // phone number of the logged-in customer
    lastPhone: '',         // آخرین شماره استفاده‌شده (برای پیش‌پر کردن ورودی)
    otp: null,             // { phone, code, expiresAt, attempts, sentAt }
    pwFails: {},           // { phone: { count, lockedUntil } } — محدودیت تلاش رمز
    pendingTab: '',
    pendingHighlight: '',
    resendAt: 0,
    timers: {},

    isLoggedIn() { return !!(this.session && this.accounts[this.session]); },

    get customer() { return this.isLoggedIn() ? this.accounts[this.session] : null; },

    persist() {
        saveJSON('prm_customer_accounts', this.accounts);
        saveJSON('prm_customer_session', this.session);
        saveJSON('prm_customer_pwfails', this.pwFails);
    },

    hydrate() {
        this.accounts = loadJSON('prm_customer_accounts', {}) || {};
        this.session = loadJSON('prm_customer_session', null);
        if (this.session && !this.accounts[this.session]) this.session = null;
        // The brute-force lockout survives reloads; drop expired locks.
        this.pwFails = loadJSON('prm_customer_pwfails', {}) || {};
        Object.keys(this.pwFails).forEach(phone => {
            if (!this.pwFails[phone] || (this.pwFails[phone].lockedUntil || 0) < Date.now()) delete this.pwFails[phone];
        });
    },

    accountFor(phone) {
        if (!this.accounts[phone]) {
            this.accounts[phone] = { name: '', email: '', company: '', joinedAt: new Date().toISOString(), addresses: [], password: null };
        }
        return this.accounts[phone];
    }
};

// ---------- ابزارهای شماره موبایل ----------
function toLatinDigits(s) {
    const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
    return String(s == null ? '' : s).replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => AR.indexOf(d));
}

function normalizePhoneInput(raw) {
    let s = toLatinDigits(String(raw || '').trim());
    s = s.replace(/[\s\-().]/g, '');
    if (s.startsWith('+98')) s = '0' + s.slice(3);
    else if (/^0098/.test(s)) s = '0' + s.slice(4);
    else if (/^98\d{10}$/.test(s)) s = '0' + s.slice(2);
    else if (/^9\d{9}$/.test(s)) s = '0' + s;
    return s;
}

// فیلتر زنده فیلد شماره: فقط ارقام؛ پیشوند +98 / 0098 هنگام پیست حذف می‌شود (پیشوند +98 ثابت است)
function filterPhoneInput(input) {
    if (!input) return;
    let digits = toLatinDigits(input.value).replace(/\D/g, '');
    if (digits.startsWith('0098')) digits = digits.slice(4);
    else if (digits.startsWith('98') && digits.length > 10) digits = digits.slice(2);
    input.value = digits.slice(0, 11);
}

function isValidIranPhone(s) { return /^09\d{9}$/.test(s); }

// ---------- رمز عبور (اختیاری، پس از تأیید شماره) ----------
// توجه: این نسخه نمایشی است و همه‌چیز در localStorage می‌ماند؛ رمز هرگز خام ذخیره
// نمی‌شود، اما هش سمت-مرورگر جایگزین هش سمت-سرور (bcrypt/argon2) نیست.
// قرارداد بک‌اند واقعی: POST /api/auth/customer/password  و  POST /api/auth/customer/login
function hashPassword(password, salt) {
    // djb2 با چند دور تکرار — فقط برای این دموی بدون بک‌اند
    let out = '';
    for (let round = 0; round < 4; round++) {
        let h = 5381 + round * 7919;
        const input = salt + '|' + password + '|' + round + '|' + out;
        for (let i = 0; i < input.length; i++) h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
        out += h.toString(36).padStart(7, '0');
    }
    return out;
}

function makePasswordRecord(password) {
    const salt = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    return { salt, hash: hashPassword(password, salt), updatedAt: new Date().toISOString() };
}

function verifyPassword(account, password) {
    const rec = account && account.password;
    if (!rec || !rec.salt || !rec.hash) return false;
    return hashPassword(password, rec.salt) === rec.hash;
}

function hasPassword(phone) {
    const acc = CustomerAuth.accounts[phone];
    return !!(acc && acc.password && acc.password.hash);
}

// سنجش قدرت رمز: ۰ تا ۴
function passwordStrength(pw) {
    const value = String(pw || '');
    if (!value) return { score: 0, label: 'خالی', cls: '' };
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    score = Math.min(4, score);
    const labels = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'عالی'];
    const classes = ['s0', 's1', 's2', 's3', 's4'];
    return { score, label: labels[score], cls: classes[score] };
}

function passwordProblem(pw) {
    const value = String(pw || '');
    if (value.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد.';
    if (!/[A-Za-z]/.test(value)) return 'رمز عبور باید حداقل یک حرف داشته باشد.';
    if (!/\d/.test(value)) return 'رمز عبور باید حداقل یک رقم داشته باشد.';
    return '';
}

// قفل موقت پس از ۵ تلاش ناموفق رمز
function passwordLockRemaining(phone) {
    const rec = CustomerAuth.pwFails[phone];
    if (!rec || !rec.lockedUntil) return 0;
    return Math.max(0, rec.lockedUntil - Date.now());
}

function registerPasswordFailure(phone) {
    const rec = CustomerAuth.pwFails[phone] || { count: 0, lockedUntil: 0 };
    rec.count += 1;
    if (rec.count >= 5) { rec.lockedUntil = Date.now() + 120000; rec.count = 0; }
    CustomerAuth.pwFails[phone] = rec;
    return rec;
}

function clearPasswordFailures(phone) { delete CustomerAuth.pwFails[phone]; }

// نمایش/مخفی کردن رمز
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    if (btn) {
        btn.innerHTML = `<i class="fas fa-${show ? 'eye-slash' : 'eye'}"></i>`;
        btn.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
    }
    input.focus();
}

// به‌روزرسانی زنده نوار قدرت رمز
function onPasswordInput(input, meterId) {
    const meter = document.getElementById(meterId || 'pw-meter');
    if (!meter) return;
    const st = passwordStrength(input.value);
    meter.className = 'acct-pw-meter ' + st.cls;
    const label = meter.querySelector('span');
    if (label) label.textContent = input.value ? st.label : '';
}

function maskPhone(p) { return p ? p.slice(0, 4) + '***' + p.slice(7) : ''; }

function getInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    // Spread by code point so emoji/surrogate pairs never split in half.
    const first = c => [...c][0] || '';
    return parts.length > 1 ? first(parts[0]) + '‌' + first(parts[1]) : first(parts[0]);
}

// ---------- چرخه ورود با پیامک ----------
function clearAccountTimers() {
    Object.values(CustomerAuth.timers).forEach(t => { clearInterval(t); clearTimeout(t); });
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
                <span class="sms-sim-code-wrap" dir="ltr">
                    <span class="sms-sim-code">${code}</span>
                    <button class="sms-sim-copy" onclick="copySmsCode('${code}')" title="کپی کد" aria-label="کپی کد تأیید"><i class="fas fa-copy"></i></button>
                </span>
                <br>
                <span class="text-xs text-gray-400">برای <span dir="ltr">${maskPhone(phone)}</span> ارسال شد.</span>
                <button class="sms-sim-fill" onclick="fillOtpFromSms('${code}')"><i class="fas fa-wand-magic-sparkles ml-1"></i>وارد کردن خودکار کد</button>
            </div>
        </div>`;
    document.body.appendChild(holder);
}

// پر کردن یک‌کلیکی خانه‌های کد از روی پیامک شبیه‌سازی‌شده
function fillOtpFromSms(code) {
    const boxes = [...document.querySelectorAll('#otp-row .otp-box')];
    if (!boxes.length) return copySmsCode(code);
    hideOtpError();
    String(code).split('').forEach((d, i) => {
        if (boxes[i]) { boxes[i].value = d; boxes[i].classList.remove('otp-error'); }
    });
    boxes[boxes.length - 1].focus();
    if (typeof scheduleOtpAutoVerify === 'function') scheduleOtpAutoVerify();
}

function copySmsCode(code) {
    const done = () => showNotification('کد کپی شد؛ کافی است در خانه اول پیست کنید.', 'success');
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(fallback);
    } else fallback();
}

function sendOtp(phone, intent = '') {
    CustomerAuth.lastPhone = phone;
    CustomerAuth.pwIntent = intent; // 'reset' → پس از تأیید، حتماً رمز تازه بگیر
    const code = String(Math.floor(10000 + Math.random() * 90000));
    // Resending must not reset the brute-force counter for the same number.
    const keptAttempts = CustomerAuth.otp && CustomerAuth.otp.phone === phone ? CustomerAuth.otp.attempts : 0;
    CustomerAuth.otp = { phone, code, expiresAt: Date.now() + 120000, attempts: keptAttempts, sentAt: Date.now() };
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
    const TABS = ['overview', 'orders', 'saved', 'addresses', 'profile'];
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
    // مسیر «ورود با رمز» دو مرحله دارد؛ مسیر پیامکی سه مرحله
    const steps = step === 'password'
        ? [{ key: 'phone', label: 'شماره موبایل' }, { key: 'password', label: 'رمز عبور' }]
        : [
            { key: 'phone', label: 'شماره موبایل' },
            { key: 'otp', label: 'کد تأیید' },
            { key: step === 'setpw' ? 'setpw' : 'name', label: step === 'setpw' ? 'ساخت رمز عبور' : 'تکمیل پروفایل' }
        ];
    const idx = steps.findIndex(s => s.key === step);
    return `<div class="acct-steps">${steps.map((s, i) => {
        const cls = i < idx ? 'done' : i === idx ? 'active' : '';
        const icon = i < idx ? '<i class="fas fa-check"></i>' : (i + 1);
        return `<span class="acct-step ${cls}"><b>${icon}</b><span>${s.label}</span></span>${i < steps.length - 1 ? '<span class="acct-step-line"></span>' : ''}`;
    }).join('')}</div>`;
}

function accountHeroHTML() {
    return `
    <aside class="acct-hero">
        <div class="acct-hero-dots"></div>
        <div class="acct-hero-glow"></div>
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
            <g class="acct-spin" fill="url(#acctGold)" stroke="#7d5204" stroke-width="1">
                <circle cx="160" cy="100" r="11"></circle>
                <circle cx="142.4" cy="142.4" r="11"></circle>
                <circle cx="100" cy="160" r="11"></circle>
                <circle cx="57.6" cy="142.4" r="11"></circle>
                <circle cx="40" cy="100" r="11"></circle>
                <circle cx="57.6" cy="57.6" r="11"></circle>
                <circle cx="100" cy="40" r="11"></circle>
                <circle cx="142.4" cy="57.6" r="11"></circle>
            </g>
            <g class="acct-spin-rev" fill="none" stroke="rgba(255,209,102,.5)" stroke-width="2" stroke-dasharray="10 14">
                <circle cx="100" cy="100" r="58"></circle>
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
        <div class="acct-hero-metrics">
            <div><b>${formatNumber(ProductDatabase.length)}+</b><span>کد کالای فعال</span></div>
            <div><b>${formatNumber(new Set(ProductDatabase.map(p => p.brand)).size)}</b><span>برند معتبر</span></div>
            <div><b>۲۴/۷</b><span>ثبت سفارش آنلاین</span></div>
        </div>
    </aside>`;
}

function accountBrandmarkHTML() {
    return `
    <div class="acct-brandmark">
        <span class="mark"><i class="fas fa-circle-notch"></i></span>
        <b>برینگ آنلاین<i class="sub">پنل مشتریان صنعتی</i></b>
    </div>`;
}

// اعتبارسنجی زنده شماره موبایل (تیک سبز داخل فیلد)
function onPhoneInput(input) {
    filterPhoneInput(input);
    const field = document.getElementById('login-phone-field');
    if (!field) return;
    const ok = isValidIranPhone(normalizePhoneInput(input.value));
    field.classList.toggle('is-valid', ok);
    if (ok) {
        field.classList.remove('input-error');
        document.getElementById('login-phone-error')?.classList.add('hidden');
    }
}

function renderAccountLogin(step, phone, message = '') {
    clearAccountTimers();
    const container = document.getElementById('account-content');
    if (!container) return;

    // شماره برای پیش‌پر: بدون صفر ابتدایی تا با پسوند +98 همخوان باشد
    const prefillPhone = (phone || CustomerAuth.lastPhone || '9121234567').replace(/^0(?=9)/, '');

    let formHTML = '';

    if (step === 'phone') {
        formHTML = `
            ${accountBrandmarkHTML()}
            ${accountStepsHTML('phone')}
            <h2 class="text-2xl font-black text-gray-900 acct-rise acct-d1" data-en="Login / Register" data-fa="ورود یا ثبت‌نام">ورود یا ثبت‌نام</h2>
            <p class="text-sm text-gray-500 mt-2 mb-6 acct-rise acct-d2">شماره موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود.</p>
            ${message ? `<div class="acct-msg-error mb-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <form onsubmit="submitPhoneForm(event)" novalidate class="acct-rise acct-d3">
                <label class="block text-sm font-bold text-gray-600 mb-2" for="login-phone">شماره موبایل</label>
                <div class="acct-phone-field" id="login-phone-field">
                    <input id="login-phone" type="tel" inputmode="numeric" autocomplete="tel" dir="ltr"
                           placeholder="9123456789" value="${escapeHTML(prefillPhone)}"
                           oninput="onPhoneInput(this)"
                           onkeydown="if(event.key==='Enter'){event.preventDefault();submitPhoneForm(event);}">
                    <span class="acct-phone-check" aria-hidden="true"><i class="fas fa-check"></i></span>
                    <span class="acct-phone-prefix"><i class="fas fa-mobile-screen ml-1"></i> +98</span>
                </div>
                <div id="login-phone-error" class="hidden acct-msg-error mt-3"><i class="fas fa-circle-exclamation"></i><span></span></div>
                <button type="submit" class="acct-btn-primary w-full mt-6">
                    <i class="fas fa-paper-plane"></i>
                    دریافت کد تأیید
                </button>
            </form>
            <div class="acct-trust acct-rise acct-d4">
                <span><i class="fas fa-lock"></i>ورود امن بدون رمز عبور</span>
                <span><i class="fas fa-bolt"></i>کمتر از ۳۰ ثانیه</span>
                <span><i class="fas fa-shield-halved"></i>اطلاعات شما محرمانه است</span>
            </div>
            <div class="acct-demo-note mt-4 acct-rise acct-d5">
                <i class="fas fa-flask mt-1"></i>
                <span>نسخه نمایشی: پیامک واقعی ارسال نمی‌شود؛ کد تأیید به‌صورت شبیه‌سازی‌شده در یک پیامک روی صفحه نمایش داده می‌شود. شماره پیش‌فرض برای تست است؛ می‌توانید شماره خود را جایگزین کنید.</span>
            </div>
            <p class="text-[11.5px] leading-6 text-gray-400 mt-4">
                ورود شما به معنای پذیرش شرایط استفاده و حریم خصوصی برینگ آنلاین است.
            </p>`;
    } else if (step === 'password') {
        const account = CustomerAuth.accounts[phone] || {};
        const hello = account.name ? escapeHTML(account.name.split(/\s+/)[0]) : '';
        formHTML = `
            ${accountBrandmarkHTML()}
            ${accountStepsHTML('password')}
            <h2 class="text-2xl font-black text-gray-900 acct-rise acct-d1">${hello ? hello + ' عزیز، خوش آمدی 👋' : 'ورود با رمز عبور'}</h2>
            <p class="text-sm text-gray-500 mt-2 acct-rise acct-d2">رمز حساب <b class="text-gray-800" dir="ltr">${maskPhone(phone)}</b> را وارد کنید.</p>
            <button onclick="renderAccountLogin('phone','${escapeHTML(phone)}')" class="text-xs font-bold text-blue-600 mt-1 hover:underline">
                <i class="fas fa-pen ml-1"></i>ورود با شماره دیگر
            </button>
            ${message ? `<div class="acct-msg-error mb-1 mt-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <form onsubmit="submitPasswordForm(event)" novalidate class="mt-5 acct-rise acct-d3">
                <label class="block text-sm font-bold text-gray-600 mb-2" for="login-password">رمز عبور</label>
                <div class="acct-pw-wrap">
                    <input id="login-password" class="acct-input" type="password" autocomplete="current-password" placeholder="رمز عبور خود را وارد کنید">
                    <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('login-password', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                </div>
                <div id="login-password-error" class="hidden acct-msg-error mt-3"><i class="fas fa-circle-exclamation"></i><span></span></div>
                <button type="submit" class="acct-btn-primary w-full mt-5"><i class="fas fa-right-to-bracket"></i>ورود به حساب</button>
            </form>
            <div class="acct-alt-row">
                <button onclick="loginWithOtpInstead()" class="acct-btn-ghost w-full"><i class="fas fa-comment-sms"></i>ورود با کد پیامکی</button>
                <button onclick="forgotPassword()" class="acct-link-btn">رمز را فراموش کرده‌ام</button>
            </div>
            <div class="acct-trust acct-rise acct-d4">
                <span><i class="fas fa-lock"></i>رمز شما رمزنگاری‌شده ذخیره می‌شود</span>
                <span><i class="fas fa-shield-halved"></i>قفل خودکار پس از ۵ تلاش ناموفق</span>
            </div>`;
    } else if (step === 'otp') {
        formHTML = `
            ${accountBrandmarkHTML()}
            ${accountStepsHTML('otp')}
            <h2 class="text-2xl font-black text-gray-900 acct-rise acct-d1">کد تأیید را وارد کنید</h2>
            <p class="text-sm text-gray-500 mt-2 acct-rise acct-d2">کد ۵ رقمی ارسال‌شده به <b class="text-gray-800" dir="ltr">${maskPhone(phone)}</b> را وارد کنید.</p>
            <button onclick="renderAccountLogin('phone','${escapeHTML(phone)}')" class="text-xs font-bold text-blue-600 mt-1 hover:underline">
                <i class="fas fa-pen ml-1"></i>ویرایش شماره
            </button>
            ${message ? `<div class="acct-msg-error mb-1 mt-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <div id="otp-error-msg" class="hidden acct-msg-error mt-4"><i class="fas fa-circle-exclamation"></i><span></span></div>
            <div class="otp-row acct-rise acct-d3" id="otp-row">
                ${[0, 1, 2, 3, 4].map(i => `<input class="otp-box" inputmode="numeric" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="رقم ${i + 1} کد تأیید">`).join('')}
            </div>
            <p class="text-[11.5px] text-gray-400 text-center mt-1">کد را می‌توانید مستقیم در خانه اول پیست کنید؛ به‌محض تکمیل ۵ رقم، خودکار بررسی می‌شود.</p>
            <div class="otp-timebar" id="otp-timebar"><i></i></div>
            <div class="otp-meta">
                <span><i class="fas fa-stopwatch ml-1"></i>اعتبار کد: <b id="otp-expiry">۲:۰۰</b></span>
                <button id="otp-resend" class="otp-resend" onclick="resendOtp()" disabled>ارسال مجدد کد</button>
            </div>
            <button id="otp-verify-btn" onclick="verifyOtp()" class="acct-btn-primary w-full mt-5"><i class="fas fa-shield-halved"></i>تأیید کد و ورود</button>
            <div class="acct-demo-note mt-5">
                <i class="fas fa-flask mt-1"></i>
                <span>پیامک شبیه‌سازی‌شده حاوی کد، پایین صفحه نمایش داده شده است؛ با دکمه «وارد کردن خودکار کد» می‌توانید آن را یک‌جا پر کنید.</span>
            </div>`;
    } else if (step === 'name') {
        formHTML = `
            ${accountBrandmarkHTML()}
            ${accountStepsHTML('name')}
            <div class="flex items-center gap-3 mb-5 acct-rise acct-d1">
                <div class="acct-avatar" style="width:58px;height:58px;border-radius:18px;font-size:22px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#123a92;border-color:#bfdbfe;">
                    <i class="fas fa-user-check"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-gray-900">شماره تأیید شد!</h2>
                    <p class="text-sm text-gray-500 mt-1">خوش آمدید؛ برای تکمیل حساب، نام خود را بنویسید.</p>
                </div>
            </div>
            ${message ? `<div class="acct-msg-error mb-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <form onsubmit="submitNameForm(event)" novalidate class="acct-rise acct-d2">
                <div class="acct-float">
                    <input id="welcome-name" class="acct-input" placeholder=" " autocomplete="name">
                    <label for="welcome-name">نام و نام خانوادگی</label>
                </div>
                <div class="acct-float mt-3">
                    <input id="welcome-company" class="acct-input" placeholder=" ">
                    <label for="welcome-company">نام شرکت / مجموعه (اختیاری)</label>
                </div>
                <button type="submit" class="acct-btn-primary w-full mt-6"><i class="fas fa-user-check"></i>ورود به حساب کاربری</button>
            </form>
            <div class="acct-trust acct-rise acct-d3">
                <span><i class="fas fa-user-shield"></i>اطلاعات فقط برای صدور فاکتور استفاده می‌شود</span>
            </div>`;
    } else if (step === 'setpw') {
        const resetting = hasPassword(phone);
        formHTML = `
            ${accountBrandmarkHTML()}
            ${accountStepsHTML('setpw')}
            <div class="flex items-center gap-3 mb-4 acct-rise acct-d1">
                <div class="acct-avatar" style="width:58px;height:58px;border-radius:18px;font-size:22px;background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#15803d;border-color:#bbf7d0;">
                    <i class="fas fa-key"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-gray-900">${resetting ? 'رمز تازه بسازید' : 'یک رمز عبور بسازید'}</h2>
                    <p class="text-sm text-gray-500 mt-1">دفعه بعد می‌توانید بدون منتظرماندن برای پیامک وارد شوید.</p>
                </div>
            </div>
            ${message ? `<div class="acct-msg-error mb-4"><i class="fas fa-circle-exclamation"></i><span>${message}</span></div>` : ''}
            <form onsubmit="submitSetPasswordForm(event)" novalidate class="acct-rise acct-d2">
                <label class="block text-sm font-bold text-gray-600 mb-2" for="new-password">رمز عبور جدید</label>
                <div class="acct-pw-wrap">
                    <input id="new-password" class="acct-input" type="password" autocomplete="new-password" placeholder="حداقل ۸ کاراکتر شامل حرف و رقم" oninput="onPasswordInput(this,'pw-meter')">
                    <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('new-password', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                </div>
                <div class="acct-pw-meter" id="pw-meter"><i></i><i></i><i></i><i></i><span></span></div>
                <label class="block text-sm font-bold text-gray-600 mb-2 mt-4" for="new-password-2">تکرار رمز عبور</label>
                <div class="acct-pw-wrap">
                    <input id="new-password-2" class="acct-input" type="password" autocomplete="new-password" placeholder="رمز را دوباره وارد کنید">
                    <button type="button" class="acct-pw-eye" onclick="togglePasswordVisibility('new-password-2', this)" aria-label="نمایش رمز"><i class="fas fa-eye"></i></button>
                </div>
                <div id="setpw-error" class="hidden acct-msg-error mt-3"><i class="fas fa-circle-exclamation"></i><span></span></div>
                <button type="submit" class="acct-btn-primary w-full mt-5"><i class="fas fa-shield-halved"></i>ذخیره رمز و ورود</button>
            </form>
            <div class="acct-alt-row">
                <button onclick="skipSetPassword()" class="acct-btn-ghost w-full"><i class="fas fa-forward"></i>فعلاً نه، بعداً می‌سازم</button>
            </div>
            <div class="acct-demo-note mt-4">
                <i class="fas fa-circle-info mt-1"></i>
                <span>ورود با کد پیامکی همیشه فعال می‌ماند؛ رمز فقط یک راه سریع‌تر است. هر زمان می‌توانید از «پروفایل و امنیت» رمز را تغییر دهید یا بردارید.</span>
            </div>`;
    }

    container.innerHTML = `
        <div class="acct-wrap acct-login-wrap">
            <div class="acct-login-card">
                <div class="acct-form-side">${formHTML}</div>
                ${accountHeroHTML()}
            </div>
        </div>`;

    if (step === 'otp') initOtpInputs();
    if (step === 'phone') {
        const phoneInput = container.querySelector('#login-phone');
        if (phoneInput) onPhoneInput(phoneInput);
    }
    const FOCUS_BY_STEP = { phone: '#login-phone', otp: '.otp-box', password: '#login-password', setpw: '#new-password', name: '#welcome-name' };
    const focusTarget = container.querySelector(FOCUS_BY_STEP[step] || '#welcome-name');
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
    CustomerAuth.lastPhone = phone;
    // اگر برای این شماره رمز ساخته شده، مستقیم صفحه رمز باز می‌شود (بدون پیامک)
    if (hasPassword(phone)) return renderAccountLogin('password', phone);
    sendOtp(phone);
}

// ---------- گام ۲-الف: ورود با رمز عبور ----------
function submitPasswordForm(event) {
    event.preventDefault();
    const phone = CustomerAuth.lastPhone;
    const input = document.getElementById('login-password');
    const errorBox = document.getElementById('login-password-error');
    const account = CustomerAuth.accounts[phone];
    const fail = msg => {
        input?.classList.add('input-error');
        if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.querySelector('span').textContent = msg;
        }
        input?.focus();
        input?.select();
    };
    if (!account) return renderAccountLogin('phone', phone);

    const lock = passwordLockRemaining(phone);
    if (lock > 0) {
        return fail(`به دلیل تلاش‌های ناموفق، ورود با رمز تا ${Math.ceil(lock / 1000)} ثانیه دیگر قفل است؛ می‌توانید با کد پیامکی وارد شوید.`);
    }
    const value = input ? input.value : '';
    if (!value) return fail('رمز عبور را وارد کنید.');
    if (!verifyPassword(account, value)) {
        const rec = registerPasswordFailure(phone);
        if (passwordLockRemaining(phone) > 0) {
            return fail('۵ بار رمز اشتباه وارد شد؛ ورود با رمز ۲ دقیقه قفل شد. با کد پیامکی وارد شوید.');
        }
        return fail(`رمز عبور درست نیست. ${5 - rec.count} تلاش تا قفل موقت باقی است.`);
    }
    clearPasswordFailures(phone);
    input?.classList.remove('input-error');
    CustomerAuth.session = phone;
    CustomerAuth.persist();
    updateAccountNav();
    showNotification(account.name ? `خوش آمدید ${account.name}!` : 'وارد حساب خود شدید.', 'success');
    if (!account.name) return renderAccountLogin('name', phone);
    finishLogin();
}

// فراموشی رمز → بازگشت به مسیر پیامکی با نیت «تعریف رمز تازه»
function forgotPassword() {
    const phone = CustomerAuth.lastPhone;
    if (!phone) return renderAccountLogin('phone', '');
    showNotification('برای بازنشانی رمز، ابتدا شماره را با کد پیامکی تأیید کنید.', 'info');
    sendOtp(phone, 'reset');
}

// ورود با کد پیامکی به‌جای رمز (بدون بازنشانی رمز فعلی)
function loginWithOtpInstead() {
    const phone = CustomerAuth.lastPhone;
    if (!phone) return renderAccountLogin('phone', '');
    sendOtp(phone);
}

// ---------- گام ۲: کد تأیید ----------
function hideOtpError() {
    const box = document.getElementById('otp-error-msg');
    if (box) { box.classList.add('hidden'); box.querySelector('span').textContent = ''; }
}

function showOtpError(msg, clearBoxes) {
    const box = document.getElementById('otp-error-msg');
    if (box) { box.querySelector('span').textContent = msg; box.classList.remove('hidden'); }
    const row = document.getElementById('otp-row');
    if (row) {
        row.classList.remove('shake');
        void row.offsetWidth; // ری‌استارت انیمیشن
        row.classList.add('shake');
    }
    document.querySelectorAll('#otp-row .otp-box').forEach(b => b.classList.add('otp-error'));
    if (clearBoxes) {
        setTimeout(() => {
            const bs = [...document.querySelectorAll('#otp-row .otp-box')];
            // اگر کاربر دوباره تایپ کرده باشد (کلاس otp-error حذف شده) پاک نکنیم
            if (!bs.length || bs.some(b => !b.classList.contains('otp-error'))) return;
            bs.forEach(b => { b.value = ''; b.classList.remove('otp-error'); });
            bs[0].focus();
        }, 750);
    }
}

function scheduleOtpAutoVerify() {
    if (CustomerAuth.timers.otpAuto) { clearTimeout(CustomerAuth.timers.otpAuto); CustomerAuth.timers.otpAuto = null; }
    CustomerAuth.timers.otpAuto = setTimeout(() => {
        CustomerAuth.timers.otpAuto = null;
        if (readOtpCode().length === 5) verifyOtp();
    }, 320);
}

function cancelOtpAutoVerify() {
    if (CustomerAuth.timers.otpAuto) { clearTimeout(CustomerAuth.timers.otpAuto); CustomerAuth.timers.otpAuto = null; }
}

function initOtpInputs() {
    const boxes = [...document.querySelectorAll('#otp-row .otp-box')];
    if (!boxes.length) return;

    const digitsOf = v => toLatinDigits(v).replace(/\D/g, '');

    // پخش یک کد کامل (پست یا اتوفیل مرورگر) از خانه‌ای که وارد شده به همه خانه‌ها
    const distribute = (digits, start = 0) => {
        digits.split('').forEach((d, j) => {
            const t = boxes[start + j];
            if (t) { t.value = d; t.classList.remove('otp-error'); }
        });
        boxes[Math.min(start + digits.length, boxes.length - 1)].focus();
        if (readOtpCode().length === boxes.length) scheduleOtpAutoVerify();
    };

    boxes.forEach((box, i) => {
        box.addEventListener('input', () => {
            const v = digitsOf(box.value);
            hideOtpError();
            if (v.length > 1) { distribute(v, i); return; } // کل کد پست/اتوفیل شد
            box.classList.remove('otp-error');
            box.value = v;
            if (box.value) {
                if (i < boxes.length - 1) boxes[i + 1].focus();
                else if (readOtpCode().length === boxes.length) scheduleOtpAutoVerify();
            } else {
                cancelOtpAutoVerify();
            }
        });
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].select(); }
            if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); boxes[i - 1].focus(); }
            if (e.key === 'ArrowRight' && i < boxes.length - 1) { e.preventDefault(); boxes[i + 1].focus(); }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (readOtpCode().length === boxes.length) verifyOtp();
                else boxes.find(b => !b.value)?.focus();
            }
        });
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const digits = digitsOf(e.clipboardData.getData('text')).slice(0, boxes.length);
            if (digits) distribute(digits, i);
        });
    });

    const expiryEl = document.getElementById('otp-expiry');
    const resendBtn = document.getElementById('otp-resend');
    const timebar = document.getElementById('otp-timebar');
    CustomerAuth.timers.otp = setInterval(() => {
        const otp = CustomerAuth.otp;
        if (!otp) return clearInterval(CustomerAuth.timers.otp);
        if (!document.getElementById('otp-row')) return clearInterval(CustomerAuth.timers.otp);

        const remain = Math.max(0, otp.expiresAt - Date.now());
        if (timebar) {
            const total = Math.max(1, otp.expiresAt - otp.sentAt);
            const ratio = Math.max(0, Math.min(1, remain / total));
            timebar.firstElementChild.style.width = (ratio * 100) + '%';
            timebar.classList.toggle('is-low', ratio < 0.25);
        }
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
    if (CustomerAuth.timers.otpVerifying) return;
    const boxes = [...document.querySelectorAll('#otp-row .otp-box')];
    const entered = readOtpCode();
    if (entered.length < 5) return showOtpError('کد ۵ رقمی را کامل وارد کنید.', false);
    if (Date.now() > otp.expiresAt) return showOtpError('کد تأیید منقضی شده است؛ کد جدید دریافت کنید.', false);
    if (entered !== otp.code) {
        otp.attempts += 1;
        const remain = 5 - otp.attempts;
        if (remain <= 0) {
            CustomerAuth.otp = null;
            removeSmsSimulator();
            return renderAccountLogin('phone', otp.phone, 'تعداد تلاش‌ها بیش از حد مجاز بود؛ دوباره کد دریافت کنید.');
        }
        return showOtpError(`کد وارد شده درست نیست. ${remain} تلاش باقی مانده است.`, true);
    }
    // موفق: تأیید خودکار — نمایش کوتاه «در حال ورود» و سپس ادامه
    CustomerAuth.timers.otpVerifying = true;
    cancelOtpAutoVerify();
    boxes.forEach(b => { b.classList.remove('otp-error'); b.classList.add('otp-ok'); b.readOnly = true; });
    const btn = document.getElementById('otp-verify-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>در حال تأیید…'; }
    setTimeout(() => {
        CustomerAuth.timers.otpVerifying = false;
        clearAccountTimers();
        removeSmsSimulator();
        const account = CustomerAuth.accountFor(otp.phone);
        const intent = CustomerAuth.pwIntent;
        CustomerAuth.session = otp.phone;
        CustomerAuth.otp = null;
        CustomerAuth.pwIntent = '';
        clearPasswordFailures(otp.phone);
        CustomerAuth.persist();
        updateAccountNav();
        if (!account.name) return renderAccountLogin('name', otp.phone);
        // بازنشانی رمز، یا پیشنهاد ساخت رمز به کسی که هنوز رمز ندارد
        if (intent === 'reset' || !hasPassword(otp.phone)) return renderAccountLogin('setpw', otp.phone);
        finishLogin();
    }, 450);
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
    // کاربر تازه: پیشنهاد ساخت رمز برای ورودهای بعدی
    if (!hasPassword(CustomerAuth.session)) return renderAccountLogin('setpw', CustomerAuth.session);
    finishLogin();
}

// ---------- گام ۳-ب: ساخت / بازنشانی رمز عبور ----------
function submitSetPasswordForm(event) {
    event.preventDefault();
    const account = CustomerAuth.customer;
    if (!account) return renderAccountLogin('phone', '');
    const pw = document.getElementById('new-password')?.value || '';
    const pw2 = document.getElementById('new-password-2')?.value || '';
    const errorBox = document.getElementById('setpw-error');
    const fail = msg => {
        if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.querySelector('span').textContent = msg;
        }
        document.getElementById('new-password')?.focus();
    };
    const problem = passwordProblem(pw);
    if (problem) return fail(problem);
    if (pw !== pw2) return fail('دو رمز واردشده یکسان نیستند.');
    account.password = makePasswordRecord(pw);
    CustomerAuth.persist();
    clearPasswordFailures(CustomerAuth.session);
    showNotification('رمز عبور ساخته شد؛ دفعه بعد می‌توانید با رمز وارد شوید.', 'success');
    finishLogin();
}

// «فعلاً نه» — ورود بدون ساخت رمز
function skipSetPassword() {
    showNotification('بدون رمز ادامه دادید؛ هر وقت خواستید از تب «پروفایل و امنیت» رمز بسازید.', 'info');
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
    try { history.replaceState(null, '', '#/account'); } catch (e) {}
    renderAccountLogin('phone', '');
}

// ---------- پُر کردن خودکار فرم‌ها از روی حساب کاربری ----------
// هر فرمی که نام/موبایل/آدرس می‌خواهد از این‌جا مقدار می‌گیرد تا کاربرِ واردشده
// مجبور نباشد دوباره اطلاعاتش را تایپ کند.
function customerContact() {
    if (typeof CustomerAuth === 'undefined' || !CustomerAuth.isLoggedIn()) return null;
    const c = CustomerAuth.customer || {};
    const addresses = c.addresses || [];
    const addr = addresses.find(a => a.isDefault) || addresses[0] || null;
    return {
        name: c.name || '',
        phone: CustomerAuth.session || '',
        company: c.company || '',
        email: c.email || '',
        address: addr
    };
}

// فقط فیلدهای خالی را پر می‌کند تا چیزی که کاربر خودش نوشته بازنویسی نشود.
function fillIfEmpty(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el || !value) return false;
    if (String(el.value || '').trim()) return false;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}

// پاک کردن مقادیری که قبلاً خودکار پر شده بودند (مثلاً پس از خروج از حساب)
function clearAutofilled(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.getAttribute('data-autofilled') !== '1') return;
        el.value = '';
        el.removeAttribute('data-autofilled');
        el.removeAttribute('data-autofill-first');
        el.classList.remove('is-autofilled');
    });
}

// نوار «به‌نام ... ثبت می‌شود» بالای فرم‌های پرشده
function autofillNoticeHTML(contact, extra = '') {
    if (!contact) return '';
    return `
    <div class="acct-autofill-note" role="status">
        <span class="acct-autofill-avatar">${escapeHTML(getInitials(contact.name) || '؟')}</span>
        <span class="acct-autofill-text">
            به‌نام <b>${escapeHTML(contact.name || 'حساب شما')}</b>
            <span dir="ltr">${escapeHTML(maskPhone(contact.phone))}</span> ثبت می‌شود.
            ${extra}
        </span>
        <button type="button" class="acct-autofill-edit" onclick="unlockAutofill(this)">ویرایش</button>
    </div>`;
}

// کاربر می‌خواهد اطلاعات دیگری وارد کند → فیلدهای پرشده را خالی و قابل ویرایش کن
function unlockAutofill(btn) {
    const note = btn.closest('.acct-autofill-note');
    if (!note) return;
    const scope = note.closest('form') || document;
    scope.querySelectorAll('[data-autofilled="1"]').forEach(el => {
        el.value = '';
        el.removeAttribute('data-autofilled');
        el.classList.remove('is-autofilled');
    });
    note.remove();
    scope.querySelector('[data-autofill-first]')?.focus();
}

// علامت‌گذاری فیلدهایی که خودکار پر شده‌اند
function markAutofilled(ids) {
    let first = true;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !String(el.value || '').trim()) return;
        el.setAttribute('data-autofilled', '1');
        el.classList.add('is-autofilled');
        if (first) { el.setAttribute('data-autofill-first', '1'); first = false; }
    });
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
