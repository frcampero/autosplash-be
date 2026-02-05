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

    const token = jwt.sign(
      { userId: user._id, role: user.role || "editor" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 1000 * 60 * 60 * 12,
    });

    logger.info("✅ Login exitoso para %s", email);
    res.json({ success: true, token });
  } catch (err) {
    logger.error("❌ Error en login: %o", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
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
    const data = user.toObject();
    if (!data.role) data.role = "editor";
    logger.info("📄 Datos del usuario recuperados: %s", user.email);
    res.json(data);
  } catch (err) {
    logger.error("❌ Error en /me: %o", err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const { firstName, lastName, avatarUrl } = req.body;

    if (firstName !== undefined) {
      const v = String(firstName).trim();
      if (!v) return res.status(400).json({ error: "El nombre no puede estar vacío" });
      user.firstName = v;
    }
    if (lastName !== undefined) {
      const v = String(lastName).trim();
      if (!v) return res.status(400).json({ error: "El apellido no puede estar vacío" });
      user.lastName = v;
    }
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : null;
    }

    await user.save();
    const data = user.toObject();
    delete data.password;
    if (!data.role) data.role = "editor";
    logger.info("Perfil actualizado: %s", user.email);
    res.json(data);
  } catch (err) {
    logger.error("Error al actualizar perfil: %o", err);
    res.status(500).json({ error: err.message || "Error al actualizar perfil" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Debes indicar la contraseña actual y la nueva" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "La contraseña actual no es correcta" });
    }
    user.password = newPassword;
    await user.save();
    logger.info("Contraseña cambiada: %s", user.email);
    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    logger.error("Error al cambiar contraseña: %o", err);
    res.status(500).json({ error: err.message || "Error al cambiar contraseña" });
  }
};

module.exports = { register, login, logout, me, updateProfile, changePassword };
