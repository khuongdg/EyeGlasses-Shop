const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { clearCachePattern } = require('../services/cacheService');

// Middleware xóa cache sản phẩm, tồn kho & dashboard khi nhập hoặc hủy phiếu nhập kho
const clearProductCache = async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      clearCachePattern('cache:*:/api/products*').catch(() => {});
      clearCachePattern('cache:*:/api/dashboard*').catch(() => {});
    }
  });
  next();
};

router.get('/', importController.getAllImports);
router.get('/:id', importController.getImportById);
router.post('/create', clearProductCache, importController.createImport);
router.delete('/:id/cancel', clearProductCache, importController.deleteImport);

module.exports = router;