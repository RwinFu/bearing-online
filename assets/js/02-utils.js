/* ===== 02-utils.js — ابزارهای عمومی (قیمت، عدد، نوتیفیکیشن) ===== */
// =============================================
// UTILITY FUNCTIONS
// =============================================
const numberFormatterCache = {};
function cachedNumberFormatter(locale) {
    if (!numberFormatterCache[locale]) numberFormatterCache[locale] = new Intl.NumberFormat(locale);
    return numberFormatterCache[locale];
}

function formatPrice(priceUSD) {
    const tomanPrice = priceUSD * AppState.exchangeRate * (1 + AppState.profitMargin / 100);
    return cachedNumberFormatter(AppState.language === 'fa' ? 'fa-IR' : 'en-US').format(Math.round(tomanPrice));
}

function formatNumber(num) {
    if (AppState.language === 'fa') {
        return cachedNumberFormatter('fa-IR').format(num);
    }
    return cachedNumberFormatter('en-US').format(num);
}

// Language-aware money/quote labels so dynamic templates stay bilingual.
function currencyLabel() { return AppState.language === 'fa' ? 'تومان' : 'Toman'; }
function quoteLabel() { return AppState.language === 'fa' ? 'استعلام' : 'RFQ'; }

// Product photos: real catalogue images live in assets/img/products/. Legacy
// products keep a generic image key ('bearing', ...) which has no file behind it.
function hasProductImage(product) {
    return !!product && typeof product.image === 'string' && product.image.startsWith('assets/');
}

function productTypeIcon(type) {
    // 'circle-notch' looked like a loading spinner on cards without a photo;
    // the wheel icon reads as a bearing instead.
    return type === 'bearing' ? 'dharmachakra' : type === 'linear' ? 'grip-lines' : type === 'coupling' ? 'link' : type === 'grease' ? 'droplet' : 'cogs';
}

// Grease uses a free-text label; everything else uses the d×D×B dimensions.
function productSizeLabel(product) {
    if (!product) return '';
    return product.type === 'grease' ? (product.dimensionsLabel || '') : `${product.d}×${product.D}×${product.B} mm`;
}

// Supplier names shown on a product, or `null` when the product is only in-stock.
// Reads the canonical `supplierIds` array the admin panel maintains; an empty
// list means the product is sourced from our own warehouse.
function productSupplierNames(product) {
    if (!product) return null;
    supplierBookkeeping(product);
    const names = [];
    if (product.stockSource === 'own' && !(product.supplierIds || []).length) names.push('انبار خودمان');
    (product.supplierIds || []).forEach(id => {
        if (id && id !== 'own') names.push(supplierName(id));
    });
    if (product.supplierId && !product.supplierIds.includes(product.supplierId)) names.push(supplierName(product.supplierId));
    return names.length ? names : null;
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    const icon = document.createElement('i');
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`;
    // The message is untrusted (it can contain account names, address titles,
    // stock errors with part codes...), so it is always inserted as text —
    // never as HTML — to make notification XSS impossible by construction.
    const text = document.createElement('span');
    text.textContent = message;
    notification.append(icon, text);
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Escape user-entered text before inserting it into an HTML template.
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}
