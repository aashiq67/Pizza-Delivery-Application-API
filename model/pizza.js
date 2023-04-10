const mongoose = require('mongoose');

const pizzaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    img: {
        type: String,
        required: true
    },
    veg: {
        type: Boolean,
        required: true
    }
});

module.exports = mongoose.model('Pizza', pizzaSchema);