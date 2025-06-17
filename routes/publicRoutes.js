const express = require("express");
const router = express.Router();
const { getPublicOrder } = require("../controllers/publicController");

router.get("/orders/:id", getPublicOrder);

module.exports = router;
