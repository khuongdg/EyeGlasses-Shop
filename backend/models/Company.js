const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');

const CompanySchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true},
    phone: {type: String, required: true },
    taxCode: {type: String, trim: true},
    address: {type: String, trim: true},
    email: {type: String, trim: true},
    logo: { type: String },
    isActive: {type: Boolean, default: true}
  },
  { timestamps: true }
);

module.exports = invoiceConnection.model('Company', CompanySchema);
