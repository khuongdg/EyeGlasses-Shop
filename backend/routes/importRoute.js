const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');

router.get('/', importController.getAllImports);
router.get('/:id', importController.getImportById);
router.post('/create', importController.createImport);
router.delete('/:id/cancel', importController.deleteImport);

module.exports = router;