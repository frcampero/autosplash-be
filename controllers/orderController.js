const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { recalculatePaymentStatus } = require("../utils/orderUtils");
const { nanoid } = require("nanoid");
const { getNextSequence } = require("../utils/counterUtils");
const { calculateTotal } = require("../utils/priceUtils");
const PriceItem = require("../models/PriceItem");
const logger = require("../utils/logger");
const Customer = require("../models/Customer"); 

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

// if (populatedItems.length === 0) {
//   logger.warn("Intento de crear orden sin ítems válidos");
//   return res
//     .status(400)
//     .json({ error: "Debe incluir al menos una prenda." });
// }

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
    logger.debug(err);
    res.status(400).json({
      error: err?.message || "Error desconocido",
      full: err?.errors || err,
    });
  }
};

//Get all orders
const getOrders = async (req, res) => {
  try {
    // 1. Extraer parámetros de la URL (query params)
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
    } = req.query;

    // 2. Construir el objeto de consulta para Mongoose
    const query = {};

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999); // Asegura que cubra todo el día
        query.createdAt.$lte = toDate;
      }
    }

    // Lógica para buscar por nombre de cliente
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const matchingCustomers = await Customer.find({
        $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
      }).select("_id");

      const customerIds = matchingCustomers.map((c) => c._id);
      query.customerId = { $in: customerIds };
    }

    // 3. Configurar las opciones de paginación
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 }, // Ordenar por más reciente
      populate: {
        path: "customerId",
        select: "firstName lastName phone",
      }, // Para traer datos del cliente
    };

    // 4. Usar el método .paginate()
    const result = await Order.paginate(query, options);

    logger.info(
      `Consulta de órdenes | Filtros: ${JSON.stringify(
        req.query
      )} | Total: ${result.totalDocs}`
    );

    // 5. Devolver el objeto completo con la paginación
    res.json(result);
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
    const order = await Order.findById(req.params.id)
      .populate("customerId")
      .populate("items.item"); // <--- ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ PRESENTE

    if (!order) {
      logger.warn(`Orden no encontrada: ID ${req.params.id}`);
      return res.status(404).json({ error: "Order not found" });
    }

    logger.info(`Orden consultada: ID ${req.params.id}`);
    res.json(order);
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
    // --- Fechas de referencia ---
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- Consultas en Paralelo para mayor eficiencia ---
    const [
      totalOrders,
      todayOrders,
      ordersByStatus,
      totalRevenueResult,
      revenueThisMonthResult,
      outstandingBalanceResult,
    ] = await Promise.all([
      // Total histórico de órdenes
      Order.countDocuments(),
      // Órdenes creadas hoy
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      // Conteo de órdenes por estado (para el gráfico de torta)
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Ingresos totales históricos
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Ingresos del mes actual
      Payment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Saldo pendiente de cobro
      Order.aggregate([
        { $match: { paymentStatus: { $in: ["Pendiente", "Parcial"] } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ["$total", "$paid"] } },
          },
        },
      ]),
    ]);

    // --- Procesar resultados ---
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const revenueThisMonth = revenueThisMonthResult[0]?.total || 0;
    const outstandingBalance = outstandingBalanceResult[0]?.total || 0;
    
    // Extraer el número de órdenes "En progreso" del resultado del gráfico
    const inProgressOrders =
      ordersByStatus.find((item) => item._id === "En progreso")?.count || 0;

    logger.info("Estadísticas de órdenes consultadas para el dashboard");

    res.json({
      // Datos para las tarjetas de KPIs
      totalRevenue,
      revenueThisMonth,
      outstandingBalance,
      inProgressOrders,
      // Datos para otros componentes del dashboard
      totalOrders,
      todayOrders,
      ordersByStatus, // Para el gráfico de torta
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
      // Reconstruir los ítems para obtener los precios actualizados
      const populatedItems = await Promise.all(
        items.map(async (i) => {
          // El frontend envía el ID en i.item
          const priceItem = await PriceItem.findById(i.item); 
          if (!priceItem) throw new Error(`Prenda no encontrada con ID: ${i.item}`);
          return { item: priceItem, quantity: i.quantity };
        })
      );

      updatedFields.items = items; // Guardamos los items con sus IDs como vienen
      updatedFields.total = calculateTotal(populatedItems); // Calculamos el total con los precios
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
    ).populate("items.item").populate("customerId"); // <-- AÑADIMOS ESTO

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
    const diasLimite = 3;
    const limiteFecha = new Date();
    limiteFecha.setDate(limiteFecha.getDate() - diasLimite);

    const matchQuery = {
      createdAt: { $lte: limiteFecha },
      status: { $nin: ["Completado", "Entregado"] },
    };

    // Primero, contamos el total de órdenes que cumplen el criterio
    const totalDelayedCount = await Order.countDocuments(matchQuery);

    // Luego, obtenemos la lista limitada de las 5 más antiguas
    const atrasadas = await Order.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: 1 } }, // Ordenar por más antiguas primero
      { $limit: 5 }, // Limitar a las 5 más críticas
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
    ]);

    logger.info(`Consulta de órdenes atrasadas. Total: ${totalDelayedCount}, mostrando: ${atrasadas.length}`);
    
    // Devolvemos un objeto con la lista y el conteo total
    res.json({
      orders: atrasadas,
      totalCount: totalDelayedCount,
    });

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

const getRevenueTrend = async (req, res) => {
  try {
    const days = 7; // Podemos hacerlo configurable en el futuro
    const trendData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const result = await Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: date,
              $lt: nextDay,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      trendData.push({
        date: date.toISOString().split("T")[0], // Formato YYYY-MM-DD
        revenue: result[0]?.total || 0,
      });
    }

    // La consulta devuelve los días en orden inverso, así que lo revertimos
    res.json(trendData.reverse());
    
  } catch (err) {
    logger.error(`Error al obtener tendencia de ingresos: ${err.message}`);
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
  getOrdersByCustomer,
  getOrderStats,
  getRevenueTrend
};
