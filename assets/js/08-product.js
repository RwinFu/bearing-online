/* ===== 08-product.js — جزئیات محصول و معادل‌ها ===== */
// =============================================
// PRODUCT DETAIL
// =============================================
// Manufacturer datasheet/catalog lookup for every product, so the "دیتاشیت"
// button always opens the maker's real datasheet for that exact part number.
// The URL template receives the display code (:code) and the normalized code
// (:norm = alphanumeric only, uppercase). Unknown brands fall through to a
// part-number search on the biggest public bearing datasheet index.
const DATASHEET_TEMPLATES = [
    { key: 'SKF', name: 'SKF', url: 'https://www.skf.com/group/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-:norm' },
    { key: 'FAG', name: 'FAG/Schaeffler', url: 'https://medias.schaeffler.us/en/product/rotary/rolling-and-plain-bearings/rolling-bearings/deep-groove-ball-bearings/:norm' },
    { key: 'NSK', name: 'NSK', url: 'https://www.nsk.com/services/bearingscatalog/searchResult.jsp?searchType=free&searchWord=:norm' },
    { key: 'NTN', name: 'NTN', url: 'https://bearingfinder.ntnamericas.com/search?keyword=:norm' },
    { key: 'INA', name: 'INA/Schaeffler', url: 'https://medias.schaeffler.us/en/product/rotary/rolling-and-plain-bearings/rolling-bearings/deep-groove-ball-bearings/:norm' },
    { key: 'ZWZ', name: 'ZWZ', url: 'https://www.bearingdata.com/search?q=:code' },
    { key: 'HIWIN', name: 'HIWIN', url: 'https://motioncontrolsystems.hiwin.com/search?q=:norm' },
    { key: 'THK', name: 'THK', url: 'https://tech.thk.com/en/products/thk_search.php?q=:norm' },
    { key: 'KTR', name: 'KTR', url: 'https://www.ktr.com/en/search?query=:norm' },
    { key: 'APEX', name: 'Apex Dynamics', url: 'https://www.apexdyna.com/en/search?keyword=:norm' },
    { key: 'RINGSPANN', name: 'Ringspann', url: 'https://www.ringspann.com/en/search?q=:norm' },
    { key: 'HKT', name: 'HKT', url: 'https://www.bearingdata.com/search?q=:code' },
    { key: 'TSUBAKI', name: 'Tsubaki', url: 'https://tsubaki.eu/search?q=:norm' },
    { key: 'SNR', name: 'NTN-SNR', url: 'https://bearingfinder.ntnamericas.com/search?keyword=:norm' },
    { key: 'TIMKEN', name: 'Timken', url: 'https://cad.timken.com/keyword/all-product-types?keyword=:norm' },
    { key: 'FLENDER', name: 'Flender', url: 'https://www.flender.com/en/search?query=:norm' },
    { key: 'ASAHI', name: 'ASAHI', url: 'https://www.bearingdata.com/search?q=:code' },
    { key: 'RULAND', name: 'Ruland', url: 'https://www.ruland.com/search?query=:norm' },
    { key: 'MIKI PULLEY', name: 'Miki Pulley', url: 'https://www.mikipulley.co.jp/EN/Search?q=:norm' },
    { key: 'MOTOVARIO', name: 'Motovario', url: 'https://www.motovario.com/en/search?q=:norm' }
];

function productDatasheetUrl(product) {
    const code = String(product.code || '').trim();
    const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const brand = String(product.brand || '');
    const key = brand.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const template = DATASHEET_TEMPLATES.find(entry => entry.key === key || brand.toUpperCase() === entry.key);
    const fill = url => url.replace(/:norm/g, encodeURIComponent(norm)).replace(/:code/g, encodeURIComponent(code));
    return template
        ? { url: fill(template.url), brand: template.name, direct: true }
        : { url: 'https://www.bearingdata.com/search?q=' + encodeURIComponent(code), brand: 'BearingData', direct: false };
}

function openProductDatasheet(productId) {
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    const ds = product.datasheet_url || productDatasheetUrl(product);
    window.open(ds.url, '_blank', 'noopener');
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
                        <button onclick="openProductDatasheet('${product.id}')" class="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition flex items-center gap-2" title="${productDatasheetUrl(product).url}">
                            <i class="fas fa-file-pdf"></i>
                            <span data-en="Datasheet" data-fa="دیتاشیت">Datasheet</span>
                            <i class="fas fa-external-link-alt text-xs"></i>
                        </button>
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
                    <div class="bg-blue-50/60 rounded-xl p-4">
                        <h4 class="text-sm font-medium text-gray-500 mb-2" data-en="Datasheet" data-fa="دیتاشیت">Datasheet</h4>
                        <button onclick="openProductDatasheet('${product.id}')" class="text-sm text-blue-700 font-bold hover:underline break-all text-right" dir="ltr">
                            <i class="fas fa-file-pdf ml-1"></i>${productDatasheetUrl(product).brand} · ${product.code}
                        </button>
                        <p class="text-xs text-gray-400 mt-2 leading-5" data-en="Opens the manufacturer's official datasheet for this part number in a new tab." data-fa="دیتاشیت رسمی سازنده برای همین شماره قطعه در تب جدید باز می‌شود.">دیتاشیت رسمی سازنده برای همین شماره قطعه در تب جدید باز می‌شود.</p>
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
