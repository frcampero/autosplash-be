const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS CONFIG
const allowedOrigins = [
  "http://localhost:5173",
  "https://autosplash-fe.vercel.app",
];

// Apply CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Middleware for JSON
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/pdf", require("./routes/pdfRoutes"));
app.use("/api/prices", require("./routes/priceRoutes"));

// Optional: health check route
app.get("/ping", (req, res) => {
  res.send("pong");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔗 Current URI:", process.env.MONGO_URI);
  console.log(`🚀 Server running on port ${PORT}`);
});
