const staffService = require('../services/staffService');

exports.getAllStaffs = async (req, res) => {
  try {
    const result = await staffService.getAllStaffs(req.query);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });

  } catch (error) {
    console.error('Get staffs error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.createStaff = async (req, res) => {
  try {
    const staff = await staffService.createStaff(req.body);

    res.status(201).json({
      success: true,
      data: staff
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const updatedStaff = await staffService.updateStaff(
      staffId,
      req.body
    );

    res.json({
      success: true,
      data: updatedStaff,
      message: 'Staff updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.searchStaffs = async (req, res) => {
  try {
    const {
      keyword,
      page = 1,
      limit = 10,
      isActive
    } = req.query;

    const result = await staffService.searchStaffs({
      keyword,
      page: Number(page),
      limit: Number(limit),
      isActive:
        isActive !== undefined ? isActive === 'true' : undefined
    });

    res.json({
      success: true,
      data: result.data,
      total: result.total,
    });
  } catch (error) {
    console.error('Search staffs error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await staffService.deleteStaff(staffId);

    res.json({
      success: true,
      message: 'Staff deleted successfully',
      data: staff
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

exports.restoreStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await staffService.restoreStaff(staffId);

    res.json({
      success: true,
      message: 'Staff restored successfully',
      data: staff
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};
