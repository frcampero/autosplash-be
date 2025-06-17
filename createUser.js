// createUser.js

require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    // Verificamos si ya existe un usuario con ese email
    const existingUser = await User.findOne({ email: 'admin@autosplash.com' })
    if (existingUser) {
      console.log('ℹ️ El usuario ya existe')
      process.exit()
    }

    const user = new User({
      email: 'editor.autosplash@gmail.com',
      password: 'admin123',
    })

    await user.save()
    console.log('✅ Usuario admin creado correctamente')
    process.exit()
  } catch (err) {
    console.error('❌ Error al crear usuario:', err)
    process.exit(1)
  }
}

createUser()
