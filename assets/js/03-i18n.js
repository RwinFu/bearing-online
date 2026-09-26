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

const TYPE_FA = {
    bearing: 'بلبرینگ',
    'industrial-bearing': 'بلبرینگ صنعتی',
    'automotive-bearing': 'بلبرینگ خودرویی',
    'housing-bushing': 'یاتاقان و بوش',
    linear: 'گاید خطی',
    coupling: 'کوپلینگ',
    gearbox: 'گیربکس',
    grease: 'گریس'
};
const TYPE_EN = {
    bearing: 'Ball Bearing',
    'industrial-bearing': 'Industrial Bearings',
    'automotive-bearing': 'Automotive Bearings',
    'housing-bushing': 'Housings & Bushings',
    linear: 'Linear Guide',
    coupling: 'Coupling',
    gearbox: 'Gearbox',
    grease: 'Grease'
};
const SUBTYPE_FA = {
    'deep-groove': 'شیار عمیق',
    spherical: 'رولبرینگ بشکه‌ای',
    tapered: 'رولبرینگ مخروطی',
    'pillow-block': 'یاتاقان (پیلوبلاک)',
    miniature: 'مینیاتوری',
    standard: 'استاندارد',
    bushing: 'بوش خطی',
    jaw: 'فکی (لاستیکی)',
    oldham: 'اولدهام',
    bellows: 'آکاردئونی',
    chain: 'زنجیری',
    freewheel: 'یک‌طرفه (فری‌ویل)',
    planetary: 'گیربکس خورشیدی',
    worm: 'حلزونی',
    bevel: 'کرانویل',
    'general-purpose': 'عمومی'
};
const SUBTYPE_EN = {
    'deep-groove': 'Deep Groove Ball',
    spherical: 'Spherical Roller',
    tapered: 'Tapered Roller',
    'pillow-block': 'Pillow Block',
    miniature: 'Miniature',
    standard: 'Standard',
    bushing: 'Linear Bushing',
    jaw: 'Jaw (Rotex)',
    oldham: 'Oldham',
    bellows: 'Bellows',
    chain: 'Chain',
    freewheel: 'Freewheel',
    planetary: 'Planetary Gearbox',
    worm: 'Worm Gear',
    bevel: 'Bevel Gear',
    'general-purpose': 'General Purpose'
};
// بایلینگ: نام فارسی + انگلیسی در هر حالت زبان UI
function bilingualLabel(fa, en) {
    if (!fa && !en) return '';
    if (!en) return fa;
    if (!fa) return en;
    return `<span class="bilingual-fa" lang="fa" dir="rtl">${fa}</span><span class="bilingual-sep"> / </span><span class="bilingual-en" lang="en" dir="ltr">${en}</span>`;
}
function typeLabel(t) {
    return bilingualLabel(TYPE_FA[t], TYPE_EN[t] || t);
}
function subtypeLabel(s) {
    return bilingualLabel(SUBTYPE_FA[s], SUBTYPE_EN[s] || s);
}
function categoryLabelFull(c) {
    const fa = TYPE_FA[c];
    const en = TYPE_EN[c];
    return bilingualLabel(fa, en || c);
}
const SEAL_FA = { Open: 'باز', '2RS': 'دو طرف سیل', '2RS1': 'دو طرف سیل', ZZ: 'دو طرف شیلد', '2Z': 'دو طرف شیلد', Sealed: 'آب‌بندی‌شده', 'N/A': '—' };
// Category labels follow the active UI language: Persian in fa mode,
// English in en mode — no second-language "box" next to the label anymore.
// NOTE: faType / faSubtype now ALWAYS return Persian+English inline so the
// bearing type is visible in both languages regardless of UI language.
function faType(t) {
    return typeLabel(t);
}
function faSubtype(s) {
    return subtypeLabel(s);
}
function faSeal(s) { return AppState.language === 'fa' ? (SEAL_FA[s] || s) : s; }
