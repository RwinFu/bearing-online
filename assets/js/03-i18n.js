/* ===== 03-i18n.js — سیستم زبان فارسی / انگلیسی ===== */
// =============================================
// LANGUAGE SYSTEM
// =============================================
function applyLanguage() {
    document.documentElement.lang = AppState.language;
    document.documentElement.dir = AppState.language === 'fa' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${AppState.language}`);
    });

    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
        el.placeholder = el.getAttribute(`data-placeholder-${AppState.language}`);
    });

    document.getElementById('lang-toggle').textContent = AppState.language === 'en' ? 'فارسی' : 'English';
}

function toggleLanguage() {
    AppState.language = AppState.language === 'en' ? 'fa' : 'en';
    applyLanguage();
    updateBrandCarouselCaption._brand = null;
    updateBrandCarouselCaption();
    renderActiveFilters();
    renderSearchResults();
    if (!document.getElementById('page-cart').classList.contains('hidden')) renderCart();
    if (!document.getElementById('page-compare').classList.contains('hidden')) renderCompare();
    if (!document.getElementById('page-account').classList.contains('hidden')) showAccount();
    const pd = document.getElementById('product-detail-content');
    if (pd && !document.getElementById('page-product').classList.contains('hidden') && pd.dataset.pid) showProductDetail(pd.dataset.pid);
    if (typeof renderHomeBrands === 'function') renderHomeBrands();
    applyLanguage();
}

const TYPE_FA = { bearing: 'برینگ', linear: 'گاید خطی', coupling: 'کوپلینگ', gearbox: 'گیربکس', grease: 'گریس' };
const TYPE_EN = { bearing: 'Bearing', linear: 'Linear Guide', coupling: 'Coupling', gearbox: 'Gearbox', grease: 'Grease' };
const SUBTYPE_FA = {
    'deep-groove': 'شیار عمیق', spherical: 'بشکه‌ای', tapered: 'مخروطی', 'pillow-block': 'یاتاقان',
    miniature: 'مینیاتوری', standard: 'استاندارد', bushing: 'بوش', jaw: 'فکی', oldham: 'اولدهام',
    bellows: 'آکاردئونی', chain: 'زنجیری', freewheel: 'فری‌ویل', planetary: 'خورشیدی', worm: 'حل‌زونی', bevel: 'کرانویل',
    'general-purpose': 'عمومی'
};
const SUBTYPE_EN = {
    'deep-groove': 'Deep Groove', spherical: 'Spherical Roller', tapered: 'Tapered Roller', 'pillow-block': 'Pillow Block',
    miniature: 'Miniature', standard: 'Standard', bushing: 'Bushing', jaw: 'Jaw', oldham: 'Oldham',
    bellows: 'Bellows', chain: 'Chain', freewheel: 'Freewheel', planetary: 'Planetary', worm: 'Worm', bevel: 'Bevel',
    'general-purpose': 'General Purpose'
};
const SEAL_FA = { Open: 'باز', '2RS': 'دو طرف سیل', '2RS1': 'دو طرف سیل', ZZ: 'دو طرف شیلد', '2Z': 'دو طرف شیلد', Sealed: 'آب‌بندی‌شده', 'N/A': '—' };
// Category labels follow the active UI language: Persian in fa mode,
// English in en mode — no second-language "box" next to the label anymore.
function faType(t) {
    return AppState.language === 'fa' ? (TYPE_FA[t] || t) : (TYPE_EN[t] || t);
}
function faSubtype(s) {
    return AppState.language === 'fa' ? (SUBTYPE_FA[s] || s) : (SUBTYPE_EN[s] || s);
}
function faSeal(s) { return AppState.language === 'fa' ? (SEAL_FA[s] || s) : s; }
