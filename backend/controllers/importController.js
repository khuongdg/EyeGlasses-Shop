const importService = require('../services/importService');

exports.createImport = async (req, res) => {
    try {
        const result = await importService.createImportReceipt(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAllImports = async (req, res) => {
    try {
        const { page, limit, keyword } = req.query;
        const result = await importService.getImportReceipts({
            page: Number(page),
            limit: Number(limit),
            keyword
        });
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getImportById = async (req, res) => {
    try {
        const result = await importService.getImportDetail(req.params.id);
        if (!result) return res.status(404).json({ message: 'Không tìm thấy phiếu' });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteImport = async (req, res) => {
    try {
        await importService.deleteImportReceipt(req.params.id);
        res.json({ success: true, message: 'Đã xóa phiếu và hoàn kho thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};