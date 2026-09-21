/* ===== 09-cart.js — سبد خرید ===== */
// =============================================
// CART SYSTEM
// =============================================
function addToCart(productId, supplierId) {
    const product = ProductDatabase.find(p => p.id === productId);
    if (!product) return;
    const suppliers = productSupplierNames(product) || [];
    // When a product has several suppliers, the chosen supplier must be recorded
    // on the cart line; otherwise it defaults to the first (or own warehouse).
    const ext = suppliers.filter(name => name !== 'انبار خودمان');
    const chosen = supplierId && [...ext].includes(supplierId) ? supplierId : (ext[0] || 'انبار خودمان');
    const existingItem = AppState.cart.find(item => item.id === productId && (item.supplier || 'انبار خودمان') === chosen);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        AppState.cart.push({ id: productId, quantity: 1, supplier: chosen });
    }
    updateCartCount();
    persistState();
    showNotification(AppState.language === 'en' ? 'Added to cart!' : 'به سبد اضافه شد!', 'success');
}

function setCartSupplier(productId, supplier) {
    const item = AppState.cart.find(i => i.id === productId);
    if (!item) return;
    const next = supplier || 'انبار خودمان';
    const twin = AppState.cart.find(i => i.id === productId && i !== item && (i.supplier || 'انبار خودمان') === next);
    if (twin) {
        // Same part under the target supplier already exists → merge this line into it.
        twin.quantity += item.quantity;
        AppState.cart = AppState.cart.filter(i => i !== item);
    } else {
        item.supplier = next;
    }
    persistState();
    renderCart();
}

function removeFromCart(productId, supplier) {
    AppState.cart = AppState.cart.filter(item => item.id !== productId || (supplier !== undefined && (item.supplier || 'انبار خودمان') !== supplier));
    updateCartCount();
    persistState();
    renderCart();
}

function updateCartQuantity(productId, delta, supplier) {
    const item = AppState.cart.find(i => i.id === productId && (supplier === undefined || (i.supplier || 'انبار خودمان') === supplier));
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId, supplier);
        } else {
            persistState();
            renderCart();
        }
    }
}

function updateCartCount() {
    const count = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

// Inline buttons resolve the exact cart line (and its supplier) from the DOM so
// the same product code can sit in the cart under two different suppliers.
function updateCartLine(productId, delta, btn) {
    const line = btn && btn.closest ? btn.closest('.cart-line') : null;
    const supplier = line ? (line.dataset.supplier || 'انبار خودمان') : undefined;
    updateCartQuantity(productId, delta, supplier);
}

function removeCartLine(productId, btn) {
    const line = btn && btn.closest ? btn.closest('.cart-line') : null;
    const supplier = line ? (line.dataset.supplier || 'انبار خودمان') : undefined;
    removeFromCart(productId, supplier);
}

function showCart() {
    renderCart();
    showPage('cart');
}

function renderCart() {
    const container = document.getElementById('cart-content');
    
    if (AppState.cart.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-lg p-12 text-center">
                <i class="fas fa-shopping-cart text-6xl text-gray-200 mb-6"></i>
                <h3 class="text-2xl font-bold text-gray-800 mb-2" data-en="Your cart is empty" data-fa="سبد خرید شما خالی است">Your cart is empty</h3>
                <p class="text-gray-500 mb-6" data-en="Browse our products and add items to your cart" data-fa="محصولات ما را مرور کنید و به سبد اضافه کنید">Browse our products and add items to your cart</p>
                <button onclick="showPage('search'); AppState.searchResults = ProductDatabase; renderSearchResults();" class="btn-primary text-white px-8 py-4 rounded-xl font-medium">
                    <span data-en="Browse Products" data-fa="مرور محصولات">Browse Products</span>
                </button>
            </div>
        `;
        return;
    }

    let totalPrice = 0;
    const cartItems = AppState.cart.map(item => {
        const product = ProductDatabase.find(p => p.id === item.id);
        if (!product) return null;
        const itemTotal = product.sell_mode === 'instant' ? product.priceUSD * item.quantity : 0;
        if (product.sell_mode === 'instant') totalPrice += itemTotal;
        return { ...product, quantity: item.quantity, itemTotal, supplier: item.supplier };
    }).filter(Boolean);

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div class="p-6 border-b border-gray-100">
                        <h3 class="font-bold text-lg" data-en="Cart Items" data-fa="اقلام سبد">Cart Items</h3>
                    </div>
                    <div class="divide-y divide-gray-100">
                        ${cartItems.map(item => {
                            return `
                            <div class="p-6 flex items-center gap-6 cart-line" data-supplier="${escapeHTML(item.supplier || 'انبار خودمان')}">
                                <div class="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    ${hasProductImage(item) ? `<img src="${item.image}" alt="" class="w-full h-full object-contain">` : `<i class="fas fa-${productTypeIcon(item.type)} text-2xl text-gray-300"></i>`}
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-gray-800">${item.brand} ${item.code}</h4>
                                    <p class="text-sm text-gray-500" dir="ltr">${productSizeLabel(item)}</p>
                                </div>
                                <div class="flex items-center gap-3 cart-line-controls">
                                    <button onclick="updateCartLine('${item.id}', -1, this)" class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition">
                                        <i class="fas fa-minus text-xs"></i>
                                    </button>
                                    <span class="w-8 text-center font-medium">${item.quantity}</span>
                                    <button onclick="updateCartLine('${item.id}', 1, this)" class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition">
                                        <i class="fas fa-plus text-xs"></i>
                                    </button>
                                </div>
                                <div class="text-right w-32">
                                    <div class="font-bold text-gray-800">${item.sell_mode === 'instant' ? `${formatPrice(item.itemTotal)} <span class="text-xs text-gray-500">تومان</span>` : '<span class="text-orange-600">استعلام</span>'}</div>
                                </div>
                                <button onclick="removeCartLine('${item.id}', this)" class="text-gray-400 hover:text-red-500 transition">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div>
                <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                    <h3 class="font-bold text-lg mb-6" data-en="Order Summary" data-fa="خلاصه سفارش">Order Summary</h3>
                    <div class="space-y-4 mb-6">
                        <div class="flex justify-between text-gray-600">
                            <span data-en="Subtotal" data-fa="جمع جزء">Subtotal</span>
                            <span>${formatPrice(totalPrice)} تومان</span>
                        </div>
                        <div class="flex justify-between text-gray-600">
                            <span data-en="Shipping" data-fa="ارسال">Shipping</span>
                            <span data-en="Calculated at checkout" data-fa="محاسبه در پرداخت">Calculated at checkout</span>
                        </div>
                        <hr>
                        <div class="flex justify-between text-xl font-bold text-gray-800">
                            <span data-en="Total" data-fa="جمع کل">Total</span>
                            <span>${formatPrice(totalPrice)} تومان</span>
                        </div>
                    </div>
                    <button onclick="showCheckout()" class="w-full btn-primary text-white py-4 rounded-xl font-medium mb-3">
                        <i class="fas fa-credit-card mr-2"></i>
                        <span data-en="Proceed to Checkout" data-fa="ادامه به پرداخت">Proceed to Checkout</span>
                    </button>
                    <button onclick="openLeadModal('cart-quote')" class="w-full btn-accent text-white py-4 rounded-xl font-medium">
                        <i class="fas fa-file-invoice mr-2"></i>
                        <span data-en="Request Quotation" data-fa="درخواست پیش‌فاکتور">Request Quotation</span>
                    </button>
                    <button onclick="openLeadModal('consultation')" class="w-full mt-3 border-2 border-blue-100 bg-blue-50 text-blue-700 py-4 rounded-xl font-medium hover:border-blue-500 transition">
                        <i class="fas fa-user-gear mr-2"></i>
                        <span data-en="Engineering consultation before purchase" data-fa="مشاوره مهندسی قبل از خرید">Engineering consultation before purchase</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    initMagnetic();
    initRipple();
    applyLanguage();
}
