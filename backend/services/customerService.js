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
  // Chỉ tìm những khách hàng có customerCode hợp lệ (không null/undefined)
  const lastCustomer = await Customer.findOne({
    customerCode: { $ne: null, $regex: /^CUS/ }
  })
    .sort({ createdAt: -1 })
    .select('customerCode');

  if (!lastCustomer || !lastCustomer.customerCode) return 'CUS000001';

  // FIX: Thêm Optional Chaining (?.) và kiểm tra chuỗi trước khi replace
  const codeStr = String(lastCustomer.customerCode);
  const lastNumber = parseInt(codeStr.replace('CUS', '')) || 0;

  return `CUS${(lastNumber + 1).toString().padStart(6, '0')}`;
};

// POST api/customers/create
exports.createCustomer = async (data) => {
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
  // if (data.phone) {
  //   const existingCustomer = await Customer.findOne({
  //     phone: data.phone,
  //     _id: { $ne: customerId }
  //   });

  //   if (existingCustomer) {
  //     throw new Error('Số điện thoại đã tồn tại');
  //   }
  // }

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

/**
 * AI Bulk Import Service (Updated for Non-Unique Phone)
 * Logic: So khớp theo (Tên + SĐT) để xử lý việc một SĐT có nhiều khách hàng
 */
exports.aiBulkImportService = async (customers) => {
  let createdCount = 0;
  let updatedCount = 0;
  const errors = [];

  await Promise.all(
    customers.map(async (item) => {
      try {
        // 1. Chuẩn hóa tên (Xử lý an toàn nếu name undefined)
        const normalizedName = item.name
          ?.trim()
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        if (!normalizedName) throw new Error('Tên khách hàng không được để trống');

        // 2. Làm sạch số điện thoại (Sửa lỗi crash replace)
        const phone = item.phone?.toString().replace(/\D/g, '') || "";

        if (!phone || phone.length < 10) {
          throw new Error('Số điện thoại không hợp lệ (yêu cầu ít nhất 10 số)');
        }

        // 3. Kiểm tra trùng lặp: Tìm khách hàng có CẢ Tên và SĐT khớp nhau
        // Vì bạn đã xóa unique phone, việc chỉ tìm theo phone sẽ không còn chính xác.
        const existingCustomer = await Customer.findOne({
          name: normalizedName,
          phone: phone
        });

        if (existingCustomer) {
          // AI Logic: Cập nhật thông tin bổ sung nếu bản ghi hiện tại đang thiếu
          let isChanged = false;

          if (!existingCustomer.address && item.address) {
            existingCustomer.address = item.address;
            isChanged = true;
          }
          if (!existingCustomer.email && item.email) {
            existingCustomer.email = item.email;
            isChanged = true;
          }
          if (!existingCustomer.taxCode && item.taxCode) {
            existingCustomer.taxCode = item.taxCode;
            isChanged = true;
          }

          if (isChanged) {
            await existingCustomer.save();
            updatedCount++;
          }
        } else {
          // Tạo khách hàng mới
          // Lưu ý: customerCode sẽ tự động mang giá trị null nếu không truyền 
          // (Hãy đảm bảo đã xóa index unique của customerCode trong DB)
          await Customer.create({
            name: normalizedName,
            phone: phone,
            email: item.email || "",
            address: item.address || "",
            taxCode: item.taxCode || "",
            isActive: true
          });
          createdCount++;
        }
      } catch (err) {
        // Log lỗi chi tiết cho từng dòng để trả về Frontend
        errors.push({
          name: item.name || 'Không xác định',
          error: err.message
        });
      }
    })
  );

  return { createdCount, updatedCount, errors };
};