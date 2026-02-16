const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');

const InvoiceItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
  sku: { type: String, required: true },
  productName: { type: String }, // Lưu để in phiếu
  brand: { type: String },       // Snapshot từ Product
  originCountry: { type: String }, // Snapshot từ Product
  unit: { type: String },        // Snapshot từ Variant
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  rowTotal: { type: Number, required: true }, // Thành tiền sau CK của dòng này

  // TRƯỜNG MỚI: QR Code riêng cho sản phẩm trong phiếu này
  itemQrCode: { type: String }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceCode: { type: String, unique: true, index: true },

  // Thông tin Công ty (Snapshot từ Active Company để tạo QR)
  companyInfo: {
    name: String,
    address: String,
    phone: String,
    taxCode: String
  },

  // Thông tin Khách hàng (Snapshot để lưu vĩnh viễn)
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerPhone: { type: String },
  customerAddress: { type: String },
  customerTaxCode: { type: String },

  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  staffName: { type: String },

  items: [InvoiceItemSchema],

  totalQuantity: { type: Number, required: true },
  subTotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  paymentMethod: { type: String, enum: ['CASH', 'TRANSFER', 'DEBT'], default: 'CASH' },
  note: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = invoiceConnection.model('Invoice', InvoiceSchema);