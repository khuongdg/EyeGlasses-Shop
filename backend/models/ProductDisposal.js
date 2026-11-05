const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../database/tenantManager');

const ProductDisposalSchema = new mongoose.Schema({
    disposalCode: { type: String, unique: true }, // PHK/YYMMDD/XXXX
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    staffName: String, // Snapshot tên nhân viên

    companyInfo: {
        name: String,
        phone: String,
        address: String,
        email: String,
        taxCode: String
    },

    reason: { type: String, required: true, trim: true }, // Lý do hủy

    // Danh sách sản phẩm hủy
    items: [{
        variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
        sku: String,
        productName: String,
        colorCode: String,
        brand: String,
        unit: String,
        price: Number,
        quantity: { type: Number, required: true, min: 1 } // Số lượng hủy
    }],

    totalQuantity: { type: Number, default: 0 }, // Tổng số lượng hủy
    note: String,
    isActive: { type: Boolean, default: true } // true: Hợp lệ/Hoạt động, false: Đã xóa (hoàn lại kho)
}, { timestamps: true });

module.exports = createTenantModelProxy('ProductDisposal', ProductDisposalSchema);

