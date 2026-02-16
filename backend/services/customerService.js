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