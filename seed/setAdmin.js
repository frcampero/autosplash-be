require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const email = process.argv[2];
if (!email) {
  console.error("Uso: node seed/setAdmin.js <email>");
  console.error("Ejemplo: node seed/setAdmin.js tu@email.com");
  process.exit(1);
}

async function setAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a MongoDB");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error("No se encontró ningún usuario con el email:", email);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();
    console.log("Rol actualizado a admin para:", user.email);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setAdmin();
