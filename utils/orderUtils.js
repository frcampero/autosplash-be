const Order = require("../models/Order");
const Payment = require("../models/Payment");

const recalculateOrderStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return;

  const payments = await Payment.find({ orderId });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const newStatus = totalPaid >= order.total ? "Completado" : "En progreso";

  if (order.status !== newStatus) {
    order.status = newStatus;
    await order.save();
  }
};

module.exports = { recalculateOrderStatus };
