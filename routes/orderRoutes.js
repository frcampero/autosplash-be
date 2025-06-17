const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderNote,
  getOrderStats,
  deleteOrder,
  updateOrder
} = require('../controllers/orderController');

const verifyToken = require('../middleware/authMiddleware');
const validateOrder = require('../middleware/orderValidator');
const handleValidation = require('../middleware/handleValidation');

router.post('/', verifyToken, validateOrder, handleValidation, createOrder);
router.get('/stats/dashboard', verifyToken, getOrderStats);
router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.put('/:id/status', verifyToken, updateOrderStatus);
router.put('/:id/note', verifyToken, updateOrderNote);
router.delete('/:id', verifyToken, deleteOrder);
router.put('/:id', verifyToken, updateOrder);


module.exports = router;