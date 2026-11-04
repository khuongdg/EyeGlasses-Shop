const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../services/cacheService');

// Clear staff cache middleware for mutations
const clearStaffCache = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await clearCachePattern('cache:*:/api/staffs*');
      } catch (e) {
        console.error('Error clearing staff cache:', e);
      }
    }
    return originalJson(data);
  };
  next();
};

router.get('/', cacheMiddleware(300), staffController.getAllStaffs);
router.get('/search', cacheMiddleware(300), staffController.searchStaffs);

router.post('/create', clearStaffCache, staffController.createStaff);
router.patch('/:staffId', clearStaffCache, staffController.updateStaff);
router.delete('/:staffId', clearStaffCache, staffController.deleteStaff);
router.patch('/:staffId/restore', clearStaffCache, staffController.restoreStaff);

module.exports = router;
