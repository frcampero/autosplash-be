const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderNote,
  getOrderStats,
  deleteOrder,
  updateOrder,
  getDelayedOrders,
  getOrdersByCustomer,
  getRevenueTrend
} = require("../controllers/orderController");

const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const Order = require("../models/Order");

const verifyToken = require("../middleware/authMiddleware");
const validateOrder = require("../middleware/orderValidator");
const handleValidation = require("../middleware/handleValidation");

router.get("/public/:orderId", async(req, res) => {
  try {
    const order = await Order.findOne({orderId: req.params.orderId});
    if (!order) return res.status(404).json({message: "Orden no encontrada"})

    const customer = await Customer.findById(order.customerId);
    const payments = await Payment.find({orderId: order._id})

  res.json({
    order,
    customer,
    payments
  })

  } catch (err) {
    console.error("Error al buscar orden publica", err)
    res.status(500).json({message:'Error al buscar la orden'})
  }
})

router.post("/", verifyToken, validateOrder, handleValidation, createOrder);
router.get("/stats/dashboard", verifyToken, getOrderStats);
router.get("/", verifyToken, getOrders);
router.get("/delayed", verifyToken, getDelayedOrders);
router.get("/customer/:id", verifyToken, getOrdersByCustomer);
router.get("/:id", verifyToken, getOrderById);
router.get("/stats/dashboard", verifyToken, getOrderStats);
router.get("/stats/revenue-trend", verifyToken, getRevenueTrend);
router.put("/:id/note", verifyToken, updateOrderNote);
router.delete("/:id", verifyToken, deleteOrder);

router.put("/:id", verifyToken, updateOrder);

module.exports = router;