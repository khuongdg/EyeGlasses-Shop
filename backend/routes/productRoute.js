const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const variantController = require('../controllers/variantController');
const { authenticate } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');

router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:productId/variants/search', variantController.searchVariants); // SKU search
router.get('/variants/search/price', variantController.searchVariantsByPrice);
router.post('/create', authenticate, allowRoles('ADMIN'), productController.createProduct);

// Get all variants
router.get('/variants', variantController.getAllVariants);

// Variant nested
router.get('/:slug/variants', variantController.getVariantsByProduct);
router.post('/:productId/variants/create', variantController.createVariant);

// Update product
router.patch('/:productId', productController.updateProduct);
// Update variant
router.patch('/:productId/variants/:variantId', variantController.updateVariant);

// Soft delete product
router.delete('/:productId', productController.deleteProduct);
// Soft delete variant
router.delete('/:productId/variants/:variantId', variantController.deleteVariant);

// Restore product
router.patch('/:productId/restore', productController.restoreProduct);
// Restore variant
router.patch('/:productId/variants/:variantId/restore', variantController.restoreVariant);

module.exports = router;
