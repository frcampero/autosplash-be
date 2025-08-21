const Payment = require("../models/Payment");
const ExcelJS = require("exceljs");
const { recalculatePaymentStatus } = require("../utils/orderUtils");
const logger = require("../utils/logger");
const Order = require("../models/Order");

// Create Payment
const createPayment = async (req, res) => {
  try {
    let { amount, method, orderId } = req.body;
    logger.info(`Intentando crear pago con datos: ${JSON.stringify(req.body)}`);

    // ... (toda tu lógica de validación se queda igual)
    const parsedAmount = parseFloat(String(amount).toString().replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      logger.warn(`Monto inválido: ${amount}`);
      return res.status(400).json({ error: "Monto inválido o fuera de rango" });
    }
    amount = Math.abs(parsedAmount);
    if (!orderId || typeof orderId !== "string" || orderId.length !== 24) {
      logger.warn(`orderId inválido: ${orderId}`);
      return res.status(400).json({ error: "orderId inválido" });
    }
    // ... (fin de la lógica de validación)

    const newPayment = new Payment({ amount, method, orderId });
    await newPayment.save();
    await recalculatePaymentStatus(orderId);

    // --- INICIO DEL CAMBIO ---
    // Buscamos la orden actualizada y la poblamos para devolverla al frontend
    const updatedOrder = await Order.findById(orderId)
      .populate("items.item")
      .populate("customerId");

    logger.info(`Pago creado exitosamente: $${amount}, método ${method}, orden ${orderId}`);
    
    // Devolvemos tanto el pago nuevo como la orden actualizada
    res.status(201).json({ payment: newPayment, order: updatedOrder });
    // --- FIN DEL CAMBIO ---

  } catch (err) {
    logger.error(`Error al guardar pago: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

// Get payment list
const getPayments = async (req, res) => {
  try {
    const { method, orderId, from, to, limit = 20, skip = 0 } = req.query;
    logger.info(`Consultando lista de pagos con filtros: ${JSON.stringify(req.query)}`);

    const filters = {};
    if (method) filters.method = method;
    if (orderId) filters.orderId = orderId;

    if (from || to) {
      filters.createdAt = {};
      if (from) filters.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filters.createdAt.$lte = toDate;
      }
    }

    const payments = await Payment.find(filters)
      .populate("orderId")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Payment.countDocuments(filters);

    logger.info(`Se encontraron ${payments.length} pagos (total: ${total})`);
    res.json({ total, results: payments });
  } catch (err) {
    logger.error(`Error al obtener pagos: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("orderId");

    if (!payment) {
      logger.warn(`Pago no encontrado: ID ${req.params.id}`);
      return res.status(404).json({ error: "Payment not found" });
    }

    logger.info(`Pago consultado: ID ${req.params.id}`);
    res.json(payment);
  } catch (err) {
    logger.error(`Error al obtener pago por ID (${req.params.id}): ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPayment) {
      logger.warn(`Intento de actualización fallido: pago no encontrado (ID ${req.params.id})`);
      return res.status(404).json({ error: "Payment not found" });
    }

    logger.info(`Pago actualizado: ID ${req.params.id}`);
    res.json(updatedPayment);
  } catch (err) {
    logger.error(`Error al actualizar pago (ID ${req.params.id}): ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

// Payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    to.setHours(23, 59, 59, 999);

    const payments = await Payment.find({
      createdAt: { $gte: from, $lte: to },
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalCount = payments.length;

    const byMethod = {};
    payments.forEach((p) => {
      byMethod[p.method] = (byMethod[p.method] || 0) + 1;
    });

    logger.info(`Estadísticas de pagos consultadas desde ${req.query.from} hasta ${req.query.to}`);
    res.json({
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
      totalPayments: totalCount,
      totalAmount,
      paymentsByMethod: byMethod,
    });
  } catch (err) {
    logger.error(`Error al obtener estadísticas de pagos: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Export payments to Excel
const exportPaymentsToExcel = async (req, res) => {
  try {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    to.setHours(23, 59, 59, 999);

    const payments = await Payment.find({
      createdAt: { $gte: from, $lte: to },
    }).populate("orderId");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payments");

    worksheet.columns = [
      { header: "Payment ID", key: "_id", width: 25 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Method", key: "method", width: 15 },
      { header: "Date", key: "createdAt", width: 20 },
      { header: "Order ID", key: "orderId", width: 25 },
    ];

    payments.forEach((p) => {
      worksheet.addRow({
        _id: p._id.toString(),
        amount: p.amount,
        method: p.method,
        createdAt: new Date(p.createdAt).toLocaleDateString(),
        orderId: p.orderId?._id?.toString() || "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payments_${req.query.from}_to_${req.query.to}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

    logger.info(`Pagos exportados a Excel: ${payments.length} registros desde ${req.query.from} hasta ${req.query.to}`);
  } catch (err) {
    logger.error(`Error al exportar pagos a Excel: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};


// Delete payment
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      logger.warn(`Intento de eliminar pago inexistente: ID ${req.params.id}`);
      return res.status(404).json({ error: "Payment not found" });
    }

    const orderId = payment.orderId; // Guardamos el ID de la orden antes de borrar
    await Payment.findByIdAndDelete(req.params.id);
    await recalculatePaymentStatus(orderId);

    // --- INICIO DEL CAMBIO ---
    // Buscamos la orden actualizada y la poblamos
    const updatedOrder = await Order.findById(orderId)
      .populate("items.item")
      .populate("customerId");

    logger.info(`Pago eliminado correctamente: ID ${req.params.id}, Orden: ${orderId}`);
    
    // Devolvemos un mensaje y la orden actualizada
    res.json({ message: "Payment deleted successfully", order: updatedOrder });
    // --- FIN DEL CAMBIO ---

  } catch (err) {
    logger.error(`Error al eliminar pago (ID ${req.params.id}): ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  getPaymentStats,
  exportPaymentsToExcel,
  deletePayment,
};