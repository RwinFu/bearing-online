/* ===== 11-leads.js — میز تامین سریع و مدیریت لیدها ===== */
// =============================================
// LEAD CAPTURE / FAST SOURCING
// =============================================
function openLeadModal(source = 'manual', prefill = '') {
    const modal = document.getElementById('lead-modal');
    const sourceInput = document.getElementById('lead-source');
    const partInput = document.getElementById('lead-part');
    const title = document.getElementById('lead-modal-title');
    const subtitle = document.getElementById('lead-modal-subtitle');
    const kicker = document.getElementById('lead-modal-kicker');

    sourceInput.value = source;
    partInput.value = prefill || (source === 'failed-search' ? AppState.lastSearch : '');

    if (source === 'consultation') {
        kicker.textContent = AppState.language === 'fa' ? 'مشاوره مهندسی همیشه فعال' : 'Always-on engineering support';
        title.textContent = AppState.language === 'fa' ? 'قبل از خرید، انتخاب قطعه را با مهندس چک کنید.' : 'Before purchase, verify the selection with an engineer.';
        subtitle.textContent = AppState.language === 'fa'
            ? 'کاربری دستگاه، بار، سرعت، دما و برند پیشنهادی را ارسال کنید تا سریع‌ترین مسیر انتخاب و خرید مشخص شود.'
            : 'Send application, load, speed, temperature, and preferred brand so we can shorten the path to selection and purchase.';
    } else if (source === 'failed-search') {
        kicker.textContent = AppState.language === 'fa' ? 'تبدیل جستجوی ناموفق به لید' : 'Failed search to lead';
        title.textContent = AppState.language === 'fa' ? 'قطعه را پیدا نکردید؟ ما تامین می‌کنیم.' : 'Could not find it? We will source it.';
        subtitle.textContent = AppState.language === 'fa'
            ? 'جستجوی ناموفق شما آماده ثبت است. شماره تماس را وارد کنید تا تیم فروش و مهندسی قیمت، معادل و زمان تحویل را اعلام کند.'
            : 'Your failed search is ready to submit. Add contact details and our sales + engineering team will return price, equivalents, and lead time.';
    } else {
        kicker.textContent = AppState.language === 'fa' ? 'میز تامین سریع' : 'Fast sourcing desk';
        title.textContent = AppState.language === 'fa' ? 'سفارش سریع قطعه صنعتی' : 'Fast custom industrial part request';
        subtitle.textContent = AppState.language === 'fa'
            ? 'اگر کد دقیق را دارید، عکس یا مشخصات را وارد کنید. اگر مطمئن نیستید، تیم مهندسی انتخاب را بررسی می‌کند.'
            : 'Enter the exact code, photo/spec notes, or application. If unsure, engineering will validate the selection.';
    }

    // Always open on the form: a previous submit may have left the success card.
    document.getElementById('lead-success')?.classList.add('hidden');
    document.getElementById('lead-form')?.classList.remove('hidden');

    modal.classList.remove('hidden');
    setTimeout(() => partInput.focus(), 100);
    initRipple();
    initMagnetic();
}

function closeLeadModal() {
    document.getElementById('lead-modal').classList.add('hidden');
    document.getElementById('lead-success')?.classList.add('hidden');
    document.getElementById('lead-form')?.classList.remove('hidden');
}

// Tracking code shown to the customer right after submitting a request
// (price quote, engineering consultation, fast part registration).
function newLeadTrackingCode() {
    const base = 'REQ-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
    let code = base, n = 1;
    while (AppState.leads.some(item => item.id === code)) code = base + '-' + (++n);
    return code;
}

// The mobile number in international form, for the WhatsApp follow-up link.
function leadWhatsappNumber(phone) {
    return String(phone || '').replace(/[^0-9]/g, '').replace(/^0/, '98');
}

function submitLead(event) {
    event.preventDefault();
    const lead = {
        id: newLeadTrackingCode(),
        source: document.getElementById('lead-source').value,
        part: document.getElementById('lead-part').value.trim(),
        quantity: parseInt(document.getElementById('lead-qty').value) || 1,
        dimensions: {
            d: document.getElementById('lead-d').value,
            D: document.getElementById('lead-D').value,
            B: document.getElementById('lead-B').value
        },
        name: document.getElementById('lead-name').value.trim(),
        phone: document.getElementById('lead-phone').value.trim(),
        notes: document.getElementById('lead-notes').value.trim(),
        fileName: document.getElementById('lead-file').files[0]?.name || '',
        status: 'new',
        createdAt: new Date().toLocaleString('fa-IR')
    };

    AppState.leads.unshift(lead);
    persistState();
    document.getElementById('lead-form').reset();
    document.getElementById('lead-qty').value = 1;
    showLeadSuccess(lead);
    renderAdminLeads();
    renderAccountLeads();
    showNotification(
        AppState.language === 'en'
            ? `Request ${lead.id} saved. We call/WhatsApp you and the answer appears in Orders → My requests.`
            : `درخواست با کد ${lead.id} ثبت شد. پاسخ از طریق تماس/واتس‌اپ و در «سفارش‌ها ← درخواست‌های من» اعلام می‌شود.`,
        'success'
    );
}

// Success card inside the lead modal: tracking code + the exact channels the
// answer comes back through, so the customer never has to guess.
function showLeadSuccess(lead) {
    const form = document.getElementById('lead-form');
    const success = document.getElementById('lead-success');
    if (!form || !success) { closeLeadModal(); return; }
    const en = AppState.language === 'en';
    document.getElementById('lead-success-code').textContent = lead.id;
    document.getElementById('lead-success-part').textContent =
        `${lead.part} × ${lead.quantity} — ${leadSourceLabel(lead.source)}`;
    document.getElementById('lead-success-channels').innerHTML = [
        `<i class="fas fa-phone-volume ml-1 text-blue-600"></i>${en ? 'Call on ' : 'تماس با '}<b dir="ltr">${escapeHTML(lead.phone)}</b>${en ? ' (usually under 2 working hours)' : ' (معمولاً کمتر از ۲ ساعت کاری)'}`,
        `<i class="fab fa-whatsapp ml-1 text-green-600"></i>${en ? 'WhatsApp reply on the same number' : 'پاسخ واتس‌اپ روی همین شماره'}`,
        `<i class="fas fa-user-gear ml-1 text-blue-600"></i>${en ? 'Written answer from the engineering desk in Orders → My requests' : 'پاسخ کتبی میز مهندسی در «سفارش‌ها ← درخواست‌های من»'}`
    ].join('<br>');
    form.classList.add('hidden');
    success.classList.remove('hidden');
}

function setLeadNote(leadId, value) {
    if (!can('tech.write')) { showNotification('این نقش اجازه ثبت یادداشت فنی را ندارد.', 'error'); renderAdminLeads(); return; }
    const lead = AppState.leads.find(item => item.id === leadId);
    if (!lead) return;
    lead.techNote = value.trim();
    opsLog('lead.note', `${lead.part}`);
    persistState();
    renderAdminLeads();
    // The engineering answer is shown to the customer on the Orders page.
    renderAccountLeads();
    showNotification('یادداشت فنی ذخیره شد.', 'success');
}

function deleteLead(leadId) {
    if (!can('tech.write')) { showNotification('این نقش اجازه حذف لید را ندارد.', 'error'); return; }
    AppState.leads = AppState.leads.filter(item => item.id !== leadId);
    opsLog('lead.delete', leadId);
    persistState();
    renderAdminLeads();
    renderAccountLeads();
    updateOpsBadges();
    showNotification('لید حذف شد.', 'success');
}

function renderAdminLeads() {
    const count = document.getElementById('admin-lead-count');
    const list = document.getElementById('admin-lead-list');
    if (!count || !list) return;
    const st = list.scrollTop;
    count.textContent = AppState.leads.length;
    const q = normalizeSearchValue(document.getElementById('ops-lead-search')?.value || '');
    const leads = AppState.leads.filter(l => !q || normalizeSearchValue(`${l.part} ${l.name} ${l.phone} ${l.notes || ''}`).includes(q));
    if (AppState.leads.length === 0) {
        list.innerHTML = `<p>${AppState.language === 'fa' ? 'هنوز لیدی ثبت نشده است.' : 'No leads yet.'}</p>`;
        return;
    }
    if (!leads.length) {
        list.innerHTML = '<p>لیدی با این مشخصات پیدا نشد.</p>';
        return;
    }
    const editable = can('tech.write');
    const statusFa = { new: 'جدید', 'in-progress': 'در حال بررسی', done: 'انجام شد', rejected: 'رد شد' };
    list.innerHTML = leads.map(lead => {
        const waPhone = String(lead.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '98');
        return `
        <div class="p-3 bg-white rounded-lg border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div class="font-bold text-gray-800">${escapeHTML(lead.part)} <span class="text-xs text-gray-400">x${lead.quantity}</span></div>
                <div class="flex gap-2">
                    <select ${editable ? '' : 'disabled'} onchange="setLeadStatus('${lead.id}',this.value)" class="compact-input md:w-40 text-sm ${editable ? '' : 'ops-locked'}">
                        ${Object.keys(statusFa).map(s => `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${statusFa[s]}</option>`).join('')}
                    </select>
                    ${editable ? `<button onclick="deleteLead('${lead.id}')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold" title="حذف لید"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="text-xs text-gray-500 mt-1">${escapeHTML(lead.name)} | <span dir="ltr">${escapeHTML(lead.phone)}</span> | ${escapeHTML(lead.source)}</div>
            ${lead.dimensions && (lead.dimensions.d || lead.dimensions.D || lead.dimensions.B) ? `<div class="text-xs text-gray-500">ابعاد: d=${escapeHTML(lead.dimensions.d) || '-'} D=${escapeHTML(lead.dimensions.D) || '-'} B=${escapeHTML(lead.dimensions.B) || '-'}</div>` : ''}
            ${lead.notes ? `<div class="text-xs text-gray-500 mt-1">یادداشت مشتری: ${escapeHTML(lead.notes)}</div>` : ''}
            ${lead.fileName ? `<div class="text-xs text-blue-600">File: ${escapeHTML(lead.fileName)}</div>` : ''}
            <label class="block text-xs text-gray-500 mt-2">یادداشت فنی / نتیجه بررسی
                <textarea ${editable ? '' : 'disabled'} onchange="setLeadNote('${lead.id}',this.value)" rows="2" class="compact-input mt-1 text-xs ${editable ? '' : 'ops-locked'}" placeholder="معادل پیشنهادی، قیمت، زمان تحویل...">${escapeHTML(lead.techNote || '')}</textarea>
            </label>
            <div class="flex flex-wrap items-center gap-2 mt-2">
                ${lead.phone ? `<a href="tel:${escapeHTML(lead.phone)}" class="text-xs font-bold text-blue-600 hover:underline"><i class="fas fa-phone ml-1"></i>تماس</a>` : ''}
                ${waPhone ? `<a href="https://wa.me/${waPhone}" target="_blank" rel="noopener" class="text-xs font-bold text-green-700 hover:underline"><i class="fab fa-whatsapp ml-1"></i>واتس‌اپ</a>` : ''}
                <span class="text-xs text-gray-400 mr-auto">${escapeHTML(lead.createdAt)}${editable ? '' : ' | فقط مدیر/مشاور فنی'}</span>
            </div>
        </div>`;
    }).join('');
    list.scrollTop = st;
}

// -----------------------------------------------------------------------------
// Customer-facing side of the sourcing desk: every price request, engineering
// consultation and fast part registration gets a visible home in the Orders
// page ("درخواست‌های من") showing its status and the engineer's written answer,
// so the customer always knows where the reply shows up.
// -----------------------------------------------------------------------------
const LEAD_SOURCE_FA = {
    manual: 'ثبت سریع قطعه',
    'quick-order': 'ثبت سریع قطعه',
    'product-quote': 'درخواست قیمت',
    'cart-quote': 'پیش‌فاکتور سبد خرید',
    consultation: 'مشاوره مهندسی',
    'failed-search': 'درخواست تامین (جستجوی ناموفق)'
};
const LEAD_SOURCE_EN = {
    manual: 'Fast part request',
    'quick-order': 'Fast part request',
    'product-quote': 'Price request',
    'cart-quote': 'Cart proforma request',
    consultation: 'Engineering consultation',
    'failed-search': 'Sourcing request'
};
const LEAD_STATUS_FA = {
    new: 'ثبت شد — در صف بررسی',
    'in-progress': 'بررسی مهندسی در جریان است',
    done: 'پاسخ داده شد',
    rejected: 'امکان تامین ندارد'
};
const LEAD_STATUS_EN = { new: 'Received', 'in-progress': 'Under review', done: 'Answered', rejected: 'Cannot source' };

function leadSourceLabel(source, en = AppState.language === 'en') {
    const map = en ? LEAD_SOURCE_EN : LEAD_SOURCE_FA;
    return map[source] || map.manual;
}

function leadStatusLabel(status) {
    const en = AppState.language === 'en';
    const map = en ? LEAD_STATUS_EN : LEAD_STATUS_FA;
    return map[status] || (en ? 'Received' : 'ثبت شد — در صف بررسی');
}

function leadStatusClass(status) {
    return status === 'done' ? 'in-stock' : status === 'rejected' ? 'rejected' : status === 'in-progress' ? 'on-order' : 'inquiry';
}

function renderAccountLeads() {
    const container = document.getElementById('account-requests');
    if (!container) return;
    const en = AppState.language === 'en';
    if (!AppState.leads.length) {
        container.innerHTML = `<div class="bg-white rounded-2xl p-8 text-center text-gray-500 text-sm leading-7">
            ${en
                ? 'No request yet. Use "Request Quote" or "Ask Engineer" on a product page, the buttons in the cart, or the fast sourcing desk — every request is listed here with its status and our answer.'
                : 'هنوز درخواستی ثبت نشده است. از صفحه محصول («درخواست قیمت» یا «مشاوره مهندسی»)، دکمه‌های سبد خرید یا «میز تامین سریع» درخواست بدهید؛ هر درخواست با وضعیت و پاسخ ما همین‌جا فهرست می‌شود.'}
        </div>`;
        return;
    }
    container.innerHTML = AppState.leads.map(lead => {
        const wa = leadWhatsappNumber(lead.phone);
        const waText = encodeURIComponent((en ? 'Follow up on request ' : 'پیگیری درخواست ') + lead.id + ' — ' + lead.part);
        const dims = lead.dimensions && (lead.dimensions.d || lead.dimensions.D || lead.dimensions.B)
            ? ` <span class="text-xs text-gray-400" dir="ltr">${escapeHTML(lead.dimensions.d) || '-'}×${escapeHTML(lead.dimensions.D) || '-'}×${escapeHTML(lead.dimensions.B) || '-'} mm</span>` : '';
        return `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                        <b dir="ltr" class="text-gray-900">${escapeHTML(lead.id)}</b>
                        <span class="stock-badge ${leadStatusClass(lead.status)}">${escapeHTML(leadStatusLabel(lead.status))}</span>
                        <span class="text-xs text-gray-400">${escapeHTML(leadSourceLabel(lead.source, en))}</span>
                    </div>
                    <p class="text-sm text-gray-700 mt-2">${escapeHTML(lead.part)} <span class="text-xs text-gray-400">× ${escapeHTML(lead.quantity || 1)}</span>${dims}</p>
                    <p class="text-xs text-gray-400 mt-1">${en ? 'Submitted' : 'ثبت'}: ${escapeHTML(lead.createdAt)} | ${en ? 'Answer goes to' : 'پاسخ به'} <b dir="ltr">${escapeHTML(lead.phone)}</b> ${en ? '(call + WhatsApp)' : '(تماس و واتس‌اپ)'}</p>
                    ${lead.notes ? `<p class="text-xs text-gray-500 mt-1">${en ? 'Your note' : 'توضیح شما'}: ${escapeHTML(lead.notes)}</p>` : ''}
                    ${lead.techNote
                        ? `<div class="text-xs text-green-800 bg-green-50 border border-green-100 rounded-lg p-2 mt-2"><b>${en ? 'Engineering answer' : 'پاسخ تیم مهندسی'}:</b> ${escapeHTML(lead.techNote)}</div>`
                        : `<div class="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 mt-2">${en ? 'The written answer appears here as soon as engineering reviews it; we also call/WhatsApp you.' : 'پاسخ کتبی به‌محض بررسی کارشناس همین‌جا نوشته می‌شود؛ هم‌زمان با شما تماس یا پیام واتس‌اپ می‌گیریم.'}</div>`}
                </div>
                <div class="flex md:flex-col gap-2 shrink-0">
                    ${wa ? `<a href="https://wa.me/${wa}?text=${waText}" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-green-700 text-xs font-bold whitespace-nowrap"><i class="fab fa-whatsapp ml-1"></i>${en ? 'Follow up on WhatsApp' : 'پیگیری در واتس‌اپ'}</a>` : ''}
                    <a href="tel:+982188709158" class="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap"><i class="fas fa-phone ml-1"></i>${en ? 'Call the desk' : 'تماس با میز تامین'}</a>
                </div>
            </div>
        </div>`;
    }).join('');
}

// "My requests" entry point used by the lead modal (info block + success card).
function showMyRequests() {
    closeLeadModal();
    showAccount();
    setTimeout(() => {
        const el = document.getElementById('account-requests');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
}
