const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');

const ImportReceiptSchema = new mongoose.Schema({
    importCode: { type: String, unique: true }, // PNK/YYMMDD/XXXX
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    staffName: String, // Snapshot tên nhân viên

    // Danh sách sản phẩm nhập
    items: [{
        variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
        sku: String,
        originCountry: String,
        quantity: { type: Number, required: true },
        importPrice: { type: Number, required: true }, // Giá vốn đợt này
        totalItemAmount: Number // quantity * importPrice
    }],

    totalQuantity: Number,
    totalAmount: Number, // Tổng tiền vốn bỏ ra nhập kho
    supplier: String,    // Tên nhà cung cấp (nếu có)
    note: String,
    isActive: { type: Boolean, default: true } // Cho phép hủy phiếu nhập nếu nhập sai
}, { timestamps: true });

module.exports = invoiceConnection.model('ImportReceipt', ImportReceiptSchema);