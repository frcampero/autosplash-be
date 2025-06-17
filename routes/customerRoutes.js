const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');

const verifyToken = require('../middleware/authMiddleware');
const validateCustomer = require('../middleware/customerValidator');
const handleValidation = require('../middleware/handleValidation');

router.post('/', verifyToken, validateCustomer, handleValidation, createCustomer);
router.get('/', verifyToken, getCustomers);
router.get('/:id', verifyToken, getCustomerById);
router.put('/:id', verifyToken, updateCustomer);
router.delete('/:id', verifyToken, deleteCustomer);

module.exports = router;