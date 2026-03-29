const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        price: {
            type: Number,
            required: true,
            trim: true
        },
        category: {
            type: String,
            trim: true
        },
        isAvailable: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;