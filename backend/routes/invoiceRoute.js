const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../services/cacheService');

// Clear invoice cache middleware for mutations
const clearInvoiceCache = async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      clearCachePattern('cache:/api/invoices*').catch(() => {});
      clearCachePattern('cache:/api/products*').catch(() => {});
    }
  });
  next();
};

router.get('/', cacheMiddleware(180), invoiceController.getInvoices);
router.get('/debts', cacheMiddleware(180), invoiceController.getDebts);
router.get('/drafts', cacheMiddleware(60), invoiceController.getDrafts);

router.post('/create', clearInvoiceCache, invoiceController.createInvoice);
router.post('/drafts', clearInvoiceCache, invoiceController.saveDraft);
router.patch('/debts/:id/pay', clearInvoiceCache, invoiceController.payDebt);
router.patch('/:invoiceId/admin-note', clearInvoiceCache, invoiceController.updateInvoiceAdminNote);
router.delete('/drafts/:draftId', clearInvoiceCache, invoiceController.deleteDraft);
router.delete('/:invoiceId/cancel', clearInvoiceCache, invoiceController.cancelInvoice);

module.exports = router;
