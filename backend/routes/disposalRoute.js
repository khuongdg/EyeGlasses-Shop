const express = require('express');
const router = express.Router();
const disposalController = require('../controllers/disposalController');
const { clearCachePattern } = require('../services/cacheService');

// Middleware xóa cache sản phẩm, tồn kho & dashboard khi hủy hoặc hoàn phiếu hủy
const clearProductCache = async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                await Promise.all([
                    clearCachePattern('cache:*:/api/products*'),
                    clearCachePattern('cache:*:/api/dashboard*'),
                    clearCachePattern('cache:*:/api/disposals*')
                ]);
            } catch (e) {
                console.error('Error clearing disposal cache:', e);
            }
        }
        return originalJson(data);
    };
    next();
};

router.get('/', disposalController.getAllDisposals);
router.get('/:id', disposalController.getDisposalById);
router.post('/create', clearProductCache, disposalController.createDisposal);
router.delete('/:id', clearProductCache, disposalController.deleteDisposal);

module.exports = router;

