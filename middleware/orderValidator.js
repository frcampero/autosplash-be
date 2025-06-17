// middleware/orderValidator.js
const { body } = require("express-validator");

const validateOrder = [
  body("customerId")
    .notEmpty()
    .withMessage("Customer ID is required"),

  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 3 })
    .withMessage("Description must be at least 3 characters"),

  body("status")
    .isIn(["Recibido", "En progreso", "Completado", "Entregado"])
    .withMessage("Status must be Recibido, En progreso, Completado or Entregado"),

  body("priority")
    .isIn(["Standard", "Express", "Delicado"])
    .withMessage("Priority must be Standard, Express or Delicado"),

  body("total")
    .isFloat({ gt: 0 })
    .withMessage("Total must be a number greater than 0"),
];

module.exports = validateOrder;
