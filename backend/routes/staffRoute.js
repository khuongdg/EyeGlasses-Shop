const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../services/cacheService');

// Clear staff cache middleware for mutations
const clearStaffCache = async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      clearCachePattern('cache:/api/staffs*').catch(() => {});
    }
  });
  next();
};

router.get('/', cacheMiddleware(300), staffController.getAllStaffs);
router.get('/search', cacheMiddleware(300), staffController.searchStaffs);

router.post('/create', clearStaffCache, staffController.createStaff);
router.patch('/:staffId', clearStaffCache, staffController.updateStaff);
router.delete('/:staffId', clearStaffCache, staffController.deleteStaff);
router.patch('/:staffId/restore', clearStaffCache, staffController.restoreStaff);

module.exports = router;
