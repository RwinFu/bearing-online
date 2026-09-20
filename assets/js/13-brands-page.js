/* ===== 13-brands-page.js — صفحه برندها ===== */
// =============================================
// BRANDS PAGE
// =============================================
function renderBrandsPage() {
    const container = document.getElementById('brands-grid');
    container.innerHTML = Object.entries(BrandInfo).filter(([name]) => ALLOWED_BRANDS.includes(name)).map(([name, info]) => `
        <div class="bg-white rounded-2xl shadow-lg p-8 card-hover cursor-pointer" onclick="filterByBrand('${name}')">
            <div class="flex items-center gap-4 mb-6">
                <div class="w-16 h-16 bg-${info.color}-100 rounded-xl flex items-center justify-center">
                    <span class="text-2xl font-bold text-${info.color}-600">${info.logo}</span>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${name}</h3>
                    <p class="text-gray-500">${info.country}</p>
                </div>
            </div>
            <p class="text-gray-600 mb-4">${info.description}</p>
            <a href="#" class="text-blue-600 font-medium hover:underline" data-en="View Products →" data-fa="مشاهده محصولات ←">View Products →</a>
        </div>
    `).join('');
    applyLanguage();
}
