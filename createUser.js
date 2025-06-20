require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    const existingUser = await User.findOne({ email: 'admin@autosplash.com' })
    if (existingUser) {
      process.exit()
    }

    const user = new User({
      email: 'editor.autosplash@gmail.com',
      password: 'admin123',
    })

    await user.save()
    process.exit()
  } catch (err) {
    console.error('❌ Error al crear usuario:', err)
    process.exit(1)
  }
}

createUser()
