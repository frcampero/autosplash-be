const express = require("express");
const router = express.Router();
const {
  getPrices,
  createPrice,
  updatePrice,
  deletePrice,
} = require("../controllers/priceController");
const verifyToken = require("../middleware/authMiddleware"); // Asumo que quieres proteger estas rutas

// Rutas públicas (si las necesitas)
router.get("/", getPrices);

// Rutas protegidas
router.post("/", verifyToken, createPrice);
router.put("/:id", verifyToken, updatePrice);
router.delete("/:id", verifyToken, deletePrice);

module.exports = router;