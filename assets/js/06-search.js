/* ===== 06-search.js — جستجو (کد، ابعادی، دسته‌بندی) و فیلترها ===== */
// =============================================
// SEARCH SYSTEM
// =============================================
function setSearchMode(mode) {
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.classList.remove('tab-active');
        if (tab.dataset.mode === mode) tab.classList.add('tab-active');
    });
    document.querySelectorAll('.search-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    document.getElementById(`search-${mode}`).classList.remove('hidden');
}

function normalizeSearchValue(value) {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const ar = '٠١٢٣٤٥٦٧٨٩';
    return String(value ?? '')
        .replace(/[۰-۹]/g, d => fa.indexOf(d))
        .replace(/[٠-٩]/g, d => ar.indexOf(d))
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .toLowerCase()
        .replace(/[\s\u200c\u200e\u200f\-_/().]/g, '');
}

function normalizePartCodeDisplay(code) {
    return normalizeLoose(code).replace(/\s+/g, '').toUpperCase();
}

// `hideSource` is for the customer-facing purchase screens (cart / checkout):
// which supplier a line is sourced from is internal information and must not be
// shown to the buyer. Catalogue screens keep the chip.
function getStockBadge(product, hideSource = false) {
    const map = {
        'in-stock': { icon: 'fa-check-circle', cls: 'in-stock', fa: `موجود تهران (${product.stock})`, en: `Tehran stock (${product.stock})` },
        'on-order': { icon: 'fa-clock', cls: 'on-order', fa: product.leadTimeFa || 'در راه', en: 'On order' },
        inquiry: { icon: 'fa-circle-question', cls: 'inquiry', fa: 'نیازمند استعلام', en: 'Inquiry' }
    };
    const item = map[product.stockStatus] || map.inquiry;
    const suppliers = hideSource ? null : productSupplierNames(product);
    const source = suppliers && suppliers.indexOf('انبار خودمان') === -1
        ? `<span class="stock-source-chip"><i class="fas fa-store"></i>${suppliers.join('، ')}</span>`
        : '';
    return `<span class="stock-badge ${item.cls}"><i class="fas ${item.icon}"></i>${AppState.language === 'fa' ? item.fa : item.en}</span>${source}`;
}

function toInchFraction(mm) {
    const common = [
        { mm: 6.35, label: '1/4"' }, { mm: 9.525, label: '3/8"' }, { mm: 12.7, label: '1/2"' },
        { mm: 15.875, label: '5/8"' }, { mm: 19.05, label: '3/4"' }, { mm: 22.225, label: '7/8"' },
        { mm: 25.4, label: '1"' }, { mm: 31.75, label: '1-1/4"' }, { mm: 38.1, label: '1-1/2"' },
        { mm: 50.8, label: '2"' }
    ];
    const close = common.find(item => Math.abs(mm - item.mm) <= Math.max(0.4, item.mm * 0.02));
    return close ? close.label : '';
}

function formatDimensions(product) {
    if (product.type === 'grease') return product.dimensionsLabel || 'NLGI · cartridge';
    const dInch = toInchFraction(product.d);
    const dText = dInch ? `d: ${product.d}mm (≈${dInch})` : `d: ${product.d}mm`;
    return `${dText} | D: ${product.D}mm | B: ${product.B}mm`;
}

function getSuffixGroup(suffix) {
    const normalized = normalizePartCodeDisplay(suffix);
    return SUFFIX_EQUIVALENTS.find(group => group.values.includes(normalized));
}

function extractCodeParts(value) {
    const compact = normalizePartCodeDisplay(value).replace(/[^A-Z0-9]/g, '');
    const suffixValues = SUFFIX_EQUIVALENTS.flatMap(group => group.values).sort((a, b) => b.length - a.length);
    // The suffix is only accepted when it follows the numeric part of the code,
    // so brand names ending in a suffix letter (ZWZ, NTN, Timken, ...) are never split.
    const foundSuffix = suffixValues.find(suffix => compact.endsWith(suffix) && compact.length > suffix.length && /\d$/.test(compact.slice(0, -suffix.length)));
    const base = foundSuffix ? compact.slice(0, -foundSuffix.length) : compact.replace(/(C[2-5])$/, '');
    return { base, suffix: foundSuffix || '' };
}

function getProductSuffix(product) {
    const fromCode = extractCodeParts(product.code).suffix;
    if (fromCode) return fromCode;
    const seal = normalizePartCodeDisplay(product.seal);
    if (seal && seal !== 'OPEN' && seal !== 'SEALED' && seal !== 'N/A') return seal;
    return '';
}

function suffixCompatible(querySuffix, product) {
    if (!querySuffix) return true;
    const queryGroup = getSuffixGroup(querySuffix);
    const productSuffix = getProductSuffix(product);
    const productGroup = getSuffixGroup(productSuffix);
    if (!queryGroup) return normalizeSearchValue(productSuffix) === normalizeSearchValue(querySuffix);
    if (queryGroup.filterOnly) return true; // clearance (C2…C5) is matched against product.clearance in searchProducts()
    return productGroup?.group === queryGroup.group;
}

function normalizeLoose(value) {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const ar = '٠١٢٣٤٥٦٧٨٩';
    return String(value ?? '')
        .replace(/[۰-۹]/g, d => fa.indexOf(d))
        .replace(/[٠-٩]/g, d => ar.indexOf(d))
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/٫/g, '.')
        .toLowerCase()
        .trim();
}

function levenshtein(a, b) {
    if (!a || !b) return Math.max(a.length, b.length);
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}

function getTypeKeywords(product) {
    const map = {
        bearing: 'bearing bearings بلبرینگ بلبرنگ برینگ بیرینگ ساچمه بلبرینگها',
        linear: 'linear guide block rail گاید خطی ریل واگن بلوک',
        coupling: 'coupling کوپلینگ کوپلن کوپلینگها کوپلینگ انتقال قدرت شفت',
        gearbox: 'gearbox gear گیربکس گیربکسها کاهنده جعبه دنده جعبه‌دنده',
        'deep-groove': 'deep groove شیار عمیق شیارعمیق',
        spherical: 'spherical roller رولبرینگ بشکه ای بشکه‌ای خودتنظیم',
        tapered: 'tapered roller رولبرینگ مخروطی',
        'pillow-block': 'pillow block ucp یاتاقان پایه دار پایه‌دار',
        jaw: 'jaw فکی',
        chain: 'chain زنجیر زنجیری',
        planetary: 'planetary خورشیدی سیاره ای سیاره‌ای'
    };
    return `${map[product.type] || ''} ${map[product.subtype] || ''}`;
}

function expandSearchTokens(tokens) {
    const synonyms = {
        'بلبرنگ': ['بلبرینگ', 'bearing'],
        'بلبرینگ': ['بلبرنگ', 'bearing', 'برینگ'],
        'برینگ': ['bearing', 'بلبرینگ'],
        'رولبرینگ': ['roller'],
        'یاتاقان': ['ucp', 'pillow'],
        'کوپلینگ': ['coupling', 'coupler', 'کوپلن'],
        'کوپلن': ['coupling', 'کوپلینگ'],
        'گیربکس': ['gearbox', 'gear', 'کاهنده'],
        'گاید': ['linear', 'guide', 'ریل'],
        'ریل': ['linear', 'guide', 'گاید'],
        'فکی': ['jaw'],
        'مخروطی': ['tapered'],
        'بشکه': ['spherical'],
        'بشکه‌ای': ['spherical'],
        'شیار': ['groove'],
        'عمیق': ['deep']
    };
    return [...new Set(tokens.flatMap(token => [token, ...(synonyms[token] || [])]))];
}

function getTokenAlternatives(token) {
    const synonyms = {
        'بلبرنگ': ['بلبرینگ', 'bearing'], 'بلبرینگ': ['بلبرنگ', 'bearing', 'برینگ'], 'برینگ': ['bearing', 'بلبرینگ'],
        'رولبرینگ': ['roller'], 'یاتاقان': ['ucp', 'pillow'], 'کوپلینگ': ['coupling', 'coupler', 'کوپلن'],
        'کوپلن': ['coupling', 'کوپلینگ'], 'گیربکس': ['gearbox', 'gear', 'کاهنده'], 'گاید': ['linear', 'guide', 'ریل'],
        'ریل': ['linear', 'guide', 'گاید'], 'فکی': ['jaw'], 'مخروطی': ['tapered'], 'بشکه': ['spherical'],
        'بشکه‌ای': ['spherical'], 'شیار': ['groove'], 'عمیق': ['deep']
    };
    return [token, ...(synonyms[token] || [])];
}

function getSearchableText(product) {
    const ids = getProductIdentifiers(product);
    return normalizeLoose([
        product.id, product.code, product.brand, product.type, product.subtype, product.origin,
        ids.reference, ids.article, ids.mpn,
        `${product.d} ${product.D} ${product.B}`,
        `${product.d}x${product.D}x${product.B}`,
        `${product.d}×${product.D}×${product.B}`,
        getTypeKeywords(product)
    ].join(' '));
}

function tokenMatchesProduct(product, token) {
    const normalizedToken = normalizeSearchValue(token);
    if (!normalizedToken) return true;
    if (/^\d+(\.\d+)?$/.test(normalizedToken)) return true;
    const fields = [
        product.code, product.brand, product.type, product.subtype, product.origin,
        getProductIdentifiers(product).reference, getProductIdentifiers(product).article, getProductIdentifiers(product).mpn,
        getTypeKeywords(product)
    ].map(normalizeSearchValue);
    return fields.some(field => field.includes(normalizedToken));
}

function hasAllMeaningfulTokens(product, query) {
    const tokens = normalizeLoose(query).split(/[\s,،+]+/).filter(Boolean).filter(token => !/\d/.test(normalizeSearchValue(token)));
    if (!tokens.length) return true;
    return tokens.every(token => getTokenAlternatives(token).some(alt => tokenMatchesProduct(product, alt)));
}

// Parse a dimension sequence, not unrelated numbers elsewhere in the query.
function parseDimensionQuery(query) {
    const match = normalizeLoose(query).match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)(?:\s*[x×*]\s*(\d+(?:\.\d+)?))?/i);
    return match ? match.slice(1).filter(value => value !== undefined).map(Number) : [];
}

function extractClearanceQuery(query) {
    const match = normalizeLoose(query).match(/c[0-5]$/i);
    return match ? match[0].toUpperCase() : '';
}

// Brand aliases are normalized before tokenizing so word order never changes results.
function normalizeSearchQuery(query) {
    let text = normalizeLoose(query);
    const aliases = [
        [/اس\s*کا\s*اف/g, 'skf'], [/ان\s*اس\s*کا/g, 'nsk'], [/ان\s*تی\s*ان/g, 'ntn'],
        [/اف\s*اِ?ی\s*جی|فاگ/g, 'fag'], [/هایوین|های\s*وین/g, 'hiwin'],
        [/تیمکن/g, 'timken'], [/رینگ\s*اسپن/g, 'ringspann'], [/آساهی|اساهی/g, 'asahi'], [/فلندر/g, 'flender']
    ];
    aliases.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
    // Split maker references, e.g. SKF-6205 and HIWIN-MGN12H, without splitting PL60-5.
    const brands = [...new Set(ProductDatabase.map(p => p.brand.toLowerCase()))];
    brands.forEach(brand => {
        text = text.replace(new RegExp('\\b' + brand + '(?=[\\s_-]*[a-z]*[0-9])', 'g'), brand + ' ');
    });
    return text;
}

function parseSearchQuery(query) {
    let text = normalizeSearchQuery(query);
    const dimensions = parseDimensionQuery(text);
    if (dimensions.length) {
        text = text.replace(/\d+(?:\.\d+)?\s*[x×*]\s*\d+(?:\.\d+)?(?:\s*[x×*]\s*\d+(?:\.\d+)?)?/i, ' ')
            .replace(/\bmm\b|میلی\s*متر|ابعاد|قطر/g, ' ');
    }
    // A spaced alphabetic code prefix belongs to the following number (UCP 205, ROTEX 28).
    text = text.replace(/\b([a-z]+)\s+(\d)/g, (match, prefix, digit) =>
        ProductDatabase.some(p => normalizeSearchValue(p.code).startsWith(prefix + digit)) ? prefix + digit : match);
    const tokens = text.split(/[\s,،+]+/).map(t => t.replace(/^[-_/]+|[-_/]+$/g, '')).filter(Boolean);
    const codes = [], words = [], suffixes = [], clearances = [];
    tokens.forEach(token => {
        let compact = normalizeSearchValue(token).toUpperCase();
        const clearance = compact.match(/C[0-5]$/);
        if (clearance) {
            clearances.push(clearance[0]);
            compact = compact.slice(0, -clearance[0].length);
        }
        if (!compact) return;
        const group = getSuffixGroup(compact);
        if (group && !group.filterOnly) { suffixes.push(compact); return; }
        if (/\d/.test(compact)) {
            const parts = extractCodeParts(compact);
            codes.push(parts.base);
            if (parts.suffix) suffixes.push(parts.suffix);
        } else words.push(token);
    });
    return { dimensions, codes, words, suffixes, clearances };
}

function productSearchScore(product, query, fields = getSelectedPartFields()) {
    const raw = normalizeLoose(query);
    const compactQuery = normalizeSearchValue(raw);
    if (!compactQuery) return 1;

    const identifiers = getProductIdentifiers(product);
    const searchable = getSearchableText(product);
    let score = 0;

    fields.forEach(field => {
        const value = normalizeSearchValue(identifiers[field] || '');
        if (value === compactQuery) score += 120;
        else if (value.startsWith(compactQuery)) score += 80;
        else if (value.includes(compactQuery)) score += 55;
        else if (compactQuery.length >= 4 && value.slice(0, 2) === compactQuery.slice(0, 2) && levenshtein(value.slice(0, compactQuery.length), compactQuery) <= 1) score += 12;
    });

    const tokens = expandSearchTokens(raw.split(/[\s,،+]+/).filter(Boolean));
    const compactProductCode = normalizeSearchValue(`${product.brand}${product.code}`);
    if (compactProductCode.includes(compactQuery)) score += 45;
    if (normalizeSearchValue(`${product.code}${product.brand}`).includes(compactQuery)) score += 25;
    tokens.forEach(token => {
        const normalizedToken = normalizeSearchValue(token);
        if (!normalizedToken) return;
        if (normalizeSearchValue(product.brand) === normalizedToken) score += 35;
        if (normalizeSearchValue(product.code).includes(normalizedToken)) score += 30;
        if (normalizeSearchValue(getTypeKeywords(product)).includes(normalizedToken)) score += 22;
        if (normalizeSearchValue(searchable).includes(normalizedToken)) score += 10;
    });

    const dims = parseDimensionQuery(query);
    if (dims.length) {
        if (Math.abs(product.d - dims[0]) <= 0.2) score += 30;
        if (dims[1] !== undefined && Math.abs(product.D - dims[1]) <= 0.2) score += 30;
        if (dims[2] !== undefined && Math.abs(product.B - dims[2]) <= 0.2) score += 25;
    }

    return score;
}

function searchProducts(query, fields = getSelectedPartFields()) {
    if (!normalizeSearchValue(query)) return [...ProductDatabase];
    const parsed = parseSearchQuery(query);
    return ProductDatabase.filter(product => {
        const ids = getProductIdentifiers(product);
        const text = normalizeSearchValue(`${getSearchableText(product)} ${ORIGIN_FA[product.origin] || ''} ${SUBTYPE_FA[product.subtype] || ''}`);
        return parsed.words.every(token => getTokenAlternatives(token).some(alt => text.includes(normalizeSearchValue(alt)))) &&
            parsed.codes.every(code => fields.some(field => normalizeSearchValue(ids[field]).includes(normalizeSearchValue(code)))) &&
            parsed.suffixes.every(suffix => suffixCompatible(suffix, product)) &&
            parsed.clearances.every(clearance => normalizeSearchValue(product.clearance) === normalizeSearchValue(clearance)) &&
            parsed.dimensions.every((value, i) => Math.abs(product[['d', 'D', 'B'][i]] - value) <= 0.2);
    }).map(product => {
        const suffix = getProductSuffix(product);
        const equivalent = parsed.suffixes.some(value => value !== suffix && getSuffixGroup(value)?.group === getSuffixGroup(suffix)?.group);
        const score = productSearchScore(product, normalizeSearchQuery(query), fields) + (equivalent ? 25 : 80);
        // Suggestions must not mutate metadata on already-rendered search results.
        return { product: { ...product, searchMeta: { equivalent, suffixMatch: parsed.suffixes.join(' ') } }, score };
    }).sort((a, b) => b.score - a.score || a.product.code.localeCompare(b.product.code)).map(item => item.product);
}

function getProductIdentifiers(product) {
    return {
        reference: product.id,
        article: product.code,
        mpn: `${product.brand}-${product.code}`
    };
}

function getIdentifierLabel(key) {
    const labels = {
        reference: AppState.language === 'fa' ? 'کد مرجع' : 'Reference code',
        article: AppState.language === 'fa' ? 'شماره قطعه' : 'Part code',
        mpn: AppState.language === 'fa' ? 'کد سازنده' : 'Maker code'
    };
    return labels[key] || key;
}

function getSelectedPartFields() {
    const selected = [...document.querySelectorAll('.part-field:checked')].map(input => input.value);
    return selected.length ? selected : ['reference', 'article', 'mpn'];
}

function productMatchesPartQuery(product, query, fields = getSelectedPartFields()) {
    if (!query) return true;
    const normalizedQuery = normalizeSearchValue(query);
    const identifiers = getProductIdentifiers(product);
    return fields.some(field => normalizeSearchValue(identifiers[field] || '').includes(normalizedQuery));
}

function toMillimeter(value, unit) {
    const text = normalizeLoose(value);
    if (!text) return null;
    const number = Number(text);
    if (!Number.isFinite(number) || number <= 0) return null;
    return unit === 'inch' ? number * 25.4 : number;
}

function dimensionWithin(value, exactValue, minValue, maxValue, mode, tolerance = 0.15) {
    if (mode === 'exact') {
        return exactValue === null || Math.abs(value - exactValue) <= tolerance;
    }
    const minOk = minValue === null || value >= minValue;
    const maxOk = maxValue === null || value <= maxValue;
    return minOk && maxOk;
}

function toggleDimensionMode(scope = 'hero') {
    if (scope === 'hero') {
        const mode = document.querySelector('input[name="dim-mode"]:checked')?.value || 'exact';
        const exact = document.getElementById('dim-exact-fields');
        const range = document.getElementById('dim-range-fields');
        exact.classList.toggle('hidden', mode !== 'exact');
        range.classList.toggle('hidden', mode !== 'range');
        exact.classList.toggle('active', mode === 'exact');
        range.classList.toggle('active', mode === 'range');
    }
}

let autocompleteTimer;
let autocompleteIndex = -1;
function closeAutocomplete() {
    clearTimeout(autocompleteTimer);
    autocompleteIndex = -1;
    document.getElementById('autocomplete-dropdown').classList.add('hidden');
    const input = document.getElementById('search-input');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
}

function handleSearchKeydown(event) {
    if (event.isComposing) return;
    const dropdown = document.getElementById('autocomplete-dropdown');
    const items = [...dropdown.querySelectorAll('[role="option"]')];
    if (event.key === 'Escape') { closeAutocomplete(); return; }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && items.length && !dropdown.classList.contains('hidden')) {
        event.preventDefault();
        autocompleteIndex = (autocompleteIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((item, index) => item.setAttribute('aria-selected', String(index === autocompleteIndex)));
        event.target.setAttribute('aria-activedescendant', items[autocompleteIndex].id);
        items[autocompleteIndex].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (autocompleteIndex >= 0 && !dropdown.classList.contains('hidden')) items[autocompleteIndex]?.click();
        else performSearch();
    }
}

function handleSearchInput(value) {
    closeAutocomplete();
    autocompleteTimer = setTimeout(() => executeAutocomplete(value), 250);
}

function executeAutocomplete(value) {
    const dropdown = document.getElementById('autocomplete-dropdown');
    autocompleteIndex = -1;
    if (value.trim().length < 2) {
        closeAutocomplete();
        return;
    }

    const fields = getSelectedPartFields();
    const matches = searchProducts(value, fields).slice(0, 8);

    if (matches.length === 0) {
        AppState.pendingLeadQuery = value;
        dropdown.innerHTML = `
            <div class="px-4 py-4 bg-gray-50">
                <div class="font-bold text-gray-800 mb-1">${AppState.language === 'fa' ? 'نتیجه‌ای پیدا نشد' : 'No matching result'}</div>
                <div class="text-sm text-gray-500 mb-3">${AppState.language === 'fa' ? 'همین جستجو را به درخواست تامین تبدیل کنید.' : 'Convert this search into a sourcing request.'}</div>
                <button onclick="submitMissingSearchFromAutocomplete()" class="btn-accent text-white px-4 py-2 rounded-lg text-sm font-bold">
                    ${AppState.language === 'fa' ? 'ثبت درخواست سریع' : 'Fast request'}
                </button>
            </div>
        `;
        dropdown.classList.remove('hidden');
    document.getElementById('search-input').setAttribute('aria-expanded', 'true');
        return;
    }

    dropdown.innerHTML = matches.map((p, index) => `
        <div id="search-option-${index}" role="option" aria-selected="false" class="autocomplete-item px-4 py-3 cursor-pointer border-b border-gray-100 flex items-center justify-between hover:bg-blue-50 transition" onclick="closeAutocomplete(); showProductDetail('${p.id}')">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    ${hasProductImage(p) ? `<img src="${p.image}" alt="" class="w-full h-full object-contain">` : `<i class="fas fa-${productTypeIcon(p.type)} text-gray-400"></i>`}
                </div>
                <div>
                    <div class="font-medium text-gray-800" dir="ltr">${p.brand} ${p.code} ${p.searchMeta?.equivalent ? `<span class="mr-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">${AppState.language === 'fa' ? 'معادل' : 'Equivalent'}</span>` : ''}</div>
                    <div class="text-sm text-gray-500" dir="ltr">${p.type === 'grease' ? (p.dimensionsLabel || '') : `${p.d}×${p.D}×${p.B} mm`} | ${getIdentifierLabel('mpn')}: ${getProductIdentifiers(p).mpn}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="mb-1">${getStockBadge(p)}</div>
                <div class="text-sm font-medium text-blue-600">${p.sell_mode === 'instant' ? formatPrice(p.priceUSD) + (AppState.language === 'fa' ? ' تومان' : ' Toman') : (AppState.language === 'fa' ? 'استعلام' : 'RFQ')}</div>
            </div>
        </div>
    `).join('');
    dropdown.classList.remove('hidden');
    document.getElementById('search-input').setAttribute('aria-expanded', 'true');
}

function submitMissingSearchFromAutocomplete() {
    AppState.lastSearch = AppState.pendingLeadQuery || document.getElementById('search-input').value.trim();
    document.getElementById('autocomplete-dropdown').classList.add('hidden');
    openLeadModal('failed-search');
}

function performSearch(value = document.getElementById('search-input').value) {
    const rawQuery = value.trim();
    if (!rawQuery && !document.getElementById('page-search').classList.contains('hidden')) { clearFilters(); return; }
    if (!rawQuery) {
        showNotification(AppState.language === 'fa' ? 'کد، برند یا ابعاد قطعه را وارد کنید' : 'Enter part code, brand, or size', 'error');
        document.getElementById('search-input').focus();
        return;
    }
    resetProductFilters();
    closeAutocomplete();
    AppState.lastSearch = rawQuery;
    AppState.textQuery = rawQuery;
    AppState.dimensionSearch = null;
    recomputeResults();
    document.getElementById('autocomplete-dropdown').classList.add('hidden');
    updateHashRoute('search');
}

function searchByDimension() {
    const mode = document.querySelector('input[name="dim-mode"]:checked')?.value || 'exact';
    const unit = document.querySelector('input[name="dim-unit"]:checked')?.value || 'metric';
    const d = toMillimeter(document.getElementById('dim-d')?.value, unit);
    const D = toMillimeter(document.getElementById('dim-D')?.value, unit);
    const B = toMillimeter(document.getElementById('dim-B')?.value, unit);
    const dMin = toMillimeter(document.getElementById('dim-d-min')?.value, unit);
    const dMax = toMillimeter(document.getElementById('dim-d-max')?.value, unit);
    const DMin = toMillimeter(document.getElementById('dim-D-min')?.value, unit);
    const DMax = toMillimeter(document.getElementById('dim-D-max')?.value, unit);
    const BMin = toMillimeter(document.getElementById('dim-B-min')?.value, unit);
    const BMax = toMillimeter(document.getElementById('dim-B-max')?.value, unit);
    const activeIds = mode === 'exact' ? ['dim-d', 'dim-D', 'dim-B'] : ['dim-d-min','dim-d-max','dim-D-min','dim-D-max','dim-B-min','dim-B-max'];
    if (!validateDimensionInputs(activeIds)) return;
    const values = mode === 'exact' ? [d, D, B] : [dMin, dMax, DMin, DMax, BMin, BMax];
    if (values.every(value => value === null) || (mode === 'range' && [[dMin,dMax],[DMin,DMax],[BMin,BMax]].some(([min,max]) => min !== null && max !== null && min > max))) {
        showNotification(AppState.language === 'fa' ? 'حداقل یک بُعد مثبت وارد کنید؛ حداقل بازه نباید از حداکثر بیشتر باشد.' : 'Enter a positive dimension and valid min/max ranges.', 'error');
        return;
    }
    resetProductFilters();
    AppState.lastSearch = mode === 'exact'
        ? `Exact ${unit}: d=${document.getElementById('dim-d').value || '-'}, D=${document.getElementById('dim-D').value || '-'}, B=${document.getElementById('dim-B').value || '-'}`
        : `Range ${unit}: d=${document.getElementById('dim-d-min').value || '-'}-${document.getElementById('dim-d-max').value || '-'}, D=${document.getElementById('dim-D-min').value || '-'}-${document.getElementById('dim-D-max').value || '-'}, B=${document.getElementById('dim-B-min').value || '-'}-${document.getElementById('dim-B-max').value || '-'}`;
    AppState.dimensionSearch = { mode, unit, d, D, B, dMin, dMax, DMin, DMax, BMin, BMax };

    recomputeResults();
    updateHashRoute('search');
}

function searchByType(type) {
    resetProductFilters();
    AppState.lastSearch = type;
    AppState.categoryFilter = type;
    recomputeResults();
    updateHashRoute('search');
}

function resetProductFilters() {
    AppState.textQuery = '';
    AppState.categoryFilter = '';
    AppState.dimensionSearch = null;
    AppState.lastSearch = '';
    AppState.relevanceOrder = [];
    document.getElementById('filter-dim-range').checked = true;
    document.getElementById('filter-unit-mm').checked = true;
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    document.querySelectorAll('.brand-filter, .type-filter, .origin-filter, .tech-filter').forEach(cb => cb.checked = false);
    ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.removeAttribute('aria-invalid'); }
    });
    const onlyStock = document.getElementById('filter-only-stock');
    if (onlyStock) onlyStock.checked = false;
}

function filterByBrand(brand) {
    resetProductFilters();
    AppState.lastSearch = brand;
    document.querySelectorAll('.brand-filter').forEach(input => input.checked = input.value === brand);
    recomputeResults();
    updateHashRoute('search');
}

function toggleFilterGroup(button) {
    button.closest('.filter-group').classList.toggle('collapsed');
}

function setQuickFilter(kind, value) {
    const map = {
        brand: '.brand-filter',
        type: '.type-filter',
        origin: '.origin-filter'
    };
    const target = [...document.querySelectorAll(map[kind] || '')].find(input => input.value === value);
    if (target) {
        target.checked = true;
        applyFilters();
    }
}

function removeFilter(kind, value) {
    if (kind === 'category') {
        AppState.categoryFilter = '';
    } else if (kind === 'hero-dimension') {
        AppState.dimensionSearch = null;
    } else if (kind === 'dimension') {
        ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    } else if (kind === 'stock') {
        const input = document.getElementById('filter-only-stock');
        if (input) input.checked = false;
    } else if (kind === 'tech') {
        const [field, val] = value.split(':');
        document.querySelectorAll('.tech-filter').forEach(input => {
            if (input.dataset.field === field && input.value === val) input.checked = false;
        });
    } else {
        const selector = kind === 'brand' ? '.brand-filter' : kind === 'type' ? '.type-filter' : '.origin-filter';
        document.querySelectorAll(selector).forEach(input => {
            if (input.value === value) input.checked = false;
        });
    }
    applyFilters();
}

function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const counter = document.getElementById('active-filter-count');
    const bar = document.getElementById('filter-strength-bar');
    if (!container || !counter || !bar) return;

    const chips = [];
    if (AppState.categoryFilter) chips.push({ kind: 'category', value: '', label: getCategoryLabel(AppState.categoryFilter) });
    if (AppState.dimensionSearch) chips.push({ kind: 'hero-dimension', value: '', label: getDimensionLabel(AppState.dimensionSearch) });
    document.querySelectorAll('.brand-filter:checked').forEach(input => chips.push({ kind: 'brand', value: input.value, label: input.value }));
    document.querySelectorAll('.type-filter:checked').forEach(input => chips.push({ kind: 'type', value: input.value, label: input.closest('label')?.textContent.trim().replace(/\d+$/,'').trim() || input.value }));
    document.querySelectorAll('.origin-filter:checked').forEach(input => chips.push({ kind: 'origin', value: input.value, label: input.closest('label')?.textContent.trim().replace(/\d+$/,'').trim() || input.value }));
    document.querySelectorAll('.tech-filter:checked').forEach(input => chips.push({ kind: 'tech', value: `${input.dataset.field}:${input.value}`, label: input.closest('label')?.textContent.trim() || input.value }));

    const dimIds = ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'];
    const hasDim = dimIds.some(id => document.getElementById(id)?.value);
    if (hasDim) chips.push({ kind: 'dimension', value: 'dimension', label: AppState.language === 'fa' ? 'ابعاد' : 'Size' });
    if (document.getElementById('filter-only-stock')?.checked) chips.push({ kind: 'stock', value: 'stock', label: AppState.language === 'fa' ? 'فقط موجود تهران' : 'Tehran stock' });

    counter.textContent = AppState.language === 'fa' ? `${chips.length} فعال` : `${chips.length} active`;
    bar.style.width = `${Math.min(chips.length * 22, 100)}%`;

    if (!chips.length) {
        container.innerHTML = `<span class="text-xs text-gray-400">${AppState.language === 'fa' ? 'فیلتری فعال نیست' : 'No active filters'}</span>`;
        return;
    }

    container.innerHTML = chips.map(chip => `
        <span class="active-filter-chip">
            ${escapeHTML(chip.label)}
            <button onclick="removeFilter('${chip.kind}', '${chip.value}')" aria-label="Remove filter">×</button>
        </span>
    `).join('');
}

function updateFilterCounts() {
    // The catalogue includes more brands than the initial featured-brand list.
    const list = document.querySelector('.brand-filter')?.closest('.filter-content');
    const shown = [...document.querySelectorAll('.brand-filter')].map(input => input.value);
    [...new Set(ProductDatabase.map(product => product.brand))].filter(brand => !shown.includes(brand)).sort().forEach(brand => {
        const row = document.createElement('label');
        row.className = 'filter-row';
        row.innerHTML = `<span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="${escapeHTML(brand)}" onchange="applyFilters()"><span>${escapeHTML(brand)}</span></span><span class="filter-count"></span>`;
        list?.appendChild(row);
    });
    document.querySelectorAll('.filter-row input').forEach(input => {
        const row = input.closest('.filter-row');
        const countEl = row?.querySelector('.filter-count');
        if (!countEl) return;
        let count = 0;
        if (input.classList.contains('brand-filter')) count = ProductDatabase.filter(p => p.brand === input.value).length;
        if (input.classList.contains('type-filter')) count = ProductDatabase.filter(p => p.type === input.value).length;
        if (input.classList.contains('origin-filter')) count = ProductDatabase.filter(p => p.origin === input.value).length;
        countEl.textContent = count;
    });
    const stockCount = document.getElementById('stock-filter-count');
    if (stockCount) stockCount.textContent = ProductDatabase.filter(p => p.stockStatus === 'in-stock' && p.stock > 0).length;
}

function updateHomeStats() {
    const indexed = document.getElementById('indexed-product-counter');
    if (indexed) {
        indexed.dataset.count = ProductDatabase.length;
        indexed.textContent = '0';
    }
}

function getSidebarFilterState() {
    const selectedBrands = [...document.querySelectorAll('.brand-filter:checked')].map(cb => cb.value);
    const selectedTypes = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);
    const selectedOrigins = [...document.querySelectorAll('.origin-filter:checked')].map(cb => cb.value);
    const techFilters = [...document.querySelectorAll('.tech-filter:checked')].reduce((acc, input) => {
        const field = input.dataset.field;
        acc[field] = acc[field] || [];
        acc[field].push(input.value);
        return acc;
    }, {});
    const onlyStock = !!document.getElementById('filter-only-stock')?.checked;
    const dimMode = document.querySelector('input[name="filter-dim-mode"]:checked')?.value || 'range';
    const dimUnit = document.querySelector('input[name="filter-dim-unit"]:checked')?.value || 'metric';
    document.querySelectorAll('#filters-aside input[id$="-max"]').forEach(input => { input.disabled = dimMode === 'exact'; });
    const dMin = toMillimeter(document.getElementById('filter-d-min').value, dimUnit);
    const dMax = toMillimeter(document.getElementById('filter-d-max').value, dimUnit);
    const DMin = toMillimeter(document.getElementById('filter-D-min').value, dimUnit);
    const DMax = toMillimeter(document.getElementById('filter-D-max').value, dimUnit);
    const BMin = toMillimeter(document.getElementById('filter-B-min').value, dimUnit);
    const BMax = toMillimeter(document.getElementById('filter-B-max').value, dimUnit);
    return { selectedBrands, selectedTypes, selectedOrigins, techFilters, onlyStock, dimMode, dimUnit, dMin, dMax, DMin, DMax, BMin, BMax };
}

function applyDimensionResultSet(results, dim) {
    if (!dim) return results;
    const hasDimFilter = [dim.d, dim.D, dim.B, dim.dMin, dim.dMax, dim.DMin, dim.DMax, dim.BMin, dim.BMax].some(value => value !== null && value !== undefined && value !== '');
    if (!hasDimFilter) return results;
    const tol = value => dim.unit === 'inch' && value ? Math.max(0.5, value * 0.01) : 0.15;
    return results.filter(p =>
        dimensionWithin(p.d, dim.d ?? null, dim.dMin ?? null, dim.dMax ?? null, dim.mode, tol(dim.d)) &&
        dimensionWithin(p.D, dim.D ?? null, dim.DMin ?? null, dim.DMax ?? null, dim.mode, tol(dim.D)) &&
        dimensionWithin(p.B, dim.B ?? null, dim.BMin ?? null, dim.BMax ?? null, dim.mode, tol(dim.B))
    );
}

function recomputeResults() {
    const filter = getSidebarFilterState();
    const query = AppState.textQuery || '';
    let results = query ? searchProducts(query, getSelectedPartFields()) : [...ProductDatabase];
    AppState.relevanceOrder = results.map(product => product.id);

    if (AppState.categoryFilter) {
        const category = AppState.categoryFilter;
        results = results.filter(p => {
            if (category === 'industrial-bearing') return p.type === 'bearing' && p.subtype !== 'pillow-block';
            if (category === 'automotive-bearing') return p.type === 'bearing' && ['tapered','deep-groove'].includes(p.subtype);
            if (category === 'housing-bushing') return p.subtype === 'pillow-block' || normalizeSearchValue(p.code).includes('ucp') || normalizeSearchValue(p.code).includes('lm');
            if (category === 'grease') return p.lubrication === 'Grease';
            return p.type === category || p.subtype === category;
        });
    }

    if (filter.selectedBrands.length > 0) {
        results = results.filter(p => filter.selectedBrands.includes(p.brand));
    }
    if (filter.selectedTypes.length > 0) {
        results = results.filter(p => filter.selectedTypes.includes(p.type));
    }
    if (filter.selectedOrigins.length > 0) {
        results = results.filter(p => filter.selectedOrigins.includes(p.origin));
    }
    if (filter.onlyStock) {
        results = results.filter(p => p.stockStatus === 'in-stock' && p.stock > 0);
    }
    Object.entries(filter.techFilters).forEach(([field, values]) => {
        if (values.length) results = results.filter(p => values.includes(p[field]));
    });

    results = applyDimensionResultSet(results, AppState.dimensionSearch);

    const hasDimFilter = [filter.dMin, filter.dMax, filter.DMin, filter.DMax, filter.BMin, filter.BMax].some(value => value !== null);
    if (hasDimFilter) {
        results = results.filter(p => {
            const tol = value => filter.dimUnit === 'inch' && value ? Math.max(0.5, value * 0.01) : 0.15;
            const dOk = filter.dimMode === 'exact'
                ? dimensionWithin(p.d, filter.dMin, null, null, 'exact', tol(filter.dMin))
                : dimensionWithin(p.d, null, filter.dMin, filter.dMax, 'range');
            const DOk = filter.dimMode === 'exact'
                ? dimensionWithin(p.D, filter.DMin, null, null, 'exact', tol(filter.DMin))
                : dimensionWithin(p.D, null, filter.DMin, filter.DMax, 'range');
            const BOk = filter.dimMode === 'exact'
                ? dimensionWithin(p.B, filter.BMin, null, null, 'exact', tol(filter.BMin))
                : dimensionWithin(p.B, null, filter.BMin, filter.BMax, 'range');
            return dOk && DOk && BOk;
        });
    }

    AppState.searchResults = results;
    const input = document.getElementById('results-search-input');
    if (input) input.value = query;
    document.getElementById('search-input').value = query;
    renderActiveFilters();
    sortResults(false);
}

function applyFilters() {
    const exact = document.getElementById('filter-dim-exact').checked;
    if (!validateDimensionInputs(exact ? ['filter-d-min','filter-D-min','filter-B-min'] : ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'])) return;
    recomputeResults();
    syncSearchRoute();
}

function clearFilters() {
    resetProductFilters();
    recomputeResults();
    syncSearchRoute();
}

function sortResults(sync = true) {
    AppState.searchResults = [...AppState.searchResults];
    const sortBy = document.getElementById('sort-select').value;
    switch (sortBy) {
        case 'relevance':
            if (AppState.relevanceOrder.length) {
                AppState.searchResults.sort((a, b) => AppState.relevanceOrder.indexOf(a.id) - AppState.relevanceOrder.indexOf(b.id));
            }
            break;
        case 'price-asc':
            AppState.searchResults.sort((a, b) => Number(b.sell_mode === 'instant') - Number(a.sell_mode === 'instant') || a.priceUSD - b.priceUSD);
            break;
        case 'price-desc':
            AppState.searchResults.sort((a, b) => Number(b.sell_mode === 'instant') - Number(a.sell_mode === 'instant') || b.priceUSD - a.priceUSD);
            break;
        case 'name':
            AppState.searchResults.sort((a, b) => a.code.localeCompare(b.code));
            break;
    }
    renderSearchResults();
    if (sync) syncSearchRoute();
}

function setViewMode(mode) {
    AppState.viewMode = mode;
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode));
        btn.classList.remove('bg-blue-100', 'text-blue-600');
        btn.classList.add('hover:bg-gray-100');
        if (btn.dataset.mode === mode) {
            btn.classList.add('bg-blue-100', 'text-blue-600');
            btn.classList.remove('hover:bg-gray-100');
        }
    });
    renderSearchResults();
    syncSearchRoute();
}

function renderSearchResults() {
    const container = document.getElementById('results-container');
    const tableContainer = document.getElementById('results-table-container');
    const tableBody = document.getElementById('results-table-body');
    document.getElementById('results-count').textContent = formatNumber(AppState.searchResults.length);

    if (AppState.searchResults.length === 0) {
        tableContainer.classList.add('hidden');
        container.classList.remove('hidden');
        container.className = 'results-empty grid grid-cols-1 gap-6';
        const title = AppState.language === 'fa' ? 'قطعه در دیتابیس پیدا نشد' : 'Part not found in the indexed database';
        const desc = AppState.language === 'fa'
            ? 'این جستجو را به درخواست تامین تبدیل کنید. تیم مهندسی برینگ آنلاین کد معادل، برند جایگزین، قیمت نهایی و زمان تحویل را سریع اعلام می‌کند.'
            : 'Convert this search into a sourcing request. Bearing Online engineering will return equivalent codes, alternative brands, final price, and delivery time fast.';
        const queryLabel = AppState.language === 'fa' ? 'جستجوی شما' : 'Your search';
        const sendLabel = AppState.language === 'fa' ? 'ثبت سفارش سریع این قطعه' : 'Create fast request for this part';
        const consultLabel = AppState.language === 'fa' ? 'مشاوره مهندسی رایگان' : 'Free engineering consultation';
        container.innerHTML = `
            <div class="lead-card rounded-2xl p-4 sm:p-5 text-white animate-slide-up">
                <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs mb-2 w-fit max-w-full">
                    <i class="fas fa-magnifying-glass-chart shrink-0"></i>
                    <span class="truncate">${queryLabel}: ${escapeHTML(AppState.textQuery || (AppState.dimensionSearch ? getDimensionLabel(AppState.dimensionSearch) : '') || getCategoryLabel(AppState.categoryFilter) || AppState.lastSearch || '-')}</span>
                </div>
                <h3 class="text-lg sm:text-xl font-extrabold mb-1">${title}</h3>
                <p class="text-white/70 text-xs sm:text-sm mb-3 max-w-2xl leading-5">${desc}</p>
                <button onclick="clearFilters()" class="mb-3 underline text-sm">${AppState.language === 'fa' ? 'پاک کردن جستجو و فیلترها' : 'Clear search and filters'}</button>
                <div class="flex flex-col sm:flex-row gap-2">
                    <button onclick="openLeadModal('failed-search')" class="btn-accent magnetic text-white px-4 py-2.5 rounded-xl font-bold text-sm">
                        <i class="fas fa-bolt mr-2"></i>${sendLabel}
                    </button>
                    <button onclick="openLeadModal('consultation')" class="btn-primary magnetic text-white px-4 py-2.5 rounded-xl font-bold text-sm">
                        <i class="fas fa-user-gear mr-2"></i>${consultLabel}
                    </button>
                </div>
            </div>
        `;
        initMagnetic();
        initRipple();
        return;
    }

    if (AppState.viewMode === 'grid') {
        container.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';
        container.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        container.innerHTML = AppState.searchResults.map(p => `
            <div tabindex="0" role="link" aria-label="${p.brand} ${p.code}" onkeydown="if(event.target === this && event.key === 'Enter') showProductDetail('${p.id}')" class="bg-white rounded-2xl shadow-sm overflow-hidden card-hover tilt-card animate-fade-in cursor-pointer" onclick="showProductDetail('${p.id}')">
                <div class="product-image-bg p-6 sm:p-8 flex items-center justify-center relative">
                    ${hasProductImage(p) ? `<img src="${p.image}" alt="${p.brand} ${p.code}" class="product-photo max-h-44 w-auto max-w-full object-contain rounded-lg" loading="lazy">` : `<i class="fas fa-${productTypeIcon(p.type)} text-6xl text-gray-300"></i>`}
                    <button onclick="event.stopPropagation(); toggleCompare('${p.id}')" aria-label="${AppState.language === 'fa' ? 'مقایسه' : 'Compare'}" class="absolute top-4 right-4 w-10 h-10 rounded-full ${AppState.compareList.includes(p.id) ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:text-blue-500'} shadow flex items-center justify-center transition">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                    <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" aria-label="${AppState.language === 'fa' ? 'علاقه‌مندی' : 'Save product'}" class="absolute top-4 left-4 w-10 h-10 rounded-full ${AppState.wishlist.includes(p.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'} shadow flex items-center justify-center transition">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-600">${p.brand}</span>
                        <span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">${faOrigin(p.origin)}</span>
                    </div>
                    <h4 dir="ltr" class="product-code text-lg font-bold text-gray-800 mb-2 hover:text-blue-600">${p.code} ${p.searchMeta?.equivalent ? `<span class="mr-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">${AppState.language === 'fa' ? 'معادل' : 'Equivalent'}</span>` : ''}</h4>
                    <p class="product-dimensions text-sm text-gray-500 mb-3" dir="ltr">${formatDimensions(p)}</p>
                    <div class="mb-4">${getStockBadge(p)}</div>
                    <div class="product-card-footer flex items-center justify-between">
                        <div>
                            <span class="text-2xl font-bold ${p.sell_mode === 'instant' ? 'text-gray-800' : 'text-orange-600'}">${p.sell_mode === 'instant' ? formatPrice(p.priceUSD) : (AppState.language === 'fa' ? 'استعلام' : 'RFQ')}</span>
                            ${p.sell_mode === 'instant' ? `<span class="text-sm text-gray-500"> ${AppState.language === 'fa' ? 'تومان' : 'Toman'}</span>` : ''}
                        </div>
                        ${p.sell_mode === 'instant' ? `<button onclick="event.stopPropagation(); addToCart('${p.id}')" aria-label="${AppState.language === 'fa' ? 'افزودن به سبد' : 'Add to cart'}" class="btn-primary text-white px-4 py-2 rounded-lg"><i class="fas fa-cart-plus"></i></button>` : `<button onclick="event.stopPropagation(); requestQuote('${p.id}')" class="btn-accent text-white px-4 py-2 rounded-lg text-sm">${AppState.language === 'fa' ? 'استعلام' : 'RFQ'}</button>`}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        tableBody.innerHTML = AppState.searchResults.map(p => `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer" onclick="showProductDetail('${p.id}')">
                <td class="px-4 py-4">
                    <span class="font-medium text-blue-600 hover:underline">${p.code}</span>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-600">${p.brand}</span>
                </td>
                <td dir="ltr" class="px-4 py-4 text-gray-600">${formatDimensions(p)}</td>
                <td class="px-4 py-4 text-gray-600">${faType(p.type)}</td>
                <td class="px-4 py-4">${getStockBadge(p)}</td>
                <td class="px-4 py-4 font-bold ${p.sell_mode === 'instant' ? 'text-gray-800' : 'text-orange-600'}">${p.sell_mode === 'instant' ? `${formatPrice(p.priceUSD)} <span class="text-xs text-gray-500">${AppState.language === 'fa' ? 'تومان' : 'Toman'}</span>` : (AppState.language === 'fa' ? 'استعلام' : 'RFQ')}</td>
                <td class="px-4 py-4">
                    <div class="flex gap-2">
                        ${p.sell_mode === 'instant' ? `<button onclick="event.stopPropagation(); addToCart('${p.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Add to cart"><i class="fas fa-cart-plus"></i></button>` : `<button onclick="event.stopPropagation(); requestQuote('${p.id}')" class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition" title="RFQ"><i class="fas fa-file-invoice"></i></button>`}
                        <button onclick="event.stopPropagation(); toggleCompare('${p.id}')" class="p-2 ${AppState.compareList.includes(p.id) ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'} rounded-lg transition" title="Compare">
                            <i class="fas fa-balance-scale"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="p-2 ${AppState.wishlist.includes(p.id) ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:bg-gray-100'} rounded-lg transition" title="Save">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// Keep the complete search context in the URL (share, reload and Back all agree).
function getSearchRoute() {
    const params = new URLSearchParams();
    if (AppState.textQuery) params.set('q', AppState.textQuery);
    if (AppState.categoryFilter) params.set('category', AppState.categoryFilter);
    if (AppState.dimensionSearch) params.set('dim', JSON.stringify(AppState.dimensionSearch));
    ['brand', 'type', 'origin', 'tech'].forEach(kind => {
        document.querySelectorAll(`.${kind}-filter:checked`).forEach(input => {
            params.append(kind, kind === 'tech' ? `${input.dataset.field}:${input.value}` : input.value);
        });
    });
    if (document.getElementById('filter-only-stock').checked) params.set('stock', '1');
    ['d-min','d-max','D-min','D-max','B-min','B-max'].forEach(key => {
        const value = document.getElementById(`filter-${key}`).value;
        if (value) params.set(key, value);
    });
    ['mode', 'unit'].forEach(key => {
        const value = document.querySelector(`input[name="filter-dim-${key}"]:checked`)?.value;
        if (value && value !== (key === 'mode' ? 'range' : 'metric')) params.set(key, value);
    });
    const sort = document.getElementById('sort-select').value;
    if (sort !== 'relevance') params.set('sort', sort);
    if (AppState.viewMode !== 'grid') params.set('view', AppState.viewMode);
    const fields = getSelectedPartFields();
    if (fields.length !== 3) params.set('fields', fields.join(','));
    return '#/search' + (params.size ? '?' + params.toString() : '');
}

function syncSearchRoute() {
    if (!AppState.routing && location.hash.startsWith('#/search')) {
        history.replaceState(null, '', getSearchRoute());
    }
}

function restoreSearchRoute(params) {
    resetProductFilters();
    AppState.textQuery = (params.get('q') || '').slice(0, 250);
    AppState.lastSearch = AppState.textQuery;
    const category = params.get('category') || '';
    AppState.categoryFilter = ['bearing','industrial-bearing','automotive-bearing','housing-bushing','grease','linear','coupling','gearbox', ...ProductDatabase.map(p => p.subtype)].includes(category) ? category : '';
    try {
        const dim = JSON.parse(params.get('dim'));
        if (dim && ['exact', 'range'].includes(dim.mode) && ['metric', 'inch'].includes(dim.unit)) {
            const safe = { mode: dim.mode, unit: dim.unit };
            ['d','D','B','dMin','dMax','DMin','DMax','BMin','BMax'].forEach(key => {
                safe[key] = typeof dim[key] === 'number' && Number.isFinite(dim[key]) && dim[key] > 0 ? dim[key] : null;
            });
            AppState.dimensionSearch = safe;
        }
    } catch (_) { /* Ignore malformed optional dimension state. */ }
    ['brand', 'type', 'origin', 'tech'].forEach(kind => {
        const values = params.getAll(kind);
        document.querySelectorAll(`.${kind}-filter`).forEach(input => {
            input.checked = values.includes(kind === 'tech' ? `${input.dataset.field}:${input.value}` : input.value);
        });
    });
    document.getElementById('filter-only-stock').checked = params.get('stock') === '1';
    ['d-min','d-max','D-min','D-max','B-min','B-max'].forEach(key => {
        document.getElementById(`filter-${key}`).value = params.get(key) || '';
    });
    ['mode', 'unit'].forEach(key => {
        const value = params.get(key) || (key === 'mode' ? 'range' : 'metric');
        document.querySelectorAll(`input[name="filter-dim-${key}"]`).forEach(input => { input.checked = input.value === value; });
    });
    const sort = document.getElementById('sort-select');
    sort.value = ['relevance','price-asc','price-desc','name'].includes(params.get('sort')) ? params.get('sort') : 'relevance';
    AppState.viewMode = params.get('view') === 'table' ? 'table' : 'grid';
    const fields = params.has('fields') ? params.get('fields').split(',') : ['article','reference','mpn'];
    document.querySelectorAll('.part-field').forEach(input => { input.checked = fields.includes(input.value); });
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        const active = btn.dataset.mode === AppState.viewMode;
        btn.classList.toggle('bg-blue-100', active);
        btn.classList.toggle('text-blue-600', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

function getCategoryLabel(category) {
    const labels = {
        'industrial-bearing': ['برینگ صنعتی', 'Industrial bearings'],
        'automotive-bearing': ['برینگ خودرویی', 'Automotive bearings'],
        'housing-bushing': ['یاتاقان و بوش', 'Housings & bushings'],
        grease: ['گریس', 'Grease']
    };
    return labels[category]?.[AppState.language === 'fa' ? 0 : 1] || faType(category);
}

function getDimensionLabel(dim) {
    const parts = ['d', 'D', 'B'].map(key => {
        if (dim.mode === 'exact') return dim[key] == null ? '' : `${key}: ${Number(dim[key].toFixed(3))}`;
        return dim[key + 'Min'] == null && dim[key + 'Max'] == null ? '' : `${key}: ${dim[key + 'Min'] ?? '…'}–${dim[key + 'Max'] ?? '…'}`;
    }).filter(Boolean);
    return `${parts.join(' / ')} mm`;
}

function validateDimensionInputs(ids) {
    let invalid = false;
    ids.forEach(id => {
        const input = document.getElementById(id);
        const bad = !!input.value.trim() && toMillimeter(input.value, 'metric') === null;
        input.setAttribute('aria-invalid', String(bad));
        invalid ||= bad;
    });
    ids.filter(id => id.endsWith('-min')).forEach(id => {
        const maxId = id.replace(/-min$/, '-max');
        if (!ids.includes(maxId)) return;
        const min = toMillimeter(document.getElementById(id).value, 'metric');
        const max = toMillimeter(document.getElementById(maxId).value, 'metric');
        if (min !== null && max !== null && min > max) {
            invalid = true;
            document.getElementById(maxId).setAttribute('aria-invalid', 'true');
        }
    });
    if (invalid) showNotification(AppState.language === 'fa' ? 'ابعاد باید عدد مثبت باشند و حداقل بازه از حداکثر بیشتر نباشد.' : 'Use positive dimensions with min no greater than max.', 'error');
    return !invalid;
}
