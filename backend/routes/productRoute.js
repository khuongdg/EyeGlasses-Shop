const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const variantController = require('../controllers/variantController');
const { authenticate } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../services/cacheService');

// Clear product cache middleware for mutations
const clearProductCache = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await Promise.all([
          clearCachePattern('cache:*:/api/products*'),
          clearCachePattern('cache:*:/api/dashboard*')
        ]);
      } catch (e) {
        console.error('Error clearing product/dashboard cache:', e);
      }
    }
    return originalJson(data);
  };
  next();
};

router.get('/', cacheMiddleware(300), productController.getAllProducts);
router.get('/search', cacheMiddleware(300), productController.searchProducts);
router.get('/:productId/variants/search', cacheMiddleware(300), variantController.searchVariants);
router.get('/variants/search/price', cacheMiddleware(300), variantController.searchVariantsByPrice);
router.get('/variants', cacheMiddleware(300), variantController.getAllVariants);
router.get('/variants/by-sku', variantController.getVariantBySku);
router.get('/:slug/variants', cacheMiddleware(300), variantController.getVariantsByProduct);

router.post('/create', authenticate, allowRoles('ADMIN'), clearProductCache, productController.createProduct);
router.post('/ai-import', clearProductCache, productController.aiBulkImport);
router.post('/:slug/variants/create', clearProductCache, variantController.createVariant);

router.patch('/:productId', clearProductCache, productController.updateProduct);
router.patch('/:slug/variants/:variantId', clearProductCache, variantController.updateVariant);
router.patch('/:productId/restore', clearProductCache, productController.restoreProduct);
router.patch('/:slug/variants/:variantId/restore', clearProductCache, variantController.restoreVariant);

router.delete('/:productId', clearProductCache, productController.deleteProduct);
router.delete('/:slug/variants/:variantId', clearProductCache, variantController.deleteVariant);

module.exports = router;
