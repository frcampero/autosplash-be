const PriceItem = require("../models/PriceItem");
const logger = require("../utils/logger");

const getPrices = async (req, res) => {
  try {
    const prices = await PriceItem.find();
    logger.info("Listado de precios consultado");
    res.json(prices);
  } catch (err) {
    logger.error(`Error al obtener precios: ${err.message}`);
    res.status(500).json({ error: "Error al obtener precios" });
  }
};

const createOrUpdatePrice = async (req, res) => {
  const { name, type, points, price } = req.body;

  if (!name || !type || !price) {
    logger.warn("Faltan datos requeridos al crear o actualizar precio");
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    const existing = await PriceItem.findOne({ name });

    if (existing) {
      existing.type = type;
      existing.points = points;
      existing.price = price;
      await existing.save();
      logger.info(`Precio actualizado: ${name}`);
      return res.json({ message: "Precio actualizado", item: existing });
    }

    const newItem = new PriceItem({ name, type, points, price });
    await newItem.save();
    logger.info(`Nuevo precio creado: ${name}`);
    res.status(201).json({ message: "Precio creado", item: newItem });
  } catch (err) {
    logger.error(`Error al crear/actualizar precio: ${err.message}`);
    res.status(500).json({ error: "Error al guardar precio" });
  }
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
      logger.warn(`Intento de actualizar precio no encontrado: ID ${id}`);
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    logger.info(`Precio actualizado por ID: ${id}`);
    res.json(updated);
  } catch (err) {
    logger.error(`Error al actualizar precio (ID ${req.params.id}): ${err.message}`);
    res.status(500).json({ error: "Error al actualizar precio" });
  }
};

module.exports = {
  getPrices,
  createOrUpdatePrice,
  updatePrice,
};