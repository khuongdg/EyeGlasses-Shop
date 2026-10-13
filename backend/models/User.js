const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createTenantModelProxy } = require('../database/tenantManager');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['ADMIN', 'STAFF'],
      required: true
    },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = createTenantModelProxy('User', UserSchema);
