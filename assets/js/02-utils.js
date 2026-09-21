/* ===== 02-utils.js — ابزارهای عمومی (قیمت، عدد، نوتیفیکیشن) ===== */
// =============================================
// UTILITY FUNCTIONS
// =============================================
function formatPrice(priceUSD) {
    const tomanPrice = priceUSD * AppState.exchangeRate * (1 + AppState.profitMargin / 100);
    return new Intl.NumberFormat(AppState.language === 'fa' ? 'fa-IR' : 'en-US').format(Math.round(tomanPrice));
}

function formatNumber(num) {
    if (AppState.language === 'fa') {
        return new Intl.NumberFormat('fa-IR').format(num);
    }
    return new Intl.NumberFormat('en-US').format(num);
}

// Product photos: real catalogue images live in assets/img/products/. Legacy
// products keep a generic image key ('bearing', ...) which has no file behind it.
function hasProductImage(product) {
    return !!product && typeof product.image === 'string' && product.image.startsWith('assets/');
}

function productTypeIcon(type) {
    return type === 'bearing' ? 'circle-notch' : type === 'linear' ? 'grip-lines' : type === 'coupling' ? 'link' : type === 'grease' ? 'droplet' : 'cogs';
}

// Grease uses a free-text label; everything else uses the d×D×B dimensions.
function productSizeLabel(product) {
    return product && product.type === 'grease' ? (product.dimensionsLabel || '') : `${product.d}×${product.D}×${product.B} mm`;
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
    const notification = document.createElement('div');
    notification.className = `notification px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Escape user-entered text before inserting it into an HTML template.
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}
