// ============================================================
//  auth.js  —  Authentication logic for Cart to Gate
//  Requires: api.js (loaded before this file)
//
//  Handles:
//    - Register form  → POST /api/auth/register
//    - Login form     → POST /api/auth/login
//    - Logout button  → clears localStorage session
//    - Navbar update  → shows Login/Register OR Logout
// ============================================================

// ── Session helpers ───────────────────────────────────────────

/** @returns {string|null} Stored JWT token */
function getToken() {
    return localStorage.getItem('ctg_token');
}

/** @returns {Object|null} Stored user object */
function getUser() {
    const raw = localStorage.getItem('ctg_user');
    return raw ? JSON.parse(raw) : null;
}

/** @returns {boolean} Whether a user is currently logged in */
function isLoggedIn() {
    return Boolean(getToken());
}

function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

// ── Navbar: dynamic auth links ────────────────────────────────

/**
 * Show Login + Register when logged out, Logout when logged in.
 * Called on every page load via DOMContentLoaded.
 */
function updateNavAuth() {
    const navLinks = document.querySelector('.nav-links');
    const searchWrapper = document.getElementById('nav-search-wrapper');

    if (!navLinks) return;

    const user = getUser();
    const role = user ? (user.role || 'user') : 'user';
    const loggedIn = isLoggedIn();

    let html = '';

    if (role === 'admin' && loggedIn) {
        // Admin navbar
        // ORDER: Home, Products, Manage, Logout
        html += `
            <li><a href="index.html">Home</a></li>
            <li><a href="products.html">Products</a></li>
            <li><a href="manage-dashboard.html">Manage</a></li>
            <li><a href="#" id="btn-logout-dynamic">Logout</a></li>
        `;
        if (searchWrapper) searchWrapper.style.display = 'none';
    } else {
        // User/Guest navbar
        // ORDER: Search, Home, Products, Cart, About Us, Logout (or Login/Register)
        html += `
            <li><a href="index.html">Home</a></li>
            <li><a href="products.html">Products</a></li>
            <li><a href="cart.html">Cart</a></li>
            <li><a href="about.html">About Us</a></li>
        `;

        if (loggedIn) {
            html += `<li><a href="#" id="btn-logout-dynamic">Logout</a></li>`;
        } else {
            html += `
                <li><a href="login.html">Login</a></li>
                <li><a href="register.html">Register</a></li>
            `;
        }

        if (searchWrapper) {
            searchWrapper.style.display = 'flex';
        }
    }

    navLinks.innerHTML = html;

    // Attach event listener to dynamic logout buttons
    const dynamicLogout = document.getElementById('btn-logout-dynamic');
    if (dynamicLogout) {
        dynamicLogout.addEventListener('click', handleLogout);
    }

    // Centered search bar global listener
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) {
        const isProductsPage = window.location.pathname.includes('products.html');
        if (isProductsPage) {
            const urlParams = new URLSearchParams(window.location.search);
            const searchQ = urlParams.get('search');
            if (searchQ) {
                searchInput.value = searchQ;
            }
        }

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (!isProductsPage) {
                    window.location.href = `products.html?search=${encodeURIComponent(query)}`;
                }
            }
        });

        searchInput.addEventListener('input', (e) => {
            if (isProductsPage) {
                const query = e.target.value.toLowerCase().trim();
                const cards = document.querySelectorAll('.product-card');
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
        });
    }
}

// ── Error display helper ──────────────────────────────────────

/**
 * Show an inline error message inside a form.
 * Clears the message when called with an empty string.
 *
 * @param {HTMLElement} form     - The <form> element
 * @param {string}      message  - Text to display ('' to clear)
 * @param {'error'|'success'} type
 */
function setFormError(form, message, type = 'error') {
    const errorEl = form.querySelector('.form-error');
    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.className = `form-error form-error--${type}${message ? ' form-error--visible' : ''}`;
}

// ── Logout ────────────────────────────────────────────────────

/**
 * Clear the stored session and redirect to login.
 * Attached to the #btn-logout anchor on every page.
 */
function handleLogout(e) {
    if (e && e.preventDefault) e.preventDefault();
    apiLogout();                           // defined in api.js — clears ctg_token + ctg_user
    updateNavAuth();
    window.location.href = 'login.html';
}

// ── Register ──────────────────────────────────────────────────

function initRegisterPage() {
    const form = document.getElementById('form-register');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setFormError(form, '');            // clear any previous error

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // ── Client-side validation ──────────────────────────
        if (!name) {
            setFormError(form, 'Full name is required.');
            document.getElementById('name').focus();
            return;
        }
        if (!email || !email.includes('@') || !email.includes('.')) {
            setFormError(form, 'Please enter a valid email address.');
            document.getElementById('email').focus();
            return;
        }
        if (password.length < 6) {
            setFormError(form, 'Password must be at least 6 characters.');
            document.getElementById('password').focus();
            return;
        }

        // ── Submit ──────────────────────────────────────────
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account…';

        try {
            await apiRegister({ name, email, password });

            setFormError(form, 'Account created! Redirecting to login…', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1200);

        } catch (err) {
            setFormError(form, err.message || 'Registration failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
    });
}

// ── Login ─────────────────────────────────────────────────────

function initLoginPage() {
    const form = document.getElementById('form-login');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setFormError(form, '');            // clear any previous error

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // ── Client-side validation ──────────────────────────
        if (!email || !email.includes('@')) {
            setFormError(form, 'Please enter a valid email address.');
            document.getElementById('email').focus();
            return;
        }
        if (!password) {
            setFormError(form, 'Password is required.');
            document.getElementById('password').focus();
            return;
        }

        // ── Submit ──────────────────────────────────────────
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in…';

        try {
            await apiLogin({ email, password });
            // apiLogin() stores ctg_token + ctg_user in localStorage

            setFormError(form, 'Login successful! Redirecting…', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);

        } catch (err) {
            setFormError(form, err.message || 'Invalid email or password.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Run on every page — builds the role-based dynamic navbar
    updateNavAuth();

    // Page-specific init
    const path = window.location.pathname;

    if (path.includes('login.html')) initLoginPage();
    if (path.includes('register.html')) initRegisterPage();
});