const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../services/cacheService');

// Clear customer cache middleware for mutations
const clearCustomerCache = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await clearCachePattern('cache:*:/api/customers*');
      } catch (e) {
        console.error('Error clearing customer cache:', e);
      }
    }
    return originalJson(data);
  };
  next();
};

router.get('/', cacheMiddleware(300), customerController.getAllCustomers);
router.get('/search', cacheMiddleware(300), customerController.searchCustomer);

router.post('/ai-import', clearCustomerCache, customerController.aiBulkImport);
router.post('/create', clearCustomerCache, customerController.createCustomer);
router.patch('/:customerId', clearCustomerCache, customerController.updateCustomer);
router.delete('/:customerId', clearCustomerCache, customerController.softDeleteCustomer);
router.patch('/:customerId/restore', clearCustomerCache, customerController.restoreCustomer);

module.exports = router;