const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');

// Route lấy thống kê dashboard
// Chỉ cho phép ADMIN truy cập để bảo mật dữ liệu doanh thu, có cache 5 phút
router.get(
    '/stats', 
    authenticate, 
    allowRoles('ADMIN'), 
    cacheMiddleware(300),
    dashboardController.getDashboardStats
);

module.exports = router;