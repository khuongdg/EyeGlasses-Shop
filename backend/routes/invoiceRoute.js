const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../services/cacheService');

// Clear invoice cache middleware for mutations
const clearInvoiceCache = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await Promise.all([
          clearCachePattern('cache:*:/api/invoices*'),
          clearCachePattern('cache:*:/api/products*'),
          clearCachePattern('cache:*:/api/dashboard*')
        ]);
      } catch (e) {
        console.error('Error clearing invoice/dashboard cache:', e);
      }
    }
    return originalJson(data);
  };
  next();
};

router.get('/', invoiceController.getInvoices);
router.get('/debts', invoiceController.getDebts);
router.get('/drafts', invoiceController.getDrafts);
router.get('/:invoiceId/detail', invoiceController.getInvoiceById);

router.post('/create', clearInvoiceCache, invoiceController.createInvoice);
router.post('/drafts', clearInvoiceCache, invoiceController.saveDraft);
router.patch('/debts/:id/pay', clearInvoiceCache, invoiceController.payDebt);
router.patch('/:invoiceId/admin-note', clearInvoiceCache, invoiceController.updateInvoiceAdminNote);
router.delete('/drafts/:draftId', clearInvoiceCache, invoiceController.deleteDraft);
router.delete('/:invoiceId/cancel', clearInvoiceCache, invoiceController.cancelInvoice);

module.exports = router;
