// ============================================================
//  api.js  —  Central API configuration for Cart to Gate
// ============================================================

const API_BASE_URL = '';

// ── Generic helpers ──────────────────────────────────────────

/**
 * Retrieve the JWT token stored after login.
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem('ctg_token');
}

/**
 * Build standard JSON headers, attaching the Bearer token when present.
 * @returns {HeadersInit}
 */
function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/**
 * Centralised fetch wrapper.
 * Throws an Error with the server message on non-2xx responses.
 *
 * @param {string} endpoint   – path starting with '/', e.g. '/api/products'
 * @param {RequestInit} opts  – standard fetch options
 * @returns {Promise<any>}    – parsed JSON body
 */
async function apiFetch(endpoint, opts = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: buildHeaders(),
        ...opts,
    });

    let data;
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        const message = data.message || data.error || `HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

// ── Auth API ─────────────────────────────────────────────────

/**
 * Register a new user.
 * @param {{name: string, email: string, password: string}} payload
 */
async function apiRegister(payload) {
    return apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Login an existing user. Stores the returned token in localStorage.
 * @param {{email: string, password: string}} payload
 */
async function apiLogin(payload) {
    const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (data.token) {
        localStorage.setItem('ctg_token', data.token);
        if (data.user) localStorage.setItem('ctg_user', JSON.stringify(data.user));
    }
    return data;
}

/** Remove the session from localStorage. */
function apiLogout() {
    localStorage.removeItem('ctg_token');
    localStorage.removeItem('ctg_user');
}

// ── Products API ─────────────────────────────────────────────

/** Fetch all products from the backend. */
async function apiGetProducts() {
    return apiFetch('/api/products');
}

/**
 * Fetch a single product by ID.
 * @param {string|number} id
 */
async function apiGetProduct(id) {
    return apiFetch(`/api/products/${id}`);
}

// ── Cart API ─────────────────────────────────────────────────

/** Fetch the current user's cart. */
async function apiGetCart() {
    return apiFetch('/api/cart');
}

/**
 * Add an item to the server-side cart.
 * Endpoint: POST /api/cart/add
 * The JWT token is automatically attached by buildHeaders().
 * @param {string|number} productId
 * @param {number} quantity
 */
async function apiAddToCart(productId, quantity = 1) {
    return apiFetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
    });
}

/**
 * Update quantity of a cart item.
 * @param {string|number} cartItemId
 * @param {number} quantity
 */
async function apiUpdateCartItem(cartItemId, quantity) {
    return apiFetch(`/api/cart/${cartItemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
    });
}

/**
 * Remove an item from the server-side cart.
 * @param {string|number} cartItemId
 */
async function apiRemoveCartItem(cartItemId) {
    return apiFetch(`/api/cart/${cartItemId}`, {
        method: 'DELETE',
    });
}

/**
 * Add a new product to the catalog.
 * Endpoint: POST /api/products
 * @param {{name: string, description: string, price: number, image: string, stock: number}} payload
 */
async function apiAddProduct(payload) {
    return apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Update an existing product.
 * Endpoint: PUT /api/products/:id
 * @param {string|number} id
 * @param {{name?: string, description?: string, price?: number, image?: string, stock?: number}} payload
 */
async function apiUpdateProduct(id, payload) {
    return apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

/**
 * Delete a product by ID.
 * Endpoint: DELETE /api/products/:id
 * @param {string|number} id
 */
async function apiDeleteProduct(id) {
    return apiFetch(`/api/products/${id}`, {
        method: 'DELETE',
    });
}

// ── Orders Admin API ──────────────────────────────────────────

/** Fetch all orders (admin). Endpoint: GET /api/orders/all */
async function apiGetAllOrders() {
    return apiFetch('/api/orders/all');
}
