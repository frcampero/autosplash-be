const mongoose = require("mongoose");

const PriceItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ["por_prenda", "fijo"], required: true },
  points: { type: Number },
  price: { type: Number, required: true },
});

module.exports = mongoose.model("PriceItem", PriceItemSchema);