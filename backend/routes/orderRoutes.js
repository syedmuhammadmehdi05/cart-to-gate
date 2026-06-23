const express = require("express");
const router = express.Router();
const adminOnly = require("../middleware/adminMiddleware");

const { placeOrder, getOrders, getAllOrders } = require("../controllers/orderController");
const protect = require("../middleware/authMiddleware");
const { updateOrderStatus } = require("../controllers/orderController");

// ➜ Place order (checkout)
router.post("/place", protect, placeOrder);

// ➜ Get user orders
router.get("/", protect, getOrders);

// ➜ Get all orders (admin)
router.get("/all", protect, adminOnly, getAllOrders);

// ➜ Get order status
router.put("/status/:id", protect, adminOnly, updateOrderStatus);

module.exports = router;