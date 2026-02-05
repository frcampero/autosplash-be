const User = require("../models/User");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const ROLES = ["admin", "editor"];

const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / limit) || 1;
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      results: users,
      currentPage: page,
      totalPages,
      totalUsers: total,
    });
  } catch (err) {
    logger.error("Error al listar usuarios: %o", err);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
};

const getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const data = user.toObject ? user.toObject() : user;
    if (!data.role) data.role = "editor";
    res.json(data);
  } catch (err) {
    logger.error("Error al obtener usuario: %o", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

const create = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, avatarUrl } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "Faltan campos requeridos: firstName, lastName, email, password",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const userRole = role && ROLES.includes(role) ? role : "editor";
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      avatarUrl: avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : undefined,
    });
    await user.save();

    const data = user.toObject();
    delete data.password;
    if (!data.role) data.role = "editor";
    logger.info("Usuario creado: %s (%s)", data.email, data.role);
    res.status(201).json(data);
  } catch (err) {
    logger.error("Error al crear usuario: %o", err);
    res.status(500).json({ error: err.message || "Error al crear usuario" });
  }
};

const update = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, avatarUrl } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (email !== undefined) {
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== user.email) {
        const existing = await User.findOne({ email: emailLower });
        if (existing) {
          return res.status(400).json({ error: "El email ya está en uso" });
        }
        user.email = emailLower;
      }
    }
    if (role !== undefined && ROLES.includes(role)) user.role = role;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : null;
    if (password !== undefined && password !== "") {
      user.password = password;
    }

    await user.save();
    const data = user.toObject();
    delete data.password;
    if (!data.role) data.role = "editor";
    logger.info("Usuario actualizado: %s", data.email);
    res.json(data);
  } catch (err) {
    logger.error("Error al actualizar usuario: %o", err);
    res.status(500).json({ error: err.message || "Error al actualizar usuario" });
  }
};

const remove = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user.userId;
    if (userId === currentUserId) {
      return res.status(400).json({ error: "No podés eliminarte a vos mismo" });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    logger.info("Usuario eliminado: %s", user.email);
    res.json({ success: true });
  } catch (err) {
    logger.error("Error al eliminar usuario: %o", err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

module.exports = { list, getById, create, update, remove };
