const disposalService = require('../services/disposalService');

exports.createDisposal = async (req, res) => {
    try {
        const result = await disposalService.createDisposal(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAllDisposals = async (req, res) => {
    try {
        const { page, limit, keyword, dateFrom, dateTo, status } = req.query;
        const result = await disposalService.getDisposals({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            keyword,
            dateFrom,
            dateTo,
            status
        });
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDisposalById = async (req, res) => {
    try {
        const result = await disposalService.getDisposalDetail(req.params.id);
        if (!result) return res.status(404).json({ message: 'Không tìm thấy phiếu hủy' });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDisposal = async (req, res) => {
    try {
        await disposalService.deleteDisposal(req.params.id);
        res.json({ success: true, message: 'Đã xóa phiếu hủy và hoàn lại tồn kho thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

