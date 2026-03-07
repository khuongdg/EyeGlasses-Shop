import { useEffect, useState } from 'react';
import { useRef } from 'react';
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
    Grid,
    Popconfirm
} from 'antd';
import { PlusOutlined, DeleteOutlined, PrinterOutlined, SearchOutlined, BarcodeOutlined } from '@ant-design/icons';
import PrintTemplate from '../../components/PrintTemplate';
import ItemLabelTemplate from '../../components/ItemLabelTemplate';
import InvoiceDetails from './InvoiceDetails';
import LabelPreviewModal from './LabelPreviewModal';

import { getInvoices, createInvoice, cancelInvoice } from '../../services/invoiceService';
import { getCustomers } from '../../services/customerService';
import { getStaffs } from '../../services/staffService';
import { getVariants } from '../../services/variantService';
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [variants, setVariants] = useState([]);

    const [loading, setLoading] = useState(false);
    const [variantLoading, setVariantLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const componentRef = useRef();

    const [form] = Form.useForm();

    // Theo dõi các giá trị tổng để UI render lại real-time
    const watchItems = Form.useWatch('items', form);
    const watchTotalQty = Form.useWatch('totalQuantity', form);
    const watchSubTotal = Form.useWatch('subTotal', form);
    const watchTotalDiscount = Form.useWatch('totalDiscount', form);
    const watchTotalAmount = Form.useWatch('totalAmount', form);

    const [openDetail, setOpenDetail] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState(null);

    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [labelItems, setLabelItems] = useState([]);
    const labelPrintRef = useRef();

    const handlePrintLabels = useReactToPrint({
        contentRef: labelPrintRef,
        pageStyle: `@page { size: 77mm 60mm; margin: 0; }`,
    });

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    const [queryParams, setQueryParams] = useState({
        keyword: '',
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
    });

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    /* ================= FETCH ================= */
    const fetchInvoices = async (params = queryParams) => {
        setLoading(true);
        try {
            const res = await getInvoices(params);
            setInvoices(res.data.data);
            // Cập nhật lại state pagination để Table hiển thị đúng số trang
            setPagination({
                current: params.page,
                pageSize: params.limit,
                total: res.data.total
            });
        } catch (err) {
            message.error('Không thể tải danh sách phiếu xuất kho');
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [cusRes, staffRes] = await Promise.all([
                getCustomers({ limit: 1000 }),
                getStaffs({ limit: 1000 })
            ]);
            setCustomers(cusRes.data.data);
            setStaffs(staffRes.data.data);
        } catch {
            message.error('Không tải được thông tin Khách hàng/Nhân viên');
        }
    };

    const fetchVariants = async () => {
        setVariantLoading(true);
        try {
            const res = await getVariants({ isActive: true, limit: 1000 });
            setVariants(res.data.data);
        } catch {
            message.error('Không tải được danh sách sản phẩm');
        } finally {
            setVariantLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
        fetchInvoices(); // Load danh sách phiếu lần đầu
        fetchVariants();
    }, []);

    const handleTableChange = (newPagination) => {
        const newParams = {
            ...queryParams,
            page: newPagination.current,
            limit: newPagination.pageSize
        };

        // Cập nhật state queryParams để đồng bộ UI
        setQueryParams(newParams);

        // Gọi API lấy dữ liệu trang mới
        fetchInvoices(newParams);
    };

    const handleSearch = () => {
        fetchInvoices({ ...queryParams, page: 1 });
    };

    // Xử lý khi nhấn nút "Reset"
    const handleReset = () => {
        const defaultParams = {
            keyword: '',
            dateFrom: null,
            dateTo: null,
            page: 1,
            limit: 10
        };
        setQueryParams(defaultParams);
        fetchInvoices(defaultParams);
    };

    /* ================= CALC ================= */
    // Hàm 1: Tính thành tiền cho từng dòng (để hiển thị trên từng hàng sản phẩm)
    const calculateRowTotal = (name) => {
        const items = form.getFieldValue('items') || [];
        const item = items[name];

        // Nếu không có item hoặc item bị undefined, trả về 0
        if (!item) return 0;

        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const discPercent = Number(item.discountPercent || 0);

        const amount = qty * price;
        const discount = (amount * discPercent) / 100;
        return amount - discount;
    };

    // Hàm 2: Tính tổng cho toàn bộ phiếu (để hiển thị ở phần Footer của Form)
    const calculateTotals = () => {
        const items = form.getFieldValue('items') || [];
        let totalQty = 0;
        let subTotal = 0;
        let totalDiscount = 0;

        items.forEach(item => {
            // Kiểm tra nếu item tồn tại mới tính toán
            if (item) {
                const qty = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                const discPercent = Number(item.discountPercent || 0);

                const amount = qty * price;
                const discount = (amount * discPercent) / 100;

                totalQty += qty;
                subTotal += amount;
                totalDiscount += discount;
            }
        });

        form.setFieldsValue({
            totalQuantity: totalQty,
            subTotal: subTotal,
            totalDiscount: totalDiscount,
            totalAmount: subTotal - totalDiscount
        });
    };
    /* ================= CREATE ================= */
    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            await createInvoice(values);

            message.success('Tạo phiếu xuất kho thành công');
            setOpenModal(false);
            form.resetFields();
            fetchInvoices();
            fetchVariants();
        } catch (err) {
            message.error(err.response?.data?.message || 'Tạo phiếu thất bại');
        }
    };

    /* ================= CANCEL ================= */
    const handleCancelInvoice = async (invoiceId) => {
        try {
            setLoading(true); // Hiển thị loading khi đang xử lý
            await cancelInvoice(invoiceId);

            message.success('Đã huỷ phiếu và hoàn trả hàng vào kho thành công');

            // Cập nhật lại danh sách phiếu và danh sách sản phẩm
            fetchInvoices();
            fetchVariants();
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể hủy phiếu');
        } finally {
            setLoading(false);
        }
    };

    const handleProductChange = (val, name) => {
        const v = variants.find((x) => x._id === val);
        if (v) {
            const productName = v.productId?.name || '';
            const brand = v.productId?.brand || 'N/A';
            const originCountry = v.productId?.originCountry || 'N/A';
            const unit = v.unit || 'Cây';

            form.setFieldValue(['items', name, 'sku'], v.sku);
            form.setFieldValue(['items', name, 'brand'], brand);
            form.setFieldValue(['items', name, 'originCountry'], originCountry);
            form.setFieldValue(['items', name, 'unit'], unit);
            form.setFieldValue(['items', name, 'price'], v.price);
            form.setFieldValue(['items', name, 'quantity'], 1);

            // Kích hoạt tính toán lại tổng số
            calculateTotals();
        }
    };

    // Định nghĩa hàm in
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        onAfterPrint: () => setSelectedInvoice(null),
    });

    const triggerPrint = (record) => {
        setSelectedInvoice(record);
        // Đợi một chút để React render dữ liệu vào template ẩn rồi mới in
        setTimeout(() => {
            handlePrint();
        }, 500);
    };

    /* ================= TABLE ================= */
    const columns = [
        { title: 'Mã phiếu', dataIndex: 'invoiceCode' },
        { title: 'Khách hàng', render: (_, record) => record.customerId?.name || 'N/A' },
        { title: 'Nhân viên', render: (_, record) => record.staffId?.name || 'N/A' },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            render: (v) => v?.toLocaleString()
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            filters: [
                { text: 'Tiền mặt', value: 'CASH' },
                { text: 'Chuyển khoản', value: 'TRANSFER' },
                { text: 'Công nợ', value: 'DEBT' },
            ],
            onFilter: (value, record) => record.paymentMethod === value,
            render: (method) => {
                const labels = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', DEBT: 'Công nợ' };
                return labels[method] || method;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            filters: [
                { text: 'Active', value: true },
                { text: 'Inactive', value: false },
            ],
            onFilter: (value, record) => record.isActive === value,
            render: (v) =>
                v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space size="small">
                    {record.isActive && (
                        <Popconfirm
                            title="Xác nhận hủy hóa đơn?"
                            description="Hành động này sẽ không thể hoàn tác!"
                            onConfirm={(e) => {
                                // e.stopPropagation() được gọi tự động nếu bạn đặt ở đây hoặc dùng trong handle
                                handleCancelInvoice(record._id);
                            }}
                            onCancel={(e) => e.stopPropagation()}
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                danger
                                size="small"
                                onClick={(e) => e.stopPropagation()} // Ngăn chặn sự kiện click vào dòng (onRow)
                            >
                                Huỷ
                            </Button>
                        </Popconfirm>
                    )}

                    {/* NÚT IN PHIẾU */}
                    <Button
                        icon={<PrinterOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerPrint(record);
                        }}
                        title="In phiếu xuất kho"
                    />

                    <Button
                        icon={<BarcodeOutlined />}
                        title="In Tem mã vạch"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLabelItems(record.items);
                            setViewingInvoice(record);
                            setIsLabelModalOpen(true);
                        }}
                    />
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-xl font-semibold">Phiếu xuất kho</h2>

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        form.resetFields();
                        setOpenModal(true);
                    }}
                >
                    Tạo phiếu
                </Button>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-100">
                <Row gutter={[16, 16]} align="bottom">
                    {/* SEARCH */}
                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Text strong className="block mb-1">Tìm kiếm</Text>
                        <Input
                            placeholder="Mã phiếu, tên hoặc SĐT khách hàng..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={queryParams.keyword}
                            onChange={(e) =>
                                setQueryParams({ ...queryParams, keyword: e.target.value })
                            }
                            onPressEnter={handleSearch}
                        />
                    </Col>

                    {/* DATE RANGE */}
                    <Col xs={24} sm={24} md={12} lg={8}>
                        <Text strong className="block mb-1">Khoảng thời gian</Text>
                        <RangePicker
                            className="w-full"
                            format="DD/MM/YYYY"
                            onChange={(dates) => {
                                setQueryParams({
                                    ...queryParams,
                                    dateFrom: dates
                                        ? dates[0].format('YYYY-MM-DD')
                                        : null,
                                    dateTo: dates
                                        ? dates[1].format('YYYY-MM-DD')
                                        : null
                                });
                            }}
                        />
                    </Col>

                    {/* ACTION BUTTONS */}
                    <Col xs={24} sm={24} md={24} lg={8}>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                type="primary"
                                onClick={handleSearch}
                                className="w-full sm:w-auto"
                            >
                                Lọc dữ liệu
                            </Button>

                            <Button
                                onClick={handleReset}
                                className="w-full sm:w-auto"
                            >
                                Reset
                            </Button>
                        </div>
                    </Col>
                </Row>
            </div>


            {/* TABLE */}
            {screens.md ? (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={invoices}
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true
                    }}
                    onChange={handleTableChange}
                    onRow={(record) => ({
                        onClick: () => {
                            setViewingInvoice(record);
                            setOpenDetail(true);
                        },
                        style: { cursor: 'pointer' }
                    })}
                />
            ) : (
                <div className="space-y-4">
                    {invoices.map((invoice) => (
                        <div
                            key={invoice._id}
                            className="border rounded-xl p-4 shadow-sm bg-white"
                            onClick={() => {
                                setViewingInvoice(invoice);
                                setOpenDetail(true);
                            }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base">
                                        {invoice.invoiceCode}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        KH: {invoice.customerId?.name || 'N/A'}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        NV: {invoice.staffId?.name || 'N/A'}
                                    </div>
                                </div>

                                <Tag color={invoice.isActive ? 'green' : 'red'}>
                                    {invoice.isActive ? 'Active' : 'Inactive'}
                                </Tag>
                            </div>

                            <div className="mt-3 space-y-1 text-sm">
                                <div>
                                    <span className="text-gray-500">Thanh toán:</span>{' '}
                                    <strong>
                                        {{
                                            CASH: 'Tiền mặt',
                                            TRANSFER: 'Chuyển khoản',
                                            DEBT: 'Công nợ'
                                        }[invoice.paymentMethod] || invoice.paymentMethod}
                                    </strong>
                                </div>

                                <div>
                                    <span className="text-gray-500">Tổng tiền:</span>{' '}
                                    <strong className="text-red-500">
                                        {invoice.totalAmount?.toLocaleString()}₫
                                    </strong>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div
                                className="mt-4 flex gap-2 flex-wrap"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {invoice.isActive && (
                                    <Button
                                        danger
                                        size="small"
                                        onClick={() => handleCancelInvoice(invoice._id)}
                                    >
                                        Huỷ
                                    </Button>
                                )}

                                <Button
                                    size="small"
                                    icon={<PrinterOutlined />}
                                    onClick={() => triggerPrint(invoice)}
                                />

                                <Button
                                    size="small"
                                    icon={<BarcodeOutlined />}
                                    onClick={() => {
                                        setLabelItems(invoice.items);
                                        setViewingInvoice(invoice);
                                        setIsLabelModalOpen(true);
                                    }}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Mobile Pagination */}
                    <div className="flex justify-center gap-3 pt-2">
                        <Button
                            disabled={pagination.current === 1}
                            onClick={() =>
                                handleTableChange({
                                    current: pagination.current - 1,
                                    pageSize: pagination.pageSize
                                })
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
                                handleTableChange({
                                    current: pagination.current + 1,
                                    pageSize: pagination.pageSize
                                })
                            }
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}


            {/* MODAL CHI TIẾT */}
            <InvoiceDetails
                open={openDetail}
                onClose={() => setOpenDetail(false)}
                data={viewingInvoice}
            />

            {/* THÀNH PHẦN ẨN: Chỉ dùng để in, không hiện trên giao diện */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <PrintTemplate ref={componentRef} data={selectedInvoice} />
            </div>

            <LabelPreviewModal
                key={isLabelModalOpen ? 'label-modal-open' : 'label-modal-closed'}
                open={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                items={labelItems}
                companyInfo={viewingInvoice?.companyInfo}
                customerName={viewingInvoice?.customerName}
                onPrint={(finalItems) => {
                    setLabelItems(finalItems);
                    // Đóng modal nhập giá trước khi hiện preview in của trình duyệt
                    setIsLabelModalOpen(false);
                    setTimeout(() => handlePrintLabels(), 500);
                }}
            />

            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <ItemLabelTemplate
                    ref={labelPrintRef}
                    items={labelItems}
                    companyInfo={viewingInvoice?.companyInfo}
                    customerName={viewingInvoice?.customerName}
                />
            </div>

            {/* MODAL CREATE */}
            <Modal
                title="Tạo phiếu xuất kho"
                open={openModal}
                onOk={handleCreate}
                onCancel={() => setOpenModal(false)}
                width="100%"
                style={{ maxWidth: 1100 }}
            >
                <Form
                    layout="vertical"
                    form={form}
                    initialValues={{ items: [{}] }}
                    onValuesChange={calculateTotals}
                >
                    {/* INFO KHÁCH HÀNG */}
                    <Row gutter={16}>
                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Form.Item name="customerName" hidden>
                                <Input />
                            </Form.Item>
                            <Form.Item
                                label="Khách hàng"
                                name="customerId"
                                rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
                            >
                                <Select
                                    showSearch // Cho phép tìm kiếm
                                    allowClear
                                    className="w-full"
                                    placeholder="Tìm theo tên hoặc SĐT"
                                    optionFilterProp="children" // Tìm kiếm dựa trên nội dung text của Option
                                    onChange={(val) => {
                                        const cus = customers.find((c) => c._id === val);
                                        if (cus) {
                                            // Tự động điền các thông tin liên quan vào Form
                                            form.setFieldsValue({
                                                customerName: cus.name,
                                                customerPhone: cus.phone,
                                                customerAddress: cus.address,
                                                customerTaxCode: cus.taxCode
                                            });
                                        } else {
                                            form.setFieldsValue({
                                                customerName: '',
                                                customerPhone: '',
                                                customerAddress: '',
                                                customerTaxCode: ''
                                            });
                                        }
                                    }}
                                >
                                    {customers.map((c) => (
                                        <Select.Option key={c._id} value={c._id}>
                                            {c.name} - {c.phone}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Form.Item label="Số điện thoại" name="customerPhone">
                                <Input disabled placeholder="SĐT khách hàng" variant="borderless" style={{ color: '#1677ff', fontWeight: 'bold' }} />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Form.Item label="Mã số thuế" name="customerTaxCode">
                                <Input disabled placeholder="MST" variant="borderless" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Địa chỉ" name="customerAddress">
                                <Input disabled placeholder="Địa chỉ chi tiết của khách hàng" variant="filled" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* PHẦN NHÂN VIÊN & THANH TOÁN */}
                    <Row gutter={16}>
                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Form.Item name="staffName" hidden>
                                <Input />
                            </Form.Item>

                            <Form.Item
                                label="Nhân viên xuất kho"
                                name="staffId"
                                rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
                            >
                                <Select
                                    showSearch
                                    allowClear
                                    className="w-full"
                                    placeholder="Tìm tên hoặc mã nhân viên"
                                    optionFilterProp="children"
                                    // Logic tìm kiếm cả tên và mã nhân viên
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    onChange={(val) => {
                                        const staff = staffs.find((s) => s._id === val);
                                        if (staff) {
                                            form.setFieldsValue({
                                                staffCode: staff.staffCode,
                                                staffName: staff.name
                                            });
                                        } else {
                                            form.setFieldsValue({ staffCode: '', staffName: '' });
                                        }
                                    }}
                                    // Hiển thị danh sách kết hợp Mã - Tên
                                    options={staffs.map((s) => ({
                                        value: s._id,
                                        label: `${s.staffCode ? s.staffCode + ' - ' : ''}${s.name}`,
                                    }))}
                                />
                            </Form.Item>

                        </Col>

                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Form.Item label="Mã nhân viên" name="staffCode">
                                <Input
                                    disabled
                                    placeholder="Mã NV"
                                    variant="borderless"
                                    style={{ color: '#8c8c8c', fontWeight: '500' }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={24} md={12} lg={8}>
                            <Form.Item label="Hình thức thanh toán" name="paymentMethod" initialValue="DEBT">
                                <Select className="w-full">
                                    <Select.Option value="DEBT">Công nợ</Select.Option>
                                    <Select.Option value="CASH">Tiền mặt</Select.Option>
                                    <Select.Option value="TRANSFER">Chuyển khoản</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }} />

                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (

                                    <div
                                        key={key}
                                        className="border rounded-lg p-4 mb-4 bg-gray-50"
                                    >
                                        {/* Trường ẩn để giữ giá trị SKU gửi lên Backend */}

                                        <Form.Item name={[name, 'sku']} hidden><Input /></Form.Item>
                                        {/* Trường ẩn cho các thông tin snapshot khác nếu cần */}
                                        {/* <Form.Item name={[name, 'brand']} hidden><Input /></Form.Item>
                                        <Form.Item name={[name, 'unit']} hidden><Input /></Form.Item> */}
                                        <Form.Item name={[name, 'originCountry']} hidden><Input /></Form.Item>
                                        {/* Hàng 1: SKU */}
                                        <Form.Item
                                            {...restField}
                                            label="Sản phẩm (SKU)"
                                            name={[name, 'variantId']}
                                            rules={[{ required: true }]}
                                        >
                                            <Select
                                                showSearch
                                                placeholder="Chọn SKU"
                                                onChange={(val) => handleProductChange(val, name)}
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={variants.map(v => ({
                                                    value: v._id,
                                                    label: `${v.sku} - Tồn: ${v.inventory || 0}`
                                                }))}
                                            />
                                        </Form.Item>

                                        {/* Hàng 2: Brand + Unit */}
                                        <Row gutter={12}>
                                            <Col xs={12}>
                                                <Form.Item label="Hãng" name={[name, 'brand']}>
                                                    <Input disabled />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={12}>
                                                <Form.Item label="Đvt" name={[name, 'unit']}>
                                                    <Input disabled />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        {/* Hàng 3: Giá + SL */}
                                        <Row gutter={12}>
                                            <Col xs={12}>
                                                <Form.Item
                                                    label="Đơn giá"
                                                    name={[name, 'price']}
                                                    getValueProps={(value) => ({
                                                        value: value != null ? value.toLocaleString('en-US') : '',
                                                    })}
                                                >
                                                    <Input disabled />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={12}>
                                                <Form.Item
                                                    label="Số lượng"
                                                    name={[name, 'quantity']}
                                                    rules={[{ required: true }]}
                                                >
                                                    <InputNumber min={1} className="w-full" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        {/* Hàng 4: CK + Thành tiền */}
                                        <Row gutter={12}>
                                            <Col xs={12}>
                                                <Form.Item
                                                    label="Chiết khấu (%)"
                                                    name={[name, 'discountPercent']}
                                                >
                                                    <InputNumber min={0} max={100} className="w-full" />
                                                </Form.Item>
                                            </Col>

                                            <Col xs={12} className="flex flex-col justify-end">
                                                <Form.Item
                                                    label="Thanh toán"
                                                >
                                                    <Text type="danger" strong>
                                                        {calculateRowTotal(name).toLocaleString()}₫
                                                    </Text>
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <div className="text-right mt-2" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0' }}>
                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                disabled={fields.length <= 1}
                                                onClick={() => {
                                                    remove(name);
                                                    calculateTotals();
                                                }}
                                            >
                                                Xoá dòng
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Thêm dòng sản phẩm
                                </Button>

                            </>
                        )}
                    </Form.List>

                    {/* SUMMARY SECTION */}
                    <div style={{ marginTop: 24, padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                        <Row gutter={32}>
                            {/* Bên trái: Ghi chú */}
                            <Col xs={24} md={12}>
                                <Form.Item label={<Text strong>Ghi chú phiếu xuất</Text>} name="note">
                                    <Input.TextArea
                                        rows={4}
                                        placeholder="Nhập nội dung tặng khách, trừ tiền hộp, hoặc các điều khoản khác..."
                                    />
                                </Form.Item>
                            </Col>

                            {/* Bên phải: Tổng hợp chi phí */}
                            <Col xs={24} md={12}>
                                <Space direction="vertical" size="middle" className="w-full">
                                    <Row justify="space-between">
                                        <Col><Text type="secondary">Tổng số lượng:</Text></Col>
                                        <Col>
                                            {/* Sử dụng watchTotalQty ở đây */}
                                            <Text strong style={{ fontSize: 16 }}>
                                                {Number(watchTotalQty || 0).toLocaleString()}
                                            </Text>
                                            <Text type="secondary" style={{ marginLeft: 4 }}>sản phẩm</Text>
                                        </Col>
                                    </Row>

                                    <Row justify="space-between">
                                        <Col><Text type="secondary">Tạm tính (Tổng cộng):</Text></Col>
                                        <Col>
                                            {/* Sử dụng watchSubTotal ở đây */}
                                            <Text strong>
                                                {Number(watchSubTotal || 0).toLocaleString()}₫
                                            </Text>
                                        </Col>
                                    </Row>

                                    <Row justify="space-between">
                                        <Col><Text type="secondary">Tổng chiết khấu:</Text></Col>
                                        <Col>
                                            {/* Sử dụng watchTotalDiscount ở đây */}
                                            <Text type="danger">
                                                - {Number(watchTotalDiscount || 0).toLocaleString()}₫
                                            </Text>
                                        </Col>
                                    </Row>

                                    <Divider style={{ margin: '8px 0' }} />

                                    <Row justify="space-between" align="middle">
                                        <Col>
                                            <Title level={4} style={{ margin: 0 }}>TỔNG THANH TOÁN:</Title>
                                        </Col>
                                        <Col>
                                            {/* Sử dụng watchTotalAmount ở đây */}
                                            <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
                                                {Number(watchTotalAmount || 0).toLocaleString()}₫
                                            </Title>
                                        </Col>
                                    </Row>

                                    {/* Giữ nguyên các field hidden */}
                                    <Form.Item name="totalQuantity" hidden><Input /></Form.Item>
                                    <Form.Item name="subTotal" hidden><Input /></Form.Item>
                                    <Form.Item name="totalDiscount" hidden><Input /></Form.Item>
                                    <Form.Item name="totalAmount" hidden><Input /></Form.Item>
                                </Space>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Invoices;
