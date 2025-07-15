const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getTopCustomers,
  getCustomerStats
} = require('../controllers/customerController');

const verifyToken = require('../middleware/authMiddleware');
const validateCustomer = require('../middleware/customerValidator');
const handleValidation = require('../middleware/handleValidation');

// Routes
router.post('/', verifyToken, validateCustomer, handleValidation, createCustomer);
router.get('/', verifyToken, getCustomers);
router.get('/top', verifyToken, getTopCustomers);

//Specific route placed before dynamic :id
router.get('/:id/stats', verifyToken, getCustomerStats);

// Dynamic routes
router.get('/:id', verifyToken, getCustomerById);
router.put('/:id', verifyToken, updateCustomer);
router.delete('/:id', verifyToken, deleteCustomer);

module.exports = router;
