const Company = require('../models/Company');

exports.getCompany = async ({ isActive } = {}) => {
  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }
  return await Company.find(filter).sort({ createdAt: -1 });
};


exports.createCompany = async (data) => {
    // 1. Deactivate tất cả công ty cũ
    await Company.updateMany({}, { isActive: false });

    const exists = await Company.findOne({ phone: data.phone });
    if (exists) {
        throw new Error('Phone number already exists');
    }

    // 2. Tạo công ty mới (active mặc định)
    const company = await Company.create(data);

    return company;
};

// PATCH /api/company/:companyId
exports.updateCompany = async (companyId, data) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new Error('Company not found');
  }

  Object.assign(company, data);
  await company.save();

  return company;
};

// DELETE /api/company/:companyId
exports.deleteCompany = async (companyId) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new Error('Company not found');
  }

  company.isActive = false;
  await company.save();

  return company;
};

// PATCH /api/company/:companyId/restore
exports.restoreCompany = async (companyId) => {
  // deactivate tất cả company khác
  await Company.updateMany({}, { isActive: false });

  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }

  company.isActive = true;
  await company.save();

  return company;
};