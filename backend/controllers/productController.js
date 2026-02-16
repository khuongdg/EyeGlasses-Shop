const productService = require('../services/productService');


exports.getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const result = await productService.getAllProducts({
            page: Number(page),
            limit: Number(limit)
        });

        res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            page: Number(page),
            pageSize: Number(limit)
        });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const product = await productService.createProductWithVariants(req.body);

        res.status(201).json({ status: true, message: 'Product created successfully', product });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const updatedProduct = await productService.updateProduct(productId, req.body);

        res.json({
            success: true,
            data: updatedProduct
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        await productService.deleteProduct(productId);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.restoreProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        await productService.restoreProduct(productId);

        res.json({
            success: true,
            message: 'Product restored successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.searchProducts = async (req, res) => {
    try {
        const { keyword, page = 1, limit = 10 } = req.query;

        const result = await productService.searchProducts({
            keyword,
            page: Number(page),
            limit: Number(limit)
        });

        res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            page: Number(page),
            pageSize: Number(limit)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



