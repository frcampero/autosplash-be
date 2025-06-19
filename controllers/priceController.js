// controllers/priceController.js
const PriceItem = require("../models/PriceItem");

const getPrices = async (req, res) => {
  const prices = await PriceItem.find();
  res.json(prices);
};

const createOrUpdatePrice = async (req, res) => {
  const { name, type, points, price } = req.body;

  if (!name || !type || !price) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const existing = await PriceItem.findOne({ name });
  if (existing) {
    existing.type = type;
    existing.points = points;
    existing.price = price;
    await existing.save();
    return res.json({ message: "Precio actualizado", item: existing });
  }

  const newItem = new PriceItem({ name, type, points, price });
  await newItem.save();
  res.status(201).json({ message: "Precio creado", item: newItem });
};

const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, points } = req.body;

    const updated = await PriceItem.findByIdAndUpdate(
      id,
      { name, price, points },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error al actualizar precio:", err);
    res.status(500).json({ error: "Error al actualizar precio" });
  }
};

module.exports = {
  getPrices,
  createOrUpdatePrice,
  updatePrice,
};
