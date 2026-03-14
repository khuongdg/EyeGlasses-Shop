const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAllCustomers);
router.post('/create', customerController.createCustomer);
router.post('/ai-import', customerController.aiBulkImport);

// search phone or name
router.get('/search', customerController.searchCustomer);

// Update customer
router.patch('/:customerId', customerController.updateCustomer);

// Soft delete customer
router.delete('/:customerId', customerController.softDeleteCustomer);

// Restore customer
router.patch('/:customerId/restore', customerController.restoreCustomer);

module.exports = router;