const PriceItem = require("../models/PriceItem");
const logger = require("../utils/logger");

// Obtener todos los precios
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

// Crear un nuevo precio
const createPrice = async (req, res) => {
  const { name, type, points, price } = req.body;

  if (!name || !type || price === undefined) {
    logger.warn("Faltan datos requeridos al crear precio");
    return res
      .status(400)
      .json({ error: "Nombre, tipo y precio son obligatorios." });
  }

  try {
    const newItem = new PriceItem({ name, type, points, price });
    await newItem.save();
    logger.info(`Nuevo precio creado: ${name}`);
    res.status(201).json(newItem);
  } catch (err) {
    logger.error(`Error al crear precio: ${err.message}`);
    res.status(500).json({ error: "Error al guardar el precio" });
  }
};

// Actualizar un precio existente por ID
const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    // Asegúrate de que el tipo también se pueda actualizar
    const { name, price, points, type } = req.body;

    const updated = await PriceItem.findByIdAndUpdate(
      id,
      { name, price, points, type },
      { new: true }
    );

    if (!updated) {
      logger.warn(`Intento de actualizar precio no encontrado: ID ${id}`);
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    logger.info(`Precio actualizado por ID: ${id}`);
    res.json(updated);
  } catch (err) {
    logger.error(
      `Error al actualizar precio (ID ${req.params.id}): ${err.message}`
    );
    res.status(500).json({ error: "Error al actualizar precio" });
  }
};

// Eliminar un precio por ID
const deletePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PriceItem.findByIdAndDelete(id);

    if (!deleted) {
      logger.warn(`Intento de eliminar precio no encontrado: ID ${id}`);
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    logger.info(`Precio eliminado: ID ${id}, Nombre: ${deleted.name}`);
    res.json({ message: "Precio eliminado correctamente" });
  } catch (err) {
    logger.error(
      `Error al eliminar precio (ID ${req.params.id}): ${err.message}`
    );
    res.status(500).json({ error: "Error al eliminar el precio" });
  }
};

module.exports = {
  getPrices,
  createPrice,
  updatePrice,
  deletePrice,
};