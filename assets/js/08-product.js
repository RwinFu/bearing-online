/* ===== 08-product.js — جزئیات محصول و معادل‌ها ===== */
// =============================================
// PRODUCT DETAIL
// =============================================
// Datasheet lookup for every product, so the single "دیتاشیت" button always
// lands on a real page for that exact part number.
//
// Only endpoints verified to resolve are hard-coded (SKF's own product search,
// which returns the official product page + downloads for any designation).
// The previous deep links were dead ends in a real browser — bearingdata.com
// bounced to its marketing home page, NSK's bearingscatalog returned 404, NTN's
// bearingfinder and Schaeffler's medias search rendered nothing — so every
// other brand now falls back to a targeted datasheet search for
// "<code>" <brand>, which always returns the maker's or a distributor's
// technical sheet instead of a blank page.
const DATASHEET_SOURCES = [
    { key: 'SKF', name: 'SKF', url: 'https://www.skf.com/group/search-results?q=:code' }
];

// The designation as written by the maker ("6205-2RS", "LGMT 3/0.4") searches
// far better than the normalized code ("62052RS", "LGMT304"); hydrate keeps it.
function datasheetCode(product) {
    return String(product.codeOriginal || product.code || '').trim();
}

function productDatasheetUrl(product) {
    const code = datasheetCode(product);
    const brand = String(product.brand || '').trim();
    const source = DATASHEET_SOURCES.find(entry => entry.key === brand.toUpperCase());
    if (source) {
        const url = source.url.replace(/:code/g, encodeURIComponent(code));
        return { url, brand: source.name, direct: true, title: `صفحه رسمی ${source.name} برای ${code} (دیتاشیت و فایل فنی)` };
    }
    const query = `"${code}" ${brand} datasheet`;
    return {
        url: 'https://www.google.com/search?q=' + encodeURIComponent(query),
        brand,
        direct: false,
        title: `جستجوی دیتاشیت رسمی ${brand} ${code}`
    };
}

function showProductDetail(productId) {
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    if (!AppState.routing && location.hash !== '#/product/' + encodeURIComponent(productId)) history.pushState(null, '', '#/product/' + encodeURIComponent(productId));

    document.getElementById('autocomplete-dropdown').classList.add('hidden');
    document.getElementById('product-breadcrumb').textContent = `${product.brand} ${product.code}`;
    document.getElementById('product-detail-content').dataset.pid = productId;

    // Find equivalent products (same code, different brands)
    const productSuffix = getProductSuffix(product);
    const productSuffixGroup = getSuffixGroup(productSuffix);
    const equivalents = ProductDatabase.filter(p => {
        if (p.id === product.id) return false;
        const sameBase = p.code.replace(/[^0-9]/g, '') === product.code.replace(/[^0-9]/g, '');
        const sameSize = p.d === product.d && p.D === product.D && p.B === product.B;
        const pGroup = getSuffixGroup(getProductSuffix(p));
        const suffixOk = !productSuffixGroup || productSuffixGroup.filterOnly || pGroup?.group === productSuffixGroup.group || !getProductSuffix(p);
        return (sameBase || sameSize) && suffixOk;
    });

    const content = `
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <!-- Product Image -->
                <div class="product-image-bg p-8 sm:p-12 flex items-center justify-center min-h-96">
                    ${hasProductImage(product) ? `<img src="${product.image}" alt="${product.brand} ${product.code}" class="product-photo max-h-80 w-auto max-w-full object-contain rounded-xl shadow-md">` : `<i class="fas fa-${productTypeIcon(product.type)} text-9xl text-gray-300 float-anim"></i>`}
                </div>

                <!-- Product Info -->
                <div class="p-8">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-600">${product.brand}</span>
                        <span class="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">${faOrigin(product.origin)}</span>
                    </div>

                    <h1 class="text-3xl font-bold text-gray-800 mb-2">${product.code}</h1>
                    <p class="text-gray-500 mb-6">${faSubtype(product.subtype)} ${faType(product.type)}</p>
                    <div class="mb-5">${getStockBadge(product)}</div>
                    ${productSupplierNames(product) ? `<div class="mb-5 text-sm text-gray-500">منابع تامین: <b class="text-gray-700">${productSupplierNames(product).join('، ')}</b></div>` : ''}

                    <div class="grid grid-cols-2 gap-3 mb-6 text-sm">
                        <div class="bg-blue-50 rounded-xl p-3"><div class="text-gray-500">${getIdentifierLabel('reference')}</div><div class="font-bold text-gray-800">${getProductIdentifiers(product).reference}</div></div>
                        <div class="bg-blue-50 rounded-xl p-3"><div class="text-gray-500">${getIdentifierLabel('article')}</div><div class="font-bold text-gray-800">${getProductIdentifiers(product).article}</div></div>
                        <div class="bg-gray-50 rounded-xl p-3 col-span-2"><div class="text-gray-500">${getIdentifierLabel('mpn')}</div><div class="font-bold text-gray-800">${getProductIdentifiers(product).mpn}</div></div>
                    </div>

                    <div class="bg-gray-50 rounded-xl p-6 mb-6">
                        <div class="flex items-baseline gap-2">
                            <span class="text-4xl font-bold ${product.sell_mode === 'instant' ? 'text-gray-800' : 'text-orange-600'}">${product.sell_mode === 'instant' ? formatPrice(product.priceUSD) : 'استعلام قیمت'}</span>
                            ${product.sell_mode === 'instant' ? '<span class="text-lg text-gray-500">تومان</span>' : ''}
                        </div>
                        <p class="text-sm text-gray-400 mt-1" data-en="Price includes import duties" data-fa="قیمت شامل هزینه واردات">Price includes import duties</p>
                    </div>

                    <div class="flex flex-col md:flex-row gap-4 mb-8">
                        ${product.sell_mode === 'instant' ? `<button onclick="addToCart('${product.id}')" class="flex-1 btn-primary magnetic text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2"><i class="fas fa-cart-plus"></i><span data-en="Add to Cart" data-fa="افزودن به سبد">افزودن به سبد</span></button>` : ''}
                        <button onclick="requestQuote('${product.id}')" class="flex-1 btn-accent magnetic text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2">
                            <i class="fas fa-file-invoice"></i>
                            <span data-en="Request Quote" data-fa="درخواست قیمت">Request Quote</span>
                        </button>
                        <button onclick="openLeadModal('consultation', '${product.brand} ${product.code}')" class="flex-1 border-2 border-blue-100 text-blue-700 bg-blue-50 py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:border-blue-500 transition">
                            <i class="fas fa-user-gear"></i>
                            <span data-en="Ask Engineer" data-fa="مشاوره مهندسی">Ask Engineer</span>
                        </button>
                    </div>

                    <div class="flex gap-3">
                        <button onclick="toggleCompare('${product.id}')" class="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition flex items-center gap-2">
                            <i class="fas fa-balance-scale"></i>
                            <span data-en="Compare" data-fa="مقایسه">Compare</span>
                        </button>
                        <button onclick="toggleWishlist('${product.id}')" class="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:text-red-600 transition flex items-center gap-2">
                            <i class="fas fa-heart"></i>
                            <span data-en="Save" data-fa="نشان کردن">نشان کردن</span>
                        </button>
                        <a href="${productDatasheetUrl(product).url}" target="_blank" rel="noopener" class="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition flex items-center gap-2" title="${productDatasheetUrl(product).title}">
                            <i class="fas fa-file-pdf"></i>
                            <span data-en="Datasheet" data-fa="دیتاشیت">Datasheet</span>
                            <i class="fas fa-external-link-alt text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Specifications -->
            <div class="border-t border-gray-100 p-8">
                <h3 class="text-xl font-bold text-gray-800 mb-6" data-en="Technical Specifications" data-fa="مشخصات فنی">Technical Specifications</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="bg-gray-50 rounded-xl p-4">
                        <h4 class="text-sm font-medium text-gray-500 mb-2" data-en="Dimensions" data-fa="ابعاد">Dimensions</h4>
                        <table class="w-full text-sm">
                            <tr><td class="py-1 text-gray-600">d (Inner Ø)</td><td class="py-1 font-medium text-right">${product.d} mm</td></tr>
                            <tr><td class="py-1 text-gray-600">D (Outer Ø)</td><td class="py-1 font-medium text-right">${product.D} mm</td></tr>
                            <tr><td class="py-1 text-gray-600">B (Width)</td><td class="py-1 font-medium text-right">${product.B} mm</td></tr>
                        </table>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4">
                        <h4 class="text-sm font-medium text-gray-500 mb-2" data-en="Performance" data-fa="عملکرد">Performance</h4>
                        <table class="w-full text-sm">
                            <tr><td class="py-1 text-gray-600" data-en="Speed Rating" data-fa="سرعت مجاز">Speed Rating</td><td class="py-1 font-medium text-right">${formatNumber(product.speedRating)} rpm</td></tr>
                            <tr><td class="py-1 text-gray-600" data-en="Load Rating" data-fa="ظرفیت بار">Load Rating</td><td class="py-1 font-medium text-right">${formatNumber(product.loadRating)} N</td></tr>
                            <tr><td class="py-1 text-gray-600" data-en="Weight" data-fa="وزن">Weight</td><td class="py-1 font-medium text-right">${product.weight} kg</td></tr>
                        </table>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4">
                        <h4 class="text-sm font-medium text-gray-500 mb-2" data-en="Details" data-fa="جزئیات">Details</h4>
                        <table class="w-full text-sm">
                            <tr><td class="py-1 text-gray-600" data-en="Seal Type" data-fa="نوع آب‌بند">Seal Type</td><td class="py-1 font-medium text-right">${product.seal}</td></tr>
                            <tr><td class="py-1 text-gray-600" data-en="Clearance" data-fa="لقی">Clearance</td><td class="py-1 font-medium text-right">${product.clearance}</td></tr>
                            <tr><td class="py-1 text-gray-600" data-en="Origin" data-fa="کشور سازنده">Origin</td><td class="py-1 font-medium text-right">${faOrigin(product.origin)}</td></tr>
                        </table>
                    </div>
                </div>
            </div>

            ${equivalents.length > 0 ? `
            <!-- Equivalent Products -->
            <div class="border-t border-gray-100 p-8">
                <h3 class="text-xl font-bold text-gray-800 mb-6" data-en="Equivalent Products from Other Brands" data-fa="محصولات معادل از برندهای دیگر">Equivalent Products from Other Brands</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${equivalents.map(eq => `
                        <div class="border-2 border-gray-100 rounded-xl p-4 hover:border-blue-500 transition cursor-pointer" onclick="showProductDetail('${eq.id}')">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-gray-800">${eq.brand} ${eq.code}</span>
                                <span class="text-sm text-gray-500">${eq.origin}</span>
                            </div>
                            <div class="text-blue-600 font-medium">${formatPrice(eq.priceUSD)} تومان</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;

    document.getElementById('product-detail-content').innerHTML = content;
    showPage('product');
    applyLanguage();
}
