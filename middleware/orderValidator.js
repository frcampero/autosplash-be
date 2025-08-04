const { body } = require("express-validator");

const validateOrder = [
  body("customerId")
    .notEmpty()
    .withMessage("Customer ID is required"),

  body("description")
    .optional() // ← no obligatoria
    .isString()
    .isLength({ max: 500 })
    .withMessage("Description must be a string (máx 500 caracteres)"),

  body("status")
    .isIn(["Recibido", "En progreso", "Completado", "Entregado"])
    .withMessage("Estado inválido"),

  body("deliveryType")
    .isIn(["estándar", "urgente"])
    .withMessage("Tipo de entrega inválido"),

  body("careLevel")
    .isIn(["normal", "delicado"])
    .withMessage("Nivel de cuidado inválido"),

  body("total")
    .isFloat({ gt: 0 })
    .withMessage("Total debe ser mayor a 0"),

  body("paid")
    .isFloat({ min: 0 })
    .withMessage("Pago debe ser un número mayor o igual a 0"),

  body("method")
    .notEmpty()
    .withMessage("Método de pago es obligatorio"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("Debe incluir al menos una prenda"),
];

module.exports = validateOrder;