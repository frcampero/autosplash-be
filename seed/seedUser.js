require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const DEMO_EMAIL = "editor.autosplash@gmail.com";
const DEMO_PASSWORD = "admin123";

async function seedUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado a MongoDB");

    let user = await User.findOne({ email: DEMO_EMAIL });
    if (user) {
      if (!user.role) {
        user.role = "admin";
        await user.save();
        console.log("Usuario actualizado con rol admin:", DEMO_EMAIL);
      } else {
        console.log("El usuario de prueba ya existe:", DEMO_EMAIL);
      }
      process.exit(0);
      return;
    }

    user = new User({
      firstName: "Editor",
      lastName: "Demo",
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: "admin",
    });
    await user.save();
    console.log("Usuario de prueba creado:", DEMO_EMAIL);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedUser();
