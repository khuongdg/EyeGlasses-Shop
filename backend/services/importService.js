const ImportReceipt = require('../models/ImportReceipt');
const Variant = require('../models/Variant');
const invoiceConnection = require('../database/invoiceConnection');

/**
 * Sinh mã phiếu nhập kho: PNK/YYMMDD/XXXX
 */
const generateImportCode = async () => {
    const today = new Date();
    const yy = today.getFullYear().toString().slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateCode = `${yy}${mm}${dd}`;

    const lastReceipt = await ImportReceipt.findOne({
        importCode: new RegExp(`^PNK/${dateCode}`)
    }).sort({ createdAt: -1 });

    let runningNumber = 1;
    if (lastReceipt) {
        const lastRunning = parseInt(lastReceipt.importCode.split('/')[2]);
        runningNumber = lastRunning + 1;
    }
    return `PNK/${dateCode}/${runningNumber.toString().padStart(4, '0')}`;
};

exports.createImportReceipt = async (payload) => {
    const session = await invoiceConnection.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const importCode = await generateImportCode();

            // 1. Cập nhật tồn kho cho từng sản phẩm
            for (const item of payload.items) {
                await Variant.findByIdAndUpdate(
                    item.variantId,
                    { $inc: { inventory: item.quantity } },
                    { session }
                );
            }

            // 2. Lưu phiếu nhập
            const newReceipt = new ImportReceipt({
                importCode,
                staffId: payload.staffId,
                staffName: payload.staffName,
                items: payload.items,
                totalQuantity: payload.totalQuantity,
                totalAmount: payload.totalAmount,
                supplier: payload.supplier,
                note: payload.note
            });

            result = await newReceipt.save({ session });
        });
        return result;
    } finally {
        session.endSession();
    }
};

exports.getImportReceipts = async ({ page = 1, limit = 10, keyword }) => {
    const filter = { isActive: true };
    if (keyword) {
        filter.importCode = { $regex: keyword, $options: 'i' };
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        ImportReceipt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ImportReceipt.countDocuments(filter)
    ]);
    return { data, total, page, limit };
};

exports.getImportDetail = async (id) => {
    return await ImportReceipt.findById(id).populate('items.variantId').lean();
};

exports.deleteImportReceipt = async (id) => {
    const session = await invoiceConnection.startSession();
    try {
        await session.withTransaction(async () => {
            const receipt = await ImportReceipt.findById(id).session(session);
            if (!receipt || !receipt.isActive) throw new Error('Phiếu không tồn tại hoặc đã xóa');

            // Hoàn trả kho (trừ lại số lượng đã nhập)
            for (const item of receipt.items) {
                await Variant.findByIdAndUpdate(
                    item.variantId,
                    { $inc: { inventory: -item.quantity } },
                    { session }
                );
            }
            receipt.isActive = false;
            await receipt.save({ session });
        });
        return { success: true };
    } finally {
        session.endSession();
    }
};