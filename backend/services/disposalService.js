const ProductDisposal = require('../models/ProductDisposal');
const Variant = require('../models/Variant');
const Company = require('../models/Company');
const invoiceConnection = require('../database/invoiceConnection');

/**
 * Sinh mã phiếu hủy kho: PHK/YYMMDD/XXXX
 */
const generateDisposalCode = async () => {
    const today = new Date();
    const yy = today.getFullYear().toString().slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateCode = `${yy}${mm}${dd}`;

    const lastReceipt = await ProductDisposal.findOne({
        disposalCode: new RegExp(`^PHK/${dateCode}`)
    }).sort({ createdAt: -1 });

    let runningNumber = 1;
    if (lastReceipt && lastReceipt.disposalCode) {
        const parts = lastReceipt.disposalCode.split('/');
        if (parts.length >= 3) {
            const lastRunning = parseInt(parts[2], 10);
            if (!isNaN(lastRunning)) {
                runningNumber = lastRunning + 1;
            }
        }
    }
    return `PHK/${dateCode}/${runningNumber.toString().padStart(4, '0')}`;
};

exports.createDisposal = async (payload) => {
    if (!payload.items || payload.items.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một sản phẩm cần hủy');
    }
    if (!payload.reason || !payload.reason.trim()) {
        throw new Error('Vui lòng nhập lý do hủy sản phẩm');
    }

    const session = await invoiceConnection.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const disposalCode = await generateDisposalCode();
            const activeCompany = await Company.findOne({ isActive: true }).session(session);

            let totalQuantity = 0;

            // 1. Kiểm tra tồn kho và trừ kho từng sản phẩm
            for (const item of payload.items) {
                const qty = Number(item.quantity);
                if (isNaN(qty) || qty <= 0) {
                    throw new Error(`Số lượng hủy của sản phẩm ${item.sku || ''} không hợp lệ`);
                }

                const variant = await Variant.findById(item.variantId).session(session);
                if (!variant) {
                    throw new Error(`Không tìm thấy sản phẩm ${item.sku || item.variantId} trong hệ thống`);
                }

                if ((variant.inventory || 0) < qty) {
                    throw new Error(`Sản phẩm mã "${variant.sku}" không đủ tồn kho để hủy (Hiện có: ${variant.inventory || 0}, Yêu cầu hủy: ${qty})`);
                }

                // Trừ tồn kho
                await Variant.findByIdAndUpdate(
                    item.variantId,
                    { $inc: { inventory: -qty } },
                    { session }
                );

                totalQuantity += qty;
            }

            // 2. Lưu phiếu hủy sản phẩm
            const newDisposal = new ProductDisposal({
                disposalCode,
                staffId: payload.staffId,
                staffName: payload.staffName,
                companyInfo: activeCompany ? {
                    name: activeCompany.name,
                    phone: activeCompany.phone,
                    address: activeCompany.address,
                    email: activeCompany.email,
                    taxCode: activeCompany.taxCode
                } : null,
                reason: payload.reason.trim(),
                items: payload.items.map(it => ({
                    variantId: it.variantId,
                    sku: it.sku,
                    productName: it.productName,
                    colorCode: it.colorCode,
                    brand: it.brand,
                    unit: it.unit || 'Cây',
                    price: Number(it.price) || 0,
                    quantity: Number(it.quantity)
                })),
                totalQuantity,
                note: payload.note,
                isActive: true
            });

            result = await newDisposal.save({ session });
        });
        return result;
    } finally {
        session.endSession();
    }
};

exports.getDisposals = async ({ page = 1, limit = 10, keyword, dateFrom, dateTo, status = 'ALL' }) => {
    const filter = {};

    // Lọc theo trạng thái
    if (status === 'ACTIVE') {
        filter.isActive = true;
    } else if (status === 'CANCELLED') {
        filter.isActive = false;
    }

    // Lọc theo từ khóa tìm kiếm
    if (keyword && keyword.trim()) {
        const kw = keyword.trim();
        filter.$or = [
            { disposalCode: { $regex: kw, $options: 'i' } },
            { staffName: { $regex: kw, $options: 'i' } },
            { reason: { $regex: kw, $options: 'i' } },
            { 'items.sku': { $regex: kw, $options: 'i' } },
            { 'items.productName': { $regex: kw, $options: 'i' } }
        ];
    }

    // Lọc theo khoảng ngày
    if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
            const start = new Date(dateFrom);
            start.setHours(0, 0, 0, 0);
            filter.createdAt.$gte = start;
        }
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        ProductDisposal.find(filter)
            .populate({
                path: 'items.variantId',
                populate: { path: 'productId' }
            })
            .populate('staffId', 'name staffCode phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ProductDisposal.countDocuments(filter)
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

exports.getDisposalDetail = async (id) => {
    return await ProductDisposal.findById(id)
        .populate({
            path: 'items.variantId',
            populate: { path: 'productId' }
        })
        .populate('staffId', 'name staffCode phone')
        .lean();
};

exports.deleteDisposal = async (id) => {
    const session = await invoiceConnection.startSession();
    try {
        await session.withTransaction(async () => {
            const disposal = await ProductDisposal.findById(id).session(session);
            if (!disposal) throw new Error('Phiếu hủy không tồn tại');
            if (!disposal.isActive) throw new Error('Phiếu hủy này đã được xóa trước đó');

            // Hoàn lại kho số lượng đã hủy
            for (const item of disposal.items) {
                await Variant.findByIdAndUpdate(
                    item.variantId,
                    { $inc: { inventory: item.quantity } },
                    { session }
                );
            }

            disposal.isActive = false;
            await disposal.save({ session });
        });
        return { success: true };
    } finally {
        session.endSession();
    }
};

