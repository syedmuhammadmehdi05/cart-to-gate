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

// ===== IMPORTS =====
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const connectDB = require("./config/db");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cors());

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== API ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// ===== HEALTH CHECK (for Railway) =====
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
    res.send("Server is running");
});

// ===== CATCH-ALL WILDCARD =====
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== GLOBAL ERROR HANDLERS =====
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection:', reason);
});

// ===== START SERVER AFTER DB CONNECTION =====
const startServer = async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

        // Keep process alive (just in case)
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();