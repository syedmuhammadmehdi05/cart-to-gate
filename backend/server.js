const crypto = require("crypto");
global.crypto = crypto;

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

// ===== IMPORTS (ALL TOGETHER) =====
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const connectDB = require("./config/db");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cors());

// ===== DB =====
connectDB();

// ===== STATIC FILES (serves frontend CSS/JS/images) =====
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== API ROUTES (MUST COME BEFORE THE WILDCARD) =====
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
    res.send("Server is running");
});

// ===== CATCH-ALL WILDCARD (MUST BE LAST - sends index.html for all other routes) =====
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});