const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const path = require("path");
const logger = require("../utils/logger");

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

const generateOrderPdf = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId");
    if (!order) {
      logger.warn(`Orden no encontrada para PDF: ID ${req.params.id}`);
      return res.status(404).json({ error: "Order not found" });
    }

    const payments = await Payment.find({ orderId: order._id });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = order.total - totalPaid;

    const trackingUrl = `${FRONTEND_BASE_URL}/lookup/${order._id}`;
    const qrDataURL = await QRCode.toDataURL(trackingUrl);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=order_${order._id}.pdf`
    );
    doc.pipe(res);

// Header
doc
  .fontSize(22)
  .fillColor("#2563eb") // azul corporativo
  .font("Helvetica-Bold")
  .text("Lavandería Autosplash", { align: "center" });
doc.moveDown(0.5);
doc
  .fontSize(12)
  .fillColor("black")
  .font("Helvetica")
  .text(`Ticket Nº: ${order.orderId}`, { align: "center" });
doc.moveDown(0.5);
doc
  .fontSize(10)
  .text(
    `Cliente: ${order.customerId.firstName} ${order.customerId.lastName}\nTeléfono: ${order.customerId.phone}\nEmail: ${order.customerId.email}\nDirección: ${order.customerId.address}`,
    { align: "center" }
  );
doc.moveDown();
doc
  .moveTo(40, doc.y)
  .lineTo(doc.page.width - 40, doc.y)
  .stroke("#2563eb");
doc.moveDown();

// Order info
doc
  .fontSize(12)
  .font("Helvetica-Bold")
  .fillColor("#2563eb")
  .text("Detalles del Pedido", { align: "left" });
doc.moveDown(0.5);
doc
  .fontSize(10)
  .fillColor("black")
  .font("Helvetica")
  .text(`Descripción: ${order.description}`);
doc.text(`Prioridad: ${order.priority}`);
doc.text(`Fecha de creación: ${new Date(order.createdAt).toLocaleDateString()}`);
doc.moveDown();
doc
  .moveTo(40, doc.y)
  .lineTo(doc.page.width - 40, doc.y)
  .stroke("#e5e7eb");
doc.moveDown();

// Payments table
doc
  .fontSize(12)
  .font("Helvetica-Bold")
  .fillColor("#2563eb")
  .text("Pagos realizados", { align: "left" });
doc.moveDown(0.5);

if (payments.length === 0) {
  doc.font("Helvetica").fillColor("black").text("No hay pagos registrados.");
} else {
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("black");
  doc.text("Monto      Método      Fecha");
  payments.forEach((p) => {
    doc.text(
      `$${p.amount.toFixed(2)}      ${p.method}      ${new Date(p.createdAt).toLocaleDateString()}`
    );
  });
}
doc.moveDown();
doc
  .moveTo(40, doc.y)
  .lineTo(doc.page.width - 40, doc.y)
  .stroke("#e5e7eb");
doc.moveDown();

// Totales
doc
  .fontSize(12)
  .font("Helvetica-Bold")
  .fillColor("black")
  .text(`Total del pedido: $${order.total}`, { align: "right" });
doc.text(`Total abonado: $${totalPaid}`, { align: "right" });
doc.text(`Saldo pendiente: $${balance}`, { align: "right" });
doc.moveDown();

// QR & link
doc.image(qrDataURL, {
  fit: [100, 100],
  align: "center",
});
doc.moveDown();
doc
  .fontSize(10)
  .fillColor("black")
  .text("Escaneá el código QR para ver el estado del pedido", { align: "center" });
doc.moveDown();
doc
  .fillColor("#2563eb")
  .font("Helvetica-Bold")
  .text(trackingUrl, { align: "center", link: trackingUrl, underline: true });
doc.moveDown();

    // Footer
    const logoPath = path.join(
      __dirname,
      "../assets/imagotipo claro + frase.png"
    );
    doc.image(logoPath, doc.page.width / 2 - 100, doc.page.height - 100, {
      fit: [200, 50],
      align: "center",
      valign: "bottom",
    });

    doc.moveDown(2);
    doc
      .fontSize(12)
      .fillColor("black")
      .text("¡Gracias por confiar en Autosplash!", {
        align: "center",
      });

    doc.end();

    logger.info(`Comprobante PDF generado: Orden ID ${order._id}`);
  } catch (err) {
    logger.error(`Error generando PDF para orden ID ${req.params.id}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "No se pudo generar el comprobante" });
    }
  }
};

module.exports = { generateOrderPdf };