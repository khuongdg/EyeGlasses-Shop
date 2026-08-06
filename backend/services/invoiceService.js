const mongoose = require('mongoose');
const invoiceConnection = require('../database/invoiceConnection');
const Invoice = require('../models/Invoice');
const Variant = require('../models/Variant');
const Company = require('../models/Company');
const Debt = require('../models/Debt');
const { generateQRCode } = require('../utils/qrCode');
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

    // 5. Tạo Object Invoice với dữ liệu Snapshot
    const newInvoice = new Invoice({
      invoiceCode,
      companyInfo: {
        name: activeCompany.name,
        address: activeCompany.address,
        phone: activeCompany.phone,
        taxCode: activeCompany.taxCode
      },
      customerId: payload.customerId || undefined,
      customerName: payload.customerName || (payload.isSample ? 'Hàng mẫu' : 'Khách lẻ'),
      customerPhone: payload.customerPhone || '',
      customerAddress: payload.customerAddress || '',
      customerTaxCode: payload.customerTaxCode || '',
      staffId: payload.staffId,
      staffName: payload.staffName,
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
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
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
  isActive,
  paymentMethod,
  dateFrom,
  dateTo,
  isSample
}) => {
  const filter = {
    isDraft: { $ne: true } // Không bao giờ hiển thị bản nháp trong danh sách phiếu
  };

  // Lọc theo isSample (tem mẫu)
  if (isSample !== undefined) {
    filter.isSample = isSample === 'true' || isSample === true;
  } else {
    filter.isSample = { $ne: true };
  }

  // Lọc theo trạng thái hoạt động hoặc đã hủy
  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  // Lọc theo phương thức thanh toán
  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  // Tìm kiếm theo mã phiếu, tên khách hàng hoặc SĐT khách hàng (Snapshot)
  if (keyword) {
    filter.$or = [
      { invoiceCode: { $regex: keyword, $options: 'i' } },
      { customerName: { $regex: keyword, $options: 'i' } },
      { customerPhone: { $regex: keyword, $options: 'i' } }
    ];
  }

  // Lọc theo khoảng thời gian
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(new Date(dateFrom).setHours(0, 0, 0, 0));
    if (dateTo) filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
  }

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      // Populate để lấy thông tin gốc nếu cần đối chiếu
      .populate('customerId', 'name phone address taxCode')
      .populate('staffId', 'name staffCode')
      // Populate variant trong mảng items để lấy thông tin sản phẩm đầy đủ
      .populate('items.variantId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // Dùng lean để tăng tốc độ truy vấn

    Invoice.countDocuments(filter)
  ]);

  return {
    data: invoices,
    total,
    page,
    limit
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
exports.getDebts = async ({ keyword, status, page = 1, limit = 10 }) => {
  const filter = { status: { $ne: 'CANCELLED' } };
  if (status) filter.status = status;
  if (keyword) {
    const matchingInvoices = await Invoice.find({
      invoiceCode: { $regex: keyword, $options: 'i' }
    }).select('_id').lean();
    const invoiceIds = matchingInvoices.map(inv => inv._id);

    filter.$or = [
      { customerName: { $regex: keyword, $options: 'i' } },
      { customerPhone: { $regex: keyword, $options: 'i' } },
      { invoiceId: { $in: invoiceIds } }
    ];
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
