const crypto = require("crypto");
const mongoose = require("mongoose");

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI is not defined in environment variables.");
        process.exit(1);
    }
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log("❌ Database connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;