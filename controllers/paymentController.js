const Payment = require("../models/Payment");
const ExcelJS = require("exceljs");
const { recalculateOrderStatus } = require("../utils/orderUtils");

// Create Payment
const createPayment = async (req, res) => {
  console.log("Body recibido:", req.body);
  try {
    let { amount, method, orderId } = req.body;

    // Ensure that amount is a valid positive number
    const parsedAmount = parseFloat(
      String(amount).toString().replace(",", ".")
    );

    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      return res.status(400).json({ error: "Monto inválido o fuera de rango" });
    }

    amount = Math.abs(parsedAmount); // Forzamos a positivo por seguridad

    // Validar orderId
    if (!orderId || typeof orderId !== "string" || orderId.length !== 24) {
      return res.status(400).json({ error: "orderId inválido" });
    }

    console.log("Creando pago con:", { amount, method, orderId });

    const newPayment = new Payment({ amount, method, orderId });
    await newPayment.save();
    await recalculateOrderStatus(orderId);

    res.status(201).json(newPayment);
  } catch (err) {
    console.error("Error al guardar pago:", err);
    res.status(400).json({ error: err.message });
  }
};

// Get payment list
const getPayments = async (req, res) => {
  try {
    const { method, orderId, from, to, limit = 20, skip = 0 } = req.query;

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

    res.json({ total, results: payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get paid by ID
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("orderId");

    if (!payment) return res.status(404).json({ error: "Payment not found" });

    res.json(payment);
  } catch (err) {
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

    if (!updatedPayment)
      return res.status(404).json({ error: "Payment not found" });

    res.json(updatedPayment);
  } catch (err) {
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

    res.json({
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
      totalPayments: totalCount,
      totalAmount,
      paymentsByMethod: byMethod,
    });
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete payment
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    await Payment.findByIdAndDelete(req.params.id);
    await recalculateOrderStatus(payment.orderId);

    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
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
