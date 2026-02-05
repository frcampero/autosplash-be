const express = require('express');
const router = express.Router();
const { register, login, logout, me, updateProfile, changePassword } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const { loginLimiter } = require("../middleware/rateLimiter");

// Rutas públicas
router.post("/register", register);
router.post("/login", loginLimiter, login);

// Rutas protegidas
router.post("/logout", logout);
router.get("/me", verifyToken, me);
router.patch("/me", verifyToken, updateProfile);
router.post("/change-password", verifyToken, changePassword);

module.exports = router;