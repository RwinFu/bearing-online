/* ===== 04-navigation.js — مسیریابی صفحه‌ها و hash routing ===== */
// =============================================
// PAGE NAVIGATION
// =============================================
function showPage(pageId) {
    if (!AppState.routing && ['home','search','cart','compare','wishlist','brands','services','about','contact','checkout','account'].includes(pageId)) {
        const simple = { home:'#/home', search:'#/search', cart:'#/cart', compare:'#/compare', wishlist:'#/wishlist', brands:'#/brands', services:'#/services', about:'#/about', contact:'#/contact', checkout:'#/checkout', account:'#/account/orders' };
        if (simple[pageId] && location.hash !== simple[pageId]) history.pushState(null, '', simple[pageId]);
    }
    const transition = document.getElementById('page-transition');
    transition.classList.add('active');
    setTimeout(() => {
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.add('hidden');
        });
        // Unknown page ids fall back to home instead of throwing and freezing the overlay.
        const target = document.getElementById(`page-${pageId}`) || document.getElementById('page-home');
        target.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        transition.classList.remove('active');
        // Re-trigger reveal animations
        initRevealObserver();
        if (pageId === 'home') animateCounters();
        if (pageId === 'search' && !document.getElementById('results-container').innerHTML.trim()) {
            AppState.searchResults = ProductDatabase;
            renderActiveFilters();
            renderSearchResults();
        }
        if (pageId === 'brands') renderBrandsPage();
        if (pageId === 'about' && typeof ensureBearing3D === 'function') {
            setTimeout(() => ensureBearing3D(), 60);
        }
    }, 250);
}

function updateHashRoute(page, payload = '') {
    const routes = {
        home: '#/home', search: '#/search', cart: '#/cart', compare: '#/compare', wishlist: '#/wishlist', brands: '#/brands', services: '#/services', about: '#/about', contact: '#/contact', checkout: '#/checkout', account: '#/account/orders'
    };
    let hash = routes[page] || '#/home';
    if (page === 'search') {
        const q = AppState.textQuery ? `?q=${encodeURIComponent(AppState.textQuery)}` : '';
        hash = '#/search' + q;
    }
    if (page === 'product') hash = '#/product/' + encodeURIComponent(payload);
    if (location.hash !== hash) location.hash = hash;
    else routeFromHash();
}

function routeFromHash() {
    AppState.routing = true;
    const hash = location.hash || '#/home';
    const route = hash.replace(/^#\//, '');
    if (route.startsWith('product/')) {
        showProductDetail(decodeURIComponent(route.split('/')[1] || ''));
    } else if (route.startsWith('search')) {
        const q = new URLSearchParams(route.split('?')[1] || '').get('q') || '';
        AppState.textQuery = q;
        const input = document.getElementById('search-input');
        if (input) input.value = q;
        recomputeResults();
        showPage('search');
    } else if (route === 'cart') showCart();
    else if (route === 'compare') showCompare();
    else if (route === 'wishlist') showWishlist();
    else if (route === 'brands') showPage('brands');
    else if (route === 'services') showPage('services');
    else if (route === 'about') showPage('about');
    else if (route === 'contact') showPage('contact');
    else if (route.startsWith('checkout/success/')) {
        const orderNo = decodeURIComponent(route.split('/')[2] || '');
        const order = MockDB.orders.find(o => o.orderNumber === orderNo);
        order ? renderCheckoutSuccess(order) : renderCheckout();
    }
    else if (route === 'checkout') renderCheckout();
    else if (route.startsWith('account')) {
        const segs = route.split('/');
        showAccount(segs.length > 2 ? decodeURIComponent(segs.slice(2).join('/')) : '');
    }
    else showPage('home');
    setTimeout(() => { AppState.routing = false; }, 50);
}
