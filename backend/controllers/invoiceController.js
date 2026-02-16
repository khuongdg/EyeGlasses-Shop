const invoiceService = require('../services/invoiceService');

exports.createInvoice = async (req, res) => {
  try {
    // req.body chứa toàn bộ payload từ Form Frontend gửi lên
    const invoice = await invoiceService.createInvoice(req.body);

    res.status(201).json({
      success: true,
      message: 'Tạo phiếu xuất kho thành công',
      data: invoice
    });
  } catch (error) {
    console.error('Create Invoice Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Thao tác thất bại'
    });
  }
};

// invoiceController.js
exports.getInvoices = async (req, res) => {
  try {
    const {
      page,
      limit,
      keyword,
      isActive,
      paymentMethod,
      dateFrom,
      dateTo
    } = req.query;

    const result = await invoiceService.getInvoices({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      keyword,
      paymentMethod,
      dateFrom,
      dateTo,
      // Xử lý logic Boolean cho isActive từ query string
      isActive: isActive === 'true' ? true : (isActive === 'false' ? false : undefined)
    });

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.cancelInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu ID phiếu xuất kho.'
      });
    }

    const cancelledInvoice = await invoiceService.cancelInvoice(invoiceId);

    res.json({
      success: true,
      message: 'Hủy phiếu và hoàn kho thành công.',
      data: cancelledInvoice
    });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Hủy phiếu thất bại.'
    });
  }
};

exports.getDebts = async (req, res) => {
  try {
    const { keyword, status, page, limit } = req.query;
    const result = await invoiceService.getDebts({
      keyword,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 10
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.payDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note, staffName } = req.body;

    const result = await invoiceService.updateDebtPayment(id, {
      amount: Number(amount),
      note,
      staffName
    });

    res.json({
      success: true,
      message: 'Cập nhật thanh toán nợ thành công',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};