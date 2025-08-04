const rateLimit = require ("express-rate-limit");

const loginLimiter = rateLimit({
    windowsMs: 15 * 60 * 1000, 
    max: 5,
    message: {
        error: 'Demasiados intentos de login. Intentalo de nuevo en 15 minutos.'
    },
    StandardValidation: true,
    legacyHeaders: false,
})

module.exports = { loginLimiter }