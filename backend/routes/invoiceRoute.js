const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/', invoiceController.getInvoices);
router.get('/debts', invoiceController.getDebts);
router.post('/create', invoiceController.createInvoice);
router.patch('/debts/:id/pay', invoiceController.payDebt);
router.delete('/:invoiceId/cancel', invoiceController.cancelInvoice);

module.exports = router;
