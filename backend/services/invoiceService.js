const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');
const Invoice = require('../models/Invoice');
const Variant = require('../models/Variant');
const Company = require('../models/Company');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const { generateQRCode } = require('../utils/qrCode');

/**
 * Tạo RegExp tìm kiếm tiếng Việt linh hoạt: hỗ trợ cả có dấu và không dấu
 */
const makeVietnameseRegex = (str) => {
  if (!str) return null;
  const escaped = str.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const accentMap = {
    'a': '[aàáảãạăằắẳẵặâầấẩẫậAÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ]',
    'e': '[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]',
    'i': '[iìíỉĩịIÌÍỈĨỊ]',
    'o': '[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]',
    'u': '[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]',
    'y': '[yỳýỷỹỵYỲÝỶỸỴ]',
    'd': '[dđDĐ]'
  };
  let pattern = '';
  for (const char of escaped) {
    const lower = char.toLowerCase();
    const base = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/, 'd');
    if (accentMap[base]) {
      pattern += accentMap[base];
    } else {
      pattern += char;
    }
  }
  return new RegExp(pattern, 'i');
};
/**
 * Sinh mã phiếu xuất kho hoặc phiếu in tem mẫu
 * Format: PXK/YYMMDD/XXXX hoặc PTM/YYMMDD/XXXX
 */
const generateInvoiceCode = async (isSample = false) => {
  const today = new Date();

  const yy = today.getFullYear().toString().slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const dateCode = `${yy}${mm}${dd}`;
  const prefix = isSample ? 'PTM' : 'PXK';

  // Tìm phiếu cuối cùng trong ngày có cùng prefix
  const lastInvoice = await Invoice.findOne({
    invoiceCode: new RegExp(`^${prefix}/${dateCode}`)
  })
    .sort({ createdAt: -1 })
    .select('invoiceCode');

  let runningNumber = 1;

  if (lastInvoice) {
    const lastRunning = parseInt(
      lastInvoice.invoiceCode.split('/')[2]
    );
    if (!isNaN(lastRunning)) {
      runningNumber = lastRunning + 1;
    }
  }

  return `${prefix}/${dateCode}/${runningNumber.toString().padStart(4, '0')}`;
};

exports.createInvoice = async (payload) => {
  const session = await invoiceConnection.startSession();
  session.startTransaction();

  try {
    // 1. Lấy thông tin công ty đang active để làm snapshot
    const activeCompany = await Company.findOne({ isActive: true }).session(session);
    if (!activeCompany) {
      throw new Error('Chưa cấu hình công ty sử dụng. Vui lòng kiểm tra mục Quản lý công ty.');
    }

    // 2. Sinh mã phiếu mới
    const invoiceCode = await generateInvoiceCode(payload.isSample === true);

    // 3. Xử lý danh sách sản phẩm & Sinh QR Code cho từng item
    const itemsWithQr = [];
    for (const item of payload.items) {
      // Dữ liệu nội dung QR Code theo yêu cầu
      const qrData = `NK và phân phối: ${activeCompany.name}. Đ/c: ${activeCompany.address}. Xuất xứ: ${item.originCountry || 'N/A'}. Mã hàng: ${item.sku}. Cửa hàng: ${item.customerName || payload.customerName || (payload.isSample ? 'Hàng mẫu' : 'Khách lẻ')}`;

      const qrBase64 = await generateQRCode(qrData);

      itemsWithQr.push({
        ...item,
        rowTotal: (item.quantity * item.price) - ((item.quantity * item.price * (item.discountPercent || 0)) / 100),
        itemQrCode: qrBase64 // Lưu vào DB để in tem sau này
      });

      // 4. Cập nhật tồn kho (Trừ kho) nếu không phải là in tem mẫu
      const variant = await Variant.findById(item.variantId).session(session);
      if (!variant) {
        throw new Error(`Sản phẩm (ID: ${item.variantId}) không tồn tại.`);
      }
      if (!payload.isSample) {
        if (variant.inventory < item.quantity) {
          throw new Error(`Sản phẩm mã ${variant.sku} không đủ tồn kho (Hiện có: ${variant.inventory}).`);
        }
        variant.inventory -= item.quantity;
        await variant.save({ session });
      }
    }

    // 5. Chuẩn hóa thông tin Snapshot Khách hàng & Nhân viên
    let customerName = payload.customerName;
    let customerPhone = payload.customerPhone;
    let customerAddress = payload.customerAddress;
    let customerTaxCode = payload.customerTaxCode;

    if (payload.customerId && (!customerName || customerName === 'Khách lẻ')) {
      const customerDoc = await Customer.findById(payload.customerId).session(session);
      if (customerDoc) {
        customerName = customerDoc.name;
        customerPhone = customerPhone || customerDoc.phone;
        customerAddress = customerAddress || customerDoc.address;
        customerTaxCode = customerTaxCode || customerDoc.taxCode;
      }
    }

    let staffName = payload.staffName;
    if (payload.staffId && !staffName) {
      const staffDoc = await Staff.findById(payload.staffId).session(session);
      if (staffDoc) {
        staffName = staffDoc.name;
      }
    }

    // 6. Tạo Object Invoice với dữ liệu Snapshot
    const newInvoice = new Invoice({
      invoiceCode,
      companyInfo: {
        name: activeCompany.name,
        address: activeCompany.address,
        phone: activeCompany.phone,
        taxCode: activeCompany.taxCode
      },
      customerId: payload.customerId || undefined,
      customerName: customerName || (payload.isSample ? 'Hàng mẫu' : 'Khách lẻ'),
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerTaxCode: customerTaxCode || '',
      staffId: payload.staffId,
      staffName: staffName || '',
      items: itemsWithQr,
      totalQuantity: payload.totalQuantity,
      subTotal: payload.isSample ? undefined : payload.subTotal,
      totalDiscount: payload.isSample ? undefined : (payload.totalDiscount || 0),
      totalAmount: payload.isSample ? undefined : payload.totalAmount,
      paymentMethod: payload.isSample ? undefined : (payload.paymentMethod || 'CASH'),
      note: payload.note || '',
      isSample: payload.isSample === true
    });

    await newInvoice.save({ session });
    // NẾU LÀ CÔNG NỢ & Không phải in tem mẫu -> TẠO BẢN GHI DEBT
    if (payload.paymentMethod === 'DEBT' && !payload.isSample) {
      const newDebt = new Debt({
        invoiceId: newInvoice._id,
        customerName: newInvoice.customerName,
        customerPhone: newInvoice.customerPhone,
        totalAmount: payload.totalAmount,
        remainingAmount: payload.totalAmount, // Ban đầu nợ bằng tổng tiền
        status: 'UNPAID'
      });
      await newDebt.save({ session });
    }
    await session.commitTransaction();

    return newInvoice;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// invoiceService.js
exports.getInvoices = async ({
  page = 1,
  limit = 10,
  keyword,
  status,
  isActive,
  paymentMethod,
  dateFrom,
  dateTo,
  isSample,
  customerId,
  customerPhone
}) => {
  const andConditions = [
    { isDraft: { $ne: true } } // Không bao giờ hiển thị bản nháp trong danh sách phiếu
  ];

  // Lọc theo isSample (tem mẫu)
  if (isSample !== undefined) {
    andConditions.push({ isSample: isSample === 'true' || isSample === true });
  } else {
    andConditions.push({ isSample: { $ne: true } });
  }

  // Lọc theo trạng thái thực tế của phiếu xuất kho
  if (status && status !== 'ALL') {
    if (status === 'CANCELLED') {
      andConditions.push({ isActive: false });
    } else if (status === 'COMPLETED') {
      // Hoàn thành: các phiếu đã xuất thành công (tiền mặt / chuyển khoản hoặc công nợ đã trả xong)
      const completedDebts = await Debt.find({ status: 'COMPLETED' }).select('invoiceId').lean();
      const completedInvoiceIds = completedDebts.map((d) => d.invoiceId);
      andConditions.push({
        isActive: true,
        $or: [
          { paymentMethod: { $in: ['CASH', 'TRANSFER'] } },
          { _id: { $in: completedInvoiceIds } }
        ]
      });
    } else if (status === 'UNPAID') {
      // Chưa trả: phiếu công nợ chưa thanh toán
      const unpaidDebts = await Debt.find({ status: { $in: ['UNPAID', 'PENDING'] } }).select('invoiceId').lean();
      const unpaidInvoiceIds = unpaidDebts.map((d) => d.invoiceId);
      andConditions.push({
        isActive: true,
        paymentMethod: 'DEBT',
        _id: { $in: unpaidInvoiceIds }
      });
    } else if (status === 'PARTIAL') {
      // Trả một phần: phiếu công nợ đã thanh toán 1 phần
      const partialDebts = await Debt.find({ status: 'PARTIAL' }).select('invoiceId').lean();
      const partialInvoiceIds = partialDebts.map((d) => d.invoiceId);
      andConditions.push({
        isActive: true,
        paymentMethod: 'DEBT',
        _id: { $in: partialInvoiceIds }
      });
    }
  } else if (isActive !== undefined) {
    andConditions.push({ isActive });
  }

  // Lọc theo phương thức thanh toán
  if (paymentMethod) {
    andConditions.push({ paymentMethod });
  }

  // Lọc theo khách hàng (ưu tiên lọc chính xác theo customerId nếu có)
  if (customerId) {
    andConditions.push({ customerId });
  } else if (customerPhone) {
    andConditions.push({ customerPhone });
  }

  // Tìm kiếm theo mã phiếu, tên/SĐT khách hàng hoặc nhân viên (cả snapshot lẫn collection Customer & Staff)
  if (keyword && keyword.trim()) {
    const vnRegex = makeVietnameseRegex(keyword);

    // 1. Tìm các customerId khớp từ collection Customer (tên, SĐT, mã khách hàng)
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: vnRegex } },
        { phone: { $regex: vnRegex } },
        { customerCode: { $regex: vnRegex } }
      ]
    }).select('_id').lean();
    const matchingCustomerIds = matchingCustomers.map((c) => c._id);

    // 2. Tìm các staffId khớp từ collection Staff (tên, SĐT, mã nhân viên)
    const matchingStaffs = await Staff.find({
      $or: [
        { name: { $regex: vnRegex } },
        { phone: { $regex: vnRegex } },
        { staffCode: { $regex: vnRegex } }
      ]
    }).select('_id').lean();
    const matchingStaffIds = matchingStaffs.map((s) => s._id);

    // 3. Xây dựng điều kiện $or cho Invoice
    const searchConditions = [
      { invoiceCode: { $regex: vnRegex } },
      { customerName: { $regex: vnRegex } },
      { customerPhone: { $regex: vnRegex } },
      { staffName: { $regex: vnRegex } }
    ];

    if (matchingCustomerIds.length > 0) {
      searchConditions.push({ customerId: { $in: matchingCustomerIds } });
    }
    if (matchingStaffIds.length > 0) {
      searchConditions.push({ staffId: { $in: matchingStaffIds } });
    }

    andConditions.push({ $or: searchConditions });
  }

  // Lọc theo khoảng thời gian
  if (dateFrom || dateTo) {
    const dateCond = {};
    if (dateFrom) dateCond.$gte = new Date(new Date(dateFrom).setHours(0, 0, 0, 0));
    if (dateTo) dateCond.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    andConditions.push({ createdAt: dateCond });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      // Populate thông tin cơ bản cần thiết cho danh sách phiếu
      .populate('customerId', 'name phone address taxCode')
      .populate('staffId', 'name staffCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // Dùng lean để tăng tốc độ truy vấn

    Invoice.countDocuments(filter)
  ]);

  // Lấy thông tin công nợ tương ứng với các phiếu xuất kho
  const invoiceIds = invoices.map((inv) => inv._id);
  const debts = await Debt.find({ invoiceId: { $in: invoiceIds } })
    .select('invoiceId status totalAmount paidAmount remainingAmount')
    .lean();

  const debtMap = new Map();
  debts.forEach((d) => {
    if (d.invoiceId) {
      debtMap.set(d.invoiceId.toString(), d);
    }
  });

  const enrichedInvoices = invoices.map((inv) => {
    const debt = debtMap.get(inv._id.toString());
    return {
      ...inv,
      debt: debt || null
    };
  });

  // Thống kê tổng số đơn và chi tiêu nếu truy vấn theo khách hàng
  let stats = null;
  if (customerId || customerPhone) {
    try {
      const matchConditions = [
        { isDraft: { $ne: true } },
        { isActive: { $ne: false } } // Loại trừ hoàn toàn các đơn hàng đã bị hủy khỏi thống kê
      ];
      if (isSample !== undefined) {
        matchConditions.push({ isSample: isSample === 'true' || isSample === true });
      } else {
        matchConditions.push({ isSample: { $ne: true } });
      }

      if (customerId) {
        const cId = mongoose.Types.ObjectId.isValid(customerId)
          ? new mongoose.Types.ObjectId(customerId)
          : customerId;
        matchConditions.push({ customerId: cId });
      } else if (customerPhone) {
        matchConditions.push({ customerPhone });
      }

      const statsResult = await Invoice.aggregate([
        { $match: { $and: matchConditions } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalQuantity: { $sum: { $ifNull: ['$totalQuantity', 0] } }
          }
        }
      ]);

      stats = statsResult[0] ? {
        totalOrders: statsResult[0].totalOrders || 0,
        totalSpent: statsResult[0].totalSpent || 0,
        totalQuantity: statsResult[0].totalQuantity || 0
      } : { totalOrders: 0, totalSpent: 0, totalQuantity: 0 };
    } catch (err) {
      console.error('Invoice stats aggregation error:', err);
    }
  }

  return {
    data: enrichedInvoices,
    total,
    page,
    limit,
    stats
  };
};


exports.cancelInvoice = async (invoiceId) => {
  const session = await invoiceConnection.startSession();

  try {
    let resultInvoice;

    // withTransaction tự động start/commit/abort transaction và RETRY khi gặp Write Conflict
    await session.withTransaction(async () => {
      // 1. Tìm phiếu và kiểm tra điều kiện hủy
      const invoice = await Invoice.findById(invoiceId).session(session);

      if (!invoice) {
        throw new Error('Không tìm thấy phiếu xuất kho.');
      }

      if (!invoice.isActive) {
        throw new Error('Phiếu này đã được hủy trước đó.');
      }

      // Nếu là phiếu in tem mẫu -> Xóa vĩnh viễn khỏi Database
      if (invoice.isSample) {
        await Invoice.findByIdAndDelete(invoiceId).session(session);
        resultInvoice = { _id: invoiceId, isDeleted: true };
      } else {
        // 2. Hoàn kho cho từng sản phẩm bằng $inc nếu không phải phiếu in mẫu
        const inventoryPromises = invoice.items.map(item => {
          return Variant.findByIdAndUpdate(
            item.variantId,
            { $inc: { inventory: item.quantity } }, // Cộng lại số lượng vào kho
            { session, new: true }
          );
        });
        await Promise.all(inventoryPromises);

        // 3. Cập nhật trạng thái phiếu xuất kho
        invoice.isActive = false;
        await invoice.save({ session });

        // 4. Cập nhật trạng thái công nợ sang CANCELLED nếu không phải phiếu in mẫu
        await Debt.findOneAndUpdate(
          { invoiceId: invoice._id },
          { status: 'CANCELLED' },
          { session }
        );

        resultInvoice = invoice;
      }
    });

    return resultInvoice;
  } catch (error) {
    // Nếu sau các lần retry mặc định của MongoDB vẫn lỗi, nó sẽ ném ra catch này
    console.error("Lỗi khi hủy phiếu:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cập nhật thanh toán công nợ
 */
exports.updateDebtPayment = async (debtId, paymentData) => {
  const session = await invoiceConnection.startSession();
  session.startTransaction();

  try {
    const { amount, note, staffName } = paymentData;

    // 1. Tìm bản ghi nợ
    const debt = await Debt.findById(debtId).session(session);
    if (!debt) throw new Error('Không tìm thấy bản ghi công nợ.');

    if (debt.status === 'COMPLETED') throw new Error('Công nợ này đã hoàn thành thanh toán.');
    if (debt.status === 'CANCELLED') throw new Error('Phiếu xuất kho này đã bị hủy, không thể thu nợ.');

    // 2. Kiểm tra số tiền thanh toán
    if (amount <= 0) throw new Error('Số tiền thanh toán phải lớn hơn 0.');
    if (amount > debt.remainingAmount) throw new Error('Số tiền trả vượt quá số nợ còn lại.');

    // 3. Cập nhật lịch sử và tính toán tiền
    debt.paymentHistory.push({
      amount,
      note,
      staffName,
      paymentDate: new Date()
    });

    debt.paidAmount += amount;
    debt.remainingAmount -= amount;

    // 4. Cập nhật trạng thái
    if (debt.remainingAmount === 0) {
      debt.status = 'COMPLETED';
    } else {
      debt.status = 'PARTIAL';
    }

    await debt.save({ session });
    await session.commitTransaction();

    return debt;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Lấy danh sách công nợ có lọc
 */
exports.getDebts = async ({ keyword, status, page = 1, limit = 10, dateFrom, dateTo }) => {
  const filter = { status: { $ne: 'CANCELLED' } };
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(new Date(dateFrom).setHours(0, 0, 0, 0));
    if (dateTo) filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
  }
  if (keyword && keyword.trim()) {
    const vnRegex = makeVietnameseRegex(keyword);

    // Tìm các customerId khớp
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: vnRegex } },
        { phone: { $regex: vnRegex } },
        { customerCode: { $regex: vnRegex } }
      ]
    }).select('_id').lean();
    const matchingCustomerIds = matchingCustomers.map((c) => c._id);

    const invoiceSearchConditions = [
      { invoiceCode: { $regex: vnRegex } }
    ];
    if (matchingCustomerIds.length > 0) {
      invoiceSearchConditions.push({ customerId: { $in: matchingCustomerIds } });
    }

    const matchingInvoices = await Invoice.find({
      $or: invoiceSearchConditions
    }).select('_id').lean();
    const invoiceIds = matchingInvoices.map((inv) => inv._id);

    const debtOrConditions = [
      { customerName: { $regex: vnRegex } },
      { customerPhone: { $regex: vnRegex } }
    ];
    if (invoiceIds.length > 0) {
      debtOrConditions.push({ invoiceId: { $in: invoiceIds } });
    }

    filter.$or = debtOrConditions;
  }

  const skip = (page - 1) * limit;
  const [debts, total, stats] = await Promise.all([
    Debt.find(filter)
      .populate('invoiceId', 'invoiceCode createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Debt.countDocuments(filter),
    Debt.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRemaining: { $sum: '$remainingAmount' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ])
  ]);

  const totalRemaining = stats[0]?.totalRemaining || 0;
  const totalPaid = stats[0]?.totalPaid || 0;

  return { data: debts, total, page, limit, totalRemaining, totalPaid };
};
const cleanObjectId = (val) => {
  if (!val) return undefined;
  const idStr = typeof val === 'object' ? (val._id || val.id) : String(val);
  return (idStr && mongoose.Types.ObjectId.isValid(idStr)) ? idStr : undefined;
};

/**
 * Lưu bản nháp phiếu xuất kho lên DB
 * Nếu draftId được truyền → cập nhật bản nháp cũ
 * Nếu không → tạo bản nháp mới
 */
exports.saveDraft = async (payload) => {
  const rawId = payload.draftId || payload.id;
  const targetId = cleanObjectId(rawId);
  const draftData = payload.formData || payload;

  const validPaymentMethods = ['CASH', 'TRANSFER', 'DEBT', 'NONE'];
  const paymentMethod = validPaymentMethods.includes(draftData.paymentMethod) ? draftData.paymentMethod : 'DEBT';

  // Thử drop index invoiceCode_1 cũ nếu nó không phải sparse index trên MongoDB Atlas
  try {
    await Invoice.collection.dropIndex('invoiceCode_1');
  } catch (e) {
    // Ignore nếu index đã được drop hoặc chưa khởi tạo
  }

  const draftFields = {
    isDraft: true,
    customerId: cleanObjectId(draftData.customerId),
    customerName: draftData.customerName || '',
    customerPhone: draftData.customerPhone || '',
    customerAddress: draftData.customerAddress || '',
    customerTaxCode: draftData.customerTaxCode || '',
    staffId: cleanObjectId(draftData.staffId),
    staffName: draftData.staffName || '',
    items: (draftData.items || []).map(item => ({
      variantId: cleanObjectId(item?.variantId),
      sku: item?.sku || '',
      productName: item?.productName || '',
      brand: item?.brand || '',
      originCountry: item?.originCountry || '',
      unit: item?.unit || '',
      price: Number(item?.price) || 0,
      quantity: Number(item?.quantity) || 0,
      discountPercent: Number(item?.discountPercent) || 0,
      rowTotal: Number(item?.rowTotal) || (Number(item?.price || 0) * Number(item?.quantity || 0) * (1 - (Number(item?.discountPercent || 0)) / 100)) || 0,
      customerName: item?.customerName || ''
    })),
    totalQuantity: Number(draftData.totalQuantity) || 0,
    subTotal: Number(draftData.subTotal) || 0,
    totalDiscount: Number(draftData.totalDiscount) || 0,
    totalAmount: Number(draftData.totalAmount) || 0,
    paymentMethod,
    note: draftData.note || ''
  };

  if (targetId) {
    // Cập nhật đè lên bản nháp cũ nếu đã tồn tại ID
    const updated = await Invoice.findOneAndUpdate(
      { _id: targetId, isDraft: true },
      { $set: draftFields },
      { new: true }
    );
    if (updated) return updated;
  }

  // Tự động sinh mã nháp duy nhất DRAFT-timestamp để đảm bảo không bao giờ bị trùng null trên MongoDB
  draftFields.invoiceCode = `DRAFT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Tạo bản nháp mới nếu chưa có ID
  const newDraft = new Invoice(draftFields);
  await newDraft.save();
  return newDraft;
};

/**
 * Lấy danh sách tất cả bản nháp
 */
exports.getDrafts = async () => {
  return Invoice.find({ isDraft: true })
    .populate('customerId', 'name phone address taxCode')
    .populate('staffId', 'name staffCode')
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Xóa một bản nháp theo ID
 */
exports.deleteDraft = async (draftId) => {
  const deleted = await Invoice.findOneAndDelete({ _id: draftId, isDraft: true });
  if (!deleted) throw new Error('Không tìm thấy bản nháp để xóa.');
  return deleted;
};

/**
 * Cập nhật ghi chú nội bộ (adminNote) của phiếu xuất kho
 */
exports.updateInvoiceAdminNote = async (invoiceId, adminNote) => {
  const invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    { $set: { adminNote } },
    { new: true }
  );
  if (!invoice) throw new Error('Không tìm thấy phiếu xuất kho.');
  return invoice;
};

/**
 * Lấy chi tiết một phiếu xuất kho theo ID (nạp đầy đủ variant và công nợ)
 */
exports.getInvoiceById = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate('customerId', 'name phone address taxCode email')
    .populate('staffId', 'name staffCode')
    .populate('items.variantId')
    .lean();

  if (!invoice) return null;

  const debt = await Debt.findOne({ invoiceId: invoice._id })
    .select('invoiceId status totalAmount paidAmount remainingAmount paymentHistory')
    .lean();

  return {
    ...invoice,
    debt: debt || null
  };
};
