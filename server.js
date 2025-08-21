const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const app = express();
app.set("trust proxy", 1);
const logger = require("./utils/logger");
const requestLogger = require("./middleware/requestLogger");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();

// CORS Config
const allowedOrigins = [
  "http://localhost:5173",
  "https://autosplash-fe.vercel.app",
  "https://autosplash-be-production-8f0a.up.railway.app",
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
app.use(mongoSanitize());


// Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

//Request Logger
app.use(requestLogger);


//Cookie parser
app.use(cookieParser());

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

app.get("/api/debug/cookies", (req, res) => {
  res.json({ cookies: req.cookies });
});

// MongoDB connection

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("✅ Connected to MongoDB"))
  .catch((err) => logger.error("❌ MongoDB connection error: %o", err));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info("🔗 Current URI: %s", process.env.MONGO_URI);
  logger.info(`🚀 Server running on port ${PORT}`);
});