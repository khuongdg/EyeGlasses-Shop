const customerService = require('../services/customerService');

exports.getAllCustomers = async (req, res) => {
  try {
    const result = await customerService.getAllCustomers(req.query);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await customerService.createCustomer(req.body);

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.searchCustomer = async (req, res) => {
  try {
    const {
      keyword,
      page = 1,
      limit = 10
    } = req.query;

    const result = await customerService.searchCustomer({
      keyword,
      page: Number(page),
      limit: Number(limit)
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Search customer error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const updatedCustomer = await customerService.updateCustomer(
      customerId,
      req.body
    );

    res.json({
      success: true,
      data: updatedCustomer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.softDeleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await customerService.softDeleteCustomer(customerId);

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.restoreCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await customerService.restoreCustomer(customerId);

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.aiBulkImport = async (req, res) => {
    try {
        const { customers } = req.body;

        // Validation cơ bản dữ liệu đầu vào
        if (!customers || !Array.isArray(customers)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Dữ liệu khách hàng không hợp lệ hoặc không phải là mảng' 
            });
        }

        // Gọi lớp Service để xử lý nghiệp vụ
        const result = await customerService.aiBulkImportService(customers);

        res.status(200).json({
            success: true,
            message: `AI xử lý hoàn tất: Thêm mới ${result.createdCount}, Cập nhật ${result.updatedCount}`,
            data: result
        });
    } catch (error) {
        console.error('Controller Error - AI Import:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống khi xử lý AI Import',
            error: error.message 
        });
    }
};