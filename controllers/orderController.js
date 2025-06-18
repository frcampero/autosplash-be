const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { recalculateOrderStatus } = require("../utils/orderUtils");

//Create a new order
const createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    const saveOrder = await order.save();
    res.status(201).json(saveOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//Get all orders
const getOrders = async (req, res) => {
  try {
    const {
      status,
      priority,
      customerId,
      from,
      to,
      limit = 20,
      skip = 0,
    } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (customerId) filters.customerId = customerId;

    if (from || to) {
      filters.createdAt = {};
      if (from) filters.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filters.createdAt.$lte = toDate;
      }
    }

    const orders = await Order.find(filters)
      .populate("customerId")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Order.countDocuments(filters);

    res.json({
      total,
      results: orders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Update order status
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "La orden no funciona" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

//Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId");
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order); //Include intern note with all fields
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Update internal note
const updateOrderNote = async (req, res) => {
  const { note } = req.body;

  try {
    const updateOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { note },
      { new: true }
    );

    if (!updateOrder) return res.status(404).json({ error: "Order not found" });

    res.json({
      message: "Note update successfully",
      order: updateOrder,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today },
    });

    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const payments = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      totalOrders,
      todayOrders,
      ordersByStatus,
      totalRevenue: payments[0]?.totalRevenue || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Delete Order
const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Check if there are payments for this order
    const hasPayments = await Payment.exists({ orderId });
    if (hasPayments) {
      return res.status(400).json({
        error: "No se puede eliminar la orden porque tiene pagos asociados",
      });
    }

    // If you have no payments, delete the order
    const deleted = await Order.findByIdAndDelete(orderId);
    if (!deleted) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    res.json({ message: "Orden eliminada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Multiple Fields of an Order
const updateOrder = async (req, res) => {
  try {
    const { status, paid, note, priority } = req.body;

    const updatedFields = {};
    if (status) updatedFields.status = status;
    if (paid !== undefined) updatedFields.paid = paid;
    if (note !== undefined) updatedFields.note = note;
    if (priority) updatedFields.priority = priority;

    const orderBefore = await Order.findById(req.params.id);
    if (!orderBefore)
      return res.status(404).json({ error: "Orden no encontrada" });

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    // Si cambió el valor de paid, registrar un nuevo pago
    if (paid !== undefined && paid !== orderBefore.paid) {
      const Payment = require("../models/Payment"); // asegurate de tenerlo importado
      await Payment.create({
        orderId: updatedOrder._id,
        amount: paid - orderBefore.paid,
        method: "Efectivo", // o podrías dejarlo configurable
      });
    }

    // Recalcular estado si cambia el pago
    if (paid !== undefined) {
      await recalculateOrderStatus(updatedOrder._id);
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getDelayedOrders = async (req, res) => {
  try {
    const diasLimite = 1;
    const limiteFecha = new Date();
    limiteFecha.setDate(limiteFecha.getDate() - diasLimite);

    const atrasadas = await Order.aggregate([
      {
        $match: {
          createdAt: { $lte: limiteFecha },
          status: { $nin: ["Completado", "Entregado"] }
        }
      },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "cliente"
        }
      },
      { $unwind: "$cliente" },
      {
        $project: {
          nombre: {
            $concat: ["$cliente.firstName", " ", "$cliente.lastName"]
          },
          estado: "$status",
          fecha: "$createdAt"
        }
      },
      { $sort: { createdAt: 1 } }
    ]);

    res.json(atrasadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  getOrderById,
  updateOrderNote,
  getOrderStats,
  deleteOrder,
  updateOrder,
  getDelayedOrders,
};
