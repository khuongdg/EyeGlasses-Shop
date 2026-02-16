const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

router.get('/', companyController.getCompanyInfo);
router.post('/create', companyController.createCompany);
router.patch('/:companyId', companyController.updateCompany);
router.delete('/:companyId', companyController.deleteCompany);
router.patch('/:companyId/restore', companyController.restoreCompany);

module.exports = router;