const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ➜ Place Order
const placeOrder = async (req, res) => {
    try {

        const userId = req.user._id;

        const cart = await Cart.findOne({ user: userId })
            .populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        let totalPrice = 0;

        // ===== CHECK STOCK =====
        for (const item of cart.items) {

            const product = await Product.findById(item.product._id);

            if (!product) {
                return res.status(404).json({
                    message: `${item.product.name} not found`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Only ${product.stock} ${product.name} remaining in stock`
                });
            }

            totalPrice += product.price * item.quantity;
        }

        // ===== CREATE ORDER =====
        const order = await Order.create({
            user: userId,

            products: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity
            })),

            totalPrice
        });

        // ===== REDUCE STOCK =====
        for (const item of cart.items) {

            await Product.findByIdAndUpdate(
                item.product._id,
                {
                    $inc: {
                        stock: -item.quantity
                    }
                }
            );
        }

        // ===== CLEAR CART =====
        cart.items = [];

        await cart.save();

        res.status(201).json(order);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

// ➜ Get All Orders (Admin)
const getAllOrders = async (req, res) => {

    try {

        const orders = await Order.find()
            .populate("user", "name email")
            .populate("products.product", "name price");

        res.json(orders);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

// ➜ Get User Orders
const getOrders = async (req, res) => {

    try {

        const orders = await Order.find({
            user: req.user._id
        }).populate("products.product");

        res.json(orders);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

// ➜ Update Order Status
const updateOrderStatus = async (req, res) => {

    try {

        const { status } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {

            return res.status(404).json({
                message: "Order not found"
            });

        }

        order.status = status || order.status;

        await order.save();

        res.json({
            message: "Order status updated",
            order
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

module.exports = {
    placeOrder,
    getOrders,
    getAllOrders,
    updateOrderStatus
};