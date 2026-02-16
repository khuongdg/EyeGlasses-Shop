const mongoose = require('mongoose');
const slugify = require('slugify');
const invoiceConnection = require('../database/invoiceConnection');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, unique: true },
    brand: { type: String, required: true },
    originCountry: { type: String },
    description: { type: String },
    images: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true });
  }
});

ProductSchema.index({ name: 'text' });

module.exports = invoiceConnection.model('Product', ProductSchema);
