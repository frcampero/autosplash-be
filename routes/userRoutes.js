const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");
const { list, getById, create, update, remove } = require("../controllers/userController");

router.use(verifyToken);
router.use(requireAdmin);

router.get("/", list);
router.get("/:id", getById);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

module.exports = router;
