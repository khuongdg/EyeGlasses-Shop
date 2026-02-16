const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');

const DebtSchema = new mongoose.Schema({
  // Liên kết đến phiếu xuất kho gốc
  invoiceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Invoice', 
    required: true 
  },
  // Thông tin khách hàng (Snapshot để truy vấn nhanh)
  customerName: String,
  customerPhone: String,
  
  totalAmount: { type: Number, required: true },    // Tổng nợ gốc
  paidAmount: { type: Number, default: 0 },        // Tổng đã trả
  remainingAmount: { type: Number, required: true }, // Còn lại
  
  // Trạng thái: UNPAID (Chưa trả), PARTIAL (Trả một phần), COMPLETED (Xong)
  status: { 
    type: String, 
    enum: ['UNPAID', 'PARTIAL', 'COMPLETED', 'CANCELLED'], 
    default: 'UNPAID' 
  },
  
  // Nhật ký các lần trả tiền
  paymentHistory: [
    {
      amount: Number,
      paymentDate: { type: Date, default: Date.now },
      note: String,
      staffName: String // Người thu tiền
    }
  ],
  note: String
}, { timestamps: true });

module.exports = invoiceConnection.model('Debt', DebtSchema);