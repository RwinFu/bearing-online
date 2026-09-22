/* ===== 12-compare.js — مقایسه و علاقه‌مندی‌ها ===== */
// =============================================
// COMPARE SYSTEM
// =============================================
function toggleCompare(productId) {
    const index = AppState.compareList.indexOf(productId);
    if (index > -1) {
        AppState.compareList.splice(index, 1);
    } else if (AppState.compareList.length < 4) {
        AppState.compareList.push(productId);
    } else {
        showNotification(AppState.language === 'en' ? 'Maximum 4 products can be compared' : 'حداکثر ۴ محصول قابل مقایسه است', 'error');
        return;
    }
    updateCompareCount();
    persistState();
    refreshSearchCardsIfVisible();
}

// Toggling from the compare/wishlist/product pages must not pay for a full
// re-render of the hidden search grid; returning to search re-renders anyway.
function refreshSearchCardsIfVisible() {
    const page = document.getElementById('page-search');
    if (page && !page.classList.contains('hidden')) renderSearchResults();
}

function updateCompareCount() {
    document.getElementById('compare-count').textContent = AppState.compareList.length;
}

function toggleWishlist(productId) {
    const index = AppState.wishlist.indexOf(productId);
    if (index > -1) AppState.wishlist.splice(index, 1);
    else AppState.wishlist.push(productId);
    updateWishlistCount();
    persistState();
    refreshSearchCardsIfVisible();
    showNotification(AppState.language === 'fa' ? 'لیست نشان‌شده‌ها به‌روزرسانی شد' : 'Saved products updated', 'success');
}

function updateWishlistCount() {
    const el = document.getElementById('wishlist-count');
    if (el) el.textContent = AppState.wishlist.length;
}

function showWishlist() {
    renderWishlist();
    showPage('wishlist');
}

function renderWishlist() {
    const container = document.getElementById('wishlist-content');
    const products = AppState.wishlist.map(id => ProductDatabase.find(p => p.id === id)).filter(Boolean);
    if (!products.length) {
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm p-12 text-center"><i class="fas fa-heart text-6xl text-gray-200 mb-5"></i><h3 class="text-2xl font-bold text-gray-800 mb-2">محصولی نشان نشده است</h3><p class="text-gray-500 mb-6">روی آیکن قلب محصولات کلیک کنید تا اینجا ذخیره شوند.</p><button onclick="showPage('search'); AppState.searchResults=ProductDatabase; renderSearchResults();" class="btn-primary text-white px-6 py-3 rounded-xl font-bold">مشاهده محصولات</button></div>`;
        return;
    }
    container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${products.map(p => `<div class="bg-white rounded-2xl shadow-sm p-6 card-hover cursor-pointer" onclick="showProductDetail('${p.id}')"><div class="flex items-start justify-between gap-4"><div><span class="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 font-bold">${p.brand}</span><h3 class="text-xl font-extrabold mt-3">${p.code}</h3><p class="text-sm text-gray-500 mt-1">${formatDimensions(p)}</p><div class="mt-3">${getStockBadge(p)}</div></div><button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="text-red-500 text-xl"><i class="fas fa-heart"></i></button></div><div class="mt-5 flex items-center justify-between"><b>${p.sell_mode === 'instant' ? formatPrice(p.priceUSD) + ' تومان' : 'استعلام'}</b>${p.sell_mode === 'instant' ? `<button onclick="event.stopPropagation(); addToCart('${p.id}')" class="btn-primary text-white px-4 py-2 rounded-lg"><i class="fas fa-cart-plus"></i></button>` : `<button onclick="event.stopPropagation(); requestQuote('${p.id}')" class="btn-accent text-white px-4 py-2 rounded-lg">استعلام</button>`}</div></div>`).join('')}</div>`;
    applyLanguage();
}

function showCompare() {
    renderCompare();
    showPage('compare');
}

function renderCompare() {
    const container = document.getElementById('compare-content');
    
    if (AppState.compareList.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-lg p-12 text-center">
                <i class="fas fa-balance-scale text-6xl text-gray-200 mb-6"></i>
                <h3 class="text-2xl font-bold text-gray-800 mb-2" data-en="No products to compare" data-fa="محصولی برای مقایسه وجود ندارد">No products to compare</h3>
                <p class="text-gray-500 mb-6" data-en="Add products to compare by clicking the compare button" data-fa="با کلیک روی دکمه مقایسه، محصولات را اضافه کنید">Add products to compare by clicking the compare button</p>
            </div>
        `;
        return;
    }

    // The manager can delete catalogue products; stale ids must neither crash
    // the table nor linger in the list.
    AppState.compareList = AppState.compareList.filter(id => ProductDatabase.some(p => p.id === id));
    const products = AppState.compareList.map(id => ProductDatabase.find(p => p.id === id)).filter(Boolean);
    if (!products.length) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-lg p-12 text-center">
                <i class="fas fa-balance-scale text-6xl text-gray-200 mb-6"></i>
                <h3 class="text-2xl font-bold text-gray-800 mb-2" data-en="No products to compare" data-fa="محصولی برای مقایسه وجود ندارد">No products to compare</h3>
                <p class="text-gray-500 mb-6" data-en="Add products to compare by clicking the compare button" data-fa="با کلیک روی دکمه مقایسه، محصولات را اضافه کنید">Add products to compare by clicking the compare button</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-lg overflow-x-auto">
            <table class="w-full min-w-max">
                <thead>
                    <tr class="border-b border-gray-100">
                        <th class="p-6 text-left text-gray-500 font-medium w-48" data-en="Specification" data-fa="مشخصه">Specification</th>
                        ${products.map(p => `
                            <th class="p-6 text-center min-w-48">
                                <div class="w-20 h-20 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                                    ${hasProductImage(p) ? `<img src="${p.image}" alt="" class="w-full h-full object-contain">` : `<i class="fas fa-${productTypeIcon(p.type)} text-2xl text-gray-300"></i>`}
                                </div>
                                <div class="font-bold text-gray-800">${p.brand} ${p.code}</div>
                                <button onclick="toggleCompare('${p.id}'); renderCompare();" class="text-red-500 text-sm mt-2 hover:underline" data-en="Remove" data-fa="حذف">Remove</button>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b border-gray-50">
                        <td class="p-4 text-gray-600" data-en="Brand" data-fa="برند">Brand</td>
                        ${products.map(p => `<td class="p-4 text-center font-medium">${p.brand}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50 bg-gray-50">
                        <td class="p-4 text-gray-600" data-en="Inner Diameter (d)" data-fa="قطر داخلی (d)">Inner Diameter (d)</td>
                        ${products.map(p => `<td class="p-4 text-center">${p.type === 'grease' ? '—' : `${p.d} mm`}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50">
                        <td class="p-4 text-gray-600" data-en="Outer Diameter (D)" data-fa="قطر خارجی (D)">Outer Diameter (D)</td>
                        ${products.map(p => `<td class="p-4 text-center">${p.type === 'grease' ? '—' : `${p.D} mm`}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50 bg-gray-50">
                        <td class="p-4 text-gray-600" data-en="Width (B)" data-fa="عرض (B)">Width (B)</td>
                        ${products.map(p => `<td class="p-4 text-center">${p.type === 'grease' ? '—' : `${p.B} mm`}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50">
                        <td class="p-4 text-gray-600" data-en="Speed Rating" data-fa="سرعت مجاز">Speed Rating</td>
                        ${products.map(p => `<td class="p-4 text-center">${p.type === 'grease' ? '—' : `${formatNumber(p.speedRating)} rpm`}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50 bg-gray-50">
                        <td class="p-4 text-gray-600" data-en="Load Rating" data-fa="ظرفیت بار">Load Rating</td>
                        ${products.map(p => `<td class="p-4 text-center">${p.type === 'grease' ? '—' : `${formatNumber(p.loadRating)} N`}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50">
                        <td class="p-4 text-gray-600" data-en="Weight" data-fa="وزن">Weight</td>
                        ${products.map(p => `<td class="p-4 text-center">${p.weight} kg</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50 bg-gray-50">
                        <td class="p-4 text-gray-600" data-en="Origin" data-fa="کشور سازنده">Origin</td>
                        ${products.map(p => `<td class="p-4 text-center">${faOrigin(p.origin)}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-50">
                        <td class="p-4 text-gray-600" data-en="Seal Type" data-fa="نوع آب‌بند">Seal Type</td>
                        ${products.map(p => `<td class="p-4 text-center">${faSeal(p.seal)}</td>`).join('')}
                    </tr>
                    <tr class="border-b border-gray-100 bg-blue-50">
                        <td class="p-4 font-bold text-gray-800" data-en="Price" data-fa="قیمت">Price</td>
                        ${products.map(p => `<td class="p-4 text-center font-bold text-lg ${p.sell_mode === 'instant' ? 'text-blue-600' : 'text-orange-600'}">${p.sell_mode === 'instant' ? formatPrice(p.priceUSD) + ' تومان' : 'استعلام'}</td>`).join('')}
                    </tr>
                    <tr>
                        <td class="p-4"></td>
                        ${products.map(p => `
                            <td class="p-4 text-center">
                                <button onclick="addToCart('${p.id}')" class="btn-primary text-white px-6 py-3 rounded-lg font-medium">
                                    <i class="fas fa-cart-plus mr-2"></i>
                                    <span data-en="Add to Cart" data-fa="افزودن به سبد">Add to Cart</span>
                                </button>
                            </td>
                        `).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    applyLanguage();
}
