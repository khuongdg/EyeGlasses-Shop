const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { clearCachePattern } = require('../services/cacheService');

// Middleware xóa cache sản phẩm, tồn kho & dashboard khi nhập hoặc hủy phiếu nhập kho
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
        console.error('Error clearing import/dashboard cache:', e);
      }
    }
    return originalJson(data);
  };
  next();
};

router.get('/', importController.getAllImports);
router.get('/:id', importController.getImportById);
router.post('/create', clearProductCache, importController.createImport);
router.delete('/:id/cancel', clearProductCache, importController.deleteImport);

module.exports = router;