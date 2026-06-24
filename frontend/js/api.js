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

// Request logger
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// ===== STATIC FILES (frontend) =====
app.use(express.static(path.join(__dirname, "../frontend")));

// ===== API ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// ===== ROOT ROUTE =====
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ===== CATCH-ALL ROUTE (Express 5) =====
app.get("/*splat", (req, res) => {
    const filePath = path.join(__dirname, "../frontend/index.html");

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error sending file:", err.message);
            res.status(404).send("Not Found");
        }
    });
});

// ===== EXPRESS ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error("Express error:", err);
    res.status(500).send("Internal Server Error");
});

// ===== PROCESS ERROR HANDLERS =====
process.on("uncaughtException", (err) => {
    console.error("💥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled Rejection:", reason);
});

// ===== START SERVER =====
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(
                `✅ Environment: ${process.env.NODE_ENV || "development"}`
            );
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
```
