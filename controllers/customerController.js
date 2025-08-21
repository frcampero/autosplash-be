const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const logger = require("../utils/logger");

// Create customer
const createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address } = req.body;
    const newCustomer = new Customer({
      firstName,
      lastName,
      phone,
      email,
      address,
    });
    await newCustomer.save();

    logger.info(`Cliente creado: ${firstName} ${lastName} (${email || phone || "sin contacto"})`);
    res.status(201).json(newCustomer);
  } catch (err) {
    logger.error(`Error al crear cliente: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const searchTerm = req.query.search || '';
    let query = {};

    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i'); // 'i' for case-insensitive
      query = {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phone: regex },
          { email: regex },
          { address: regex },
        ],
      };
    }

    const totalCustomers = await Customer.countDocuments(query);
    const totalPages = Math.ceil(totalCustomers / limit);

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(`Clientes consultados. Página: ${page}, Límite: ${limit}, Total: ${totalCustomers}`);
    res.json({
      results: customers,
      currentPage: page,
      totalPages,
      totalCustomers,
    });
  } catch (err) {
    logger.error(`Error al obtener clientes: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      logger.warn(`Cliente no encontrado: ID ${req.params.id}`);
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    logger.info(`Cliente consultado: ID ${req.params.id}`);
    res.json(customer);
  } catch (err) {
    logger.error(`Error al obtener cliente (ID ${req.params.id}): ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      logger.warn(`Cliente no encontrado al intentar actualizar: ID ${req.params.id}`);
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    logger.info(`Cliente actualizado: ID ${req.params.id}`);
    res.json(updatedCustomer);
  } catch (err) {
    logger.error(`Error al actualizar cliente (ID ${req.params.id}): ${err.message}`);
    res.status(400).json({ error: err.message });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;

    const hasOrders = await Order.exists({ customerId });
    if (hasOrders) {
      logger.warn(`No se puede eliminar cliente con pedidos: ID ${customerId}`);
      return res.status(400).json({
        error: "No se puede eliminar el cliente porque tiene pedidos asociados",
      });
    }

    const hasPayments = await Payment.exists({ customerId });
    if (hasPayments) {
      logger.warn(`No se puede eliminar cliente con pagos: ID ${customerId}`);
      return res.status(400).json({
        error: "No se puede eliminar el cliente porque tiene pagos asociados",
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      logger.warn(`Cliente no encontrado al intentar eliminar: ID ${customerId}`);
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    await customer.deleteOne();
    logger.info(`Cliente eliminado correctamente: ID ${customerId}`);
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    logger.error(`Error al eliminar cliente (ID ${req.params.id}): ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Customers with the most orders
const getTopCustomers = async (req, res) => {
  try {
    const top = await Payment.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      {
        $group: {
          _id: "$order.customerId",
          montoAbonado: { $sum: "$amount" },
          cantidadPagos: { $sum: 1 },
          ultimaFecha: { $max: "$createdAt" },
        },
      },
      { $sort: { montoAbonado: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "cliente",
        },
      },
      { $unwind: "$cliente" },
      {
        $project: {
          nombre: {
            $concat: ["$cliente.firstName", " ", "$cliente.lastName"],
          },
          montoAbonado: 1,
          cantidadPagos: 1,
          ultimaFecha: 1,
        },
      },
    ]);

    logger.info(`Consulta de clientes con más pagos: top ${top.length}`);
    res.json(top);
  } catch (err) {
    logger.error(`Error al obtener clientes destacados: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

const getCustomerStats = async (req, res) => {
  try {
    const customerId = req.params.id;
    const orders = await Order.find({ customerId });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((acc, t) => acc + (t.total || 0), 0);

    const lastOrderDate = orders.length
      ? orders.reduce(
          (latest, t) =>
            new Date(t.createdAt) > new Date(latest) ? t.createdAt : latest,
          orders[0].createdAt
        )
      : null;

    logger.info(`Estadísticas consultadas para cliente: ${customerId}`);
    res.json({ totalOrders, totalSpent, lastOrderDate });
  } catch (err) {
    logger.error(`Error al obtener estadísticas del cliente (${req.params.id}): ${err.message}`);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getTopCustomers,
  getCustomerStats
};
