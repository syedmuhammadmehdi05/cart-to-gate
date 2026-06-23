const Cart = require("../models/Cart");

// ➜ Add to Cart
const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, quantity } = req.body;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = await Cart.create({
                user: userId,
                items: [{ product: productId, quantity }]
            });
        } else {
            const itemIndex = cart.items.findIndex(
                item => item.product.toString() === productId
            );

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({ product: productId, quantity });
            }
        }

        await cart.save();

        res.json(cart);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// ➜ Get Cart
const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate("items.product");

        res.json(cart);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = { addToCart, getCart };