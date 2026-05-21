const Company = require('../models/Company');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

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
  // 1. Kiểm tra sự tồn tại của cấu hình công ty trong invoice_db
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Không tìm thấy thông tin cấu hình cửa hàng cần cập nhật.');
  }

  // 2. Lấy mật khẩu admin do frontend gửi lên trong form values
  const { adminPassword } = data;
  if (!adminPassword) {
    throw new Error('Vui lòng nhập mật khẩu Admin để xác nhận lưu thay đổi.');
  }

  // 3. Tìm tài khoản có quyền ADMIN trong hệ thống invoice_db
  const adminUser = await User.findOne({ role: 'ADMIN', isActive: true });
  if (!adminUser) {
    throw new Error('Không tìm thấy tài khoản Quản trị viên (ADMIN) trên hệ thống.');
  }

  // 4. KIỂM TRA BẢO MẬT: Đối chiếu mật khẩu thô với chuỗi mã hóa trong DB
  const isPasswordMatch = bcrypt.compareSync(adminPassword, adminUser.password);

  // NẾU MẬT KHẨU SAI (isPasswordMatch === false), CHẶN ĐỨNG VÀ BÁO LỖI NGAY TẠI ĐÂY
  if (!isPasswordMatch) {
    throw new Error('Mật khẩu xác nhận của Admin không chính xác. Quyền thay đổi bị từ chối!');
  }

  // 5. RẤT QUAN TRỌNG: Xóa trường adminPassword thừa ra khỏi đối tượng data
  delete data.adminPassword;

  // 6. Tiến hành cập nhật dữ liệu an toàn vào Database
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