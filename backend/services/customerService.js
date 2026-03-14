const Customer = require('../models/Customer');

// GET api/customers
// Search api/customers?keyword=0901 || api/customers?keyword=CUS00001
// GET api/customers?isActive=true/false
exports.getAllCustomers = async (query = {}) => {
  const {
    page = 1,
    limit = 10
  } = query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [customers, total] = await Promise.all([
    Customer.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),

    Customer.countDocuments()
  ]);

  return {
    data: customers,
    total,
    page: pageNum,
    limit: limitNum
  };
};

const generateCustomerCode = async () => {
  const lastCustomer = await Customer.findOne({})
    .sort({ createdAt: -1 })
    .select('customerCode');

  if (!lastCustomer) return 'CUS000001';

  const lastNumber = parseInt(lastCustomer.customerCode.replace('CUS', ''));
  return `CUS${(lastNumber + 1).toString().padStart(6, '0')}`;
};

// POST api/customers/create
exports.createCustomer = async (data) => {
  const { phone } = data;

  const existingCustomer = await Customer.findOne({ phone });
  if (existingCustomer) {
    throw new Error('Số điện thoại đã tồn tại');
  }

  const customerCode = await generateCustomerCode();

  const customer = new Customer({
    ...data,
    customerCode
  });

  return await customer.save();
};

//GET api/customers/search?keyword=0901 or keyword=nguyen
exports.searchCustomer = async ({ keyword, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const filter = {
    isActive: true
  };

  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } }
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Customer.countDocuments(filter)
  ]);

  return {
    data: customers,
    total,
    page,
    limit
  };
};


// PATCH api/customers/:customerId
exports.updateCustomer = async (customerId, data) => {
  // Không cho update customerCode
  delete data.customerCode;

  // Nếu update phone → check trùng
  if (data.phone) {
    const existingCustomer = await Customer.findOne({
      phone: data.phone,
      _id: { $ne: customerId }
    });

    if (existingCustomer) {
      throw new Error('Số điện thoại đã tồn tại');
    }
  }

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new Error('Không tìm thấy khách hàng');
  }

  return customer;
};

// DELETE /api/customers/:id
exports.softDeleteCustomer = async (customerId) => {
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { isActive: false },
    { new: true }
  );

  if (!customer) {
    throw new Error('Không tìm thấy khách hàng');
  }

  return customer;
};

// PATCH /api/customers/:id/restore
exports.restoreCustomer = async (customerId) => {
  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { isActive: true },
    { new: true }
  );

  if (!customer) {
    throw new Error('Không tìm thấy khách hàng');
  }

  return customer;
};

exports.aiBulkImportService = async (customers) => {
    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    // Sử dụng Promise.allSettled hoặc map để xử lý song song
    await Promise.all(
        customers.map(async (item) => {
            try {
                // 1. AI Logic: Chuẩn hóa tên (Ví dụ: "nguyen van a" -> "Nguyen Van A")
                const normalizedName = item.name
                    ?.trim()
                    .split(/\s+/)
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ');
                
                // 2. Làm sạch số điện thoại (chỉ giữ lại số)
                const phone = item.phone.toString().replace(/\D/g, '');

                if (!phone || phone.length < 10) {
                    throw new Error('Số điện thoại không hợp lệ');
                }

                // 3. Kiểm tra trùng lặp dựa trên Số điện thoại
                const existingCustomer = await Customer.findOne({ phone });

                if (existingCustomer) {
                    // Cập nhật thông tin nếu bản ghi cũ đang trống
                    let isChanged = false;
                    if (!existingCustomer.address && item.address) {
                        existingCustomer.address = item.address;
                        isChanged = true;
                    }
                    if (!existingCustomer.email && item.email) {
                        existingCustomer.email = item.email;
                        isChanged = true;
                    }

                    if (isChanged) {
                        await existingCustomer.save();
                        updatedCount++;
                    }
                } else {
                    // Tạo khách hàng mới nếu chưa tồn tại
                    await Customer.create({
                        ...item,
                        name: normalizedName,
                        phone: phone,
                        isActive: true
                    });
                    createdCount++;
                }
            } catch (err) {
                errors.push({ name: item.name || 'Không tên', error: err.message });
            }
        })
    );

    return { createdCount, updatedCount, errors };
};