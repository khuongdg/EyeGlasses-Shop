const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');

// Route lấy thống kê dashboard
// Chỉ cho phép ADMIN truy cập để bảo mật dữ liệu doanh thu
router.get(
    '/stats', 
    authenticate, 
    allowRoles('ADMIN'), 
    dashboardController.getDashboardStats
);

module.exports = router;