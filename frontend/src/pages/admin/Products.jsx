import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    Table,
    Button,
    Input,
    Select,
    InputNumber,
    Space,
    Modal,
    Form,
    message,
    Tag,
    Popconfirm,
    Grid,
    Upload,
    Dropdown,
    Typography,
    Row,
    Col
} from 'antd';
import { PlusOutlined, FileExcelOutlined, DownloadOutlined, BarChartOutlined, DownOutlined, SearchOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    searchProducts,
    aiBulkImport,
    getAllVariants
} from '../../services/productService';
import { getAllImports } from '../../services/importService';

const { Title } = Typography;

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [searchKeyword, setSearchKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [importLoading, setImportLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const navigate = useNavigate();

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    const handleAIImport = (file) => {
        const reader = new FileReader();
        setImportLoading(true);

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                console.log("Dữ liệu thô:", rawData);

                // AI Logic: Gộp các dòng trùng "Mã hàng" thành 1 sản phẩm có nhiều variant
                // Hỗ trợ tự động lấp đầy (fill forward) khi người dùng gộp ô (Merge cells) cột Mã hàng
                const groupedMap = new Map();
                let lastProductCode = '';
                let lastBrand = 'Christian DG';
                let lastOrigin = 'PRC';
                let lastUnit = 'Cây';

                rawData.forEach(item => {
                    let productName = String(item['Mã hàng'] || '').trim();
                    if (productName) {
                        lastProductCode = productName;
                        if (item['Thương hiệu']) lastBrand = item['Thương hiệu'];
                        if (item['Xuất xứ']) lastOrigin = item['Xuất xứ'];
                        if (item['Đơn vị']) lastUnit = item['Đơn vị'];
                    } else if (lastProductCode) {
                        // Kế thừa giá trị khi ô Mã hàng được gộp ô (Merge cells)
                        productName = lastProductCode;
                    }

                    const color = String(item['Mã màu'] || item['Màu'] || '').trim().toUpperCase();

                    if (!productName) return;

                    if (!groupedMap.has(productName)) {
                        groupedMap.set(productName, {
                            name: productName,
                            brand: item['Thương hiệu'] || lastBrand,
                            originCountry: item['Xuất xứ'] || lastOrigin,
                            variants: []
                        });
                    }

                    const product = groupedMap.get(productName);
                    product.variants.push({
                        sku: `${productName}_${color}`, // Tự động sinh SKU theo quy tắc
                        colorCode: color,
                        unit: item['Đơn vị'] || lastUnit,
                        price: Number(item['Giá bán'] || item['Giá'] || 0),
                        inventory: 0
                    });
                });

                const finalData = Array.from(groupedMap.values());

                if (finalData.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ");

                const res = await aiBulkImport(finalData);

                // Lấy thông tin chi tiết từ kết quả Backend trả về
                const { created, updated, errors } = res.data.data;

                message.success({
                    content: `AI Import thành công! Tạo mới: ${created} | Cập nhật: ${updated}`,
                    duration: 5,
                });

                if (errors && errors.length > 0) {
                    Modal.warning({
                        title: 'Lưu ý: Một số sản phẩm bị lỗi',
                        content: (
                            <ul className="max-h-40 overflow-y-auto">
                                {errors.map((err, idx) => (
                                    <li key={idx} className="text-red-500 text-xs">
                                        - {err.name}: {err.error}
                                    </li>
                                ))}
                            </ul>
                        )
                    });
                }
                fetchProducts('', 1, pagination.pageSize);
            } catch (err) {
                message.error(err.message || "Lỗi xử lý file Excel");
            } finally {
                setImportLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();

        // ================= SHEET 1: ĐIỀN DỮ LIỆU =================
        const worksheet1 = workbook.addWorksheet('Template_NhapKho');
        worksheet1.columns = [
            { header: 'Mã hàng', key: 'sku', width: 15 },
            { header: 'Mã màu', key: 'color', width: 12 },
            { header: 'Thương hiệu', key: 'brand', width: 18 },
            { header: 'Xuất xứ', key: 'origin', width: 15 },
            { header: 'Đơn vị', key: 'unit', width: 10 },
            { header: 'Giá bán', key: 'price', width: 15 },
            { header: 'Giá vốn', key: 'importPrice', width: 15 },
            { header: 'Số lượng', key: 'quantity', width: 12 },
        ];
        worksheet1.spliceRows(1, 1);

        const headerRow = worksheet1.addRow(['Mã hàng', 'Mã màu', 'Thương hiệu', 'Xuất xứ', 'Đơn vị', 'Giá bán', 'Giá vốn', 'Số lượng']);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
            cell.font = { name: 'Arial', bold: true, color: { argb: 'FF006100' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        headerRow.height = 25;

        const sampleData = [
            ['8619', 'C1', 'Christian DG', 'PRC', 'Cây', 250000, 150000, 10],
            ['8619', 'C3', 'Christian DG', 'PRC', 'Cây', 250000, 150000, 5],
            ['8617', 'C1', 'Christian DG', 'PRC', 'Cây', 280000, 165000, 20],
        ];
        sampleData.forEach(row => {
            const r = worksheet1.addRow(row);
            r.height = 24;
            [1, 2, 3, 4, 5, 8].forEach(colIdx => r.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' });
            [6, 7].forEach(colIdx => {
                r.getCell(colIdx).numFmt = '#,##0';
                r.getCell(colIdx).alignment = { horizontal: 'right', vertical: 'middle' };
            });
            r.eachCell(cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
        });

        // Gộp các dòng có cùng Mã hàng trong file mẫu (giống lúc xuất file nhập hàng, không có số lô)
        worksheet1.mergeCells('A2:A3'); // Mã hàng
        worksheet1.mergeCells('C2:C3'); // Thương hiệu
        worksheet1.mergeCells('D2:D3'); // Xuất xứ
        worksheet1.mergeCells('E2:E3'); // Đơn vị


        // ================= SHEET 2: HƯỚNG DẪN & LƯU Ý =================
        const worksheet2 = workbook.addWorksheet('Hướng_Dẫn_Lưu_Ý');

        // Cấu hình độ rộng cột cho trang hướng dẫn
        worksheet2.columns = [
            { width: 25 }, // Cột Tiêu đề mục
            { width: 75 }  // Cột Nội dung chi tiết
        ];

        // 1. Tiêu đề trang hướng dẫn
        const guideTitle = worksheet2.addRow(['QUY ĐỊNH & HƯỚNG DẪN NHẬP FILE KHO HÀNG (AI IMPORT)']);
        worksheet2.mergeCells('A1:B1');
        guideTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1D6F42' } };
        guideTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        guideTitle.height = 35;
        worksheet2.addRow([]); // Dòng trống

        // 2. Nội dung các quy tắc
        const guidelines = [
            ['1. Quy tắc gộp sản phẩm:', 'Các dòng có cùng "Mã hàng" có thể gộp ô (Merge cells) lại hoặc để riêng từng dòng. Hệ thống sẽ tự động gộp thành 1 sản phẩm cha có các biến thể màu tương ứng.'],
            ['2. Quy tắc sinh mã SKU:', 'Hệ thống tự động nối chuỗi theo dạng: [Mã hàng]_[Mã màu] (Ví dụ dòng 1 sẽ sinh ra SKU: 8619_C1).'],
            ['3. Màu sắc (Mã màu):', 'Có thể điền mã màu bằng chữ thường hoặc in hoa, hệ thống sẽ tự động chuyển tất cả về dạng in hoa khi import. (Ví dụ: c1 hoặc C1 đều đúng).'],
            ['4. Định dạng cột Giá:', 'Nhập số nguyên trực tiếp (Ví dụ: 150000), KHÔNG gõ thêm chữ "đ" hay "VND" bằng tay.'],
            ['5. Xử lý hàng tồn kho:', 'Đối với sản phẩm/màu MỚI, tồn kho mặc định = 0. Đối với sản phẩm đã có sẵn, số lượng cũ trong máy được GIỮ NGUYÊN, hệ thống chỉ CẬP NHẬT giá mới.'],
            ['6. Lưu ý về tên cột:', 'TUYỆT ĐỐI không thay đổi tên hàng đầu tiên ở Sheet 1, có thể xoá các cột không cần thiết như "Thương hiệu"/"Xuất xứ"/"Đơn vị" nếu mặc định là "Christian DG"/"PRC"/"Cây"'],
            ['7. Lưu ý về dữ liệu:', 'Dữ liệu sản phẩm trên Sheet 1 chỉ là mẫu, hãy thay thế bằng dữ liệu thực tế để tránh nhầm lẫn.']
        ]

        guidelines.forEach(guideline => {
            const row = worksheet2.addRow(guideline);
            row.height = 30;

            // Cột tiêu đề quy định (Cột A)
            row.getCell(1).font = { name: 'Arial', bold: true, color: { argb: 'FFFF0000' } }; // Chữ đỏ cho chú ý
            row.getCell(1).alignment = { vertical: 'middle' };

            // Cột nội dung chi tiết (Cột B)
            row.getCell(2).font = { name: 'Arial', italic: true };
            row.getCell(2).alignment = { vertical: 'middle', wrapText: true }; // Tự động xuống dòng nếu text dài
        });

        // 3. Xuất file tích hợp cả 2 sheet về máy người dùng
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Mau_Nhap_Kho_Sieu_Thi_Kinh.xlsx');
        message.success('Tải file mẫu kèm hướng dẫn thành công!');
    };

    /* ================= XUẤT EXCEL THỐNG KÊ TỒN KHO THEO SỐ LÔ ================= */
    const exportInventoryToExcel = async () => {
        setExportLoading(true);
        try {
            // Lấy đồng thời danh sách biến thể tồn kho và toàn bộ phiếu nhập kho
            const [variantsRes, importsRes] = await Promise.all([
                getAllVariants({ limit: 100000 }),
                getAllImports({ limit: 100000 }).catch(err => {
                    console.warn('Không thể tải phiếu nhập kho, tiếp tục xuất tồn kho không phân lô:', err);
                    return { data: { data: [] } };
                })
            ]);

            const variants = variantsRes.data.data || [];
            const importList = importsRes.data?.data || [];

            if (variants.length === 0) {
                message.warning('Không có dữ liệu hàng tồn kho để xuất!');
                return;
            }

            // 1. Lập bảng lịch sử các đợt nhập kho theo SKU (sắp xếp từ MỚI NHẤT -> CŨ NHẤT)
            const sortedImports = [...importList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            const skuImportHistory = new Map();

            sortedImports.forEach(receipt => {
                const defaultBatch = (receipt.batchCode || '').trim() || 'Chưa phân lô';
                (receipt.items || []).forEach(item => {
                    const rawSku = (item.sku || item.variantId?.sku || '').trim().toUpperCase();
                    if (!rawSku) return;

                    const batchCode = (item.batchCode || '').trim() || defaultBatch;
                    const qty = Number(item.quantity) || 0;
                    const originCountry = item.originCountry || item.variantId?.productId?.originCountry;

                    if (!skuImportHistory.has(rawSku)) {
                        skuImportHistory.set(rawSku, []);
                    }

                    skuImportHistory.get(rawSku).push({
                        batchCode,
                        quantity: qty,
                        importPrice: Number(item.importPrice) || 0,
                        originCountry,
                        date: receipt.createdAt
                    });
                });
            });

            // 2. Gom nhóm dữ liệu tồn kho theo: Số lô -> Mã hàng -> Mã màu
            const batchMap = new Map();

            variants.forEach(v => {
                const rawSku = (v.sku || '').trim().toUpperCase();
                let productCode = '';
                let colorCode = '';

                if (v.productId?.name) {
                    productCode = v.productId.name.trim();
                    colorCode = v.colorCode || '';
                } else if (rawSku.includes('_')) {
                    const parts = rawSku.split('_');
                    productCode = parts[0];
                    colorCode = parts.slice(1).join('_');
                } else {
                    productCode = rawSku || 'N/A';
                    colorCode = v.colorCode || '-';
                }

                const brand = v.productId?.brand || 'Christian DG';
                const originCountry = v.productId?.originCountry || 'PRC';
                const unit = v.unit || 'Cây';
                const price = Number(v.price) || 0;
                const currentInv = Number(v.inventory) || 0;

                const addToBatch = (bCode, qty, origin) => {
                    const batch = (bCode || '').trim() || 'Chưa phân lô';
                    if (!batchMap.has(batch)) {
                        batchMap.set(batch, new Map());
                    }
                    const productMap = batchMap.get(batch);
                    if (!productMap.has(productCode)) {
                        productMap.set(productCode, {
                            productCode,
                            brand,
                            originCountry: origin || originCountry,
                            unit,
                            colors: new Map()
                        });
                    }
                    const prod = productMap.get(productCode);
                    if (!prod.colors.has(colorCode)) {
                        prod.colors.set(colorCode, {
                            colorCode,
                            price,
                            inventory: 0,
                            totalAmount: 0
                        });
                    }
                    const col = prod.colors.get(colorCode);
                    col.inventory += qty;
                    col.totalAmount += qty * price;
                };

                const history = skuImportHistory.get(rawSku) || [];

                if (history.length === 0) {
                    // Chưa từng nhập kho qua phiếu nhập -> gán vào 'Chưa phân lô'
                    addToBatch('Chưa phân lô', currentInv, originCountry);
                } else if (currentInv <= 0) {
                    // Hàng hết tồn kho (inventory = 0) -> gắn vào lô gần nhất để theo dõi
                    addToBatch(history[0].batchCode, 0, history[0].originCountry || originCountry);
                } else {
                    // Phân bổ tồn kho theo các lô nhập gần nhất (FIFO)
                    let remainingToAssign = currentInv;

                    for (const record of history) {
                        if (remainingToAssign <= 0) break;
                        const assignQty = Math.min(remainingToAssign, record.quantity);
                        if (assignQty > 0) {
                            addToBatch(record.batchCode, assignQty, record.originCountry || originCountry);
                            remainingToAssign -= assignQty;
                        }
                    }

                    // Nếu số lượng tồn kho còn vượt quá tổng số lượng trong các phiếu nhập, cộng vào lô gần nhất
                    if (remainingToAssign > 0) {
                        addToBatch(history[0].batchCode, remainingToAssign, history[0].originCountry || originCountry);
                    }
                }
            });

            if (batchMap.size === 0) {
                message.warning('Không tìm thấy dữ liệu tồn kho hợp lệ!');
                return;
            }

            // Sắp xếp các Số lô: Lô có mã (VD: T05-2026, T06-2026) xếp theo bảng chữ cái, 'Chưa phân lô' đưa xuống cuối
            const sortedBatchCodes = Array.from(batchMap.keys()).sort((a, b) => {
                if (a === 'Chưa phân lô') return 1;
                if (b === 'Chưa phân lô') return -1;
                return a.localeCompare(b);
            });

            // 3. Khởi tạo Workbook ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Thong_Ke_Ton_Kho');

            // Cấu hình các cột (đồng bộ cấu trúc với Xuất thống kê nhập hàng)
            worksheet.columns = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Số lô', key: 'batchCode', width: 16 },
                { header: 'Mã hàng', key: 'productCode', width: 16 },
                { header: 'Mã màu', key: 'colorCode', width: 12 },
                { header: 'Thương hiệu', key: 'brand', width: 18 },
                { header: 'Xuất xứ', key: 'originCountry', width: 14 },
                { header: 'ĐVT', key: 'unit', width: 10 },
                { header: 'Giá bán (₫)', key: 'price', width: 16 },
                { header: 'Số lượng tồn', key: 'inventory', width: 16 },
                { header: 'Thành tiền (₫)', key: 'totalAmount', width: 20 },
            ];

            // Tiêu đề Báo Cáo
            worksheet.spliceRows(1, 1);
            const titleRow = worksheet.addRow(['BÁO CÁO THỐNG KÊ CHI TIẾT TỒN KHO']);
            worksheet.mergeCells('A1:J1');
            titleRow.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1D6F42' } };
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 36;

            const subTitleRow = worksheet.addRow([`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị: Hệ thống quản trị kho`]);
            worksheet.mergeCells('A2:J2');
            subTitleRow.font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF555555' } };
            subTitleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            subTitleRow.height = 20;

            worksheet.addRow([]);

            // Header bảng
            const headerRow = worksheet.addRow([
                'STT',
                'Số lô',
                'Mã hàng',
                'Mã màu',
                'Thương hiệu',
                'Xuất xứ',
                'ĐVT',
                'Giá bán',
                'Số lượng tồn',
                'Thành tiền'
            ]);
            headerRow.height = 26;
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D6F42' } };
                cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // 4. Đổ dữ liệu từng Số lô: Cùng mã hàng gộp 1 ô, mã màu hiển thị theo mã hàng, mỗi số lô tính tổng riêng
            let sttCounter = 1;
            let grandTotalQty = 0;
            let grandTotalAmount = 0;

            sortedBatchCodes.forEach(batchCode => {
                const productMap = batchMap.get(batchCode);
                const sortedProducts = Array.from(productMap.values()).sort((a, b) => a.productCode.localeCompare(b.productCode));

                let batchTotalQty = 0;
                let batchTotalAmount = 0;
                const batchStartRow = worksheet.lastRow.number + 1;

                sortedProducts.forEach(prod => {
                    const colorList = Array.from(prod.colors.values()).sort((a, b) => a.colorCode.localeCompare(b.colorCode));
                    const prodStartRow = worksheet.lastRow.number + 1;

                    colorList.forEach(color => {
                        const row = worksheet.addRow([
                            sttCounter,
                            batchCode,
                            prod.productCode,
                            color.colorCode,
                            prod.brand,
                            prod.originCountry,
                            prod.unit,
                            color.price,
                            color.inventory,
                            color.totalAmount
                        ]);

                        row.height = 24;

                        // Căn chỉnh nội dung
                        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(2).font = { name: 'Arial', bold: true, color: { argb: 'FF1677FF' } };

                        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(3).font = { name: 'Arial', bold: true };

                        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

                        // Giá bán
                        row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
                        row.getCell(8).numFmt = '#,##0';

                        // Số lượng tồn
                        row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
                        row.getCell(9).font = { name: 'Arial', bold: true };
                        row.getCell(9).numFmt = '#,##0';

                        // Thành tiền
                        row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
                        row.getCell(10).font = { name: 'Arial', bold: true };
                        row.getCell(10).numFmt = '#,##0';

                        row.eachCell((cell) => {
                            cell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            };
                        });

                        batchTotalQty += color.inventory;
                        batchTotalAmount += color.totalAmount;
                    });

                    const prodEndRow = worksheet.lastRow.number;

                    // GỘP Ô CHO CÙNG MÃ HÀNG: Cùng mã hàng sẽ gộp lại thành 1 ô trên cột, mã màu hiển thị theo mã hàng đã gộp
                    if (prodEndRow > prodStartRow) {
                        worksheet.mergeCells(`A${prodStartRow}:A${prodEndRow}`); // STT
                        worksheet.mergeCells(`C${prodStartRow}:C${prodEndRow}`); // Mã hàng
                        worksheet.mergeCells(`E${prodStartRow}:E${prodEndRow}`); // Thương hiệu
                        worksheet.mergeCells(`F${prodStartRow}:F${prodEndRow}`); // Xuất xứ
                        worksheet.mergeCells(`G${prodStartRow}:G${prodEndRow}`); // ĐVT
                    }

                    sttCounter++;
                });

                const batchEndRow = worksheet.lastRow.number;

                // Gộp ô cột Số lô cho toàn bộ khối của lô đó
                if (batchEndRow > batchStartRow) {
                    worksheet.mergeCells(`B${batchStartRow}:B${batchEndRow}`);
                }

                // DÒNG TÍNH TỔNG RIÊNG CHO TỪNG SỐ LÔ (Tổng tồn kho và tổng tiền theo lô)
                const batchSummaryRow = worksheet.addRow([
                    `TỔNG SỐ LÔ [ ${batchCode} ]`,
                    '', '', '', '', '', '', '',
                    batchTotalQty,
                    batchTotalAmount
                ]);
                const bIdx = batchSummaryRow.number;
                worksheet.mergeCells(`A${bIdx}:H${bIdx}`);

                batchSummaryRow.height = 26;
                batchSummaryRow.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4FF' } }; // Màu xanh băng dịu mắt
                    cell.font = { name: 'Arial', bold: true, color: { argb: 'FF0958D9' } };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
                batchSummaryRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                batchSummaryRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
                batchSummaryRow.getCell(9).numFmt = '#,##0';
                batchSummaryRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
                batchSummaryRow.getCell(10).numFmt = '#,##0';

                // Cộng dồn vào tổng toàn bộ
                grandTotalQty += batchTotalQty;
                grandTotalAmount += batchTotalAmount;
            });

            // 5. Dòng Tổng Cộng toàn bộ các lô (Grand Total)
            const summaryRow = worksheet.addRow([
                'TỔNG CỘNG TOÀN BỘ CÁC LÔ',
                '', '', '', '', '', '', '',
                grandTotalQty,
                grandTotalAmount
            ]);
            const summaryRowIdx = summaryRow.number;
            worksheet.mergeCells(`A${summaryRowIdx}:H${summaryRowIdx}`);

            summaryRow.height = 28;
            summaryRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1E7DD' } }; // Nền xanh lá nổi bật
                cell.font = { name: 'Arial', bold: true, color: { argb: 'FF0F5132' } };
                cell.border = {
                    top: { style: 'medium' },
                    left: { style: 'thin' },
                    bottom: { style: 'double' },
                    right: { style: 'thin' }
                };
            });
            summaryRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            summaryRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
            summaryRow.getCell(9).numFmt = '#,##0';
            summaryRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
            summaryRow.getCell(10).numFmt = '#,##0';

            // Xuất file
            const buffer = await workbook.xlsx.writeBuffer();
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(new Blob([buffer]), `Thong_Ke_Ton_Kho_${dateStr}.xlsx`);
            message.success('Xuất file Excel thống kê tồn kho thành công!');
        } catch (err) {
            console.error('Lỗi xuất Excel tồn kho:', err);
            message.error(err.response?.data?.message || 'Có lỗi xảy ra khi xuất file Excel');
        } finally {
            setExportLoading(false);
        }
    };

    /* ================= FETCH ================= */
    const fetchProducts = async (keyword = searchKeyword, page = pagination.current, pageSize = pagination.pageSize, status = statusFilter) => {
        setLoading(true);
        try {
            const isActiveVal = status === 'ACTIVE' ? true : (status === 'INACTIVE' ? false : undefined);
            const res = await getProducts({ page, limit: pageSize, isActive: isActiveVal, keyword });

            setProducts(res.data.data || []);
            setPagination({
                current: page,
                pageSize,
                total: res.data.total || 0
            });
        } catch (err) {
            console.error('Fetch products error:', err);
            message.error(
                err.response?.data?.message || 'Không tải được sản phẩm'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts('', 1, pagination.pageSize, statusFilter);
    }, [statusFilter]);


    /* ================= DEBOUNCE SEARCH ================= */
    const debounceSearch = useRef(
        debounce((value) => {
            const keyword = value.trim();
            setSearchKeyword(keyword);
            fetchProducts(keyword, 1, pagination.pageSize);
        }, 400)
    ).current;



    /* ================= HIGHLIGHT ================= */
    const highlightText = (text = '', keyword = '') => {
        if (!keyword) return text;

        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.split(regex).map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase() ? (
                <span key={i} className="bg-yellow-300 px-1 font-semibold">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    /* ================= AUTO GENERATE SKU LOGIC ================= */
    const handleValuesChange = (changedValues, allValues) => {
        // Kiểm tra xem thay đổi có nằm ở tên sản phẩm hoặc danh sách variants không
        if (changedValues.name !== undefined || changedValues.variants) {
            const { name, variants } = allValues;

            if (!variants) return;

            // Chuẩn hóa tên sản phẩm (thay khoảng trắng bằng dấu gạch dưới, viết hoa)
            const formatString = (str) => {
                return str ? str.trim().replace(/\s+/g, '_').toUpperCase() : '';
            };

            const productName = formatString(name);

            // Cập nhật SKU & Mã màu cho từng variant dựa trên tên sản phẩm và màu
            const updatedVariants = variants.map((v) => {
                const color = formatString(v?.colorCode);
                // Chỉ tự động sinh nếu có tên sản phẩm hoặc màu, định dạng: NAME_COLOR
                const autoSku = color ? `${productName}_${color}` : productName;

                return {
                    ...v,
                    colorCode: color, // Tự động viết hoa mã màu ngay khi nhập
                    sku: autoSku
                };
            });

            // Cập nhật lại giá trị vào form
            createForm.setFieldsValue({ variants: updatedVariants });
        }
    };

    /* ================= CRUD ================= */
    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            
            // Đảm bảo viết hoa toàn bộ màu sắc và SKU khi gửi lưu
            if (values.variants) {
                values.variants = values.variants.map((v) => ({
                    ...v,
                    colorCode: (v.colorCode || '').trim().toUpperCase(),
                    sku: (v.sku || '').trim().toUpperCase()
                }));
            }

            await createProduct(values);

            message.success('Tạo sản phẩm thành công');
            setOpenModal(false);
            createForm.resetFields();
            fetchProducts();
        } catch (err) {
            message.error(err.response?.data?.message || 'Tạo sản phẩm thất bại');
        }
    };

    const openEdit = (product) => {
        setEditingProduct(product);
        editForm.setFieldsValue({
            name: product.name,
            brand: product.brand,
            originCountry: product.originCountry,
            description: product.description
        });
        setEditOpen(true);
    };

    const handleUpdateProduct = async () => {
        try {
            const values = await editForm.validateFields();
            await updateProduct(editingProduct._id, values);

            message.success('Cập nhật sản phẩm thành công');
            setEditOpen(false);
            setEditingProduct(null);
            editForm.resetFields();
            fetchProducts(searchKeyword);
        } catch (err) {
            message.error(err.response?.data?.message || 'Cập nhật thất bại');
        }
    };

    const handleDelete = async (id) => {
        await deleteProduct(id);
        message.success('Đã xoá sản phẩm');
        fetchProducts(searchKeyword);
    };

    const handleRestore = async (id) => {
        await restoreProduct(id);
        message.success('Đã khôi phục sản phẩm');
        fetchProducts(searchKeyword);
    };

    /* ================= TABLE ================= */
    const columns = [
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            render: (text) => highlightText(text, searchKeyword)
        },
        {
            title: 'Thương hiệu',
            dataIndex: 'brand'
        },
        {
            title: 'Xuất xứ',
            dataIndex: 'originCountry'
        },
        {
            title: 'Variant khớp',
            render: (_, record) =>
                record.matchedVariants?.length ? (
                    <Space wrap>
                        {record.matchedVariants.map((v) => (
                            <Tag color="blue" key={v.sku}>
                                {highlightText(v.sku, searchKeyword)}
                            </Tag>
                        ))}
                    </Space>
                ) : (
                    '-'
                )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            render: (val) =>
                val ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Không hoạt động</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space onClick={(e) => e.stopPropagation()}>
                    {record.isActive && (
                        <Button
                            size="small"
                            onClick={() => openEdit(record)}
                        >
                            Sửa
                        </Button>
                    )}

                    {record.isActive ? (
                        <Button
                            danger
                            size="small"
                            onClick={() => handleDelete(record._id)}
                        >
                            Huỷ
                        </Button>
                    ) : (
                        <Space size="small">
                            <Button
                                size="small"
                                type="dashed"
                                onClick={() => handleRestore(record._id)}
                            >
                                Khôi phục
                            </Button>
                            <Popconfirm
                                title="Bạn có chắc chắn muốn xoá vĩnh viễn sản phẩm này khỏi hệ thống?"
                                onConfirm={() => handleDelete(record._id)}
                                okButtonProps={{ danger: true }}
                                okText="Xoá"
                                cancelText="Huỷ"
                            >
                                <Button danger size="small">
                                    Xoá
                                </Button>
                            </Popconfirm>
                        </Space>
                    )}
                </Space>
            )
        }
    ];

    const excelMenuItems = [
        {
            key: 'download_template',
            label: <span style={{ fontWeight: 600 }}>Tải file mẫu Excel</span>,
            icon: <DownloadOutlined />,
            onClick: downloadTemplate
        },
        {
            type: 'divider'
        },
        {
            key: 'import_excel',
            label: (
                <Upload
                    accept=".xlsx, .xls"
                    showUploadList={false}
                    beforeUpload={handleAIImport}
                    disabled={importLoading}
                    style={{ width: '100%' }}
                >
                    <div style={{ width: '100%', fontWeight: 600 }}>Import Excel kho hàng</div>
                </Upload>
            ),
            icon: <FileExcelOutlined />,
        },
        {
            type: 'divider'
        },
        {
            key: 'export_report',
            label: <span style={{ fontWeight: 600 }}>Báo cáo tồn kho (Excel)</span>,
            icon: <BarChartOutlined />,
            onClick: exportInventoryToExcel
        }
    ];

    return (
        <div className="space-y-4">
            {/* TITLE ROW */}
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col flex="auto">
                    <Title level={3} style={{ margin: 0 }}>Quản lý sản phẩm</Title>
                </Col>
                <Col>
                    <Space wrap>
                        <Dropdown
                            menu={{ items: excelMenuItems }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Button
                                loading={importLoading || exportLoading}
                                className="text-white bg-[#1D6F42] border-[#1D6F42] 
                                            hover:!bg-[#278950] hover:!text-white hover:!border-[#278950] 
                                            focus:!bg-[#1D6F42] focus:!text-white focus:!border-[#1D6F42]
                                            active:!bg-[#155231] 
                                            transition-all duration-200"
                            >
                                Thao tác Excel <DownOutlined />
                            </Button>
                        </Dropdown>

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setOpenModal(true)}
                        >
                            Thêm thủ công
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* SEARCH ROW */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <Input
                    placeholder="Tìm theo tên sản phẩm hoặc SKU..."
                    prefix={<SearchOutlined />}
                    allowClear
                    className="flex-1"
                    style={{ borderRadius: '20px' }}
                    onChange={(e) => debounceSearch(e.target.value)}
                />

                <Select
                    className="w-full sm:w-48"
                    style={{ borderRadius: '20px' }}
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                        { value: 'ALL', label: 'Tất cả trạng thái' },
                        { value: 'ACTIVE', label: 'Hoạt động' },
                        { value: 'INACTIVE', label: 'Không hoạt động' }
                    ]}
                />
            </div>

            {/* TABLE */}
            {screens.sm ? (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={products}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        onChange: (page, pageSize) => {
                            fetchProducts(searchKeyword.trim(), page, pageSize);
                        }
                    }}
                    onRow={(record) => ({
                        onClick: () => {
                            // Sử dụng record.slug thay vì record._id để tạo URL thân thiện
                            if (record.slug) {
                                navigate(`/admin/products/${record.slug}`, {
                                    state: {
                                        fromPage: pagination.current,
                                        fromKeyword: searchKeyword
                                    }
                                });
                            } else {
                                // Backup trường hợp sản phẩm cũ chưa có slug
                                navigate(`/admin/products/${record._id}`);
                            }
                        }
                    })}
                />
            ) : (
                <div className="space-y-3">
                    {products.map((product) => (
                        <div
                            key={product._id}
                            onClick={() => {
                                if (product.slug) {
                                    navigate(`/admin/products/${product.slug}`, {
                                        state: {
                                            fromPage: pagination.current,
                                            fromKeyword: searchKeyword
                                        }
                                    });
                                } else {
                                    navigate(`/admin/products/${product._id}`);
                                }
                            }}
                            className="border rounded-lg p-4 shadow-sm bg-white cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base">
                                        {highlightText(product.name, searchKeyword)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {product.brand}
                                    </div>
                                </div>

                                <Tag color={product.isActive ? 'green' : 'red'}>
                                    {product.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                </Tag>
                            </div>

                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                                {product.originCountry && (
                                    <div>Xuất xứ: {product.originCountry}</div>
                                )}

                                {product.matchedVariants?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {product.matchedVariants.map((v) => (
                                            <Tag key={v.sku} color="blue">
                                                {highlightText(v.sku, searchKeyword)}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                <Button
                                    size="small"
                                    disabled={!product.isActive}
                                    onClick={() => openEdit(product)}
                                >
                                    Sửa
                                </Button>

                                {product.isActive ? (
                                    <Button
                                        danger
                                        size="small"
                                        onClick={() => handleDelete(product._id)}
                                    >
                                        Huỷ
                                    </Button>
                                ) : (
                                    <Space size="small">
                                        <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => handleRestore(product._id)}
                                        >
                                            Khôi phục
                                        </Button>
                                        <Popconfirm
                                            title="Bạn có chắc chắn muốn xoá vĩnh viễn sản phẩm này khỏi hệ thống?"
                                            onConfirm={() => handleDelete(product._id)}
                                            okButtonProps={{ danger: true }}
                                            okText="Xoá"
                                            cancelText="Huỷ"
                                        >
                                            <Button danger size="small">
                                                Xoá
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Pagination mobile */}
                    <div className="flex justify-center gap-3 pt-2">
                        <Button
                            disabled={pagination.current === 1}
                            onClick={() =>
                                fetchProducts(
                                    searchKeyword,
                                    pagination.current - 1,
                                    pagination.pageSize
                                )
                            }
                        >
                            Trước
                        </Button>

                        <span className="self-center text-sm">
                            Trang {pagination.current}
                        </span>

                        <Button
                            disabled={
                                pagination.current * pagination.pageSize >= pagination.total
                            }
                            onClick={() =>
                                fetchProducts(
                                    searchKeyword,
                                    pagination.current + 1,
                                    pagination.pageSize
                                )
                            }
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {/* Modal Create */}
            <Modal
                title="Tạo sản phẩm"
                open={openModal}
                onOk={handleCreate}
                onCancel={() => setOpenModal(false)}
                okText="Tạo"
                cancelText="Huỷ"
                width="90%"
                style={{ maxWidth: 900 }}
            >
                <Form layout="vertical" form={createForm} onValuesChange={handleValuesChange}>
                    {/* PRODUCT INFO */}
                    <Form.Item
                        label="Tên sản phẩm"
                        name="name"
                        rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Thương hiệu"
                        name="brand"
                        rules={[{ required: true, message: 'Nhập thương hiệu' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Xuất xứ"
                        name="originCountry">
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    {/* VARIANTS */}
                    <Form.List
                        name="variants"
                        rules={[
                            {
                                validator: async (_, variants) => {
                                    if (!variants || variants.length < 1) {
                                        return Promise.reject(
                                            new Error('Phải có ít nhất 1 variant')
                                        );
                                    }
                                }
                            }
                        ]}
                    >
                        {(fields, { add, remove }) => (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Danh sách Variant</h3>
                                </div>
                                {fields.map(({ key, name }) => (
                                    <div
                                        key={key}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border p-3 rounded mb-3" >
                                        <Form.Item
                                            label="SKU"
                                            name={[name, 'sku']}
                                            rules={[{ required: true, message: 'Auto generate SKU' }]}
                                        >
                                            <Input readOnly className="bg-gray-50 font-mono" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Màu"
                                            name={[name, 'colorCode']}>
                                            <Input />
                                        </Form.Item>

                                        <Form.Item
                                            label="Đơn vị"
                                            name={[name, 'unit']}
                                            rules={[{ required: true }]}
                                        >
                                            <Input placeholder="Cây / Cái / Hộp" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Giá"
                                            name={[name, 'price']}
                                            rules={[{ required: true }]}
                                        >
                                            <InputNumber
                                                className="w-full"
                                                min={0}
                                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                                addonAfter="₫"
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            label="Tồn kho"
                                            name={[name, 'inventory']}
                                            initialValue={0}
                                        >
                                            <Input
                                                type="number"
                                                disabled
                                                className="bg-gray-100 cursor-not-allowed"
                                            />
                                        </Form.Item>

                                        <div className="flex items-end sm:col-span-2 lg:col-span-1 mb-6">
                                            <Button danger onClick={() => remove(name)}> Xoá </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end items-center mb-2">
                                    <Button type="dashed" onClick={() => add({ unit: 'Cây', inventory: 0 })}>
                                        + Thêm Variant
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                title="Chỉnh sửa sản phẩm"
                open={editOpen}
                onCancel={() => {
                    setEditOpen(false);
                    editForm.resetFields();
                }}
                onOk={handleUpdateProduct}
            >
                <Form layout="vertical" form={editForm}>
                    <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item label="Thương hiệu" name="brand" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item label="Xuất xứ" name="originCountry">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Products;
