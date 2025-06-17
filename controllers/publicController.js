const Order = require("../models/Order");
const Payment = require("../models/Payment");

const getPublicOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId");
    if (!order) return res.status(404).json({ error: "Order not found" });

    const payments = await Payment.find({ orderId: order._id });

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
        // Puedes agregar más campos si querés que el cliente los vea
      },
      payments: payments.map((p) => ({
        amount: p.amount,
        method: p.method,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPublicOrder };
