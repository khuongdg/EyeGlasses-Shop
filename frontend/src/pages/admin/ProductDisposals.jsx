import { useEffect, useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    message,
    Space,
    Tag,
    Row,
    Col,
    Divider,
    Typography,
    DatePicker,
    Popconfirm,
    Grid,
    Card,
    Tooltip,
    Alert
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    PrinterOutlined,
    SearchOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import debounce from 'lodash/debounce';

import { getDisposals, getDisposalById, createDisposal, deleteDisposal } from '../../services/disposalService';
import { getStaffs } from '../../services/staffService';
import { getVariants } from '../../services/variantService';
import DisposalPrintTemplate from '../../components/DisposalPrintTemplate';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const ProductDisposals = () => {
    const [disposals, setDisposals] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal tạo phiếu hủy
    const [openModal, setOpenModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [form] = Form.useForm();

    // State chọn sản phẩm trong modal
    const [selectedProductCode, setSelectedProductCode] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]); // Danh sách các SKU đã chọn để hủy

    // Modal chi tiết phiếu hủy
    const [openDetail, setOpenDetail] = useState(false);
    const [viewingDisposal, setViewingDisposal] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // In phiếu
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        pageStyle: `@page { size: auto; margin: 15mm; }`
    });

    const triggerPrint = (record) => {
        setPrintData(record);
        setTimeout(() => {
            handlePrint();
        }, 150);
    };

    // Phân trang & Bộ lọc
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [queryParams, setQueryParams] = useState({
        keyword: '',
        dateFrom: null,
        dateTo: null,
        status: 'ALL'
    });
    const [keyword, setKeyword] = useState('');

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    /* ================= FETCH DỮ LIỆU ================= */
    const fetchDisposals = async (params = queryParams, page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        try {
            const res = await getDisposals({
                page,
                limit: pageSize,
                keyword: params.keyword,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
                status: params.status
            });
            setDisposals(res.data.data || []);
            setPagination({
                current: res.data.page,
                pageSize: res.data.limit,
                total: res.data.total
            });
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể tải danh sách phiếu hủy sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [staffRes, varRes] = await Promise.all([
                getStaffs({ limit: 1000, isActive: true }),
                getVariants({ isActive: true, limit: 100000 })
            ]);
            setStaffs(staffRes.data.data || []);
            setVariants(varRes.data.data || []);
        } catch {
            message.error('Không tải được danh mục nhân viên hoặc sản phẩm');
        }
    };

    useEffect(() => {
        fetchInitialData();
        fetchDisposals();
    }, []);

    // Gom nhóm biến thể theo Mã hàng để tìm kiếm
    const productGroups = useMemo(() => {
        const map = new Map();
        variants.forEach((v) => {
            let code = v.productId?.name?.trim();
            if (!code && v.sku) {
                code = v.sku.includes('_') ? v.sku.split('_')[0] : v.sku;
            }
            if (!code) return;

            if (!map.has(code)) {
                map.set(code, {
                    productCode: code,
                    brand: v.productId?.brand || 'Christian DG',
                    originCountry: v.productId?.originCountry || 'PRC',
                    unit: v.unit || 'Cây',
                    variants: []
                });
            }
            map.get(code).variants.push(v);
        });
        return map;
    }, [variants]);

    const productOptions = useMemo(() => {
        return Array.from(productGroups.values())
            .sort((a, b) => a.productCode.localeCompare(b.productCode))
            .map((item) => ({
                value: item.productCode,
                label: `${item.productCode} (${item.brand}) • ${item.variants.length} SKU`,
                brand: item.brand,
                variantsCount: item.variants.length
            }));
    }, [productGroups]);

    // Các SKU của mã hàng hiện đang được chọn để hủy
    const currentSkusOfProduct = useMemo(() => {
        if (!selectedProductCode) return [];
        const group = productGroups.get(selectedProductCode);
        return group?.variants || [];
    }, [selectedProductCode, productGroups]);

    /* ================= XỬ LÝ TÌM KIẾM BỘ LỌC ================= */
    const debounceSearch = useRef(
        debounce((val) => {
            setQueryParams((prev) => {
                const newParams = { ...prev, keyword: val.trim() };
                fetchDisposals(newParams, 1, pagination.pageSize);
                return newParams;
            });
        }, 400)
    ).current;

    const handleDateChange = (dates) => {
        const newParams = {
            ...queryParams,
            dateFrom: dates && dates[0] ? dates[0].format('YYYY-MM-DD') : null,
            dateTo: dates && dates[1] ? dates[1].format('YYYY-MM-DD') : null
        };
        setQueryParams(newParams);
        fetchDisposals(newParams, 1, pagination.pageSize);
    };

    const handleStatusFilterChange = (status) => {
        const newParams = { ...queryParams, status };
        setQueryParams(newParams);
        fetchDisposals(newParams, 1, pagination.pageSize);
    };

    /* ================= XỬ LÝ CHỌN SKU TRONG MODAL HỦY ================= */
    const handleAddSkuToDisposal = (v) => {
        // Kiểm tra xem SKU đã có trong danh sách chọn chưa
        const existsIndex = selectedItems.findIndex(it => it.variantId === v._id);
        if (existsIndex > -1) {
            message.info(`SKU ${v.sku} đã có trong danh sách hủy`);
            return;
        }

        const currentInv = v.inventory || 0;
        if (currentInv <= 0) {
            message.warning(`Sản phẩm ${v.sku} hiện tại tồn kho = 0, không thể hủy`);
            return;
        }

        const productName = v.productId?.name || (v.sku.includes('_') ? v.sku.split('_')[0] : v.sku) || '';
        const newItem = {
            variantId: v._id,
            sku: v.sku,
            productName,
            colorCode: v.colorCode || '-',
            brand: v.productId?.brand || 'Christian DG',
            unit: v.unit || 'Cây',
            price: v.price || 0,
            inventory: currentInv,
            quantity: 1
        };

        setSelectedItems(prev => [...prev, newItem]);
        message.success(`Đã thêm SKU ${v.sku} vào danh sách hủy`);
    };

    const handleAddAllSkusOfCurrentProduct = () => {
        if (!currentSkusOfProduct.length) return;
        let count = 0;
        setSelectedItems(prev => {
            const newItems = [...prev];
            currentSkusOfProduct.forEach(v => {
                const currentInv = v.inventory || 0;
                if (currentInv > 0 && !newItems.some(it => it.variantId === v._id)) {
                    const productName = v.productId?.name || (v.sku.includes('_') ? v.sku.split('_')[0] : v.sku) || '';
                    newItems.push({
                        variantId: v._id,
                        sku: v.sku,
                        productName,
                        colorCode: v.colorCode || '-',
                        brand: v.productId?.brand || 'Christian DG',
                        unit: v.unit || 'Cây',
                        price: v.price || 0,
                        inventory: currentInv,
                        quantity: 1
                    });
                    count++;
                }
            });
            return newItems;
        });

        if (count > 0) {
            message.success(`Đã thêm ${count} SKU còn hàng của mã ${selectedProductCode} vào danh sách hủy`);
        } else {
            message.info('Tất cả SKU của mã này đã có trong danh sách hoặc đã hết hàng tồn');
        }
    };

    const handleUpdateQuantity = (variantId, newQty) => {
        const qty = Number(newQty);
        setSelectedItems(prev => prev.map(item => {
            if (item.variantId === variantId) {
                return { ...item, quantity: qty > 0 ? qty : 1 };
            }
            return item;
        }));
    };

    const handleRemoveSelectedItem = (variantId) => {
        setSelectedItems(prev => prev.filter(it => it.variantId !== variantId));
    };

    const totalDisposalQuantity = useMemo(() => {
        return selectedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    }, [selectedItems]);

    /* ================= SUBMIT TẠO PHIẾU HỦY ================= */
    const handleCreateDisposal = async () => {
        try {
            const values = await form.validateFields();

            if (selectedItems.length === 0) {
                message.warning('Vui lòng chọn ít nhất một SKU sản phẩm cần hủy!');
                return;
            }

            // Kiểm tra số lượng hủy với tồn kho
            for (const item of selectedItems) {
                if (!item.quantity || item.quantity <= 0) {
                    message.error(`Số lượng hủy của SKU ${item.sku} phải lớn hơn 0`);
                    return;
                }
                if (item.quantity > item.inventory) {
                    message.error(`SKU ${item.sku} yêu cầu hủy ${item.quantity} nhưng tồn kho chỉ còn ${item.inventory}`);
                    return;
                }
            }

            setSubmitLoading(true);

            const payload = {
                staffId: values.staffId,
                staffName: values.staffName,
                reason: values.reason,
                note: values.note,
                items: selectedItems
            };

            await createDisposal(payload);
            message.success('Tạo phiếu hủy sản phẩm thành công! Đã tự động trừ số lượng trong kho.');
            setOpenModal(false);
            form.resetFields();
            setSelectedItems([]);
            setSelectedProductCode(null);
            fetchDisposals();
            // Cập nhật lại tồn kho mới nhất
            fetchInitialData();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.message || 'Tạo phiếu hủy thất bại');
        } finally {
            setSubmitLoading(false);
        }
    };

    /* ================= XÓA PHIẾU HỦY (HOÀN KHO) ================= */
    const handleDeleteDisposal = async (id) => {
        try {
            await deleteDisposal(id);
            message.success('Đã xóa phiếu hủy và hoàn lại số lượng sản phẩm vào kho thành công!');
            fetchDisposals();
            fetchInitialData();
        } catch (err) {
            message.error(err.response?.data?.message || 'Xóa phiếu hủy thất bại');
        }
    };

    /* ================= XEM CHI TIẾT PHIẾU HỦY ================= */
    const handleViewDetail = async (record) => {
        setDetailLoading(true);
        setOpenDetail(true);
        try {
            const res = await getDisposalById(record._id);
            setViewingDisposal(res.data.data);
        } catch {
            setViewingDisposal(record);
        } finally {
            setDetailLoading(false);
        }
    };

    /* ================= COLUMNS BẢNG DANH SÁCH ================= */
    const columns = [
        {
            title: 'Mã phiếu',
            dataIndex: 'disposalCode',
            width: 160,
            render: (v) => <strong className="text-red-600 font-mono whitespace-nowrap">{v}</strong>
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 180,
            render: (v) => <span className="whitespace-nowrap">{new Date(v).toLocaleString('vi-VN')}</span>
        },
        {
            title: 'Nhân viên',
            width: 220,
            render: (_, r) => (
                <span className="whitespace-nowrap font-medium text-gray-800">
                    {r.staffName || r.staffId?.name || 'N/A'}
                </span>
            )
        },
        {
            title: 'Lý do huỷ',
            dataIndex: 'reason',
            minWidth: 220,
            render: (v) => <span className="text-gray-700 italic">{v || 'N/A'}</span>
        },
        {
            title: 'Tổng SL',
            dataIndex: 'totalQuantity',
            align: 'center',
            width: 100,
            render: (v) => <strong className="text-red-600 font-bold whitespace-nowrap">{v || 0}</strong>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            align: 'center',
            width: 160,
            render: (v) => (
                <span className="whitespace-nowrap">
                    {v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã xoá (Đã hoàn kho)</Tag>}
                </span>
            )
        },
        {
            title: 'Thao tác',
            align: 'center',
            width: 110,
            fixed: 'right',
            render: (_, record) => (
                <Space onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="In phiếu hủy">
                        <Button
                            size="small"
                            icon={<PrinterOutlined />}
                            onClick={() => triggerPrint(record)}
                        />
                    </Tooltip>
                    {record.isActive && (
                        <Popconfirm
                            title="Xác nhận xóa phiếu hủy?"
                            description="Khi xóa phiếu hủy, toàn bộ số lượng sản phẩm sẽ được tự động hoàn trả lại vào kho hàng."
                            onConfirm={() => handleDeleteDisposal(record._id)}
                            okText="Xóa & Hoàn kho"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Xoá phiếu (Hoàn kho)">
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* Template in ẩn */}
            <div style={{ display: 'none' }}>
                <DisposalPrintTemplate ref={printRef} data={printData} />
            </div>

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <Title level={3} style={{ margin: 0 }}>Quản lý Huỷ sản phẩm</Title>
                    <Text type="secondary" className="text-xs">
                        Lập phiếu hủy sản phẩm hỏng, lỗi, mẫu cũ. Số lượng hủy sẽ tự động trừ vào kho và hoàn lại khi xóa phiếu.
                    </Text>
                </div>
                <Button
                    type="primary"
                    danger
                    icon={<PlusOutlined />}
                    onClick={() => {
                        form.resetFields();
                        setSelectedItems([]);
                        setSelectedProductCode(null);
                        setOpenModal(true);
                    }}
                    style={{ borderRadius: '20px' }}
                >
                    Huỷ sản phẩm
                </Button>
            </div>

            {/* BỘ LỌC TÌM KIẾM */}
            <Card bodyStyle={{ padding: '16px' }} className="shadow-sm rounded-xl border-gray-200">
                <Row gutter={[16, 12]} align="middle">
                    <Col xs={24} md={10}>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Tìm kiếm</div>
                        <Input
                            placeholder="Tìm theo mã phiếu, tên nhân viên, lý do hủy..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            allowClear
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                debounceSearch(e.target.value);
                            }}
                            style={{ borderRadius: '20px' }}
                        />
                    </Col>
                    <Col xs={24} sm={14} md={8}>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Khoảng thời gian</div>
                        <RangePicker
                            className="w-full"
                            style={{ borderRadius: '20px' }}
                            format="DD/MM/YYYY"
                            placeholder={['Từ ngày', 'Đến ngày']}
                            onChange={handleDateChange}
                        />
                    </Col>
                    <Col xs={24} sm={10} md={6}>
                        <div className="text-xs font-semibold text-gray-500 mb-1">Trạng thái</div>
                        <Select
                            className="w-full"
                            style={{ borderRadius: '20px' }}
                            value={queryParams.status}
                            onChange={handleStatusFilterChange}
                            options={[
                                { value: 'ALL', label: 'Tất cả trạng thái' },
                                { value: 'ACTIVE', label: 'Hoạt động' },
                                { value: 'CANCELLED', label: 'Đã xoá (Hoàn kho)' }
                            ]}
                        />
                    </Col>
                </Row>
            </Card>

            {/* BẢNG DỮ LIỆU */}
            <Card bodyStyle={{ padding: 0 }} className="shadow-sm rounded-xl overflow-hidden border-gray-200">
                <Table
                    columns={columns}
                    dataSource={disposals}
                    rowKey="_id"
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        onChange: (page, pageSize) => fetchDisposals(queryParams, page, pageSize)
                    }}
                    onRow={(record) => ({
                        onClick: () => handleViewDetail(record),
                        className: 'cursor-pointer hover:bg-red-50/20 transition-colors'
                    })}
                />
            </Card>

            {/* ================= MODAL TẠO PHIẾU HỦY SẢN PHẨM ================= */}
            <Modal
                title={
                    <span className="text-lg font-bold text-red-600 flex items-center gap-2">
                        <ExclamationCircleOutlined /> Lập phiếu huỷ sản phẩm kho
                    </span>
                }
                open={openModal}
                onOk={handleCreateDisposal}
                confirmLoading={submitLoading}
                onCancel={() => setOpenModal(false)}
                okText="Xác nhận huỷ & Trừ kho"
                okButtonProps={{ danger: true }}
                cancelText="Huỷ bỏ"
                width="100%"
                style={{ maxWidth: 950, top: 20 }}
                destroyOnClose
            >
                <Form form={form} layout="vertical" className="mt-3">
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="staffName" hidden><Input /></Form.Item>
                            <Form.Item
                                label={<span className="font-semibold text-gray-700">Nhân viên lập phiếu</span>}
                                name="staffId"
                                rules={[{ required: true, message: 'Vui lòng chọn nhân viên lập phiếu' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Tìm tên hoặc mã nhân viên"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    onChange={(val) => {
                                        const staff = staffs.find(s => s._id === val);
                                        if (staff) {
                                            form.setFieldsValue({ staffName: staff.name });
                                        }
                                    }}
                                    options={staffs.map(s => ({
                                        value: s._id,
                                        label: `${s.staffCode ? s.staffCode + ' - ' : ''}${s.name}`
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                label={<span className="font-semibold text-gray-700">Lý do huỷ sản phẩm</span>}
                                name="reason"
                                rules={[{ required: true, message: 'Vui lòng điền lý do huỷ' }]}
                            >
                                <Input placeholder="Ví dụ: Gãy gọng, nứt tròng kính, hàng lỗi sản xuất, mẫu cũ hỏng..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item label="Ghi chú thêm (Tùy chọn)" name="note">
                                <Input placeholder="Nhập thêm ghi chú biên bản hủy nếu có..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }}>
                        <span className="text-sm font-bold text-gray-700">CHỌN SẢN PHẨM & SKU CẦN HỦY</span>
                    </Divider>

                    {/* KHU VỰC SEARCH MÃ HÀNG HUỶ & HIỂN THỊ BẢNG SKU */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                        <Row gutter={12} align="middle">
                            <Col xs={24} md={16}>
                                <div className="text-xs font-semibold text-gray-700 mb-1">
                                    1. Tìm kiếm Mã hàng cần huỷ:
                                </div>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Gõ mã hàng để tìm kiếm (VD: 8619, 8617, RB2140...)"
                                    value={selectedProductCode}
                                    onChange={(val) => setSelectedProductCode(val)}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={productOptions}
                                    className="w-full"
                                />
                            </Col>
                            {selectedProductCode && currentSkusOfProduct.length > 0 && (
                                <Col xs={24} md={8} className="flex items-end mt-2 md:mt-0">
                                    <Button
                                        type="dashed"
                                        onClick={handleAddAllSkusOfCurrentProduct}
                                        className="w-full text-blue-600 border-blue-400 hover:text-blue-700"
                                    >
                                        + Thêm tất cả màu của mã này
                                    </Button>
                                </Col>
                            )}
                        </Row>

                        {/* BẢNG SKU TƯƠNG ỨNG VỚI MÃ HÀNG ĐƯỢC CHỌN */}
                        {selectedProductCode && (
                            <div className="mt-3">
                                <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-between">
                                    <span>Danh sách biến thể SKU của mã [ {selectedProductCode} ]:</span>
                                    <span className="text-gray-400">Click nút "+ Chọn huỷ" để đưa vào danh sách</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                                    <Table
                                        size="small"
                                        pagination={false}
                                        dataSource={currentSkusOfProduct}
                                        rowKey="_id"
                                        columns={[
                                            { title: 'SKU', dataIndex: 'sku', render: (v) => <strong className="font-mono">{v}</strong> },
                                            { title: 'Màu', dataIndex: 'colorCode', render: (v) => v || '-' },
                                            {
                                                title: 'Tồn kho',
                                                dataIndex: 'inventory',
                                                align: 'center',
                                                render: (v) => (
                                                    <Tag color={v > 0 ? 'blue' : 'default'} className="font-medium">
                                                        {v ?? 0}
                                                    </Tag>
                                                )
                                            },
                                            {
                                                title: 'Đơn giá',
                                                dataIndex: 'price',
                                                align: 'right',
                                                render: (v) => `${(v || 0).toLocaleString()} ₫`
                                            },
                                            {
                                                title: 'Thao tác',
                                                align: 'center',
                                                width: 120,
                                                render: (_, v) => {
                                                    const isAdded = selectedItems.some(it => it.variantId === v._id);
                                                    const outOfStock = (v.inventory || 0) <= 0;
                                                    return (
                                                        <Button
                                                            size="small"
                                                            type={isAdded ? 'default' : 'primary'}
                                                            danger={!isAdded}
                                                            disabled={isAdded || outOfStock}
                                                            onClick={() => handleAddSkuToDisposal(v)}
                                                            icon={isAdded ? <CheckCircleOutlined className="text-green-600" /> : <PlusOutlined />}
                                                        >
                                                            {isAdded ? 'Đã thêm' : outOfStock ? 'Hết tồn' : 'Chọn huỷ'}
                                                        </Button>
                                                    );
                                                }
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DANH SÁCH SẢN PHẨM ĐÃ CHỌN ĐỂ HỦY */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-gray-700">
                                2. Danh sách sản phẩm lập phiếu hủy ({selectedItems.length} SKU):
                            </span>
                            {selectedItems.length > 0 && (
                                <Button size="small" type="link" danger onClick={() => setSelectedItems([])}>
                                    Xóa tất cả
                                </Button>
                            )}
                        </div>

                        {selectedItems.length === 0 ? (
                            <div className="border border-dashed border-gray-300 p-8 text-center rounded-xl bg-gray-50/50 text-gray-400">
                                Chưa có sản phẩm nào được chọn. Hãy tìm kiếm Mã hàng ở trên và click "Chọn huỷ" các SKU mong muốn.
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                <Table
                                    size="small"
                                    pagination={false}
                                    dataSource={selectedItems}
                                    rowKey="variantId"
                                    columns={[
                                        { title: 'STT', render: (_, __, i) => i + 1, width: 45, align: 'center' },
                                        { title: 'Mã hàng', dataIndex: 'productName' },
                                        { title: 'Mã SKU', dataIndex: 'sku', render: (v) => <strong className="font-mono text-red-600">{v}</strong> },
                                        { title: 'Màu', dataIndex: 'colorCode', width: 70 },
                                        {
                                            title: 'Tồn hiện tại',
                                            dataIndex: 'inventory',
                                            align: 'center',
                                            width: 100,
                                            render: (v) => <Tag color="blue">{v}</Tag>
                                        },
                                        {
                                            title: 'SL Hủy',
                                            width: 120,
                                            align: 'center',
                                            render: (_, r) => (
                                                <InputNumber
                                                    min={1}
                                                    max={r.inventory}
                                                    value={r.quantity}
                                                    onChange={(val) => handleUpdateQuantity(r.variantId, val)}
                                                    className="w-20"
                                                />
                                            )
                                        },
                                        {
                                            title: '',
                                            width: 50,
                                            align: 'center',
                                            render: (_, r) => (
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleRemoveSelectedItem(r.variantId)}
                                                />
                                            )
                                        }
                                    ]}
                                    summary={() => (
                                        <Table.Summary.Row style={{ backgroundColor: '#fff1f0' }}>
                                            <Table.Summary.Cell index={0} colSpan={5} align="right">
                                                <strong className="text-red-700">TỔNG SỐ LƯỢNG HỦY TRỪ KHO:</strong>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1} align="center">
                                                <strong className="text-red-600 text-base">{totalDisposalQuantity}</strong>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} />
                                        </Table.Summary.Row>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                </Form>
            </Modal>

            {/* ================= MODAL CHI TIẾT PHIẾU HỦY ================= */}
            <Modal
                title={`Chi tiết phiếu hủy: ${viewingDisposal?.disposalCode}`}
                open={openDetail}
                onCancel={() => setOpenDetail(false)}
                footer={[
                    <Button key="close" onClick={() => setOpenDetail(false)}>Đóng</Button>,
                    viewingDisposal && (
                        <Button
                            key="print"
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={() => triggerPrint(viewingDisposal)}
                        >
                            In phiếu hủy
                        </Button>
                    )
                ]}
                width={750}
                style={{ top: 20 }}
            >
                {viewingDisposal && (
                    <div className="space-y-4">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                                <p className="mb-2"><strong>Mã phiếu:</strong> <span className="text-red-600 font-bold">{viewingDisposal.disposalCode}</span></p>
                                <p className="mb-0"><strong>Nhân viên lập:</strong> {viewingDisposal.staffName || viewingDisposal.staffId?.name || 'N/A'}</p>
                            </Col>
                            <Col xs={24} sm={12}>
                                <p className="mb-2"><strong>Ngày lập:</strong> {new Date(viewingDisposal.createdAt).toLocaleString('vi-VN')}</p>
                                <p className="mb-0">
                                    <strong>Trạng thái:</strong>{' '}
                                    {viewingDisposal.isActive ? (
                                        <Tag color="green">Hoạt động</Tag>
                                    ) : (
                                        <Tag color="red">Đã xoá (Đã hoàn lại kho)</Tag>
                                    )}
                                </p>
                            </Col>
                        </Row>

                        <div className="bg-red-50 p-3 border border-red-200 rounded text-sm">
                            <strong className="text-red-700">Lý do huỷ:</strong> <span className="text-red-800">{viewingDisposal.reason || 'N/A'}</span>
                            {viewingDisposal.note && (
                                <div className="mt-1 text-gray-600">
                                    <strong>Ghi chú:</strong> {viewingDisposal.note}
                                </div>
                            )}
                        </div>

                        <Divider style={{ margin: '16px 0' }} />
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-700 mb-0">Danh sách sản phẩm bị hủy</h4>
                            <span className="text-sm">Tổng SL: <strong className="text-red-600">{viewingDisposal.totalQuantity || 0}</strong></span>
                        </div>

                        <Table
                            dataSource={viewingDisposal.items || []}
                            pagination={false}
                            size="small"
                            bordered
                            rowKey={(r, idx) => r._id || r.sku || idx}
                            columns={[
                                { title: 'STT', render: (_, __, i) => i + 1, width: 45, align: 'center' },
                                { title: 'Mã hàng', dataIndex: 'productName' },
                                { title: 'Mã SKU', dataIndex: 'sku', render: (v) => <strong className="font-mono text-red-600">{v}</strong> },
                                { title: 'Màu', dataIndex: 'colorCode', width: 70 },
                                { title: 'Thương hiệu', dataIndex: 'brand' },
                                { title: 'ĐVT', dataIndex: 'unit', width: 70, align: 'center' },
                                {
                                    title: 'SL Hủy',
                                    dataIndex: 'quantity',
                                    align: 'center',
                                    width: 80,
                                    render: (v) => <strong className="text-red-600">{v}</strong>
                                }
                            ]}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProductDisposals;

