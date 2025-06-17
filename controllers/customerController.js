const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address } = req.body;

    const newCustomer = new Customer({ firstName, lastName, phone, email, address });
    await newCustomer.save();

    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(updatedCustomer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;

    // Search if you have orders
    const hasOrders = await Order.exists({ customerId });
    if (hasOrders) {
      return res.status(400).json({
        error: 'No se puede eliminar el cliente porque tiene pedidos asociados'
      });
    }

    // Find out if you have payments
    const hasPayments = await Payment.exists({ customerId });
    if (hasPayments) {
      return res.status(400).json({
        error: 'No se puede eliminar el cliente porque tiene pagos asociados'
      });
    }

    // If you have no orders or payments, delete
    const deleted = await Customer.findByIdAndDelete(customerId);
    if (!deleted) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};