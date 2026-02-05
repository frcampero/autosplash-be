const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autorizado" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Se requieren permisos de administrador" });
  }
  next();
};

module.exports = requireAdmin;
