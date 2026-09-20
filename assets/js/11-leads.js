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

    modal.classList.remove('hidden');
    setTimeout(() => partInput.focus(), 100);
    initRipple();
    initMagnetic();
}

function closeLeadModal() {
    document.getElementById('lead-modal').classList.add('hidden');
}

function submitLead(event) {
    event.preventDefault();
    const lead = {
        id: `LEAD-${Date.now()}`,
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
        createdAt: new Date().toLocaleString()
    };

    AppState.leads.unshift(lead);
    persistState();
    closeLeadModal();
    document.querySelector('#lead-modal form').reset();
    document.getElementById('lead-qty').value = 1;
    showNotification(AppState.language === 'en' ? 'Request saved. Engineering will contact you fast.' : 'درخواست ثبت شد. تیم مهندسی سریع با شما تماس می‌گیرد.', 'success');
    renderAdminLeads();
}

function renderAdminLeads() {
    const count = document.getElementById('admin-lead-count');
    const list = document.getElementById('admin-lead-list');
    if (!count || !list) return;
    count.textContent = AppState.leads.length;
    if (AppState.leads.length === 0) {
        list.innerHTML = `<p>${AppState.language === 'fa' ? 'هنوز لیدی ثبت نشده است.' : 'No leads yet.'}</p>`;
        return;
    }
    const editable = can('tech.write');
    const statusFa = { new: 'جدید', 'in-progress': 'در حال بررسی', done: 'انجام شد', rejected: 'رد شد' };
    list.innerHTML = AppState.leads.map(lead => `
        <div class="p-3 bg-white rounded-lg border border-gray-100">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div class="font-bold text-gray-800">${lead.part} <span class="text-xs text-gray-400">x${lead.quantity}</span></div>
                <select ${editable ? '' : 'disabled'} onchange="setLeadStatus('${lead.id}',this.value)" class="compact-input md:w-40 text-sm ${editable ? '' : 'ops-locked'}">
                    ${Object.keys(statusFa).map(s => `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${statusFa[s]}</option>`).join('')}
                </select>
            </div>
            <div class="text-xs text-gray-500 mt-1">${lead.name} | ${lead.phone} | ${lead.source}</div>
            ${lead.dimensions && (lead.dimensions.d || lead.dimensions.D || lead.dimensions.B) ? `<div class="text-xs text-gray-500">ابعاد: d=${lead.dimensions.d || '-'} D=${lead.dimensions.D || '-'} B=${lead.dimensions.B || '-'}</div>` : ''}
            ${lead.notes ? `<div class="text-xs text-gray-500 mt-1">یادداشت: ${lead.notes}</div>` : ''}
            ${lead.fileName ? `<div class="text-xs text-blue-600">File: ${lead.fileName}</div>` : ''}
            <div class="text-xs text-gray-400 mt-1">${lead.createdAt}${editable ? '' : ' | فقط مدیر/مشاور فنی'}</div>
        </div>
    `).join('');
}
