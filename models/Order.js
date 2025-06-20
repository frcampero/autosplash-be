const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['Recibido', 'En progreso', 'Completado', 'Entregado']
    },
    priority: {
      type: String,
      enum: ['Standard', 'Express', 'Delicado'],
      default: 'Standard'
    },
    total: {
      type: Number,
      default: 0
    },
    paid: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      default: '',
      trim: true
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model('Order', OrderSchema);
