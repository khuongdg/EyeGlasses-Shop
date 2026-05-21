import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
    Table,
    Button,
    Input,
    InputNumber,
    Space,
    Modal,
    Form,
    message,
    Tag,
    Popconfirm,
    Grid,
    Upload
} from 'antd';
import { PlusOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    searchProducts,
    aiBulkImport
} from '../../services/productService';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [searchKeyword, setSearchKeyword] = useState('');

    const [importLoading, setImportLoading] = useState(false);

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
                const groupedMap = new Map();

                rawData.forEach(item => {
                    const productName = String(item['Mã hàng'] || '').trim();
                    const color = String(item['Mã màu'] || item['Màu'] || '').trim().toUpperCase();

                    if (!productName) return;

                    if (!groupedMap.has(productName)) {
                        groupedMap.set(productName, {
                            name: productName,
                            brand: item['Thương hiệu'] || 'Christian DG',
                            originCountry: item['Xuất xứ'] || 'PRC',
                            variants: []
                        });
                    }

                    const product = groupedMap.get(productName);
                    product.variants.push({
                        sku: `${productName}_${color}`, // Tự động sinh SKU theo quy tắc
                        colorCode: color,
                        unit: item['Đơn vị'] || 'Cây',
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
            [1, 2, 4, 5, 8].forEach(colIdx => r.getCell(colIdx).alignment = { horizontal: 'center' });
            [6, 7].forEach(colIdx => {
                r.getCell(colIdx).numFmt = '#,##0';
                r.getCell(colIdx).alignment = { horizontal: 'right' };
            });
            r.eachCell(cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
        });


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
            ['1. Quy tắc gộp sản phẩm:', 'Các dòng có cùng "Mã hàng" sẽ được hệ thống tự động gộp thành 1 sản phẩm cha. Đừng đổi tên mã hàng lung tung nhé.'],
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

    /* ================= FETCH ================= */
    const fetchProducts = async (keyword, page, pageSize) => {
        console.log('FETCH', { keyword, page, pageSize });
        setLoading(true);
        try {
            const res = keyword
                ? await searchProducts({ keyword, page, limit: pageSize })
                : await getProducts({ page, limit: pageSize });

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
        fetchProducts('', 1, pagination.pageSize);
    }, []);


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

            // Cập nhật SKU cho từng variant dựa trên tên sản phẩm và màu
            const updatedVariants = variants.map((v) => {
                const color = formatString(v?.colorCode);
                // Chỉ tự động sinh nếu có tên sản phẩm hoặc màu, định dạng: NAME_COLOR
                const autoSku = color ? `${productName}_${color}` : productName;

                return {
                    ...v,
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
                val ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        disabled={!record.isActive}
                        onClick={(e) => {
                            e.stopPropagation();
                            openEdit(record);
                        }}
                    >
                        Sửa
                    </Button>

                    {record.isActive ? (
                        <Popconfirm
                            title="Xoá sản phẩm?"
                            onConfirm={(e) => {
                                e.stopPropagation();
                                handleDelete(record._id);
                            }}
                        >
                            <Button
                                danger
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Xoá
                            </Button>
                        </Popconfirm>
                    ) : (
                        <Button
                            size="small"
                            type="dashed"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(record._id);
                            }}
                        >
                            Khôi phục
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <Input
                    placeholder="Tìm theo tên sản phẩm hoặc SKU"
                    allowClear
                    className="w-full sm:w-80"
                    onChange={(e) => debounceSearch(e.target.value)}
                />

                <Space wrap>
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={downloadTemplate}
                        className="text-gray-600 border-gray-300 hover:text-green-600 hover:border-green-600"
                    >
                        Tải file mẫu
                    </Button>

                    <Upload
                        accept=".xlsx, .xls"
                        showUploadList={false}
                        beforeUpload={handleAIImport}
                        disabled={importLoading}
                    >
                        <Button
                            icon={<FileExcelOutlined />}
                            loading={importLoading}
                            className="text-white bg-[#1D6F42] border-[#1D6F42] 
                                        hover:!bg-[#278950] hover:!text-white hover:!border-[#278950] 
                                        focus:!bg-[#1D6F42] focus:!text-white focus:!border-[#1D6F42]
                                        active:!bg-[#155231] 
                                        transition-all duration-200"
                        >
                            Import By Excel
                        </Button>
                    </Upload>

                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setOpenModal(true)}
                    >
                        Thêm thủ công
                    </Button>
                </Space>
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
                            onClick={() => navigate(`/admin/products/${product._id}`)}
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
                                    {product.isActive ? 'Active' : 'Inactive'}
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

                            <div className="mt-3 flex gap-2 flex-wrap">
                                <Button
                                    size="small"
                                    disabled={!product.isActive}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEdit(product);
                                    }}
                                >
                                    Sửa
                                </Button>

                                {product.isActive ? (
                                    <Button
                                        danger
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(product._id);
                                        }}
                                    >
                                        Xoá
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        type="dashed"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRestore(product._id);
                                        }}
                                    >
                                        Khôi phục
                                    </Button>
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
                        initialValue='Christian DG'
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
                                    <Button type="dashed" onClick={() => add()}>
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
