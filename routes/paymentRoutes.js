const express = require("express");
const router = express.Router();

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getPaymentStats,
  exportPaymentsToExcel,
} = require("../controllers/paymentController");

const verifyToken = require("../middleware/authMiddleware");
const validatePayment = require('../middleware/paymentValidator');
const handleValidation = require('../middleware/handleValidation');

// Reports
router.get("/stats", verifyToken, getPaymentStats);
router.get("/export", verifyToken, exportPaymentsToExcel);

// CRUD
router.post("/", verifyToken, validatePayment, handleValidation, createPayment);
router.get("/", verifyToken, getPayments);
router.get("/:id", verifyToken, getPaymentById);
router.put("/:id", verifyToken, updatePayment);
router.delete("/:id", verifyToken, deletePayment);

module.exports = router;
