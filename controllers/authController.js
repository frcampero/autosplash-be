const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const register = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("Intento de registro con email existente: %s", email);
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const user = new User({ email, password });
    await user.save();
    logger.info("Nuevo usuario registrado: %s", email);
    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    logger.error("❌ Error en registro: %o", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  logger.info("🔐 Intentando login con: %s", email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Usuario no encontrado: %s", email);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    logger.info("Resultado bcrypt.compare para %s: %s", email, isMatch);

    if (!isMatch) {
      logger.warn("Contraseña incorrecta para %s", email);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 12,
    });

    logger.info("✅ Login exitoso para %s", email);
    res.json({ success: true });
  } catch (err) {
    logger.error("❌ Error en login: %o", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

const logout = (req, res) => {
  res.clearCookie("token");
  logger.info("🔒 Logout realizado");
  res.json({ success: true });
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      logger.warn("Usuario no encontrado en /me con ID: %s", req.user.userId);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    logger.info("📄 Datos del usuario recuperados: %s", user.email);
    res.json(user);
  } catch (err) {
    logger.error("❌ Error en /me: %o", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

module.exports = { register, login, logout, me };