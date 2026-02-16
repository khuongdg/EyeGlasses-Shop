const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

router.get('/', staffController.getAllStaffs);
router.get('/search', staffController.searchStaffs);
router.post('/create', staffController.createStaff);
router.patch('/:staffId', staffController.updateStaff);
router.delete('/:staffId', staffController.deleteStaff);
router.patch('/:staffId/restore', staffController.restoreStaff);

module.exports = router;
