const { body } = require('express-validator');

const validateCustomer = [
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),

  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),

  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email address'),

  body('phone')
    .notEmpty().withMessage('Phone is required'),

  body('address')
    .notEmpty().withMessage('Address is required'),
];

module.exports = validateCustomer;
