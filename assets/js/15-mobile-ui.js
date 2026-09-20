/* ===== 15-mobile-ui.js — منوی موبایل، فیلترها و حرکت سه‌بعدی هیرو ===== */
// =============================================
// MOBILE NAV & FILTERS
// =============================================
function toggleMobileMenu(force) {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (!menu || !overlay) return;
    const open = force !== undefined ? force : !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
}

function closeMobileMenu() {
    toggleMobileMenu(false);
}

function toggleMobileFilters() {
    const aside = document.getElementById('filters-aside');
    const btn = document.getElementById('mobile-filter-btn');
    if (!aside || !btn) return;
    const collapsed = aside.classList.toggle('filters-collapsed');
    btn.classList.toggle('expanded', !collapsed);
}

// Hero 3D motion: mouse-driven depth tilt + layered float on homepage copy
function initHero3D() {
    const hero = document.querySelector('#page-home .hero-bright');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const title = hero.querySelector('h2');
    const subtitle = hero.querySelector('.hero-subtitle-clear');
    const chips = [...hero.querySelectorAll('.hero-proof-chip')];
    const kicker = hero.querySelector('.hero-kicker');
    if (title && !title.classList.contains('hero-3d')) title.classList.add('hero-3d');
    if (subtitle && !subtitle.classList.contains('hero-3d-sub')) subtitle.classList.add('hero-3d-sub');
    chips.forEach(c => { if (!c.classList.contains('hero-chip-3d')) c.classList.add('hero-chip-3d'); });
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    function loop() {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        if (title) title.style.transform = `rotateY(${cx * 10}deg) rotateX(${-cy * 8}deg) translateZ(26px)`;
        if (subtitle) subtitle.style.transform = `rotateY(${cx * 6}deg) rotateX(${-cy * 5}deg) translateZ(14px)`;
        if (kicker) kicker.style.transform = `rotateY(${cx * 8}deg) rotateX(${-cy * 6}deg) translateZ(20px)`;
        chips.forEach((c, i) => {
            const depth = 18 + i * 8;
            c.style.transform = `rotateY(${cx * 7}deg) rotateX(${-cy * 6}deg) translateZ(${depth}px)`;
        });
        if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(loop);
        else raf = null;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        kick();
    });
    hero.addEventListener('mouseleave', () => {
        tx = 0; ty = 0;
        if (title) title.style.transform = '';
        if (subtitle) subtitle.style.transform = '';
        if (kicker) kicker.style.transform = '';
        chips.forEach(c => { c.style.transform = ''; });
    });
}
