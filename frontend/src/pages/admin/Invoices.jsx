import { useEffect, useState } from 'react';
import { useRef } from 'react';
import debounce from 'lodash/debounce';
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
    Popconfirm,
    Badge
} from 'antd';
import { PlusOutlined, DeleteOutlined, PrinterOutlined, SearchOutlined, BarcodeOutlined, InboxOutlined, FolderOpenOutlined } from '@ant-design/icons';
import PrintTemplate from '../../components/PrintTemplate';
import ItemLabelTemplate from '../../components/ItemLabelTemplate';
import InvoiceDetails from './InvoiceDetails';
import LabelPreviewModal from './LabelPreviewModal';
import SkuSelectModal from './SkuSelectModal';

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
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);
    const [isDraftListModalOpen, setIsDraftListModalOpen] = useState(false);
    const [showSaveDraftConfirm, setShowSaveDraftConfirm] = useState(false);
    const [draftsList, setDraftsList] = useState([]);
    const [isFormModified, setIsFormModified] = useState(false);
    const [currentEditingDraftId, setCurrentEditingDraftId] = useState(null);
    const [draftRestored, setDraftRestored] = useState(false);

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
    });
    const [keyword, setKeyword] = useState('');

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
                getStaffs({ limit: 1000, isActive: true })
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
        
        // Tải danh sách bản nháp ban đầu để hiển thị badge số lượng
        const drafts = JSON.parse(localStorage.getItem('invoice_drafts') || '[]');
        setDraftsList(drafts);
    }, []);

    useEffect(() => {
        // Chỉ khôi phục nháp khi danh sách sản phẩm (variants) đã tải xong vào state
        if (variants && variants.length > 0 && !draftRestored) {
            const wasOpen = localStorage.getItem('is_invoice_modal_open') === 'true';
            if (wasOpen) {
                const savedDraft = localStorage.getItem('current_invoice_draft');
                console.log("=== RESTORING DRAFT FROM LOCALSTORAGE ===", savedDraft);
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        console.log("=== PARSED DRAFT ===", parsed);
                        form.setFieldsValue(parsed);
                        setTimeout(() => {
                            calculateTotals();
                        }, 100);
                    } catch (e) {
                        console.error("Failed to parse current draft", e);
                    }
                }
                const savedEditingId = localStorage.getItem('current_editing_draft_id');
                if (savedEditingId) {
                    setCurrentEditingDraftId(savedEditingId);
                }
                setIsFormModified(true);
                setOpenModal(true);
            }
            setDraftRestored(true);
        }
    }, [variants, draftRestored]);

    useEffect(() => {
        if (isDraftListModalOpen) {
            const drafts = JSON.parse(localStorage.getItem('invoice_drafts') || '[]');
            setDraftsList(drafts);
        }
    }, [isDraftListModalOpen]);

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

    const debounceSearch = useRef(
        debounce((val) => {
            setQueryParams((prev) => {
                const newParams = {
                    ...prev,
                    page: 1,
                    keyword: val.trim()
                };
                fetchInvoices(newParams);
                return newParams;
            });
        }, 400)
    ).current;

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
        saveActiveDraft();
    };

    const saveActiveDraft = () => {
        const values = form.getFieldsValue(true);
        console.log("=== SAVING ACTIVE DRAFT TO LOCALSTORAGE ===", values);
        localStorage.setItem('current_invoice_draft', JSON.stringify(values));
    };

    const updateActiveDraft = () => {
        setIsFormModified(true);
        saveActiveDraft();
    };
    /* ================= CREATE ================= */
    const handleCreate = async () => {
        try {
            setSubmitLoading(true);
            const values = await form.validateFields();
            if (!values.items || values.items.length === 0) {
                message.error('Vui lòng chọn ít nhất 1 sản phẩm (SKU)');
                return;
            }
            await createInvoice(values);

            message.success('Tạo phiếu xuất kho thành công');
            setOpenModal(false);
            form.resetFields();

            if (currentEditingDraftId) {
                const drafts = JSON.parse(localStorage.getItem('invoice_drafts') || '[]');
                const updated = drafts.filter(d => d.id !== currentEditingDraftId);
                localStorage.setItem('invoice_drafts', JSON.stringify(updated));
                setDraftsList(updated);
            }

            localStorage.removeItem('current_invoice_draft');
            localStorage.removeItem('current_editing_draft_id');
            localStorage.setItem('is_invoice_modal_open', 'false');
            setCurrentEditingDraftId(null);
            fetchInvoices();
            fetchVariants();
        } catch (err) {
            if (err.errorFields) return; // Lỗi validate form
            message.error(err.response?.data?.message || 'Tạo phiếu thất bại');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancelCreate = () => {
        const values = form.getFieldsValue(true);
        const hasContent = values.customerId || (values.items && values.items.length > 0) || values.note;

        if (isFormModified && hasContent) {
            setShowSaveDraftConfirm(true);
        } else {
            setOpenModal(false);
            localStorage.removeItem('current_invoice_draft');
            localStorage.removeItem('current_editing_draft_id');
            localStorage.setItem('is_invoice_modal_open', 'false');
            setCurrentEditingDraftId(null);
            form.resetFields();
        }
    };

    const handleSaveDraft = () => {
        const values = form.getFieldsValue(true);
        const drafts = JSON.parse(localStorage.getItem('invoice_drafts') || '[]');
        let isUpdate = false;
        
        if (currentEditingDraftId) {
            // Cập nhật đè lên bản nháp cũ
            const draftIndex = drafts.findIndex(d => d.id === currentEditingDraftId);
            if (draftIndex > -1) {
                drafts[draftIndex] = {
                    ...drafts[draftIndex],
                    ...values,
                    updatedAt: new Date().toLocaleString('vi-VN')
                };
                isUpdate = true;
            } else {
                const newDraft = {
                    ...values,
                    id: currentEditingDraftId,
                    updatedAt: new Date().toLocaleString('vi-VN'),
                };
                drafts.unshift(newDraft);
            }
        } else {
            // Tạo mới một bản nháp
            const newDraft = {
                ...values,
                id: 'draft_' + Date.now(),
                updatedAt: new Date().toLocaleString('vi-VN'),
            };
            drafts.unshift(newDraft);
        }
        
        localStorage.setItem('invoice_drafts', JSON.stringify(drafts));
        setDraftsList(drafts);
        
        if (isUpdate) {
            message.success('Đã cập nhật bản lưu nháp');
        } else {
            message.success('Đã lưu phiếu vào danh sách bản nháp');
        }
        
        setShowSaveDraftConfirm(false);
        setOpenModal(false);
        setIsFormModified(false);
        localStorage.removeItem('current_invoice_draft');
        localStorage.removeItem('current_editing_draft_id');
        localStorage.setItem('is_invoice_modal_open', 'false');
        setCurrentEditingDraftId(null);
        form.resetFields();
    };

    const handleDiscard = () => {
        setShowSaveDraftConfirm(false);
        setOpenModal(false);
        setIsFormModified(false);
        localStorage.removeItem('current_invoice_draft');
        localStorage.removeItem('current_editing_draft_id');
        localStorage.setItem('is_invoice_modal_open', 'false');
        setCurrentEditingDraftId(null);
        form.resetFields();
        message.info('Đã hủy các thay đổi');
    };

    const handleEditDraft = (draft) => {
        localStorage.setItem('current_invoice_draft', JSON.stringify(draft));
        localStorage.setItem('current_editing_draft_id', draft.id);
        localStorage.setItem('is_invoice_modal_open', 'true');
        
        form.resetFields();
        form.setFieldsValue(draft);
        setIsFormModified(false);
        setCurrentEditingDraftId(draft.id);
        
        setTimeout(() => {
            calculateTotals();
        }, 100);

        setOpenModal(true);
        setIsDraftListModalOpen(false);
    };

    const handleDeleteDraft = (draftId) => {
        const drafts = JSON.parse(localStorage.getItem('invoice_drafts') || '[]');
        const updated = drafts.filter(d => d.id !== draftId);
        localStorage.setItem('invoice_drafts', JSON.stringify(updated));
        setDraftsList(updated);
        message.success('Đã xóa bản nháp');
    };

    const handleSkuModalConfirm = (selectedIds) => {
        const currentItems = form.getFieldValue('items') || [];
        const existingItemsMap = {};
        
        currentItems.forEach(item => {
            if (item && item.variantId) {
                existingItemsMap[item.variantId] = item;
            }
        });

        const updatedItems = selectedIds.map(id => {
            if (existingItemsMap[id]) {
                return existingItemsMap[id];
            } else {
                const v = variants.find(x => x._id === id);
                return {
                    variantId: v._id,
                    sku: v?.sku,
                    brand: v?.productId?.brand || 'N/A',
                    originCountry: v?.productId?.originCountry || 'N/A',
                    unit: v?.unit || 'Cây',
                    price: v?.price || 0,
                    quantity: 1,
                    discountPercent: 0
                };
            }
        });

        form.setFieldsValue({ items: updatedItems });
        calculateTotals();
        updateActiveDraft();
        setIsSkuModalOpen(false);
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
            updateActiveDraft();
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
                { text: 'Hoạt động', value: true },
                { text: 'Không hoạt động', value: false },
            ],
            onFilter: (value, record) => record.isActive === value,
            render: (v) =>
                v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Không hoạt động</Tag>
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space size="small">
                    {record.isActive && (
                        <>
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
                        </>
                    )}

                    {record.isActive && (
                        <span onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                                title="Xác nhận hủy hóa đơn?"
                                description="Hành động này sẽ không thể hoàn tác!"
                                onConfirm={() => handleCancelInvoice(record._id)}
                                okButtonProps={{ danger: true }}
                            >
                                <Button danger size="small">
                                    Huỷ
                                </Button>
                            </Popconfirm>
                        </span>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h2 className="text-xl font-semibold">Phiếu xuất kho</h2>

                <div className="flex gap-2">
                    <Badge count={draftsList.length} size="small">
                        <Button
                            icon={<FolderOpenOutlined />}
                            onClick={() => setIsDraftListModalOpen(true)}
                            title="Danh sách phiếu nháp"
                            className="flex items-center justify-center border-gray-300 hover:border-blue-500 hover:text-blue-500"
                        />
                    </Badge>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            form.resetFields();
                            setIsFormModified(false);
                            setOpenModal(true);
                            localStorage.setItem('is_invoice_modal_open', 'true');
                            localStorage.setItem('current_invoice_draft', JSON.stringify(form.getFieldsValue(true)));
                        }}
                    >
                        Tạo phiếu
                    </Button>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-100">
                <Row gutter={[16, 16]} align="bottom">
                    {/* SEARCH */}
                    <Col xs={24} md={14} lg={16}>
                        <Text strong className="block mb-1">Tìm kiếm</Text>
                        <Input
                            placeholder="Mã phiếu, tên hoặc SĐT khách hàng..."
                            prefix={<SearchOutlined />}
                            allowClear
                            value={keyword}
                            style={{ borderRadius: '20px' }}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKeyword(val);
                                debounceSearch(val);
                            }}
                        />
                    </Col>

                    {/* DATE RANGE */}
                    <Col xs={24} md={10} lg={8}>
                        <Text strong className="block mb-1">Khoảng thời gian</Text>
                        <RangePicker
                            className="w-full"
                            format="DD/MM/YYYY"
                            style={{ borderRadius: '20px' }}
                            onChange={(dates) => {
                                const newParams = {
                                    ...queryParams,
                                    page: 1,
                                    dateFrom: dates
                                        ? dates[0].format('YYYY-MM-DD')
                                        : null,
                                    dateTo: dates
                                        ? dates[1].format('YYYY-MM-DD')
                                        : null
                                };
                                setQueryParams(newParams);
                                fetchInvoices(newParams);
                            }}
                        />
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
                                    {invoice.isActive ? 'Hoạt động' : 'Không hoạt động'}
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
                            {invoice.isActive && (
                                <div
                                    className="mt-4 flex gap-2 flex-wrap"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span onClick={(e) => e.stopPropagation()}>
                                        <Popconfirm
                                            title="Xác nhận hủy hóa đơn?"
                                            description="Hành động này sẽ không thể hoàn tác!"
                                            onConfirm={() => handleCancelInvoice(invoice._id)}
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button danger size="small">
                                                Huỷ
                                            </Button>
                                        </Popconfirm>
                                    </span>

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
                            )}
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
                confirmLoading={submitLoading}
                onCancel={handleCancelCreate}
                width="100%"
                style={{ maxWidth: 1100, top: 20 }}
            >
                <Form
                    layout="vertical"
                    form={form}
                    initialValues={{ items: [] }}
                    onValuesChange={(changedValues, allValues) => {
                        calculateTotals();
                        setIsFormModified(true);
                    }}
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
                                        updateActiveDraft();
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
                                        updateActiveDraft();
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

                    <Divider style={{ marginTop: '4px', marginBottom: '12px' }}><Text strong className="text-blue-500">Danh sách sản phẩm</Text></Divider>

                    <div style={{ maxHeight: '42vh', overflowY: 'auto', paddingRight: '12px', paddingLeft: '4px' }} className="mb-4">
                        <Form.List name="items">
                            {(fields, { add, remove }) => {
                                const hasFields = fields.length > 0;
                                return (
                                    <>
                                        {!hasFields ? (
                                            <div 
                                                onClick={() => setIsSkuModalOpen(true)}
                                                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl bg-gray-50 hover:bg-blue-50/20 transition-all cursor-pointer group min-h-[160px]"
                                            >
                                                <InboxOutlined className="text-4xl text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                                                <span className="text-base font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">Thêm SKU</span>
                                                <span className="text-xs text-gray-400 mt-1">Tìm kiếm và chọn một hoặc nhiều sản phẩm (SKU)</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Table Header (desktop only) */}
                                                <div className="hidden md:flex gap-3 px-4 py-2 bg-gray-100 font-semibold text-gray-600 border rounded-t-lg items-center text-sm">
                                                    <div className="flex-[2]">Sản phẩm (SKU)</div>
                                                    <div className="w-[120px] text-right">Đơn giá</div>
                                                    <div className="w-[100px] text-center">Số lượng</div>
                                                    <div className="w-[100px] text-center">Chiết khấu (%)</div>
                                                    <div className="w-[120px] text-right">Thành tiền</div>
                                                    <div className="w-[40px]"></div>
                                                </div>

                                                <div className="border border-t-0 rounded-b-lg divide-y bg-white">
                                                    {fields.map(({ key, name, ...restField }) => (
                                                        <div key={key} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center px-4 py-3 hover:bg-gray-50/50">
                                                            {/* Cột 1: Sản phẩm (SKU) */}
                                                            <div className="flex-[2] min-w-0">
                                                                <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Sản phẩm (SKU)</span>
                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[name, 'variantId']}
                                                                    rules={[{ required: true, message: 'Chọn SKU' }]}
                                                                    style={{ margin: 0 }}
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
                                                                        className="w-full"
                                                                    />
                                                                </Form.Item>
                                                                <Form.Item name={[name, 'sku']} hidden><Input /></Form.Item>
                                                                <Form.Item name={[name, 'brand']} hidden><Input /></Form.Item>
                                                                <Form.Item name={[name, 'unit']} hidden><Input /></Form.Item>
                                                                <Form.Item name={[name, 'originCountry']} hidden><Input /></Form.Item>
                                                            </div>

                                                            {/* Cột 2: Đơn giá */}
                                                            <div className="w-full md:w-[120px]">
                                                                <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Đơn giá</span>
                                                                <Form.Item
                                                                    name={[name, 'price']}
                                                                    style={{ margin: 0 }}
                                                                    getValueProps={(value) => ({
                                                                        value: value != null ? value.toLocaleString('en-US') : '',
                                                                    })}
                                                                >
                                                                    <Input disabled className="text-right md:text-right font-medium text-gray-700 bg-gray-50" />
                                                                </Form.Item>
                                                            </div>

                                                            {/* Cột 3: Số lượng */}
                                                            <div className="w-full md:w-[100px]">
                                                                <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Số lượng</span>
                                                                <Form.Item
                                                                    name={[name, 'quantity']}
                                                                    rules={[{ required: true, message: 'Nhập SL' }]}
                                                                    style={{ margin: 0 }}
                                                                >
                                                                    <InputNumber min={1} className="w-full text-center" onChange={() => calculateTotals()} />
                                                                </Form.Item>
                                                            </div>

                                                            {/* Cột 4: Chiết khấu (%) */}
                                                            <div className="w-full md:w-[100px]">
                                                                <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Chiết khấu (%)</span>
                                                                <Form.Item
                                                                    name={[name, 'discountPercent']}
                                                                    style={{ margin: 0 }}
                                                                >
                                                                    <InputNumber min={0} max={100} className="w-full text-center" onChange={() => calculateTotals()} />
                                                                </Form.Item>
                                                            </div>

                                                            {/* Cột 5: Thanh toán */}
                                                            <div className="w-full md:w-[120px] flex flex-col justify-center">
                                                                <span className="block md:hidden text-xs font-semibold text-gray-500 mb-1">Thanh toán</span>
                                                                <div className="text-right font-semibold text-red-500 text-sm">
                                                                    {calculateRowTotal(name).toLocaleString()}₫
                                                                </div>
                                                            </div>

                                                            {/* Cột 6: Hành động */}
                                                            <div className="w-full md:w-[40px] flex justify-end items-center">
                                                                <Button
                                                                    danger
                                                                    type="text"
                                                                    icon={<DeleteOutlined />}
                                                                    onClick={() => {
                                                                        remove(name);
                                                                        calculateTotals();
                                                                        updateActiveDraft();
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                            <Button 
                                                type="dashed" 
                                                onClick={() => {
                                                    add({ quantity: 1, discountPercent: 0 });
                                                    calculateTotals();
                                                    updateActiveDraft();
                                                }} 
                                                className="flex-1"
                                                icon={<PlusOutlined />}
                                            >
                                                Thêm dòng sản phẩm
                                            </Button>
                                            {hasFields && (
                                                <Button 
                                                    type="primary"
                                                    ghost
                                                    icon={<InboxOutlined />}
                                                    onClick={() => setIsSkuModalOpen(true)}
                                                >
                                                    Chọn SKU từ danh sách
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                );
                            }}
                        </Form.List>
                    </div>

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

            <SkuSelectModal
                open={isSkuModalOpen}
                onClose={() => setIsSkuModalOpen(false)}
                variants={variants}
                onConfirm={handleSkuModalConfirm}
                initialSelectedIds={(form.getFieldValue('items') || [])
                    .filter(item => item && item.variantId)
                    .map(item => item.variantId)
                }
            />

            {/* Modal hỏi lưu nháp khi đóng modal tạo phiếu */}
            <Modal
                title={<span className="font-bold text-gray-800">Lưu bản nháp?</span>}
                open={showSaveDraftConfirm}
                onCancel={() => setShowSaveDraftConfirm(false)}
                centered
                footer={[
                    <Button key="cancel" className="rounded-full animate-fade-in" onClick={() => setShowSaveDraftConfirm(false)}>
                        Quay lại
                    </Button>,
                    <Button key="discard" danger className="rounded-full" onClick={handleDiscard}>
                        Không lưu
                    </Button>,
                    <Button key="save" type="primary" className="rounded-full bg-blue-600" onClick={handleSaveDraft}>
                        Lưu bản nháp
                    </Button>
                ]}
            >
                <div className="py-2">
                    <p className="text-gray-600">Bạn có muốn lưu thông tin phiếu đang tạo này dưới dạng bản nháp để tiếp tục chỉnh sửa vào lần sau không?</p>
                </div>
            </Modal>

            {/* Modal danh sách phiếu nháp */}
            <Modal
                title={<span className="font-bold text-gray-800">Danh sách phiếu nháp</span>}
                open={isDraftListModalOpen}
                onCancel={() => setIsDraftListModalOpen(false)}
                width={850}
                centered
                footer={[
                    <Button key="close" className="rounded-full" onClick={() => setIsDraftListModalOpen(false)}>
                        Đóng
                    </Button>
                ]}
            >
                <div className="my-4">
                    <Table
                        rowKey="id"
                        dataSource={draftsList}
                        locale={{ emptyText: 'Chưa có phiếu nháp nào được lưu' }}
                        scroll={{ x: 'max-content' }}
                        columns={[
                            {
                                title: 'Thời gian lưu',
                                dataIndex: 'updatedAt',
                                key: 'updatedAt',
                                width: 150,
                                className: 'whitespace-nowrap',
                                render: (v) => <span className="font-mono text-xs text-gray-500">{v}</span>
                            },
                            {
                                title: 'Khách hàng',
                                dataIndex: 'customerName',
                                key: 'customerName',
                                className: 'whitespace-nowrap',
                                render: (name) => <span className="font-medium text-gray-800">{name || 'Chưa chọn'}</span>
                            },
                            {
                                title: 'Nhân viên',
                                dataIndex: 'staffName',
                                key: 'staffName',
                                className: 'whitespace-nowrap',
                                render: (name) => <span className="text-gray-600">{name || 'Chưa chọn'}</span>
                            },
                            {
                                title: 'Số sản phẩm',
                                dataIndex: 'items',
                                key: 'items',
                                width: 120,
                                className: 'whitespace-nowrap',
                                render: (items) => <span>{(items || []).length} sản phẩm</span>
                            },
                            {
                                title: 'Tạm tính',
                                dataIndex: 'subTotal',
                                key: 'subTotal',
                                width: 130,
                                className: 'whitespace-nowrap',
                                render: (val) => <span className="font-semibold text-gray-800">{(val || 0).toLocaleString()}₫</span>
                            },
                            {
                                title: 'Hành động',
                                key: 'action',
                                width: 150,
                                align: 'center',
                                className: 'whitespace-nowrap',
                                render: (_, record) => (
                                    <Space size="small">
                                        <Button
                                            type="primary"
                                            size="small"
                                            onClick={() => handleEditDraft(record)}
                                        >
                                            Sửa tiếp
                                        </Button>
                                        <Popconfirm
                                            title="Xóa bản nháp?"
                                            description="Hành động này không thể hoàn tác!"
                                            onConfirm={() => handleDeleteDraft(record.id)}
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                )
                            }
                        ]}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default Invoices;
