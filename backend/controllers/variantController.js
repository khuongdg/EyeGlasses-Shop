const variantService = require('../services/variantService');

exports.getAllVariants = async (req, res) => {
  try {
    const result = await variantService.getAllVariants(req.query);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });

  } catch (error) {
    console.error('Get variants error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.createVariant = async (req, res) => {
  try {
    const { slug } = req.params;

    const variant = await variantService.createVariant(
      slug,
      req.body
    );

    res.status(201).json({
      success: true,
      data: variant
    });
  } catch (error) {
    res.status(error.message === 'Product not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getVariantsByProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    const data = await variantService.getVariantsByProduct(slug);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateVariant = async (req, res) => {
  try {
    const { slug, variantId } = req.params;

    const updatedVariant = await variantService.updateVariant(
      slug,
      variantId,
      req.body
    );

    res.json({
      success: true,
      data: updatedVariant
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteVariant = async (req, res) => {
  try {
    const { slug, variantId } = req.params;

    await variantService.deleteVariant(slug, variantId);

    res.json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.restoreVariant = async (req, res) => {
  try {
    const { slug, variantId } = req.params;

    await variantService.restoreVariant(slug, variantId);

    res.json({
      success: true,
      message: 'Variant restored successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.searchVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sku } = req.query;

    const variants = await variantService.searchVariantsBySku(productId, sku);

    res.json({
      success: true,
      data: variants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.searchVariantsByPrice = async (req, res) => {
  try {
    const { productId } = req.params;
    const { minPrice, maxPrice } = req.query;

    const variants = await variantService.searchVariantsByPrice(
      productId,
      minPrice,
      maxPrice
    );

    res.json({
      success: true,
      data: variants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

