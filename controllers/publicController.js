const Order = require("../models/Order");
const Payment = require("../models/Payment");
const logger = require("../utils/logger");

const getPublicOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId");
    if (!order) {
      logger.warn(`Orden no encontrada: ID ${req.params.id}`);
      return res.status(404).json({ error: "Order not found" });
    }

    const payments = await Payment.find({ orderId: order._id });

    logger.info(`Orden pública consultada: ID ${order._id}`);

    res.json({
      order: {
        _id: order._id,
        description: order.description,
        status: order.status,
        priority: order.priority,
        total: order.total,
        createdAt: order.createdAt,
      },
      customer: {
        firstName: order.customerId.firstName,
        lastName: order.customerId.lastName,
      },
      payments: payments.map((p) => ({
        amount: p.amount,
        method: p.method,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    logger.error(`Error al obtener orden pública (ID ${req.params.id}): ${err.message}`);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { getPublicOrder };