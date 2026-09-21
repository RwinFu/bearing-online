/* ===== 07-brand-carousel.js — رینگ سه‌بعدی برندها ===== */
/* ===== Round 3D Brand Carousel engine (Originkit-style, vanilla JS) ===== */
const BrandCarousel = {
    rotY: 0, vel: 0, last: 0, raf: 0,
    dragging: false, dragX: 0, moved: 0,
    speed: 0, direction: 1, paused: false, target: null,
    angle: 0, radius: 400, count: 0, built: false
};

/* Official brand logos (exact user-provided artwork, text fallback if any fails) */
const BRAND_LOGOS = {
    'SKF': 'assets/img/brands/skf.jpg',
    'FAG': 'assets/img/brands/fag.jpg',
    'NTN': 'assets/img/brands/ntn.jpg',
    'ZWZ': 'assets/img/brands/zwz.png',
    'HKT': 'assets/img/brands/hkt.png',
    'Timken': 'assets/img/brands/timken.png',
    'ASAHI': 'assets/img/brands/asahi.png',
    'Flender': 'assets/img/brands/flender.png'
};
const ALLOWED_BRANDS = ['SKF', 'FAG', 'NTN', 'ZWZ', 'HKT', 'Timken', 'ASAHI', 'Flender', 'Ringspann'];

/* Official company catalog for each brand (one entry per company).
   Shown in the home “Trusted Brands” panel and on the brands directory page.
   To host a catalog locally later, point the value at e.g. 'assets/catalogs/skf.pdf'. */
const BRAND_CATALOGS = {
    'SKF': 'https://www.skf.com/go/17000',
    'FAG': 'https://medias.schaeffler.com/en',
    'NTN': 'https://www.ntnglobal.com/en/products/catalog/',
    'ZWZ': 'https://www.zwz-bearing.com/',
    'HKT': 'https://hktbearings.com/',
    'Timken': 'https://www.timken.com/catalogs',
    'ASAHI': 'https://www.asahiseiko.co.jp/en/',
    'Flender': 'https://www.flender.com/',
    'Ringspann': 'https://www.ringspann.com/en/service/downloads/product-catalogues'
};

function brandCarouselItems() {
    const counts = {};
    ProductDatabase.forEach(p => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
    return ALLOWED_BRANDS.filter(b => counts[b])
        .map(b => ({ brand: b, count: counts[b], origin: (typeof BrandInfo !== 'undefined' && BrandInfo[b] ? BrandInfo[b].country : '') }));
}

function brandCarouselDims() {
    const mobile = window.innerWidth <= 768;
    return { w: mobile ? 168 : 232, h: mobile ? 108 : 142, tilt: mobile ? -4 : -7, spacing: 2.4 };
}

function renderHomeBrands() {
    const ring = document.getElementById('brandRing');
    const stage = document.getElementById('brandRoundStage');
    if (!ring || !stage) return;
    const items = brandCarouselItems();
    if (!items.length) return;
    const dims = brandCarouselDims();
    BrandCarousel.count = items.length;
    BrandCarousel.angle = 360 / items.length;
    const factor = 1 + dims.spacing * 0.15;
    BrandCarousel.radius = (dims.w * factor) / (2 * Math.tan(Math.PI / items.length));
    ring.style.setProperty('--rc-w', dims.w + 'px');
    ring.style.setProperty('--rc-h', dims.h + 'px');
    const tilt = document.getElementById('brandTilt');
    if (tilt) tilt.style.transform = `rotateX(${dims.tilt}deg)`;
    ring.innerHTML = items.map((it, i) => {
        // Brands without a local logo file fall back to a styled wordmark (never an empty src="").
        const logo = BRAND_LOGOS[it.brand]
            ? `<img src="${BRAND_LOGOS[it.brand]}" alt="${it.brand}" loading="lazy" draggable="false" onerror="this.parentNode.innerHTML='<span class=rc-brand>${it.brand}</span>'">`
            : `<span class="rc-brand">${it.brand}</span>`;
        return `
        <div class="rc-slot" data-brand="${it.brand}" data-i="${i}" style="transform: rotateY(${(i * BrandCarousel.angle).toFixed(2)}deg) translateZ(${BrandCarousel.radius.toFixed(1)}px)">
            <div class="rc-face">
                    <div class="rc-logo"><a href="#" onclick="event.stopPropagation();filterByBrand('${it.brand}')">${logo}</a></div>
                <div class="rc-sub">${it.origin || 'Industrial'}</div>
                <div class="rc-count">${it.count} ${AppState.language === 'fa' ? 'محصول' : 'items'}</div>
            </div>
            <div class="rc-face back">
                <div class="rc-brand">${it.brand}</div>
                <div class="rc-sub">${AppState.language === 'fa' ? 'مشاهده محصولات ←' : 'View products →'}</div>
                <div class="rc-count">${it.count} ✓</div>
            </div>
        </div>`;
    }).join('');
    const dots = document.getElementById('rcDots');
    if (dots) {
        dots.innerHTML = items.map((it, i) => `<button class="rc-dot" data-i="${i}" type="button" aria-label="${it.brand}" title="${it.brand}"></button>`).join('');
        dots.onclick = (e) => {
            const b = e.target && e.target.closest ? e.target.closest('.rc-dot') : null;
            if (b) rotateToBrand(parseInt(b.dataset.i, 10));
        };
    }
    if (!BrandCarousel.built) {
        BrandCarousel.built = true;
        initBrandCarousel();
    }
    updateBrandCarouselCaption();
}

/* 6-line brand stories for the side panel */
function brandStory(brand) {
    const fa = AppState.language === 'fa';
    const L = {
        'SKF': fa ? ['غول سوئدی صنعت بلبرینگ با بیش از یک قرن نوآوری.','انتخاب اول صنایع سنگین، فولاد و سیمان.','دقت ساخت بالا و طول عمر فوق‌العاده.','شبکه جهانی خدمات پس از فروش.','معیار طلایی کیفیت در بازار ایران.','معادل‌یابی آسان با همه برندها.'] : ['Swedish giant with a century of innovation.','First choice for heavy industry.','Superior precision and service life.','Global after-sales network.','The gold standard in Iran.','Easy cross-reference with all brands.'],
        'FAG': fa ? ['مهندسی اصیل آلمانی از گروه Schaeffler.','متخصص رولبرینگ‌های سنگین صنعتی.','عملکرد پایدار در بار و سرعت بالا.','استاندارد سخت‌گیرانه کیفیت اروپا.','محبوب کارخانه‌های فولاد و معدن.','هم‌خانواده برند INA.'] : ['Genuine German engineering by Schaeffler.','Heavy industrial roller specialist.','Stable under high load and speed.','Strict European quality standards.','Loved by steel and mining plants.','Sister brand of INA.'],
        'NTN': fa ? ['دقت ژاپنی با قیمت منطقی و رقابتی.','پوشش کامل بلبرینگ خودرو و صنعت.','کیفیت یکدست در تمام سری‌ها.','موجودی خوب در بازار ایران.','انتخاب هوشمند تعمیرکاران حرفه‌ای.','گارانتی اصالت در برینگ آنلاین.'] : ['Japanese precision at a fair price.','Full auto and industrial coverage.','Consistent quality across series.','Good availability in Iran.','The smart choice of pros.','Authenticity guaranteed here.'],
        'ZWZ': fa ? ['بزرگ‌ترین سازنده بلبرینگ چین.','قیمت اقتصادی برای پروژه‌های حجیم.','کیفیت رو به رشد در سال‌های اخیر.','مناسب مصارف عمومی و کشاورزی.','تامین سریع از شبکه جهانی.','گزینه اقتصادی جایگزین اروپایی.'] : ['Largest bearing maker in China.','Economical for volume projects.','Steadily improving quality.','Great for general and agri use.','Fast global sourcing.','Budget alternative to Europe.'],
        'HKT': fa ? ['برند کره‌ای متخصص صنایع فولاد.','طراحی‌شده برای نورد و خطوط سنگین.','مقاومت بالا در ضربه و حرارت.','قیمت بهتر از ژاپنی‌ها.','نمایندگی انحصاری در ایران.','پشتیبانی فنی مستقیم کارخانه.'] : ['Korean brand for steel plants.','Built for rolling mills.','High shock and heat resistance.','Better price than Japanese.','Exclusive agency in Iran.','Direct factory tech support.'],
        'Timken': fa ? ['پادشاه آمریکایی رولبرینگ مخروطی.','انتخاب اول چرخ خودروهای سنگین.','مهندسی افسانه‌ای در تحمل بار محوری.','کیفیت بدون رقیب در کاربرد خودرویی.','برند محبوب تعمیرگاه‌های تخصصی.','عمر طولانی در شرایط سخت.'] : ['American king of tapered rollers.','First choice for heavy wheels.','Legendary axial-load engineering.','Unmatched in automotive use.','Loved by specialist garages.','Long life under harsh duty.'],
        'ASAHI': fa ? ['متخصص ژاپنی یاتاقان‌های UCP.','بدنه چدنی مستحکم و مقاوم.','نصب سریع روی شفت بدون ابزار خاص.','ایده‌آل خطوط تولید و نوار نقاله.','قیمت مناسب و موجودی دائم.','انتخاب اول صنعتگران کارگاهی.'] : ['Japanese UCP housing specialist.','Rugged cast-iron body.','Fast shaft mounting.','Ideal for conveyors and lines.','Fair price, steady stock.','Workshop favorite.'],
        'Flender': fa ? ['غول آلمانی گیربکس‌های صنعتی.','قلب تپنده خطوط سیمان و معدن.','توان بالا با راندمان فوق‌العاده.','سرویس و قطعات یدکی تضمینی.','استاندارد جهانی درایو صنعتی.','مشاوره انتخاب رایگان در برینگ آنلاین.'] : ['German industrial gearbox giant.','The heart of cement and mining.','High power, superb efficiency.','Guaranteed spares and service.','Global drive standard.','Free sizing help here.'],
        'Ringspann': fa ? ['متخصص آلمانی کوپلینگ و فری‌ویل.','ایمنی‌بخش سیستم‌های انتقال قدرت.','دقت مهندسی در حد میکرون.','مورد اعتماد صنایع نفت و گاز.','نمایندگی انحصاری در ایران.','مشاوره فنی تخصصی رایگان.'] : ['German coupling and freewheel expert.','Safety for power transmission.','Micron-level engineering.','Trusted by oil and gas.','Exclusive agency in Iran.','Free specialist advice.']
    };
    return L[brand] || (fa ? ['برند معتبر تامین‌شده در برینگ آنلاین.','اصالت کالا تضمین می‌شود.','مشاوره انتخاب رایگان.','تحویل سریع سراسری.','قیمت رقابتی و شفاف.','پشتیبانی پس از فروش.'] : ['Trusted brand stocked here.','Authenticity guaranteed.','Free sizing advice.','Fast nationwide delivery.','Clear competitive pricing.','After-sales support.']);
}

/* Typewriter motion for the side brand typography */
let brandTypeToken = 0;
function typeBrandStory(el, lines) {
    const run = ++brandTypeToken;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
        el.innerHTML = lines.map(line => `<p class="typo-line">• ${line}</p>`).join('');
        return;
    }
    el.innerHTML = '';
    let li = 0, ci = 0, current = null;
    function render() {
        if (run !== brandTypeToken) return;
        let html = '';
        for (let k = 0; k < li; k++) html += `<p class="typo-line">• ${lines[k]}</p>`;
        if (current !== null) html += `<p class="typo-line">• ${current}<span class="type-caret"></span></p>`;
        el.innerHTML = html;
    }
    function tick() {
        if (run !== brandTypeToken) return;
        if (li >= lines.length) {
            el.innerHTML = lines.map(line => `<p class="typo-line">• ${line}</p>`).join('');
            return;
        }
        const full = lines[li];
        ci += 2;
        if (ci >= full.length) {
            li++;
            ci = 0;
            current = null;
            render();
            setTimeout(tick, 160);
        } else {
            current = full.slice(0, ci);
            render();
            const ch = full[ci - 1];
            setTimeout(tick, ch === ' ' ? 8 : 22);
        }
    }
    tick();
}

function updateBrandCarouselCaption() {
    const ring = document.getElementById('brandRing');
    const label = document.getElementById('rcActiveName');
    if (!ring || !BrandCarousel.count) return;
    let best = 0, bestDist = 999;
    for (let i = 0; i < BrandCarousel.count; i++) {
        const rel = ((i * BrandCarousel.angle + BrandCarousel.rotY) % 360 + 360) % 360;
        const dist = Math.min(rel, 360 - rel);
        if (dist < bestDist) { bestDist = dist; best = i; }
    }
    const slot = ring.children[best];
    if (!slot) return;
    const brand = slot.dataset.brand || '';
    const items = brandCarouselItems();
    const info = items.find(x => x.brand === brand);
    if (label) label.innerHTML = `${brand}<small>${info && info.origin ? info.origin + ' • ' : ''}${info ? info.count : ''} ${AppState.language === 'fa' ? 'محصول — کلیک کنید' : 'products — click to shop'}</small>`;
    const prevBrand = updateBrandCarouselCaption._brand;
    updateBrandCarouselCaption._brand = brand;
    if (brand && brand !== prevBrand) {
        const name = document.getElementById('brandTypoName');
        const origin = document.getElementById('brandTypoOrigin');
        const lines = document.getElementById('brandTypoLines');
        const count = document.getElementById('brandTypoCount');
        const cta = document.getElementById('brandTypoCta');
        const story = brandStory(brand);
        if (name) name.textContent = brand;
        if (origin) origin.textContent = (info && info.origin ? info.origin + ' • ' : '') + (info ? info.count : '') + (AppState.language === 'fa' ? ' محصول در فروشگاه' : ' products in store');
        if (lines) typeBrandStory(lines, story);
        if (count) count.textContent = (info ? info.count : '') + (AppState.language === 'fa' ? ' محصول' : ' items');
        if (cta) cta.onclick = () => filterByBrand(brand);
        const catalog = document.getElementById('brandTypoCatalog');
        if (catalog) {
            const url = (typeof BRAND_CATALOGS !== 'undefined' && BRAND_CATALOGS[brand]) || '';
            catalog.href = url || '#';
            catalog.style.display = url ? '' : 'none';
            catalog.setAttribute('aria-label', brand + (AppState.language === 'fa' ? ' — کاتالوگ شرکت' : ' — company catalog'));
        }
    }
    [...ring.children].forEach((el, i) => {
        const rel = ((i * BrandCarousel.angle + BrandCarousel.rotY) % 360 + 360) % 360;
        const dist = Math.min(rel, 360 - rel);
        el.classList.toggle('rc-front', i === best);
        const front = el.firstElementChild;
        if (front) front.style.filter = `brightness(${(1 - dist / 360 * 0.55).toFixed(3)})`;
    });
    const dots = document.getElementById('rcDots');
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === best));
}

function brandCarouselApply() {
    const ring = document.getElementById('brandRing');
    if (!ring) return;
    ring.style.transform = `translateZ(${-BrandCarousel.radius.toFixed(1)}px) rotateY(${BrandCarousel.rotY.toFixed(2)}deg)`;
}

function brandCarouselLoop(now) {
    const dt = BrandCarousel.last ? (now - BrandCarousel.last) / 1000 : 0;
    BrandCarousel.last = now;
    const f = Math.min(dt, 0.1);
    if (!BrandCarousel.dragging && !BrandCarousel.paused) {
        const degPerSec = BrandCarousel.speed * 6 * BrandCarousel.direction;
        if (BrandCarousel.target !== null && BrandCarousel.target !== undefined) {
            const diff = BrandCarousel.target - BrandCarousel.rotY;
            BrandCarousel.rotY += diff * Math.min(1, f * 5);
            BrandCarousel.vel = 0;
            if (Math.abs(diff) < 0.15) { BrandCarousel.rotY = BrandCarousel.target; BrandCarousel.target = null; }
        } else if (Math.abs(BrandCarousel.vel) > 0.5) {
            BrandCarousel.rotY += BrandCarousel.vel * f;
            BrandCarousel.vel *= 0.94;
        } else {
            BrandCarousel.rotY += degPerSec * f;
        }
    }
    brandCarouselApply();
    if (!window.__rcCaptionTick) window.__rcCaptionTick = 0;
    if (now - window.__rcCaptionTick > 180) { window.__rcCaptionTick = now; updateBrandCarouselCaption(); }
    BrandCarousel.raf = requestAnimationFrame(brandCarouselLoop);
}

function rotateToBrand(i) {
    if (!BrandCarousel.count || !BrandCarousel.angle) return;
    const base = -i * BrandCarousel.angle;
    const cur = BrandCarousel.rotY;
    const turns = Math.round((cur - base) / 360);
    BrandCarousel.target = base + turns * 360;
    BrandCarousel.vel = 0;
}

function initBrandCarousel() {
    const stage = document.getElementById('brandRoundStage');
    const ring = document.getElementById('brandRing');
    if (!stage || !ring) return;
    cancelAnimationFrame(BrandCarousel.raf);
    BrandCarousel.last = 0;
    brandCarouselApply();
    BrandCarousel.raf = requestAnimationFrame(brandCarouselLoop);
    stage.onpointerdown = (e) => {
        BrandCarousel.dragging = true;
        BrandCarousel.dragX = e.clientX;
        BrandCarousel.moved = 0;
        BrandCarousel.vel = 0;
        BrandCarousel.target = null;
        try { stage.setPointerCapture && stage.setPointerCapture(e.pointerId); } catch (err) {}
    };
    stage.onpointermove = (e) => {
        if (!BrandCarousel.dragging) return;
        const dx = e.clientX - BrandCarousel.dragX;
        BrandCarousel.dragX = e.clientX;
        BrandCarousel.moved += Math.abs(dx);
        const k = 0.28;
        BrandCarousel.rotY += dx * k;
        BrandCarousel.vel = Math.max(-650, Math.min(650, dx * k * 60));
    };
    const endDrag = () => { BrandCarousel.dragging = false; };
    stage.onpointerup = endDrag;
    stage.onpointercancel = endDrag;
    stage.onclick = (e) => {
        if (BrandCarousel.moved > 8) return;
        const slot = e.target && e.target.closest ? e.target.closest('.rc-slot') : null;
        if (slot && slot.dataset.brand && typeof filterByBrand === 'function') filterByBrand(slot.dataset.brand);
    };

    const prev = document.getElementById('rcPrev');
    const next = document.getElementById('rcNext');
    if (prev) prev.onclick = (e) => { e.stopPropagation(); BrandCarousel.vel = -260; };
    if (next) next.onclick = (e) => { e.stopPropagation(); BrandCarousel.vel = 260; };
    /* fixed medium auto-rotate — no manual controls */

    let rsz;
    window.addEventListener('resize', () => {
        clearTimeout(rsz);
        rsz = setTimeout(() => { BrandCarousel.built = true; renderHomeBrands(); }, 250);
    });
}
