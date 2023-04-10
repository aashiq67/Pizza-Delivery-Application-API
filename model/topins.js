const mongoose = require('mongoose');

const topinsSchema = new mongoose.Schema({
    sauce:[
        {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    cheese:[
        {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    veggies:[
        {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ]
});

module.exports = mongoose.model('Topin', topinsSchema);