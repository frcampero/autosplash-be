const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema( {
    firstName: {
        type:String,
        require:true,
        trim:true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim:true
    },
    email: {
        type: String,
        required: false,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Customer', CustomerSchema);