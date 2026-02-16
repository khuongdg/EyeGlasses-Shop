// services/dashboardService.js
const Invoice = require('../models/Invoice');
const ImportReceipt = require('../models/ImportReceipt');
const Variant = require('../models/Variant');
const Debt = require('../models/Debt');

exports.getStats = async ({ startDate, endDate }) => {
    const query = {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        isActive: true
    };

    // 1. Tính Doanh thu (Cash + Transfer + Completed Debts)
    const invoices = await Invoice.find(query).lean();
    const invoiceIds = invoices.map(i => i._id);

    // Lấy danh sách nợ tương ứng của các hóa đơn này
    const debts = await Debt.find({ invoiceId: { $in: invoiceIds } }).lean();

    let revenue = 0;
    invoices.forEach(inv => {
        if (inv.paymentMethod === 'CASH' || inv.paymentMethod === 'TRANSFER') {
            revenue += inv.totalAmount;
        } else if (inv.paymentMethod === 'DEBT') {
            const debt = debts.find(d => d.invoiceId.toString() === inv._id.toString());
            // Theo yêu cầu: Chỉ tính nợ đã thu xong (COMPLETED)
            if (debt && debt.status === 'COMPLETED') {
                revenue += inv.totalAmount;
            }
        }
    });

    // 2. Tính Tiền vốn nhập hàng
    const imports = await ImportReceipt.find(query).lean();
    const totalImportCost = imports.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    // 3. Sản phẩm bán được (Top 5 sản phẩm)
    const productSales = {};
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const key = item.productName || item.sku;
            productSales[key] = (productSales[key] || 0) + item.quantity;
        });
    });

    const topProducts = Object.entries(productSales)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // 4. Lấy danh sách sản phẩm sắp hết hàng (inventory < 5)
    // Giả định bạn lưu tồn kho trong collection Variants
    const LowStockProducts = await Variant.find({
        inventory: { $lt: 5 },
        isActive: true
    })
        .populate('productId', 'name') // Lấy tên sản phẩm từ collection Products
        .lean();

    const lowStockList = LowStockProducts.map(v => ({
        name: v.productId?.name || 'N/A',
        sku: v.sku,
        inventory: v.inventory,
        unit: v.unit
    }));

    return {
        revenue,
        importCost: totalImportCost,
        profit: revenue - totalImportCost,
        topProducts,
        totalSalesCount: invoices.length,
        lowStockList
    };
};