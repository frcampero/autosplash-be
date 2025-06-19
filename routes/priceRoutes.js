const express = require("express");
const router = express.Router();
const { getPrices, updatePrice } = require("../controllers/priceController");

router.get("/", getPrices);
router.put("/:id", updatePrice); 
module.exports = router;