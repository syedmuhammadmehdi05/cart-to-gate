// ============================================================
//  main.js — UI logic for Cart to Gate
// ============================================================

// ── Helpers ──────────────────────────────────────────────────

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

// ── Local Cart ───────────────────────────────────────────────

function getLocalCart() {
    return JSON.parse(localStorage.getItem('ctg_cart')) || [];
}

function saveLocalCart(cart) {
    localStorage.setItem('ctg_cart', JSON.stringify(cart));
}

// ── Page Init ────────────────────────────────────────────────

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

// ── Home ─────────────────────────────────────────────────────

async function initHomePage() {
    const welcomeMsg = document.getElementById('welcome-message');
    const user = getUser?.();

    if (welcomeMsg) {
        if (user?.name) {
            welcomeMsg.textContent = `Welcome, ${user.name}`;
            welcomeMsg.style.display = 'block';
        } else {
            welcomeMsg.style.display = 'none';
        }
    }
}

// ── PRODUCT CARD (FIXED) ─────────────────────────────────────

function renderProductCard(product, container) {
    const id = product._id || product.id;
    const name = product.name || product.title || 'Unnamed';
    const price = product.price ?? 0;
    const stock =
        product.stock ?? product.countInStock ?? null;

    const image =
        product.image ||
        product.imageUrl ||
        product.img ||
        'https://via.placeholder.com/400x260?text=No+Image';

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
            ? `<button class="btn-add-cart" disabled>Out of Stock</button>`
            : `<button class="btn-add-cart">Add to Cart</button>`
        }
            </div>
        </div>
    `;

    const addBtn = card.querySelector('.btn-add-cart');

    if (stock !== 0 && addBtn) {
        addBtn.addEventListener('click', () => {
            handleAddToCart(addBtn, product);
        });
    }

    // 🔥 CRITICAL FIX (you were missing this)
    container.appendChild(card);
}

// ── ADD TO CART ─────────────────────────────────────────────

async function handleAddToCart(btn, product) {
    const id = product._id || product.id;
    const name = product.name || product.title || 'Product';
    const price = product.price || 0;
    const image = product.image || product.imageUrl || product.img || '';

    btn.disabled = true;
    btn.textContent = 'Adding…';

    if (isLoggedIn?.()) {
        try {
            await apiAddToCart(id, 1);
            showToast(`"${name}" added to cart! ✓`, 'success');

            btn.textContent = 'Added ✓';

            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = 'Add to Cart';
            }, 2000);

        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Add to Cart';
        }

    } else {
        const cart = getLocalCart();
        const existing = cart.find(i => String(i.id) === String(id));

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ id, name, price, image, quantity: 1 });
        }

        saveLocalCart(cart);

        showToast(`"${name}" added! Login to sync.`, 'info');

        btn.textContent = 'Added ✓';

        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Add to Cart';
        }, 2000);
    }
}

// ── CART PAGE ────────────────────────────────────────────────

async function initCartPage() {
    if (isLoggedIn?.()) {
        await renderApiCart();
    } else {
        renderLocalCart();
    }
}

// ── API CART ────────────────────────────────────────────────

async function renderApiCart() {
    const tbody = document.querySelector('.cart-table tbody');
    const totalEl = document.querySelector('.total-amount');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';

    try {
        const data = await apiGetCart();
        const items = data?.cartItems || data?.items || data || [];

        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="4">Cart empty</td></tr>';
            return;
        }

        let total = 0;
        tbody.innerHTML = '';

        items.forEach(item => {
            const id = item._id || item.id;
            const name = item.name || item.product?.name;
            const price = item.price || item.product?.price || 0;
            const qty = item.quantity || 1;
            const image = item.image || item.product?.image || '';

            total += price * qty;

            tbody.innerHTML += buildCartRowHtml({ id, name, price, qty, image });
        });

        if (totalEl) totalEl.textContent = `Total: PKR ${total.toFixed(2)}`;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4">${err.message}</td></tr>`;
    }
}

// ── LOCAL CART ──────────────────────────────────────────────

function renderLocalCart() {
    const tbody = document.querySelector('.cart-table tbody');
    const totalEl = document.querySelector('.total-amount');
    if (!tbody) return;

    const cart = getLocalCart();

    if (!cart.length) {
        tbody.innerHTML = '<tr><td colspan="4">Cart empty</td></tr>';
        return;
    }

    let total = 0;
    tbody.innerHTML = '';

    cart.forEach(item => {
        total += item.price * item.quantity;

        tbody.innerHTML += buildCartRowHtml({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.quantity,
            image: item.image
        });
    });

    if (totalEl) totalEl.textContent = `Total: PKR ${total.toFixed(2)}`;
}

// ── CART ROW ────────────────────────────────────────────────

function buildCartRowHtml({ id, name, price, qty, image }) {
    return `
        <tr>
            <td>${name}</td>
            <td>${price}</td>
            <td>${qty}</td>
            <td>
                <button class="remove-btn" data-id="${id}">Remove</button>
            </td>
        </tr>
    `;
}

// ── PRODUCT DETAIL PAGE ─────────────────────────────────────

async function initProductDetailPage() {
    const id = new URLSearchParams(location.search).get('id');

    const grid = document.querySelector('.product-grid');
    const detail = document.querySelector('.product-detail-card');

    if (!id) {
        try {
            const data = await apiGetProducts();
            const products = data?.products || data || [];

            grid.innerHTML = '';

            products.forEach(p => renderProductCard(p, grid));

        } catch (err) {
            grid.innerHTML = err.message;
        }
        return;
    }

    try {
        const product = await apiGetProduct(id);

        detail.innerHTML = `
            <h1>${product.name}</h1>
            <p>${product.description}</p>
            <p>PKR ${product.price}</p>
        `;

    } catch (err) {
        detail.innerHTML = err.message;
    }
}