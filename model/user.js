const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    verified: {
        type: Boolean,
        default: false
    },
    likes:[
        {
            type: String
        }
    ],
    cart:[
        {
            type: String
        }
    ]
});

module.exports = mongoose.model('User', userSchema);