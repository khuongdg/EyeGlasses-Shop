import { useEffect, useState, useRef } from 'react';
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
import ItemLabelTemplate from '../../components/ItemLabelTemplate';

import { getInvoices, createInvoice, cancelInvoice } from '../../services/invoiceService';
import { getStaffs } from '../../services/staffService';
import { getVariants } from '../../services/variantService';
import { getCompanyInfo } from '../../services/companyService';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const SampleLabels = () => {
    const [invoices, setInvoices] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [variants, setVariants] = useState([]);
    const [company, setCompany] = useState(null);

    const [loading, setLoading] = useState(false);
    const [variantLoading, setVariantLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [openDetail, setOpenDetail] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const labelPrintRef = useRef();

    const [form] = Form.useForm();
    const watchTotalQuantity = Form.useWatch('totalQuantity', form);

    const handlePrintLabels = useReactToPrint({
        contentRef: labelPrintRef,
        pageStyle: `@page { size: 77mm 56mm; margin: 0; }`,
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
        isSample: true // Lọc chỉ phiếu tem mẫu
    });

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    /* ================= FETCH DATA ================= */
    const fetchInvoices = async (params = queryParams) => {
        setLoading(true);
        try {
            const res = await getInvoices(params);
            setInvoices(res.data.data);
            setPagination({
                current: params.page,
                pageSize: params.pageSize,
                total: res.data.total
            });
        } catch (err) {
            message.error('Không thể tải danh sách phiếu in tem mẫu');
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [staffRes, compRes] = await Promise.all([
                getStaffs({ limit: 1000, isActive: true }),
                getCompanyInfo({ isActive: true })
            ]);
            setStaffs(staffRes.data.data);
            if (compRes.data.data && compRes.data.data.length > 0) {
                setCompany(compRes.data.data[0]);
            }
        } catch {
            message.error('Không tải được thông tin Nhân viên / Cửa hàng');
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
        fetchInvoices();
        fetchVariants();
    }, []);

    const handleTableChange = (newPagination) => {
        const newParams = {
            ...queryParams,
            page: newPagination.current,
            pageSize: newPagination.pageSize
        };
        setQueryParams(newParams);
        fetchInvoices(newParams);
    };

    /* ================= SEARCH & RESET ================= */
    const handleSearch = () => {
        const newParams = { ...queryParams, page: 1 };
        setQueryParams(newParams);
        fetchInvoices(newParams);
    };

    const handleReset = () => {
        const resetParams = {
            keyword: '',
            dateFrom: null,
            dateTo: null,
            page: 1,
            pageSize: 10,
            isSample: true
        };
        setQueryParams(resetParams);
        fetchInvoices(resetParams);
    };

    /* ================= ACTIONS ================= */
    const handleDelete = async (id) => {
        try {
            await cancelInvoice(id);
            message.success('Xóa phiếu in tem mẫu thành công');
            fetchInvoices();
        } catch (err) {
            message.error(err.response?.data?.message || 'Xóa phiếu thất bại');
        }
    };

    const triggerPrint = (record) => {
        setSelectedInvoice(record);
        setTimeout(() => {
            handlePrintLabels();
        }, 500);
    };

    /* ================= LOGIC FORM TẠO PHIẾU ================= */
    const handleProductChange = (val, name) => {
        const v = variants.find((x) => x._id === val);
        if (v) {
            const productName = v.productId?.name || '';
            const brand = v.productId?.brand || 'N/A';
            const originCountry = v.productId?.originCountry || 'N/A';
            const unit = v.unit || 'Cây';

            form.setFieldValue(['items', name, 'sku'], v.sku);
            form.setFieldValue(['items', name, 'productName'], productName);
            form.setFieldValue(['items', name, 'brand'], brand);
            form.setFieldValue(['items', name, 'originCountry'], originCountry);
            form.setFieldValue(['items', name, 'unit'], unit);
            form.setFieldValue(['items', name, 'price'], v.price);
            form.setFieldValue(['items', name, 'quantity'], 1);
            form.setFieldValue(['items', name, 'customerName'], ''); // Khách hàng tùy chọn in tem
            
            calculateTotals();
        }
    };

    const calculateTotals = () => {
        const items = form.getFieldValue('items') || [];
        let totalQty = 0;
        let totalAmt = 0;

        items.forEach((item) => {
            if (item && item.price && item.quantity) {
                totalQty += Number(item.quantity);
                totalAmt += Number(item.quantity) * Number(item.price);
            }
        });

        form.setFieldsValue({
            totalQuantity: totalQty,
            subTotal: totalAmt,
            totalAmount: totalAmt
        });
    };

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            const totalQty = values.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const subTotal = values.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

            const payload = {
                ...values,
                isSample: true, // Biến thể in mẫu
                paymentMethod: 'CASH', // Default giá trị bắt buộc trên DB
                totalDiscount: 0,
                totalQuantity: totalQty,
                subTotal: subTotal,
                totalAmount: subTotal,
                items: values.items.map((it) => ({
                    ...it,
                    discountPercent: 0,
                    rowTotal: it.quantity * it.price
                }))
            };

            await createInvoice(payload);
            message.success('Tạo phiếu in tem mẫu thành công');
            setOpenModal(false);
            form.resetFields();
            fetchInvoices();
        } catch (err) {
            if (err.errorFields) return; // Lỗi validate form
            message.error(err.response?.data?.message || 'Tạo phiếu in tem mẫu thất bại');
        }
    };

    const handleOpenPrintAllModal = () => {
        form.resetFields();

        if (!variants || variants.length === 0) {
            message.warning('Không có sản phẩm nào trong hệ thống để in');
            return;
        }

        const allItems = variants.map((v) => {
            const productName = v.productId?.name || '';
            const brand = v.productId?.brand || 'N/A';
            const originCountry = v.productId?.originCountry || 'N/A';
            const unit = v.unit || 'Cây';

            return {
                variantId: v._id,
                sku: v.sku,
                productName: productName,
                brand: brand,
                originCountry: originCountry,
                unit: unit,
                price: v.price,
                quantity: 1, // Mặc định số lượng là 1
                customerName: '' // Trống để in mặc định Hàng mẫu
            };
        });

        form.setFieldsValue({
            items: allItems
        });

        calculateTotals();
        setOpenModal(true);
    };

    /* ================= COLUMNS TABLE ================= */
    const columns = [
        { title: 'Mã phiếu', dataIndex: 'invoiceCode' },
        { title: 'Người lập phiếu', render: (_, record) => record.staffId?.name || 'N/A' },
        {
            title: 'Ngày lập',
            dataIndex: 'createdAt',
            render: (date) => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Tổng số tem',
            dataIndex: 'totalQuantity',
            render: (v) => `${v || 0} tem`
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            render: (v) => v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã hủy</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        icon={<BarcodeOutlined />}
                        title="In danh sách tem"
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerPrint(record);
                        }}
                    />
                    
                    {record.isActive && (
                        <Popconfirm
                            title="Xóa vĩnh viễn phiếu in tem mẫu?"
                            description="Phiếu này sẽ bị xóa hoàn toàn khỏi hệ thống và không thể hoàn tác."
                            onConfirm={(e) => {
                                e.stopPropagation();
                                handleDelete(record._id);
                            }}
                            onCancel={(e) => e.stopPropagation()}
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger size="small" onClick={(e) => e.stopPropagation()}>
                                Xoá
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    // Tạo mảng tem phẳng để gửi vào ItemLabelTemplate
    const getFlatLabelItems = () => {
        if (!selectedInvoice) return [];
        const flatItems = [];
        selectedInvoice.items.forEach((item) => {
            const qty = Number(item.quantity) || 0;
            for (let i = 0; i < qty; i++) {
                flatItems.push({
                    ...item,
                    printPrice: item.price, // Mặc định in theo đơn giá của dòng sản phẩm
                    customerName: item.customerName || selectedInvoice.customerName || 'Hàng mẫu',
                    tempId: `${item.sku}-${i}`
                });
            }
        });
        return flatItems;
    };

    return (
        <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BarcodeOutlined/> In tem mẫu sản phẩm
                    </h2>
                </div>

                <Space>
                    <Button
                        icon={<PlusOutlined />}
                        onClick={handleOpenPrintAllModal}
                        style={{
                            backgroundColor: '#fff7e6',
                            borderColor: '#ffd591',
                            color: '#d46b08',
                            transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffe7ba';
                            e.currentTarget.style.borderColor = '#ffc069';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff7e6';
                            e.currentTarget.style.borderColor = '#ffd591';
                        }}
                    >
                        Tạo phiếu in tất cả
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            form.resetFields();
                            form.setFieldsValue({ items: [{}] });
                            setOpenModal(true);
                        }}
                    >
                        Tạo phiếu in tem mẫu
                    </Button>
                </Space>
            </div>

            {/* FILTER BAR */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            placeholder="Mã phiếu hoặc tên nhân viên..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            value={queryParams.keyword}
                            onChange={(e) => setQueryParams({ ...queryParams, keyword: e.target.value })}
                            onPressEnter={handleSearch}
                            allowClear
                        />
                    </Col>

                    <Col xs={24} sm={12} md={10}>
                        <RangePicker
                            className="w-full"
                            placeholder={['Từ ngày', 'Đến ngày']}
                            value={queryParams.dateFrom && queryParams.dateTo ? [queryParams.dateFrom, queryParams.dateTo] : null}
                            onChange={(dates) => {
                                setQueryParams({
                                    ...queryParams,
                                    dateFrom: dates ? dates[0] : null,
                                    dateTo: dates ? dates[1] : null
                                });
                            }}
                        />
                    </Col>

                    <Col xs={24} md={6}>
                        <div className="flex gap-2">
                            <Button type="primary" onClick={handleSearch}>Lọc dữ liệu</Button>
                            <Button onClick={handleReset}>Reset</Button>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* TABLE LIST */}
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

            {/* HIDDEN PRINT COMPONENT */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <ItemLabelTemplate
                    ref={labelPrintRef}
                    items={getFlatLabelItems()}
                    companyInfo={selectedInvoice?.companyInfo || company}
                    customerName={selectedInvoice?.customerName || 'Hàng mẫu'}
                />
            </div>

            {/* MODAL CHI TIẾT PHIẾU IN TEM MẪU */}
            <Modal
                title={`Chi tiết phiếu in tem mẫu: ${viewingInvoice?.invoiceCode}`}
                open={openDetail}
                onCancel={() => setOpenDetail(false)}
                footer={[
                    <Button key="close" onClick={() => setOpenDetail(false)}>Đóng</Button>
                ]}
                width={750}
                style={{ top: 20 }}
            >
                {viewingInvoice && (
                    <div className="space-y-4">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                                <p className="mb-2"><strong>Mã phiếu:</strong> {viewingInvoice.invoiceCode}</p>
                                <p className="mb-0"><strong>Nhân viên lập:</strong> {viewingInvoice.staffId?.name || viewingInvoice.staffName || 'N/A'}</p>
                            </Col>
                            <Col xs={24} sm={12}>
                                <p className="mb-2"><strong>Ngày lập:</strong> {new Date(viewingInvoice.createdAt).toLocaleString('vi-VN')}</p>
                                <p className="mb-0"><strong>Trạng thái:</strong> {viewingInvoice.isActive ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã hủy</Tag>}</p>
                            </Col>
                        </Row>

                        {viewingInvoice.note && (
                            <div className="bg-yellow-50 p-3 border border-yellow-200 rounded text-sm mt-2">
                                <strong>Ghi chú:</strong> {viewingInvoice.note}
                            </div>
                        )}

                        <Divider style={{ margin: '16px 0' }} />
                        <h4 className="font-semibold text-gray-700 mb-2">Danh sách sản phẩm in tem</h4>
                         <Table
                            dataSource={viewingInvoice.items}
                            pagination={false}
                            rowKey={(record, idx) => record.variantId + record.sku + idx}
                            size="small"
                            bordered
                            scroll={{ y: '40vh' }}
                            columns={[
                                { title: 'Mã hàng (SKU)', dataIndex: 'sku' },
                                { title: 'Thương hiệu', dataIndex: 'brand' },
                                { title: 'ĐVT', dataIndex: 'unit' },
                                { title: 'Đơn giá in', dataIndex: 'price', render: (v) => `${v?.toLocaleString()} ₫` },
                                { title: 'Số tem in', dataIndex: 'quantity', render: (v) => <strong>{v} tem</strong> },
                                { title: 'Tên cửa hàng in', dataIndex: 'customerName', render: (v) => v || 'Hàng mẫu' },
                            ]}
                        />
                    </div>
                )}
            </Modal>

            {/* MODAL TẠO PHIẾU IN MẪU */}
            <Modal
                title="Tạo phiếu in tem mẫu"
                open={openModal}
                onOk={handleCreate}
                onCancel={() => setOpenModal(false)}
                width="100%"
                style={{ maxWidth: 1000, top: 20 }}
                destroyOnClose
            >
                <Form
                    layout="vertical"
                    form={form}
                    initialValues={{ items: [{}] }}
                    onValuesChange={calculateTotals}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="staffName" hidden><Input /></Form.Item>
                            <Form.Item
                                label="Nhân viên lập phiếu"
                                name="staffId"
                                rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Tìm tên hoặc mã nhân viên"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    onChange={(val) => {
                                        const staff = staffs.find((s) => s._id === val);
                                        if (staff) {
                                            form.setFieldsValue({ staffName: staff.name });
                                        }
                                    }}
                                    options={staffs.map((s) => ({
                                        value: s._id,
                                        label: `${s.staffCode ? s.staffCode + ' - ' : ''}${s.name}`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Ghi chú lập phiếu" name="note">
                                <Input placeholder="Ví dụ: In tem test cho đợt hàng mắt kính hè..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }}><Text strong className="text-blue-500">Danh sách sản phẩm in tem</Text></Divider>

                    <div style={{ maxHeight: '42vh', overflowY: 'auto', paddingRight: '12px', paddingLeft: '4px' }} className="mb-4">
                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <div key={key} className="border rounded-lg p-4 mb-4 bg-gray-50 relative">
                                            {/* Hidden fields */}
                                            <Form.Item name={[name, 'sku']} hidden><Input /></Form.Item>
                                            <Form.Item name={[name, 'productName']} hidden><Input /></Form.Item>
                                            <Form.Item name={[name, 'originCountry']} hidden><Input /></Form.Item>

                                            <Row gutter={12}>
                                                <Col xs={24} md={12}>
                                                    <Form.Item
                                                        {...restField}
                                                        label="Sản phẩm (SKU)"
                                                        name={[name, 'variantId']}
                                                        rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
                                                    >
                                                        <Select
                                                            showSearch
                                                            placeholder="Tìm theo SKU"
                                                            onChange={(val) => handleProductChange(val, name)}
                                                            filterOption={(input, option) =>
                                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                            }
                                                            options={variants.map(v => ({
                                                                value: v._id,
                                                                label: `${v.sku} - ${v.productId?.name || ''} (Tồn: ${v.inventory || 0})`
                                                            }))}
                                                        />
                                                    </Form.Item>
                                                </Col>

                                                <Col xs={12} md={6}>
                                                    <Form.Item label="Hãng sản xuất" name={[name, 'brand']}>
                                                        <Input disabled placeholder="Hãng sản xuất" className="bg-gray-100" />
                                                    </Form.Item>
                                                </Col>

                                                <Col xs={12} md={6}>
                                                    <Form.Item label="Đơn vị tính" name={[name, 'unit']}>
                                                        <Input disabled placeholder="Đvt" className="bg-gray-100" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Row gutter={12}>
                                                <Col xs={24} sm={12} md={8}>
                                                    <Form.Item
                                                        label="Đơn giá in (VND)"
                                                        name={[name, 'price']}
                                                        rules={[{ required: true, message: 'Nhập giá hiển thị tem' }]}
                                                    >
                                                        <InputNumber
                                                            className="w-full"
                                                            min={0}
                                                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                            parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                                            onChange={() => calculateTotals()}
                                                        />
                                                    </Form.Item>
                                                </Col>

                                                <Col xs={12} sm={6} md={4}>
                                                    <Form.Item
                                                        label="Số lượng in"
                                                        name={[name, 'quantity']}
                                                        rules={[{ required: true, message: 'Nhập số lượng' }]}
                                                    >
                                                        <InputNumber min={1} className="w-full" onChange={() => calculateTotals()} />
                                                    </Form.Item>
                                                </Col>

                                                <Col xs={12} sm={18} md={8}>
                                                    <Form.Item label="Tên cửa hàng in tem (Branding tùy chọn)" name={[name, 'customerName']}>
                                                        <Input placeholder="Mặc định sẽ in 'Hàng mẫu'" />
                                                    </Form.Item>
                                                </Col>

                                                <Col xs={24} md={4} className="flex items-end mb-6">
                                                    <Button danger onClick={() => { remove(name); calculateTotals(); }} className="w-full">
                                                        Xóa dòng
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    ))}

                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="mb-4">
                                        Thêm sản phẩm in tem
                                    </Button>
                                </>
                            )}
                        </Form.List>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* SUMMARY SECTION */}
                    <div className="flex justify-end p-2 bg-gray-50 rounded-lg">
                        <Space size="large" className="text-right">
                            <div className="text-center w-32">
                                <Text type="secondary">Tổng số tem in:</Text>
                                <div className="text-xl font-bold text-gray-800 mt-1">
                                    {watchTotalQuantity || 0}
                                </div>
                                <Form.Item name="totalQuantity" hidden initialValue={0}>
                                    <InputNumber />
                                </Form.Item>
                            </div>
                            <Form.Item name="totalAmount" hidden initialValue={0}>
                                <InputNumber />
                            </Form.Item>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SampleLabels;
