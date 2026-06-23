// ============================================================
//  checkout.js  —  Checkout page logic for Cart to Gate
//  Requires: api.js, auth.js (loaded before this file)
// ============================================================

/**
 * Show / clear an inline form message.
 * Reuses the same helper pattern as auth.js.
 */
function setCheckoutError(form, message, type = 'error') {
    const el = form.querySelector('.form-error');
    if (!el) return;
    el.textContent = message;
    el.className = `form-error form-error--${type}${message ? ' form-error--visible' : ''}`;
}

function initCheckoutPage() {
    const form = document.getElementById('form-checkout');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setCheckoutError(form, '');

        const address = document.getElementById('address').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const payment = document.getElementById('payment').value;

        // ── Client-side validation ──────────────────────────
        if (!address) {
            setCheckoutError(form, 'Delivery address is required.');
            document.getElementById('address').focus();
            return;
        }
        if (!phone) {
            setCheckoutError(form, 'Phone number is required.');
            document.getElementById('phone').focus();
            return;
        }
        if (!payment) {
            setCheckoutError(form, 'Please select a payment method.');
            document.getElementById('payment').focus();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Placing order…';

        try {
            const cart = isLoggedIn()
                ? await apiGetCart()
                : JSON.parse(localStorage.getItem('ctg_cart') || '[]');

            const items = Array.isArray(cart)
                ? cart
                : (cart.items || cart.cartItems || cart.cart || []);

            if (!items.length) {
                setCheckoutError(form, 'Your cart is empty.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
                return;
            }

            // normalize items for backend
            const orderItems = items.map(item => ({
                product: item.product?._id || item.id || item.productId,
                quantity: item.quantity
            }));

            await apiFetch('/api/orders/place', {
                method: 'POST',
                body: JSON.stringify({
                    address,
                    phone,
                    paymentMethod: payment,
                    products: orderItems
                }),
            });

            // clear cart after success
            if (isLoggedIn()) {
                // optional: backend cart clear endpoint (if you have it)
            } else {
                localStorage.removeItem('ctg_cart');
            }

            setCheckoutError(form, 'Order placed successfully! Redirecting…', 'success');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (err) {
            setCheckoutError(form, err.message || 'Failed to place order. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        }
    });
}

document.addEventListener('DOMContentLoaded', initCheckoutPage);
