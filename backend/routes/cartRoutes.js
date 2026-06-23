const express = require("express");
const router = express.Router();

const { addToCart, getCart } = require("../controllers/cartController");
const protect = require("../middleware/authMiddleware");

// ➜ Get user cart
router.get("/", protect, getCart);

// ➜ Add item to cart
router.post("/add", protect, addToCart);

module.exports = router;