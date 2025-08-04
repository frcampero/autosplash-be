const Order = require("../models/Order");
const Payment = require("../models/Payment");

const recalculatePaymentStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return;

  const payments = await Payment.find({ orderId });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  let newPaymentStatus = "Pendiente";
  if (totalPaid === 0) {
    newPaymentStatus = "Pendiente";
  } else if (totalPaid < order.total) {
    newPaymentStatus = "Parcial";
  } else {
    newPaymentStatus = "Pagado";
  }

  order.paid = totalPaid;
  order.paymentStatus = newPaymentStatus;

  await order.save();
};

module.exports = { recalculatePaymentStatus };
