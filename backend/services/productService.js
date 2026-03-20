const Product = require('../models/Product');
const Variant = require('../models/Variant');
const mongoose = require('mongoose');
const slugify = require('slugify');
const { generateQRCode } = require('../utils/qrCode');

exports.getAllProducts = async ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        Product.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Product.countDocuments()
    ]);

    return {
        data,
        total
    };
};


// exports.createProduct = async (productData) => {
//     const product = new Product(productData);
//     return await product.save();
// };

exports.createProductWithVariants = async (payload) => {
    const session = await Product.db.startSession();
    session.startTransaction();

    try {
        const {
            name,
            brand,
            originCountry,
            description,
            images,
            variants
        } = payload;

        if (!variants || variants.length === 0) {
            throw new Error('Product must have at least one variant');
        }

        const slug = slugify(name, { lower: true });

        // CHECK TRÙNG SLUG
        const existed = await Product.findOne({ slug }).session(session);
        if (existed) {
            throw new Error('Product name already exists');
        }

        // Create Product
        const product = await Product.create(
            [{
                name,
                brand,
                originCountry,
                description,
                images,
                slug
            }],
            { session }
        );

        const createdProduct = product[0];

        // Create Variants
        const createdVariants = [];

        for (const v of variants) {
            const variant = new Variant({
                productId: createdProduct._id,
                sku: v.sku,
                colorCode: v.colorCode,
                unit: v.unit,
                price: v.price,
                inventory: v.inventory || 0,
                image: v.image || []
            });

            // Generate QR Code
            variant.qrCode = await generateQRCode({
                variantId: variant._id,
                sku: variant.sku,
                product: createdProduct.name,
                price: variant.price
            });

            await variant.save({ session });
            createdVariants.push(variant);
        }

        await session.commitTransaction();
        session.endSession();

        return {
            product: createdProduct,
            variants: createdVariants
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

exports.updateProduct = async (productId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid productId');
    }

    // Không cho update field hệ thống
    const disallowedFields = ['_id', 'createdAt', 'updatedAt'];
    disallowedFields.forEach(field => delete updateData[field]);

    // Nếu update name → update slug tương ứng
    if (updateData.name) {
        updateData.slug = slugify(updateData.name, {
            lower: true,
            strict: true
        });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedProduct) {
        throw new Error('Product not found');
    }

    return updatedProduct;
};

// DELETE /api/products/:productId
exports.deleteProduct = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid productId');
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    // Soft delete product
    product.isActive = false;
    await product.save();

    // Soft delete toàn bộ variant thuộc product
    await Variant.updateMany(
        { productId },
        { $set: { isActive: false } }
    );

    return product;
};

// RESTORE /api/products/:productId/restore
exports.restoreProduct = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid productId');
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    product.isActive = true;
    await product.save();

    // Restore toàn bộ variant thuộc product
    await Variant.updateMany(
        { productId },
        { $set: { isActive: true } }
    );

    return product;
};

// SEARCH /api/products/search?keyword=
exports.searchProducts = async ({ keyword, page = 1, limit = 10 }) => {
    if (!keyword) {
        return {
            data: [],
            total: 0
        };
    }

    const skip = (page - 1) * limit;

    /* ================= 1. SEARCH VARIANT BY SKU ================= */
    const variants = await Variant.find({
        sku: { $regex: keyword, $options: 'i' },
        isActive: true
    })
        .populate('productId')
        .lean();

    const variantMap = {};
    variants.forEach(v => {
        const pid = v.productId._id.toString();
        if (!variantMap[pid]) variantMap[pid] = [];
        variantMap[pid].push(v);
    });

    /* ================= 2. SEARCH PRODUCT BY NAME ================= */
    const productsByName = await Product.find({
        name: { $regex: keyword, $options: 'i' },
        isActive: true
    }).lean();

    /* ================= 3. MERGE RESULT ================= */
    const productMap = {};

    productsByName.forEach(p => {
        productMap[p._id.toString()] = {
            ...p,
            matchedVariants: []
        };
    });

    Object.keys(variantMap).forEach(pid => {
        if (!productMap[pid]) {
            productMap[pid] = {
                ...variantMap[pid][0].productId,
                matchedVariants: variantMap[pid]
            };
        } else {
            productMap[pid].matchedVariants = variantMap[pid];
        }
    });

    const allProducts = Object.values(productMap);

    /* ================= 4. PAGINATION ================= */
    const total = allProducts.length;
    const paginatedData = allProducts.slice(skip, skip + limit);

    return {
        data: paginatedData,
        total
    };
};

exports.aiBulkImportProducts = async (productsData) => {
    let createdProductCount = 0;
    let updatedProductCount = 0;
    const errors = [];

    console.log(">>> BẮT ĐẦU IMPORT AI:", productsData.length, "sản phẩm");

    for (const item of productsData) {
        try {
            // 1. Kiểm tra Sản phẩm cha
            let product = await Product.findOne({ name: item.name });

            if (!product) {
                product = await Product.create({
                    name: item.name,
                    brand: item.brand || 'Christian DG',
                    originCountry: item.originCountry,
                    description: 'Imported via AI from Excel',
                    isActive: true
                });
                createdProductCount++;
                console.log(`[NEW PRODUCT] Tạo thành công: ${item.name} (_id: ${product._id})`);
            } else {
                updatedProductCount++;
                console.log(`[EXISTING PRODUCT] Tìm thấy: ${item.name} (_id: ${product._id})`);
            }

            // 2. Kiểm tra danh sách Variant đầu vào
            if (!item.variants || item.variants.length === 0) {
                console.warn(`[WARN] Sản phẩm ${item.name} không có variant nào trong dữ liệu.`);
                continue;
            }

            // 3. Xử lý từng Variant
            for (const v of item.variants) {
                try {
                    console.log(`   --- Đang xử lý Variant SKU: ${v.sku}`);

                    const existingVariant = await Variant.findOne({ sku: v.sku });

                    if (!existingVariant) {
                        // KIỂM TRA HÀM QR CODE (Điểm dễ lỗi nhất)
                        console.log(`   --- Đang sinh mã QR cho: ${v.sku}`);
                        const qrCode = await generateQRCode(v.sku);

                        if (!qrCode) {
                            console.error(`   [ERROR QR] SKU ${v.sku} không sinh được QR!`);
                        }

                        // TẠO VARIANT
                        await Variant.create({
                            ...v,
                            productId: product._id, // Quan trọng: Phải là ID của object 'product' bên trên
                            qrCode: qrCode,
                            isActive: true
                        });
                        console.log(`   [SUCCESS] Đã tạo Variant: ${v.sku} cho ProductID: ${product._id}`);
                    } else {
                        console.log(`   [SKIP] SKU ${v.sku} đã tồn tại, tiến hành cập nhật.`);
                        existingVariant.price = v.price || existingVariant.price;
                        existingVariant.unit = v.unit || existingVariant.unit;
                        await existingVariant.save();
                    }
                } catch (vErr) {
                    console.error(`   [VARIANT ERROR] SKU: ${v.sku} thất bại:`, vErr.message);
                    errors.push({ name: `${item.name} (${v.sku})`, error: vErr.message });
                }
            }
        } catch (err) {
            console.error(`[PRODUCT ERROR] Sản phẩm ${item.name} thất bại:`, err.message);
            errors.push({ name: item.name, error: err.message });
        }
    }

    console.log(">>> KẾT THÚC IMPORT. Thành công:", createdProductCount, "sản phẩm mới.");
    return { createdProductCount, updatedProductCount, errors };
};