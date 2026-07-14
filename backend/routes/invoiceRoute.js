const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/', invoiceController.getInvoices);
router.get('/debts', invoiceController.getDebts);
router.get('/drafts', invoiceController.getDrafts);
router.post('/create', invoiceController.createInvoice);
router.post('/drafts', invoiceController.saveDraft);
router.patch('/debts/:id/pay', invoiceController.payDebt);
router.delete('/drafts/:draftId', invoiceController.deleteDraft);
router.delete('/:invoiceId/cancel', invoiceController.cancelInvoice);

module.exports = router;
