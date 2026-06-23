// ============================================================
//  dashboard.js  —  Admin Dashboard logic for Cart to Gate
//  Requires: api.js, auth.js (loaded before this file)
//
//  Handles:
//    - Tab switching
//    - Add Product form  → POST /api/products
//    - Manage Products   → GET / PUT / DELETE /api/products
//    - Manage Orders     → GET /api/orders/all
// ============================================================

// ── Toast helper ─────────────────────────────────────────────
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return alert(message);

    toast.textContent = message;
    toast.className = `toast toast--${type} toast--show`;

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('toast--show');
    }, 3000);
}

// ── Form error helper ────────────────────────────────────────
function setFormError(form, message, type = 'error') {
    const el = form?.querySelector('.form-error');
    if (!el) return;

    el.textContent = message;
    el.className = `form-error form-error--${type}${message ? ' form-error--visible' : ''}`;
}

// ── AUTH GUARD ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!isLoggedIn() || !isAdmin()) {
        window.location.href = 'index.html';
        return;
    }

    initTabs();
    initAddProductForm();
    initProductsTableEvents();
    initEditModal();

    // load default tab
    loadProducts();
});

// ── Tabs ─────────────────────────────────────────────────────
function initTabs() {
    const tabs = document.querySelectorAll('.dash-tab');
    const panels = document.querySelectorAll('.dash-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });

            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const target = document.getElementById(tab.getAttribute('aria-controls'));
            if (target) target.classList.add('active');

            if (tab.id === 'tab-products') loadProducts();
            if (tab.id === 'tab-orders') loadOrders();
        });
    });
}

// ── ADD PRODUCT ──────────────────────────────────────────────
function initAddProductForm() {
    const form = document.getElementById('form-add-product');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setFormError(form, '');

        const name = prod('prod-name');
        const description = prod('prod-desc');
        const price = prod('prod-price');
        const image = prod('prod-image');
        const stock = prod('prod-stock');

        function prod(id) {
            return document.getElementById(id).value.trim();
        }

        if (!name || !description || !price || !image || !stock) {
            return setFormError(form, 'All fields are required.');
        }

        try {
            await apiAddProduct({
                name,
                description,
                price: +price,
                image,
                stock: +stock
            });

            showToast('Product added successfully!', 'success');
            form.reset();
            loadProducts(); // 🔥 AUTO REFRESH
        } catch (err) {
            setFormError(form, err.message);
        }
    });
}

// ── PRODUCTS ────────────────────────────────────────────────
let productsCache = [];

async function loadProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

    try {
        const res = await apiGetProducts();
        productsCache = Array.isArray(res) ? res : res.products || [];

        if (!productsCache.length) {
            tbody.innerHTML = `<tr><td colspan="5">No products found</td></tr>`;
            return;
        }

        tbody.innerHTML = productsCache.map(p => `
            <tr data-id="${p._id}">
                <td>${p.name}</td>
                <td>PKR ${p.price}</td>
                <td>${p.stock ?? 0}</td>
                <td>
                    <button data-action="edit" data-id="${p._id}">Edit</button>
                    <button data-action="delete" data-id="${p._id}">Delete</button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
    }
}

// ── PRODUCT EVENTS ───────────────────────────────────────────
function initProductsTableEvents() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.dataset.id;

        if (btn.dataset.action === 'delete') {
            if (!confirm('Delete product?')) return;

            try {
                await apiDeleteProduct(id);
                showToast('Deleted', 'info');
                loadProducts(); // 🔥 AUTO REFRESH
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        if (btn.dataset.action === 'edit') {
            const product = productsCache.find(p => p._id === id);
            if (product) openEditModal(product);
        }
    });
}

// ── EDIT MODAL ───────────────────────────────────────────────
function openEditModal(p) {
    document.getElementById('edit-prod-id').value = p._id;
    document.getElementById('edit-prod-name').value = p.name;
    document.getElementById('edit-prod-desc').value = p.description;
    document.getElementById('edit-prod-price').value = p.price;
    document.getElementById('edit-prod-image').value = p.image || '';
    document.getElementById('edit-prod-stock').value = p.stock || 0;

    document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('open');
}

function initEditModal() {
    const form = document.getElementById('form-edit-product');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = edit('edit-prod-id');
        const name = edit('edit-prod-name');
        const description = edit('edit-prod-desc');
        const price = edit('edit-prod-price');
        const image = edit('edit-prod-image');
        const stock = edit('edit-prod-stock');

        function edit(id) {
            return document.getElementById(id).value.trim();
        }

        try {
            await apiUpdateProduct(id, {
                name,
                description,
                price: +price,
                image,
                stock: +stock
            });

            showToast('Updated!', 'success');
            closeEditModal();
            loadProducts(); // 🔥 AUTO REFRESH
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ── ORDERS ───────────────────────────────────────────────────
async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

    try {
        const res = await apiGetAllOrders();
        const orders = Array.isArray(res) ? res : res.orders || [];

        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="6">No orders</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o._id.slice(-6)}</td>
                <td>${o.user?.email || '-'}</td>
                <td>PKR ${o.totalPrice}</td>
                <td>
                    <span class="status-badge">${o.status}</span>
                </td>
                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
}