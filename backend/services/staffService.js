const Staff = require('../models/Staff');

exports.getAllStaffs = async (query = {}) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.max(parseInt(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  // filter active / inactive
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true';
  }

  const [staffs, total] = await Promise.all([
    Staff.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Staff.countDocuments(filter)
  ]);

  return {
    data: staffs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};


const generateStaffCode = async () => {
  const lastStaff = await Staff.findOne({})
    .sort({ createdAt: -1 })
    .select('staffCode');

  if (!lastStaff) return 'STF000001';

  const lastNumber = parseInt(lastStaff.staffCode.replace('STF', ''));
  return `STF${(lastNumber + 1).toString().padStart(6, '0')}`;
};

// POST /api/staffs/create
exports.createStaff = async (data) => {
  // Check phone duplicate
  const existingStaff = await Staff.findOne({ phone: data.phone });
  if (existingStaff) {
    throw new Error('Phone number already exists');
  }

  const staffCode = await generateStaffCode(Staff);

  const staff = await Staff.create({
    ...data,
    staffCode
  });

  return staff;
};

// PATCH api/staffs/:staffId
exports.updateStaff = async (staffId, data) => {
  // Không cho update staffCode
  delete data.staffCode;

  // Nếu update phone → check trùng
  if (data.phone) {
    const existingStaff = await Staff.findOne({
      phone: data.phone,
      _id: { $ne: staffId }
    });

    if (existingStaff) {
      throw new Error('Số điện thoại đã tồn tại');
    }
  }

  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!staff) {
    throw new Error('Không tìm thấy nhân viên');
  }

  return staff;
};

// GET /api/staffs/search?keyword=
exports.searchStaffs = async ({
  keyword,
  page = 1,
  limit = 10,
  isActive
}) => {
  const filter = {};

  // search keyword
  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } }
    ];
  }

  // filter active / inactive
  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [staffs, total] = await Promise.all([
    Staff.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Staff.countDocuments(filter)
  ]);

  return {
    data: staffs,
    total,
    page,
    limit
  };
};


// DELETE /api/staffs/:staffId
exports.deleteStaff = async (staffId) => {
  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { isActive: false },
    { new: true }
  );

  if (!staff) {
    throw new Error('Staff not found');
  }

  return staff;
};

// RESTORE /api/staffs/:staffId/restore
exports.restoreStaff = async (staffId) => {
  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { isActive: true },
    { new: true }
  );

  if (!staff) {
    throw new Error('Staff not found');
  }

  return staff;
};