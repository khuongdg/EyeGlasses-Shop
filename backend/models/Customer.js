const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../database/tenantManager');

const CustomerSchema = new mongoose.Schema(
  {
    customerCode: {type: String, index: true},
    name: {type: String, required: true, trim: true},
    phone: {type: String, required: true, index: true},
    taxCode: {type: String, trim: true},
    address: {type: String, trim: true},
    email: {type: String, trim: true},
    isActive: {type: Boolean, default: true}
  },
  { timestamps: true }
);

module.exports = createTenantModelProxy('Customer', CustomerSchema);
