const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");
  } catch (err) {
    console.error("❌ Error al conectar a MongoDB:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
