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

// ===== CATCH-ALL WILDCARD (sends index.html for any unmatched route) =====
app.get('/*', (req, res) => {
    const filePath = path.join(__dirname, '../frontend/index.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err.message);
            res.status(404).send('Not Found');
        }
    });
});

// ===== ERROR HANDLER (catch all errors) =====
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).send('Internal Server Error');
});

// ===== KEEP-ALIVE: prevents event loop from emptying =====
setInterval(() => {
    console.log("⏳ Keep-alive ping");
}, 30000);

// Extra interval to ensure event loop stays busy (every second)
setInterval(() => {
    // do nothing – just keep the loop alive
}, 1000);

// ===== IGNORE TERMINATION SIGNALS (Railway sends SIGTERM) =====
process.on('SIGTERM', () => {
    console.log('Received SIGTERM – ignoring it to keep container alive');
    // Do NOT call process.exit()
});

process.on('SIGINT', () => {
    console.log('Received SIGINT – ignoring it');
    // Do NOT call process.exit()
});

// ===== ERROR HANDLERS (log but do NOT exit) =====
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
});

// ===== START SERVER AFTER DATABASE CONNECTION =====
const startServer = async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        // Exit only on fatal error – Railway will restart
        process.exit(1);
    }
};

startServer();