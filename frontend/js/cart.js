// ============================================================
//  cart.js  —  Cart page logic for Cart to Gate
//  Requires: api.js, auth.js (loaded before this file)
//
//  Responsibilities:
//    - Fetch & render cart items (API for logged-in, localStorage for guests)
//    - Live quantity controls (+/-) and item removal
//    - Running total calculation
//    - "Place Order" flow  →  POST /api/orders/place
//    - Clear cart UI after successful order
// ============================================================

// ── DOM refs (populated once DOM is ready) ────────────────────
let cartTbody = null;
let totalEl = null;
let summaryEl = null;

// ── Helpers ───────────────────────────────────────────────────

function getLocalCart() {
    const raw = localStorage.getItem('ctg_cart');
    return raw ? JSON.parse(raw) : [];
}

function saveLocalCart(cart) {
    localStorage.setItem('ctg_cart', JSON.stringify(cart));
}

/**
 * Compute and display the running total from visible cart rows.
 * Reads price × qty directly from the data-* attributes on each row
 * so it works for both API and guest carts without a separate data store.
 */
function recalcTotal() {
    let total = 0;
    document.querySelectorAll('.cart-table tbody tr[data-price]').forEach(row => {
        const price = parseFloat(row.dataset.price) || 0;
        const qty = parseInt(row.querySelector('.qty-display')?.textContent, 10) || 0;
        total += price * qty;
    });
    if (totalEl) totalEl.textContent = `Total: PKR ${total.toFixed(2)}`;
    return total;
}

// ── Main entry point ──────────────────────────────────────────

async function initCartPage() {
    cartTbody = document.querySelector('.cart-table tbody');
    totalEl = document.querySelector('.total-amount');
    summaryEl = document.querySelector('.cart-summary');

    if (!cartTbody) return;

    attachOrderPanelHandlers();

    if (isLoggedIn()) {
        await loadApiCart();
    } else {
        loadLocalCart();
    }
}

// ── API cart ──────────────────────────────────────────────────

async function loadApiCart() {
    cartTbody.innerHTML = `
        <tr><td colspan="5" class="loading-msg">Loading your cart…</td></tr>
    `;

    try {
        const data = await apiGetCart();
        const items = Array.isArray(data)
            ? data
            : (data.cartItems || data.items || data.cart || []);

        renderCartRows(items, 'api');

    } catch (err) {
        cartTbody.innerHTML = `
            <tr><td colspan="5" class="error-msg">
                Could not load cart: ${err.message}
            </td></tr>
        `;
    }
}

// ── Guest cart ────────────────────────────────────────────────

function loadLocalCart() {
    const items = getLocalCart();
    renderCartRows(items, 'local');
}

// ── Rendering ─────────────────────────────────────────────────

/**
 * Build all cart rows from an array of items.
 * Handles both API response shapes and localStorage shapes.
 *
 * @param {Object[]} items
 * @param {'api'|'local'} source
 */
function renderCartRows(items, source) {
    if (!items.length) {
        showEmptyCart();
        return;
    }

    cartTbody.innerHTML = '';

    items.forEach(item => {
        // Normalise field names from various API shapes
        const id = item._id || item.cartItemId || item.id;
        const name = item.name || (item.product && item.product.name) || 'Product';
        const price = item.price || (item.product && item.product.price) || 0;
        const qty = item.quantity || 1;
        const image = item.image || (item.product && item.product.image)
            || item.imageUrl || 'https://via.placeholder.com/60';

        cartTbody.insertAdjacentHTML('beforeend', buildRow({ id, name, price, qty, image }));
    });

    recalcTotal();
    toggleSummaryVisibility(true);
}

function showEmptyCart() {
    cartTbody.innerHTML = `
        <tr><td colspan="5" class="empty-cart-msg">
            Your cart is empty. <a href="index.html">Shop now →</a>
        </td></tr>
    `;
    if (totalEl) totalEl.textContent = 'Total: PKR 0.00';
    toggleSummaryVisibility(false);
}

/**
 * Hide the checkout/order panel when the cart is empty,
 * show it when there are items.
 */
function toggleSummaryVisibility(hasItems) {
    const placeOrderPanel = document.getElementById('order-panel');
    if (!placeOrderPanel) return;
    placeOrderPanel.style.display = hasItems ? 'block' : 'none';
}

/**
 * Build a single cart row HTML string.
 * Embeds data-price on the <tr> so recalcTotal() can read it.
 */
function buildRow({ id, name, price, qty, image }) {
    return `
        <tr data-id="${id}" data-price="${price}">
            <td>
                <div class="product-info">
                    <img src="${image}" alt="${name}">
                    <span class="product-title">${name}</span>
                </div>
            </td>
            <td class="col-price">PKR ${Number(price).toFixed(2)}</td>
            <td>
                <div class="qty-controls">
                    <button type="button" class="qty-btn" data-action="decrease" data-id="${id}">−</button>
                    <span class="qty-display">${qty}</span>
                    <button type="button" class="qty-btn" data-action="increase" data-id="${id}">+</button>
                </div>
            </td>
            <td class="col-subtotal">PKR ${(Number(price) * qty).toFixed(2)}</td>
            <td>
                <button type="button" class="remove-btn" data-id="${id}">Remove</button>
            </td>
        </tr>
    `;
}

// ── Cart interactions ─────────────────────────────────────────

/**
 * Update the subtotal cell for a single row after qty change.
 */
function updateRowSubtotal(row) {
    const price = parseFloat(row.dataset.price) || 0;
    const qty = parseInt(row.querySelector('.qty-display').textContent, 10) || 0;
    const subtotal = row.querySelector('.col-subtotal');
    if (subtotal) subtotal.textContent = `PKR ${(price * qty).toFixed(2)}`;
}

// Delegated click handler for +/- and Remove buttons
document.addEventListener('click', async (e) => {
    if (!window.location.pathname.includes('cart.html')) return;

    // ── Remove ────────────────────────────────────────────────
    if (e.target.closest('.remove-btn')) {
        const btn = e.target.closest('.remove-btn');
        const id = btn.dataset.id;

        btn.disabled = true;
        btn.textContent = '…';

        if (isLoggedIn()) {
            try { await apiRemoveCartItem(id); } catch { /* ignore */ }
        } else {
            saveLocalCart(getLocalCart().filter(i => String(i.id) !== String(id)));
        }

        const row = cartTbody.querySelector(`tr[data-id="${id}"]`);
        if (row) row.remove();

        if (!cartTbody.querySelector('tr[data-id]')) showEmptyCart();
        else recalcTotal();
        return;
    }

    // ── Qty +/- ───────────────────────────────────────────────
    const qtyBtn = e.target.closest('.qty-btn[data-action]');
    if (!qtyBtn) return;

    const id = qtyBtn.dataset.id;
    const action = qtyBtn.dataset.action;
    const row = cartTbody.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const qtySpan = row.querySelector('.qty-display');
    let qty = parseInt(qtySpan.textContent, 10);

    if (action === 'increase') {
        qty += 1;
    } else {
        qty -= 1;
        if (qty < 1) {
            // Treat decrease-to-zero as remove
            qtyBtn.disabled = true;
            if (isLoggedIn()) {
                try { await apiRemoveCartItem(id); } catch { /* ignore */ }
            } else {
                saveLocalCart(getLocalCart().filter(i => String(i.id) !== String(id)));
            }
            row.remove();
            if (!cartTbody.querySelector('tr[data-id]')) showEmptyCart();
            else recalcTotal();
            return;
        }
    }

    qtySpan.textContent = qty;
    updateRowSubtotal(row);
    recalcTotal();

    if (isLoggedIn()) {
        try { await apiUpdateCartItem(id, qty); } catch { /* qty already updated in DOM */ }
    } else {
        const cart = getLocalCart();
        const item = cart.find(i => String(i.id) === String(id));
        if (item) { item.quantity = qty; saveLocalCart(cart); }
    }
});

// ── Place Order panel ─────────────────────────────────────────

function attachOrderPanelHandlers() {
    // "Proceed to Checkout" button opens the inline order panel
    const openBtn = document.getElementById('btn-open-order');
    const panel = document.getElementById('order-panel');

    if (openBtn && panel) {
        openBtn.addEventListener('click', () => {
            const isOpen = panel.classList.toggle('order-panel--open');
            openBtn.textContent = isOpen ? 'Hide Checkout ▲' : 'Proceed to Checkout ▼';
            if (isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    // Order form submit
    const form = document.getElementById('form-place-order');
    if (form) {
        form.addEventListener('submit', handlePlaceOrder);
    }
}

/**
 * Call POST /api/orders/place, then clear the cart on success.
 */
async function handlePlaceOrder(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const address = document.getElementById('order-address').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    const payment = document.getElementById('order-payment').value;

    // Client-side validation
    if (!address) {
        setOrderError(form, 'Delivery address is required.');
        document.getElementById('order-address').focus();
        return;
    }
    if (!phone) {
        setOrderError(form, 'Phone number is required.');
        document.getElementById('order-phone').focus();
        return;
    }
    if (!payment) {
        setOrderError(form, 'Please select a payment method.');
        document.getElementById('order-payment').focus();
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order…';
    setOrderError(form, '');

    try {
        // POST /api/orders/place  — JWT attached automatically by apiFetch
        await apiFetch('/api/orders/place', {
            method: 'POST',
            body: JSON.stringify({
                address,
                phone,
                paymentMethod: payment,
            }),
        });

        // ── Success ───────────────────────────────────────────
        clearCartAfterOrder();
        showOrderSuccess();

    } catch (err) {
        setOrderError(form, err.message || 'Failed to place order. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
    }
}

/**
 * Clear cart table, total, localStorage, and hide the order panel.
 */
function clearCartAfterOrder() {
    // Clear localStorage guest cart
    localStorage.removeItem('ctg_cart');

    // Clear the cart table DOM
    if (cartTbody) {
        cartTbody.innerHTML = '';
    }
    if (totalEl) totalEl.textContent = 'Total: PKR 0.00';

    // Hide the order panel
    const panel = document.getElementById('order-panel');
    if (panel) panel.classList.remove('order-panel--open');
    toggleSummaryVisibility(false);
}

/**
 * Replace the main cart area with a big success state.
 */
function showOrderSuccess() {
    const cartMain = document.querySelector('.cart-container');
    if (!cartMain) return;

    cartMain.innerHTML = `
        <div class="order-success">
            <div class="order-success__icon">✓</div>
            <h1 class="order-success__title">Order Placed!</h1>
            <p class="order-success__msg">
                Thank you for your order. We'll start processing it right away.
            </p>
            <div class="order-success__actions">
                <a href="index.html" class="order-success__btn order-success__btn--primary">
                    Continue Shopping
                </a>
            </div>
        </div>
    `;
}

// ── Inline order-form error helper ────────────────────────────

function setOrderError(form, message, type = 'error') {
    const el = form.querySelector('.form-error');
    if (!el) return;
    el.textContent = message;
    el.className = `form-error form-error--${type}${message ? ' form-error--visible' : ''}`;
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initCartPage);
