const companyService = require('../services/companyService');

exports.getCompanyInfo = async (req, res) => {
  try {
    const { isActive } = req.query;

    const companies = await companyService.getCompany({
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });

    // Ta kiểm tra mảng trống thay vì check !company
    if (!companies || companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No companies found',
        data: [] // Trả về mảng trống để Frontend không bị crash
      });
    }

    res.json({
      success: true,
      data: companies // Bây giờ data sẽ là một mảng [{}, {}, ...]
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.createCompany = async (req, res) => {
  try {
    const company = await companyService.createCompany(req.body);

    res.status(201).json({
      success: true,
      data: company
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await companyService.updateCompany(companyId, req.body);

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    await companyService.deleteCompany(companyId);

    res.json({
      success: true,
      message: 'Company has been deactivated'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.restoreCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await companyService.restoreCompany(companyId);

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
