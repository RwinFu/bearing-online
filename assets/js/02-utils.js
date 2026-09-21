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
