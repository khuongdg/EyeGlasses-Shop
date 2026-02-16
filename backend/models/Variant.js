const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');

const VariantSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

        sku: { type: String, required: true, unique: true }, // Mã hàng
        colorCode: { type: String, required: true }, // Mã màu (hex)
        unit: { type: String, enum: ['Cây', 'Cái', 'Hộp'], required: true }, // Cây, Cái, Hộp
        price: { type: Number, required: true },
        inventory: { type: Number, default: 0 },

        qrCode: { type: String, unique: true },
        image: [String],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

VariantSchema.index(
    { productId: 1, sku: 1 },
    { unique: true }
);

module.exports = invoiceConnection.model('Variant', VariantSchema);
