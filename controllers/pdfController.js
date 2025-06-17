const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const path = require("path"); // necesario para ruta local del logo

const generateOrderPdf = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId");
    if (!order) return res.status(404).json({ error: "Order not found" });

    const payments = await Payment.find({ orderId: order._id });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = order.total - totalPaid;

    const trackingUrl = `http://localhost:5173/orders/${order._id}`;
    const qrDataURL = await QRCode.toDataURL(trackingUrl);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=order_${order._id}.pdf`
    );
    doc.pipe(res);

    // Encabezado
    doc.fontSize(18).text("Lavandería Autosplash", { align: "center" });
    doc.moveDown();

    // Info del pedido
    doc.fontSize(12).text(`Ticket Nº: ${order._id}`);
    doc.text(
      `Cliente: ${order.customerId.firstName} ${order.customerId.lastName}`
    );
    doc.text(`Teléfono: ${order.customerId.phone}`);
    doc.text(`Email: ${order.customerId.email}`);
    doc.text(`Dirección: ${order.customerId.address}`);
    doc.moveDown();

    doc.text(`Descripción: ${order.description}`);
    doc.text(`Prioridad: ${order.priority}`);
    doc.text(
      `Fecha de creación: ${new Date(order.createdAt).toLocaleDateString()}`
    );
    doc.moveDown();

    // Pagos
    doc.font("Helvetica-Bold").text("Pagos realizados:");
    doc.font("Helvetica");

    if (payments.length === 0) {
      doc.text("No hay pagos registrados.");
    } else {
      payments.forEach((p, i) => {
        doc.text(
          `${i + 1}. $${p.amount} - Método: ${p.method} - Fecha: ${new Date(
            p.createdAt
          ).toLocaleDateString()}`
        );
      });
    }

    doc.moveDown();
    doc.text(`Total del pedido: $${order.total}`);
    doc.text(`Total abonado: $${totalPaid}`);
    doc.text(`Saldo pendiente: $${balance}`);
    doc.moveDown();

    // QR y link
    doc.image(qrDataURL, {
      fit: [100, 100],
      align: "center",
    });

    doc.moveDown();
    doc
      .fontSize(10)
      .text("Escaneá el código QR para ver el estado del pedido", {
        align: "center",
      });

    doc.moveDown();
    doc.fillColor("blue").text(trackingUrl, {
      align: "center",
      link: trackingUrl,
      underline: true,
    });

    // Pie de página con logo
    const logoPath = path.join(
      __dirname,
      "../assets/imagotipo claro + frase.png"
    );
    doc.image(logoPath, doc.page.width / 2 - 100, doc.page.height - 100, {
      fit: [200, 50],
      align: "center",
      valign: "bottom",
    });

    doc.end();
  } catch (err) {
    console.error("Error generando PDF:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "No se pudo generar el comprobante" });
    }
  }
};

module.exports = { generateOrderPdf };
