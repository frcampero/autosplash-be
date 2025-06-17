const { body } = require('express-validator');

const validatePayment = [
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a number greater than 0'),

  body('method')
    .isIn(['Efectivo', 'Transferencia', 'Tarjeta de Credito', 'Tarjeta de debito'])
    .withMessage('Método de pago inválido'),

  body('orderId')
    .notEmpty().withMessage('Order ID is required'),
];

module.exports = validatePayment;