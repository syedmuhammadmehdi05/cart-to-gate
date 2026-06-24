// ============================================================
//  main.js  —  UI logic for Cart to Gate
//  Requires: api.js (loaded first in each HTML page)
// ============================================================

// ── Helpers ──────────────────────────────────────────────────

/**
 * Display a toast-style notification.
 * Falls back to alert() if the #toast element is missing.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) { alert(message); return; }

    toast.textContent = message;
    toast.className = `toast toast--${type} toast--show`;
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('toast--show');
    }, 3000);
}

// ── Fallback local cart (when user is not logged in) ─────────

function getLocalCart() {
    const cart = localStorage.getItem('ctg_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveLocalCart(cart) {
    localStorage.setItem('ctg_cart', JSON.stringify(cart));
}

// ── Page Initialisation (products + cart only) ───────────────
// Auth pages are handled by auth.js

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('index.html') || path.endsWith('/') || path.endsWith('frontend')) {
        initHomePage();
    }

    if (path.includes('cart.html')) {
        initCartPage();
    }

    if (path.includes('products.html')) {
        initProductDetailPage();
    }
});

// ── Home / Products Page ─────────────────────────────────────

async function initHomePage() {
    const welcomeMsg = document.getElementById('welcome-message');
    const user = getUser();
    if (user && user.name) {
        if (welcomeMsg) {
            welcomeMsg.textContent = `Welcome, ${user.name}`;
            welcomeMsg.style.display = 'block';
        }
    } else {
        if (welcomeMsg) {
            welcomeMsg.style.display = 'none';
        }
    }
}

/**
 * Build and inject one product card into the grid.
 * @param {Object} product
 * @param {HTMLElement} container
 */
function renderProductCard(product, container) {
    // Normalise field names from various backend shapes
    const id = product._id || product.id;
    const name = product.name || product.title || 'Unnamed';
    const price = product.price != null ? product.price : 0;
    const stock = product.stock != null
        ? product.stock
        : (product.countInStock != null ? product.countInStock : null);
    const image = product.image || product.imageUrl || product.img
        || 'https://via.placeholder.com/400x260?text=No+Image';
    const desc = product.description || product.desc || '';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="card-image">
            <img src="${image}" alt="${name}" loading="lazy">
        </div>
        <div class="card-content">
            <h3 class="card-name">${name}</h3>
            ${desc ? `<p class="card-desc">${desc}</p>` : ''}
            ${stock !== null ? `<p class="quantity">${stock} in stock</p>` : ''}
            <p class="price">PKR ${Number(price).toFixed(2)}</p>
            <div class="card-actions">
                <a href="products.html?id=${id}" class="btn-details">
                    Product Details
                </a>

                ${stock === 0

            ?

            `<button
                        type="button"
                        class="btn-add-cart"
                        disabled
                    >
                        Out of Stock
                    </button>`

            :

            `<button
                        type="button"
                        class="btn-add-cart"
                        id="btn-add-${id}"
                        data-id="${id}"
                        aria-label="Add ${name} to cart"
                    >
                        Add to Cart
                    </button>`
        }

            </div>
        </div>
    `;

    const addBtn = card.querySelector('.btn-add-cart');

    if (stock !== 0 && addBtn) {

        addBtn.addEventListener(
            'click',
            (e) => {

                handleAddToCart(
                    e.currentTarget,
                    product
                );

            }
        );

    }

    /**
     * Handle "Add to Cart" button click.
     *
     * - Logged in → POST /api/cart/add with JWT (via buildHeaders in api.js)
     * - Guest     → save to localStorage with full product data
     *
     * @param {HTMLButtonElement} btn     - The clicked button element
     * @param {Object}            product - Full product object from the API
     */
    async function handleAddToCart(btn, product) {
        const id = product._id || product.id;
        const name = product.name || product.title || 'Product';
        const price = product.price || 0;
        const image = product.image || product.imageUrl || product.img || '';

        // Disable button and show loading feedback
        btn.disabled = true;
        btn.textContent = 'Adding…';

        if (isLoggedIn()) {
            // ── Authenticated: call backend ──────────────────────
            try {
                await apiAddToCart(id, 1);
                showToast(`"${name}" added to cart! ✓`, 'success');
                btn.textContent = 'Added ✓';
                // Re-enable after a short delay so user can add more
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = 'Add to Cart';
                }, 2000);
            } catch (err) {
                showToast(`Could not add to cart: ${err.message}`, 'error');
                btn.disabled = false;
                btn.textContent = 'Add to Cart';
            }
        } else {
            // ── Guest: persist full product data to localStorage ──
            const cart = getLocalCart();
            const existing = cart.find(i => String(i.id) === String(id));

            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ id, name, price, image, quantity: 1 });
            }
            saveLocalCart(cart);

            showToast(`"${name}" added! Log in to sync your cart.`, 'info');
            btn.textContent = 'Added ✓';
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = 'Add to Cart';
            }, 2000);
        }
    }

    // ── Cart Page ────────────────────────────────────────────────

    async function initCartPage() {
        if (isLoggedIn()) {
            await renderApiCart();
        } else {
            renderLocalCart();
        }
    }

    async function renderApiCart() {
        const tbody = document.querySelector('.cart-table tbody');
        const totalEl = document.querySelector('.total-amount');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="loading-msg">Loading cart…</td></tr>';

        try {
            const data = await apiGetCart();
            const items = Array.isArray(data) ? data : (data.cartItems || data.items || data.cart || []);

            if (!items.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-cart-msg">Your cart is empty. <a href="index.html">Shop now →</a></td></tr>';
                if (totalEl) totalEl.textContent = 'Total: PKR 0.00';
                return;
            }

            tbody.innerHTML = '';
            let total = 0;

            items.forEach(item => {
                // Normalise field names from various API shapes
                const cartItemId = item._id || item.cartItemId || item.id;
                const name = item.name || (item.product && item.product.name) || 'Product';
                const price = item.price || (item.product && item.product.price) || 0;
                const qty = item.quantity || 1;
                const image = item.image || (item.product && item.product.image) || 'https://via.placeholder.com/60';
                total += price * qty;

                tbody.innerHTML += buildCartRowHtml({ cartItemId, name, price, qty, image });
            });

            if (totalEl) totalEl.textContent = `Total: PKR ${total.toFixed(2)}`;

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" class="error-msg">Could not load cart: ${err.message}</td></tr>`;
        }
    }

    function renderLocalCart() {
        const tbody = document.querySelector('.cart-table tbody');
        const totalEl = document.querySelector('.total-amount');
        if (!tbody) return;

        const cart = getLocalCart();

        if (!cart.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-cart-msg">Your cart is empty. <a href="index.html">Shop now →</a></td></tr>';
            if (totalEl) totalEl.textContent = 'Total: PKR 0.00';
            return;
        }

        tbody.innerHTML = '';
        let total = 0;

        cart.forEach(item => {
            const price = item.price || 0;
            total += price * item.quantity;
            tbody.innerHTML += buildCartRowHtml({
                cartItemId: item.id,
                name: item.name,
                price,
                qty: item.quantity,
                image: item.image || 'https://via.placeholder.com/60',
            });
        });

        if (totalEl) totalEl.textContent = `Total: PKR ${total.toFixed(2)}`;
    }

    /**
     * Build an HTML string for one cart table row.
     */
    function buildCartRowHtml({ cartItemId, name, price, qty, image }) {
        return `
        <tr data-cart-item-id="${cartItemId}">
            <td>
                <div class="product-info">
                    <img src="${image}" alt="${name}">
                    <span class="product-title">${name}</span>
                </div>
            </td>
            <td>PKR ${Number(price).toFixed(2)}</td>
            <td>
                <div class="qty-controls">
                    <button type="button" class="qty-btn" data-action="decrease" data-id="${cartItemId}">−</button>
                    <span class="qty-display">${qty}</span>
                    <button type="button" class="qty-btn" data-action="increase" data-id="${cartItemId}">+</button>
                </div>
            </td>
            <td><button type="button" class="remove-btn" data-id="${cartItemId}">Remove</button></td>
        </tr>
    `;
    }

    // Delegate cart button clicks (remove / qty change)
    document.addEventListener('click', async (e) => {
        if (!window.location.pathname.includes('cart.html')) return;

        const btn = e.target.closest('[data-action], .remove-btn');
        if (!btn) return;

        const id = btn.dataset.id;

        if (btn.classList.contains('remove-btn')) {
            if (isLoggedIn()) {
                try { await apiRemoveCartItem(id); } catch { }
            } else {
                const cart = getLocalCart().filter(i => String(i.id) !== String(id));
                saveLocalCart(cart);
            }
            initCartPage();
            return;
        }

        const action = btn.dataset.action;
        if (!action) return;

        if (isLoggedIn()) {
            // For increase/decrease via API we need current qty from the DOM
            const row = btn.closest('tr');
            const qtySpan = row.querySelector('.qty-display');
            let qty = parseInt(qtySpan.textContent, 10);
            qty = action === 'increase' ? qty + 1 : qty - 1;

            if (qty < 1) {
                try { await apiRemoveCartItem(id); } catch { }
            } else {
                try { await apiUpdateCartItem(id, qty); } catch { }
            }
            initCartPage();
        } else {
            const cart = getLocalCart();
            const item = cart.find(i => String(i.id) === String(id));
            if (item) {
                if (action === 'increase') {
                    item.quantity += 1;
                } else {
                    item.quantity -= 1;
                    if (item.quantity < 1) {
                        saveLocalCart(cart.filter(i => String(i.id) !== String(id)));
                        initCartPage();
                        return;
                    }
                }
                saveLocalCart(cart);
            }
            initCartPage();
        }
    });

    /**
     * Product Detail Page Initialization
     */
    async function initProductDetailPage() {
        const detailSection = document.getElementById('product-detail-section');
        const listSection = document.getElementById('product-list-section');
        const detailCard = document.querySelector('.product-detail-card');
        const productGrid = document.querySelector('#product-list-section .product-grid');

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        console.log("[Debug] initProductDetailPage - query param id:", id);

        // Catalog view (No specific ID parameter)
        if (!id || id.trim() === '' || id === 'undefined' || id === 'null') {
            if (detailSection) detailSection.style.display = 'none';
            if (listSection) listSection.style.display = 'block';

            if (productGrid) {
                productGrid.innerHTML = '<p class="loading-msg">Loading products…</p>';
                try {
                    const data = await apiGetProducts();
                    const products = Array.isArray(data) ? data : (data.products || data.data || []);
                    if (!products.length) {
                        productGrid.innerHTML = '<p class="loading-msg">No products found.</p>';
                        return;
                    }
                    productGrid.innerHTML = '';
                    products.forEach(product => renderProductCard(product, productGrid));

                    // Apply initial search filter if the search parameter is present in URL
                    const searchQ = params.get('search');
                    if (searchQ) {
                        const query = searchQ.toLowerCase().trim();
                        const cards = productGrid.querySelectorAll('.product-card');
                        cards.forEach(card => {
                            const name = card.querySelector('.card-name')?.textContent.toLowerCase() || '';
                            const desc = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
                            if (name.includes(query) || desc.includes(query)) {
                                card.style.display = '';
                            } else {
                                card.style.display = 'none';
                            }
                        });
                    }
                } catch (err) {
                    console.error('[Catalog View] Failed to load products:', err);
                    productGrid.innerHTML = `<p class="loading-msg error-msg">Could not load products. <br><small>${err.message}</small></p>`;
                }
            }
            return;
        }

        // Single Product Detail view
        if (listSection) listSection.style.display = 'none';
        if (detailSection) detailSection.style.display = 'block';

        if (!detailCard) return;
        detailCard.innerHTML = `<p class="loading-msg">Loading product details…</p>`;

        try {
            const product = await apiGetProduct(id);
            if (!product) {
                detailCard.innerHTML = `<p class="loading-msg">Product not found. <a href="products.html">Go back to products.</a></p>`;
                return;
            }

            const name = product.name || product.title || 'Unnamed Product';
            const price = product.price != null ? product.price : 0;
            const stock = product.stock != null ? product.stock : (product.countInStock != null ? product.countInStock : null);
            const image = product.image || product.imageUrl || product.img || 'https://via.placeholder.com/400x260?text=No+Image';
            const desc = product.description || product.desc || 'No description available for this product.';

            detailCard.innerHTML = `
            <div class="product-detail-image">
                <img src="${image}" alt="${name}">
            </div>
            <div class="product-detail-info">
                <h1>${name}</h1>
                <p class="product-description">${desc}</p>
                ${stock !== null ? `<p class="quantity" style="margin-bottom:15px; color:#6c757d; font-weight:600;">${stock} in stock</p>` : ''}
                <p class="product-price">PKR ${Number(price).toFixed(2)}</p>
                <div class="product-actions" style="margin-top:20px;">
                    <label for="quantity" style="font-weight:600; color:#333;">Quantity</label>
                    <input type="number" id="quantity" name="quantity" min="1" value="1" style="width: 80px; padding:10px; border:1px solid #ced4da; border-radius:8px; font-size:1rem; text-align:center;">
                    <button
                    type="button"

                    class="add-cart-button"

                    id="btn-detail-add"

                     ${stock === 0 ? "disabled" : ""}

                    style="
                    background:${stock === 0 ? "#999" : "#0077b6"};
                    color:white;
                    border:none;
                    padding:12px 24px;
                    border-radius:8px;
                    font-size:1rem;
                    font-weight:700;
                    cursor:${stock === 0 ? "not-allowed" : "pointer"};
                    transition:all 0.2s;
                    "

                    >

                    ${stock === 0 ? "Out of Stock" : "Add to Cart"}

                    </button>
                </div>
            </div>
        `;

            const addBtn = document.getElementById('btn-detail-add');

            if (stock !== 0 && addBtn) {
                addBtn.addEventListener('click', async () => {
                    const qtyInput = document.getElementById('quantity');
                    const qty = parseInt(qtyInput.value, 10) || 1;
                    addBtn.disabled = true;
                    addBtn.textContent = 'Adding…';

                    if (isLoggedIn()) {
                        try {
                            await apiAddToCart(id, qty);
                            showToast(`"${name}" added to cart! ✓`, 'success');
                            addBtn.textContent = 'Added ✓';
                            setTimeout(() => {
                                addBtn.disabled = false;
                                addBtn.textContent = 'Add to Cart';
                            }, 2000);
                        } catch (err) {
                            showToast(`Failed: ${err.message}`, 'error');
                            addBtn.disabled = false;
                            addBtn.textContent = 'Add to Cart';
                        }
                    } else {
                        const cart = getLocalCart();
                        const existing = cart.find(i => String(i.id) === String(id));
                        if (existing) {
                            existing.quantity += qty;
                        } else {
                            cart.push({ id, name, price, image, quantity: qty });
                        }
                        saveLocalCart(cart);
                        showToast(`"${name}" added! Log in to sync your cart.`, 'info');
                        addBtn.textContent = 'Added ✓';
                        setTimeout(() => {
                            addBtn.disabled = false;
                            addBtn.textContent = 'Add to Cart';
                        }, 2000);
                    }
                });
            }

        } catch (err) {
            console.error('[Detail] Failed to load product:', err);
            detailCard.innerHTML = `<p class="loading-msg error-msg">Could not load product. <br><small>${err.message}</small></p>`;
        }
    }
}