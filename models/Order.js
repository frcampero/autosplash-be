const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Recibido", "En progreso", "Completado", "Entregado"],
    },
    total: {
      type: Number,
      default: 0,
    },
    paid: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Pagado", "Pendiente", "Parcial"],
      default: "Pendiente",
    },
    deliveryType:{
      type: String,
      enum: ["estándar", "urgente"],
      default: "estándar"
    },
    careLevel: {
      type: String,
      enum: ["normal", "delicado"],
      default: "normal"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
