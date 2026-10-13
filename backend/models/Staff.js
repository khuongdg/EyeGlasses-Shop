const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../database/tenantManager');

const StaffSchema = new mongoose.Schema(
  {
    staffCode: {type: String, unique: true, index: true},
    name: {type: String, required: true, trim: true},
    phone: {type: String, required: true, unique: true, index: true},
    address: {type: String, trim: true},
    email: {type: String, trim: true},
    isActive: {type: Boolean, default: true}
  },
  { timestamps: true }
);

module.exports = createTenantModelProxy('Staff', StaffSchema);
