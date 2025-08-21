const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

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
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PriceItem",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
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
    deliveryType: {
      type: String,
      enum: ["estándar", "urgente"],
      default: "estándar",
    },
    careLevel: {
      type: String,
      enum: ["normal", "delicado"],
      default: "normal",
    },
  },
  { timestamps: true }
);

OrderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Order", OrderSchema);