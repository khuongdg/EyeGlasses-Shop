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
