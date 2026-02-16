const Variant = require('../models/Variant');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { generateQRCode } = require('../utils/qrCode');

exports.getAllVariants = async (query = {}) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  // filter active / inactive
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true';
  }

  const [variants, total] = await Promise.all([
    Variant.find(filter)
      .populate('productId', 'name brand originCountry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Variant.countDocuments(filter)
  ]);

  return {
    data: variants,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

exports.createVariant = async (productId, payload) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Tạo variant trước (chưa có qr)
  const variant = new Variant({
    ...payload,
    productId
  });

  // Sinh QR code
  variant.qrCode = await generateQRCode({
    variantId: variant._id,
    sku: variant.sku,
    product: product.name,
    price: variant.price
  });

  await variant.save();
  return variant;
};

//GET api/products/:idProduct/variants
exports.getVariantsByProduct = async (identifier) => {
  let product;
  // 1. Kiểm tra xem identifier là ID hay Slug
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    product = await Product.findById(identifier);
  } else {
    // Tìm sản phẩm dựa trên slug nếu identifier không phải là ObjectId
    product = await Product.findOne({ slug: identifier });
  }

  if (!product) {
    throw new Error('Product not found');
  }

  const variants = await Variant.find({
    productId: product._id,
    // isActive: true
  })
    .sort({ createdAt: -1 })
    .populate('productId', 'name brand originCountry slug');

  return { product, variants };
};

// PATCH /api/products/:productId/variants/:variantId
exports.updateVariant = async (productId, variantId, updateData) => {
  if (
    !mongoose.Types.ObjectId.isValid(productId) ||
    !mongoose.Types.ObjectId.isValid(variantId)
  ) {
    throw new Error('Invalid productId or variantId');
  }

  // Không cho update field hệ thống
  const disallowedFields = [
    '_id',
    'productId',
    'createdAt',
    'updatedAt',
    'qrCode'
  ];
  disallowedFields.forEach(field => delete updateData[field]);

  // Lấy variant hiện tại
  const variant = await Variant.findOne({
    _id: variantId,
    productId
  });

  if (!variant) {
    throw new Error('Variant not found');
  }

  // Merge data cũ + mới để build QR
  const mergedData = {
    sku: updateData.sku ?? variant.sku,
    price: updateData.price ?? variant.price
  };

  // Nếu có field ảnh hưởng QR → regenerate
  if (updateData.sku || updateData.price) {
    const product = await Product.findById(productId);

    variant.qrCode = await generateQRCode({
      variantId: variant._id,
      sku: mergedData.sku,
      product: product.name,
      price: mergedData.price
    });
  }

  // Apply update
  Object.assign(variant, updateData);

  await variant.save();

  return variant;
};

// DELETE /api/products/:productId/variants/:variantId
exports.deleteVariant = async (productId, variantId) => {
  if (
    !mongoose.Types.ObjectId.isValid(productId) ||
    !mongoose.Types.ObjectId.isValid(variantId)
  ) {
    throw new Error('Invalid productId or variantId');
  }

  const variant = await Variant.findOne({
    _id: variantId,
    productId
  });

  if (!variant) {
    throw new Error('Variant not found');
  }

  variant.isActive = false;
  await variant.save();

  return variant;
};

// RESTORE PATCH /api/products/:productId/variants/:variantId/restore
exports.restoreVariant = async (productId, variantId) => {
  if (
    !mongoose.Types.ObjectId.isValid(productId) ||
    !mongoose.Types.ObjectId.isValid(variantId)
  ) {
    throw new Error('Invalid productId or variantId');
  }

  const variant = await Variant.findOne({
    _id: variantId,
    productId
  });

  if (!variant) {
    throw new Error('Variant not found');
  }

  variant.isActive = true;
  await variant.save();

  return variant;
};

// GET api/products/:productId/variants/search?sku=
exports.searchVariantsBySku = async (productId, keyword) => {
  if (!keyword) return [];

  const query = {
    sku: { $regex: keyword, $options: 'i' },
    isActive: true
  };

  if (productId) {
    query.productId = productId;
  }

  return await Variant.find(query)
    .populate('productId', 'name brand originCountry')
    .sort({ createdAt: -1 });
};

// GET api/variants/search/price?minPrice=100000&maxPrice=300000
exports.searchVariantsByPrice = async (productId, minPrice, maxPrice) => {
  const query = { isActive: true };

  if (productId) {
    query.productId = productId;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  return await Variant.find(query)
    .populate('productId', 'name brand originCountry')
    .sort({ price: 1 });
};
