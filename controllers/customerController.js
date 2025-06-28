const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;


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
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({ results: customers }); // ✅ estructura esperada por el frontend
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(customer);
  } catch (err) {
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

    if (!updatedCustomer)
      return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(updatedCustomer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;

    const hasOrders = await Order.exists({ customerId });
    if (hasOrders) {
      return res.status(400).json({
        error: "No se puede eliminar el cliente porque tiene pedidos asociados",
      });
    }

    const hasPayments = await Payment.exists({ customerId });
    if (hasPayments) {
      return res.status(400).json({
        error: "No se puede eliminar el cliente porque tiene pagos asociados",
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    await customer.deleteOne();
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
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
          as: "order"
        }
      },
      { $unwind: "$order" },
      {
        $group: {
          _id: "$order.customerId",
          montoAbonado: { $sum: "$amount" },
          cantidadPagos: { $sum: 1 },
          ultimaFecha: { $max: "$createdAt" }
        }
      },
      { $sort: { montoAbonado: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "cliente"
        }
      },
      { $unwind: "$cliente" },
      {
        $project: {
          nombre: {
            $concat: ["$cliente.firstName", " ", "$cliente.lastName"]
          },
          montoAbonado: 1,
          cantidadPagos: 1,
          ultimaFecha: 1
        }
      }
    ]);

    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getTopCustomers,
};
