/* ===== 15-mobile-ui.js — منوی موبایل و فیلترها ===== */
// =============================================
// MOBILE NAV & FILTERS
// =============================================
function toggleMobileMenu(force) {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (!menu || !overlay) return;
    const open = force !== undefined ? force : !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    menu.inert = !open;
    document.getElementById('mobile-menu-toggle')?.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => {
        if (menu.classList.contains('open')) menu.querySelector('button')?.focus();
    }, 260);
    else if (menu.contains(document.activeElement)) document.getElementById('mobile-menu-toggle')?.focus();
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
    btn.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        aside.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
}

// Sticky "Show N results" button inside the mobile filter panel.
function closeMobileFiltersAndScroll() {
    const aside = document.getElementById('filters-aside');
    if (aside && !aside.classList.contains('filters-collapsed')) toggleMobileFilters();
    const target = document.querySelector('.results-main');
    if (target) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
}
