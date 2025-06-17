const express = require ('express');
const router = express.Router();
const { generateOrderPdf } = require('../controllers/pdfController');

router.get('/order/:id', generateOrderPdf);

module.exports = router;