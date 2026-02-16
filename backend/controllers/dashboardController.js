// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');

exports.getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Kiểm tra nếu thiếu ngày tháng
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp khoảng thời gian (startDate và endDate)"
            });
        }

        // Gọi service để tính toán số liệu
        const stats = await dashboardService.getStats({ startDate, endDate });

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error("Dashboard Controller Error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy dữ liệu thống kê",
            error: error.message
        });
    }
};