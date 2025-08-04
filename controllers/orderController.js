const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { recalculatePaymentStatus } = require("../utils/orderUtils");
const { nanoid } = require("nanoid");
const { getNextSequence } = require("../utils/counterUtils");
const { calculateTotal } = require("../utils/priceUtils");
const PriceItem = require("../models/PriceItem");
const logger = require("../utils/logger");

//Create a new order
const createOrder = async (req, res) => {
  try {
    const nextSeq = await getNextSequence("orders");
    const orderId = String(nextSeq).padStart(6, "0");

    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    // Reconstruir ítems desde la base
    const populatedItems = await Promise.all(
      rawItems.map(async ({ itemId, quantity }) => {
        const item = await PriceItem.findById(itemId);
        if (!item) throw new Error(`Item no encontrado con ID: ${itemId}`);
        return { item, quantity };
      })
    );

    logger.info(`Ítems con precio reconstruidos para nueva orden: ${JSON.stringify(populatedItems.map(i => ({ name: i.item.name, quantity: i.quantity })))}`);

    const total = calculateTotal(populatedItems);
    logger.info(`Total calculado para orden: $${total}`);

    const paid = parseFloat(req.body.paid) || 0;

    if (populatedItems.length === 0) {
      logger.warn("Intento de crear orden sin ítems válidos");
      return res
        .status(400)
        .json({ error: "Debe incluir al menos una prenda." });
    }

    logger.info(`Creando nueva orden con datos: ${JSON.stringify(req.body)}`);

    const order = new Order({
      ...req.body,
      orderId,
      items: populatedItems,
      total,
      paid,
    });

    const savedOrder = await order.save();
    logger.info(`Orden creada: ID ${savedOrder._id}, N° ${orderId}`);

    if (paid > 0) {
      await Payment.create({
        orderId: savedOrder._id,
        amount: paid,
        method: req.body.method || "Efectivo",
      });
      logger.info(`Pago inicial registrado: $${paid} para orden ${savedOrder._id}`);
    }

    res.status(201).json(savedOrder);
  } catch (err) {
    logger.error(`Error al crear orden: ${err.message}`);
    logger.debug(err); // Para ver todo el error en profundidad si se habilita el nivel `debug`
    res.status(400).json({
      error: err?.message || "Error desconocido",
      full: err?.errors || err,
    });
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

    logger.info(
      `Consulta de órdenes | Filtros: ${JSON.stringify(req.query)} | Total: ${total}`
    );

    res.json({
      total,
      results: orders,
    });
  } catch (err) {
    logger.error(`Error al obtener órdenes: ${err.message}`);
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

    if (!updated) {
      logger.warn(`Intento de actualizar orden inexistente: ID ${req.params.id}`);
      return res.status(404).json({ error: "La orden no funciona" });
    }

    logger.info(`Estado de orden actualizado: ID ${req.params.id}, nuevo estado: ${status}`);
    res.json(updated);
  } catch (err) {
    logger.error(`Error al actualizar estado de orden (ID ${req.params.id}): ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

//Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId");

    if (!order) {
      logger.warn(`Orden no encontrada: ID ${req.params.id}`);
      return res.status(404).json({ error: "Order not found" });
    }

    logger.info(`Orden consultada: ID ${req.params.id}`);
    res.json(order); //Incluye nota interna y todos los campos
  } catch (err) {
    logger.error(`Error al obtener orden (ID ${req.params.id}): ${err.message}`);
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

    if (!updateOrder) {
      logger.warn(`Intento de actualizar nota en orden inexistente: ID ${req.params.id}`);
      return res.status(404).json({ error: "Order not found" });
    }

    logger.info(`Nota interna actualizada para orden: ID ${req.params.id}`);
    res.json({
      message: "Note update successfully",
      order: updateOrder,
    });
  } catch (err) {
    logger.error(`Error al actualizar nota interna (ID ${req.params.id}): ${err.message}`);
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

    logger.info("Estadísticas de órdenes consultadas");

    res.json({
      totalOrders,
      todayOrders,
      ordersByStatus,
      totalRevenue: payments[0]?.totalRevenue || 0,
    });
  } catch (err) {
    logger.error(`Error al obtener estadísticas de órdenes: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

//Delete Order
const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const hasPayments = await Payment.exists({ orderId });
    if (hasPayments) {
      logger.warn(`No se puede eliminar la orden ${orderId} porque tiene pagos asociados`);
      return res.status(400).json({
        error: "No se puede eliminar la orden porque tiene pagos asociados",
      });
    }

    const deleted = await Order.findByIdAndDelete(orderId);
    if (!deleted) {
      logger.warn(`Intento de eliminar orden inexistente: ID ${orderId}`);
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    logger.info(`Orden eliminada correctamente: ID ${orderId}`);
    res.json({ message: "Orden eliminada correctamente" });
  } catch (err) {
    logger.error(`Error al eliminar orden (ID ${req.params.id}): ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
// Update Multiple Fields of an Order
const updateOrder = async (req, res) => {
  try {
    const { status, paid, note, priority, items } = req.body;

    const updatedFields = {};
    if (status) updatedFields.status = status;
    if (paid !== undefined) updatedFields.paid = paid;
    if (note !== undefined) updatedFields.note = note;
    if (priority) updatedFields.priority = priority;
    if (items) {
      updatedFields.items = items;
      updatedFields.total = calculateTotal(items);
    }

    const orderBefore = await Order.findById(req.params.id);
    if (!orderBefore) {
      logger.warn(`Intento de actualizar orden inexistente: ID ${req.params.id}`);
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    logger.info(`Orden actualizada: ID ${req.params.id} | Campos: ${JSON.stringify(Object.keys(updatedFields))}`);

    // Si se registró un nuevo pago
    if (paid !== undefined && paid > orderBefore.paid) {
      const amount = paid - orderBefore.paid;
      await Payment.create({
        orderId: updatedOrder._id,
        amount,
        method: req.body.method || "Efectivo",
      });
      logger.info(`Nuevo pago registrado por diferencia: $${amount} para orden ${updatedOrder._id}`);
    }

    // Recalcular estado si corresponde
    if (paid !== undefined || items) {
      await recalculatePaymentStatus(updatedOrder._id);
      logger.info(`Estado de pago recalculado para orden: ID ${updatedOrder._id}`);
    }

    res.json(updatedOrder);
  } catch (err) {
    logger.error(`Error al actualizar orden (ID ${req.params.id}): ${err.message}`);
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
          status: { $nin: ["Completado", "Entregado"] },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "cliente",
        },
      },
      { $unwind: "$cliente" },
      {
        $project: {
          _id: 1,
          nombre: {
            $concat: ["$cliente.firstName", " ", "$cliente.lastName"],
          },
          estado: "$status",
          fecha: "$createdAt",
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    logger.info(`Órdenes atrasadas consultadas. Total: ${atrasadas.length}`);
    res.json(atrasadas);
  } catch (err) {
    logger.error(`Error al obtener órdenes atrasadas: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const orders = await Order.find({ customerId }).sort({ createdAt: -1 });

    logger.info(`Órdenes consultadas para cliente: ${customerId} | Total: ${orders.length}`);
    res.json(orders);
  } catch (err) {
    logger.error(`Error al obtener órdenes para cliente ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: "Error al obtener tickets" });
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
  getOrdersByCustomer,
};
