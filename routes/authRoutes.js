const express = require('express');
const router = express.Router();
const { register, login, logout, me } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const { loginLimiter } = require ("../middleware/rateLimiter")

// Rutas públicas
router.post('/register', register);
router.post('/login', loginLimiter, login);

// Rutas protegidas
router.post('/logout', logout);
router.get('/me', verifyToken, me);

module.exports = router;