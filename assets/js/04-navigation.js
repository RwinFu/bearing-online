/* ===== 04-navigation.js — مسیریابی صفحه‌ها و hash routing ===== */
// =============================================
// PAGE NAVIGATION
// =============================================
let pageTransitionTimer;
function showPage(pageId) {
    closeAutocomplete();
    closeMobileMenu();
    clearTimeout(pageTransitionTimer);
    if (!AppState.routing && ['home','search','cart','compare','wishlist','brands','services','about','contact','checkout','account'].includes(pageId)) {
        const simple = { home:'#/home', search:'#/search', cart:'#/cart', compare:'#/compare', wishlist:'#/wishlist', brands:'#/brands', services:'#/services', about:'#/about', contact:'#/contact', checkout:'#/checkout', account:'#/account' };
        if (pageId === 'search') simple.search = getSearchRoute();
        if (pageId === 'account') {
            // keep current account tab in hash if already on account
            if (!location.hash.startsWith('#/account')) {
                if (simple[pageId] && location.hash !== simple[pageId]) history.pushState(null, '', simple[pageId]);
            }
        } else {
            if (simple[pageId] && location.hash !== simple[pageId]) history.pushState(null, '', simple[pageId]);
        }
    }
    const transition = document.getElementById('page-transition');
    transition.classList.add('active');
    pageTransitionTimer = setTimeout(() => {
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.add('hidden');
        });
        // Unknown page ids fall back to home instead of throwing and freezing the overlay.
        const target = document.getElementById(`page-${pageId}`) || document.getElementById('page-home');
        target.classList.remove('hidden');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        transition.classList.remove('active');
        // Re-trigger reveal animations
        initRevealObserver();
        if (pageId === 'home') animateCounters();
        if (pageId === 'search') recomputeResults();
        if (typeof updateBearingVisibility === 'function') updateBearingVisibility();
        if (pageId === 'brands') renderBrandsPage();
        if (pageId === 'about' && typeof ensureBearing3D === 'function') {
            setTimeout(() => ensureBearing3D(), 60);
        }
    }, 250);
}

function updateHashRoute(page, payload = '') {
    const routes = {
        home: '#/home', search: '#/search', cart: '#/cart', compare: '#/compare', wishlist: '#/wishlist', brands: '#/brands', services: '#/services', about: '#/about', contact: '#/contact', checkout: '#/checkout', account: '#/account'
    };
    let hash = routes[page] || '#/home';
    if (page === 'search') {
        hash = getSearchRoute();
    }
    if (page === 'product') hash = '#/product/' + encodeURIComponent(payload);
    if (location.hash !== hash) location.hash = hash;
    else routeFromHash();
}

function routeFromHash() {
    AppState.routing = true;
    try {
        const hash = location.hash || '#/home';
        const route = hash.replace(/^#\//, '');
        if (route.startsWith('product/')) {
            const productId = decodeURIComponent(route.split('/')[1] || '');
            if (ProductDatabase.some(p => p.id === productId)) showProductDetail(productId);
            else showPage('search');
        } else if (route === 'search' || route.startsWith('search?')) {
            restoreSearchRoute(new URLSearchParams(route.split('?')[1] || ''));
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
            const segs = route.split('/').map(s=>{ try { return decodeURIComponent(s); } catch(e){ return s; } });
            // segs: ['account', 'orders'|'addresses'|'profile'|'overview', 'PRM-...']
            const tab = segs[1] || '';
            const highlight = segs[2] || '';
            // legacy: #/account/orders/PRM-xxx  OR #/account/PRM-xxx
            const KNOWN_TABS = ['overview','orders','saved','addresses','profile','security'];
            if (tab && !KNOWN_TABS.includes(tab)) {
                // treat as highlight for orders (old links)
                showAccount('orders', tab);
            } else {
                showAccount(tab, highlight);
            }
        }
        else showPage('home');
    } catch (error) {
        if (!(error instanceof URIError)) throw error;
        showPage('home');
    } finally {
        AppState.routing = false;
    }
}
