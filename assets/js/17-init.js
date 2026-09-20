/* ===== 17-init.js — راه‌اندازی (DOMContentLoaded) ===== */
// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // Derived product fields must exist before anything reads the catalogue
    hydrateProductDatabase();

    // Initialize search results
    hydrateState();
    AppState.searchResults = ProductDatabase;
    updateHomeStats();
    renderHomeBrands();
    applyLanguage();
    updateFilterCounts();
    renderActiveFilters();

    // Initialize animation engine
    initRevealObserver();
    initTilt();
    initMagnetic();
    initRipple();
    initScrollEffects();
    initCursor();
    initTypingPlaceholder();
    initHeaderScroll();
    initParallax();
    initSpotlight();
    initHeadingLine();
    initHero3D();
    animateCounters();

    // Apply spotlight + shine to all cards
    document.querySelectorAll('.card-hover').forEach(c => {
        c.classList.add('spotlight', 'shine');
    });

    // Re-init tilt + spotlight after renders
    const origRender = renderSearchResults;
    renderSearchResults = function() {
        origRender();
        initTilt();
        document.querySelectorAll('#results-container .card-hover').forEach(c => {
            if (!c.classList.contains('spotlight')) c.classList.add('spotlight', 'shine');
        });
        initSpotlight();
        initRipple();
        initMagnetic();
    };
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-input') && !e.target.closest('#autocomplete-dropdown')) {
            document.getElementById('autocomplete-dropdown').classList.add('hidden');
        }
    });

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAdminPanel();
            closeLeadModal();
            document.getElementById('product-modal').classList.add('hidden');
        }
    });

    // Search on enter
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    // Dummy "#" links must not jump the page; their onclick handlers do the navigation
    document.addEventListener('click', (e) => {
        const a = e.target && e.target.closest ? e.target.closest('a[href="#"]') : null;
        if (a) e.preventDefault();
    });
    window.addEventListener('hashchange', routeFromHash);
    window.addEventListener('popstate', routeFromHash);

    // Mobile: Escape closes drawer, filters start collapsed, badge mirrors active count
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileMenu();
    });
    const filtersAside = document.getElementById('filters-aside');
    if (filtersAside && window.innerWidth <= 768) {
        filtersAside.classList.add('filters-collapsed');
    }
    window.addEventListener('resize', () => {
        const aside = document.getElementById('filters-aside');
        if (!aside) return;
        if (window.innerWidth > 768) aside.classList.remove('filters-collapsed');
    });
    const activeCount = document.getElementById('active-filter-count');
    const mobileCount = document.getElementById('mobile-filter-count');
    if (activeCount && mobileCount) {
        const syncMobileFilterCount = () => { mobileCount.textContent = activeCount.textContent; };
        syncMobileFilterCount();
        new MutationObserver(syncMobileFilterCount).observe(activeCount, { childList: true, characterData: true, subtree: true });
    }
    if (location.hash) routeFromHash();
    else history.replaceState(null, '', '#/home');

    // Dynamic copyright year
    const footerYear = document.getElementById('footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
});
