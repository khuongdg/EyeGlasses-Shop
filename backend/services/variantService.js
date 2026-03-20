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

exports.createVariant = async (slug, payload) => {
  // 1. Tìm sản phẩm cha bằng slug để lấy _id và tên
  const product = await Product.findOne({ slug }).select('_id name');
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm với slug này');
  }

  // 2. Kiểm tra trùng SKU trong hệ thống (Tùy chọn nhưng nên có)
  const existingSku = await Variant.findOne({ sku: payload.sku });
  if (existingSku) {
    throw new Error('Mã SKU này đã tồn tại trong hệ thống');
  }

  // 3. Khởi tạo Variant mới gắn với productId vừa tìm được
  const variant = new Variant({
    ...payload,
    productId: product._id
  });

  // 4. Sinh QR code sắc nét cho máy Godex G500
  // Lưu ý: Chỉ truyền SKU để tối ưu mật độ điểm ảnh, giúp máy in nhiệt scan tốt hơn
  variant.qrCode = await generateQRCode(variant.sku);

  // 5. Lưu vào Database
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

// PATCH /api/products/:slug/variants/:variantId
exports.updateVariant = async (slug, variantId, updateData) => {
  // 1. Chỉ check valid cho variantId (vì slug là chuỗi, không phải ObjectId)
  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error('Invalid variantId');
  }

  // 2. Tìm Product dựa trên slug để lấy ID thực
  const product = await Product.findOne({ slug }).select('_id name');
  if (!product) {
    throw new Error('Product not found with this slug');
  }

  // 3. Xóa các field không cho phép sửa
  const disallowedFields = ['_id', 'productId', 'createdAt', 'updatedAt', 'qrCode'];
  disallowedFields.forEach(field => delete updateData[field]);

  // 4. Tìm variant thuộc về đúng product đó
  const variant = await Variant.findOne({
    _id: variantId,
    productId: product._id
  });

  if (!variant) {
    throw new Error('Variant not found in this product');
  }

  // 5. Kiểm tra nếu có thay đổi SKU hoặc Giá để sinh lại mã QR
  if (updateData.sku || updateData.price) {
    const mergedData = {
      sku: updateData.sku ?? variant.sku,
      price: updateData.price ?? variant.price
    };

    // Rút gọn dữ liệu QR để in tem Godex G500 sắc nét hơn
    // Lưu ý: Chỉ truyền SKU để mã QR đơn giản, dễ quét tại cửa hàng
    variant.qrCode = await generateQRCode(mergedData.sku);
  }

  // 6. Cập nhật dữ liệu mới
  Object.assign(variant, updateData);
  await variant.save();

  return variant;
};

// DELETE /api/products/:productId/variants/:variantId
exports.deleteVariant = async (slug, variantId) => {
  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error('ID biến thể không hợp lệ');
  }

  // 1. Tìm Product bằng slug để lấy ID thực
  const product = await Product.findOne({ slug }).select('_id');
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm cha');
  }

  // 2. Tìm và cập nhật trạng thái
  const variant = await Variant.findOne({
    _id: variantId,
    productId: product._id
  });

  if (!variant) {
    throw new Error('Không tìm thấy biến thể trong sản phẩm này');
  }

  variant.isActive = false;
  await variant.save();

  return variant;
};

// RESTORE PATCH /api/products/:productId/variants/:variantId/restore
exports.restoreVariant = async (slug, variantId) => {
  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error('ID biến thể không hợp lệ');
  }

  // 1. Tìm Product bằng slug
  const product = await Product.findOne({ slug }).select('_id');
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm cha');
  }

  // 2. Tìm và khôi phục
  const variant = await Variant.findOne({
    _id: variantId,
    productId: product._id
  });

  if (!variant) {
    throw new Error('Không tìm thấy biến thể để khôi phục');
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
