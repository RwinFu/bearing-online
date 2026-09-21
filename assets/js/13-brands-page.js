/* ===== 13-brands-page.js — صفحه برندها ===== */
// =============================================
// PREMIUM BRANDS DIRECTORY
// =============================================
const BRAND_COUNTRY_FA = {
    Sweden: 'سوئد', Germany: 'آلمان', Japan: 'ژاپن', China: 'چین',
    Korea: 'کره جنوبی', USA: 'آمریکا', Taiwan: 'تایوان'
};
const BRAND_DESCRIPTION_FA = {
    SKF: 'پیشرو جهانی فناوری برینگ، آب‌بندی و روانکاری برای کاربردهای دقیق و صنایع سنگین.',
    FAG: 'مهندسی ممتاز آلمان از گروه شفلر؛ متخصص رولبرینگ‌ها و کاربردهای صنعتی پرفشار.',
    NTN: 'دقت ساخت ژاپنی برای برینگ‌های صنعتی و خودرویی با پوشش گسترده سری‌ها.',
    ZWZ: 'یکی از بزرگ‌ترین سازندگان برینگ چین و انتخابی اقتصادی برای پروژه‌های عمومی و حجیم.',
    HKT: 'برند تخصصی کره‌ای برای صنایع فولاد و خطوط سنگین، با مقاومت بالا در ضربه و حرارت.',
    Timken: 'متخصص آمریکایی رولبرینگ مخروطی و راهکارهای انتقال قدرت برای بارهای سنگین.',
    ASAHI: 'سازنده ژاپنی یاتاقان‌های بلبرینگی و سری‌های UCP و UCT برای خطوط تولید.',
    Flender: 'راهکارهای آلمانی گیربکس، کوپلینگ و سیستم‌های درایو برای صنایع سنگین.',
    Ringspann: 'متخصص آلمانی فری‌ویل، کوپلینگ، ترمز و تجهیزات ایمنی انتقال قدرت.'
};

function renderBrandsPage() {
    const container = document.getElementById('brands-grid');
    if (!container) return;
    const counts = {};
    ProductDatabase.forEach(product => { counts[product.brand] = (counts[product.brand] || 0) + 1; });
    const brands = Object.entries(BrandInfo).filter(([name]) => ALLOWED_BRANDS.includes(name));
    container.innerHTML = brands.map(([name, info], index) => {
        const logoSrc = BRAND_LOGOS[name];
        const logo = logoSrc
            ? `<img src="${logoSrc}" alt="${name}" loading="lazy" onerror="this.parentNode.innerHTML='<span class=brand-card-wordmark>${name}</span>'">`
            : `<span class="brand-card-wordmark">${info.logo || name}</span>`;
        const countryFa = BRAND_COUNTRY_FA[info.country] || info.country;
        const descriptionFa = BRAND_DESCRIPTION_FA[name] || 'برند معتبر قابل تأمین با تضمین اصالت و پشتیبانی فنی.';
        const searchable = `${name} ${info.country} ${countryFa} ${descriptionFa}`.toLocaleLowerCase();
        const catalogUrl = (typeof BRAND_CATALOGS !== 'undefined' && BRAND_CATALOGS[name]) || '';
        const catalogBtn = catalogUrl
            ? `<a class="brand-catalog-btn" href="${catalogUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()" aria-label="${name} catalog"><i class="fas fa-book-open"></i><span data-en="Catalog" data-fa="کاتالوگ">کاتالوگ</span></a>`
            : '';
        return `
        <article class="brand-page-card" tabindex="0" role="link" data-brand-card data-search="${searchable}" onclick="filterByBrand('${name}')" onkeydown="if(event.target.closest('a'))return;if(event.key==='Enter'||event.key===' '){event.preventDefault();filterByBrand('${name}')}" aria-label="${name}">
            <div class="brand-card-top">
                <div class="brand-card-logo">${logo}</div>
                <span class="brand-card-code">BRAND / ${String(index + 1).padStart(2, '0')}</span>
            </div>
            <h4>${name}</h4>
            <div class="brand-card-origin"><i class="fas fa-location-dot"></i><span data-en="${info.country}" data-fa="${countryFa}">${countryFa}</span></div>
            <p class="brand-card-description" data-en="${info.description}" data-fa="${descriptionFa}">${descriptionFa}</p>
            <div class="brand-card-footer">
                <span class="brand-product-count"><b dir="ltr">${counts[name] || 0}</b> <span data-en="products" data-fa="محصول">محصول</span></span>
                <span class="brand-card-actions">${catalogBtn}<span class="brand-card-cta"><span data-en="View products" data-fa="مشاهده محصولات">مشاهده محصولات</span><i class="fas fa-arrow-right"></i></span></span>
            </div>
        </article>`;
    }).join('');
    applyLanguage();
    const input = document.getElementById('brand-page-search');
    filterBrandCards(input ? input.value : '');
}

function filterBrandCards(value) {
    const query = String(value || '').trim().toLocaleLowerCase();
    const cards = [...document.querySelectorAll('#brands-grid [data-brand-card]')];
    let visible = 0;
    cards.forEach(card => {
        const match = !query || (card.dataset.search || '').includes(query);
        card.classList.toggle('hidden', !match);
        if (match) visible++;
    });
    const empty = document.getElementById('brands-empty');
    if (empty) empty.classList.toggle('hidden', visible !== 0);
}
