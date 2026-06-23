const express = require("express");
const router = express.Router();

const { createProduct, getProducts, getProductById, updateProduct, deleteProduct } = require("../controllers/productController");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// Public route
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected routes (only logged-in users)
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;