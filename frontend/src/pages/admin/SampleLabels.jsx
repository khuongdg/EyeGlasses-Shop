import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
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
    Dropdown,
    Checkbox
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
    const [submitLoading, setSubmitLoading] = useState(false);
    const [printLoading, setPrintLoading] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [printMinimal, setPrintMinimal] = useState(false);
    const [labelItems, setLabelItems] = useState([]);
    const [pendingPrint, setPendingPrint] = useState(false);
    const [selectedItemSkus, setSelectedItemSkus] = useState([]);
    const [openDetail, setOpenDetail] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const labelPrintRef = useRef();

    const [form] = Form.useForm();
    const watchTotalQuantity = Form.useWatch('totalQuantity', form);
    const watchItems = Form.useWatch('items', form);

    const handlePrintLabels = useReactToPrint({
        contentRef: labelPrintRef,
        pageStyle: `@page { size: 77mm 56mm; margin: 0; }`,
    });

    useEffect(() => {
        if (pendingPrint) {
            handlePrintLabels();
            setPendingPrint(false);
            setTimeout(() => {
                setPrintLoading(false);
            }, 500);
        }
    }, [pendingPrint, handlePrintLabels]);

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
    const [keyword, setKeyword] = useState('');

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();
    const isMobile = !screens.md;

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
            const res = await getVariants({ isActive: true, limit: 100000 });
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

    const triggerPrint = useCallback(async (record, isMinimal = true) => {
        setPrintLoading(true);
        try {
            let invoiceToUse = record;

            if (isMinimal) {
                // Sinh QR mới cho từng item chỉ chứa đúng chuỗi SKU
                const itemsWithSkuQr = await Promise.all(
                    (record.items || []).map(async (item) => {
                        const skuQr = await QRCode.toDataURL(item.sku, {
                            errorCorrectionLevel: 'L',
                            margin: 1,
                            width: 600,
                            color: { dark: '#000000', light: '#FFFFFF' }
                        });
                        return { ...item, itemQrCode: skuQr };
                    })
                );
                invoiceToUse = { ...record, items: itemsWithSkuQr };
            }

            const flatItems = [];
            (invoiceToUse.items || []).forEach((item) => {
                const qty = Number(item.quantity) || 0;
                for (let i = 0; i < qty; i++) {
                    flatItems.push({
                        ...item,
                        printPrice: item.price,
                        customerName: item.customerName || invoiceToUse.customerName || 'Hàng mẫu',
                        tempId: `${item.sku}-${i}`
                    });
                }
            });

            setSelectedInvoice(invoiceToUse);
            setPrintMinimal(isMinimal);
            setLabelItems(flatItems);
            setPendingPrint(true);
        } catch (err) {
            message.error('Khởi tạo tem in thất bại');
            setPrintLoading(false);
        }
    }, []);

    /* ================= LOGIC GOM NHÓM THEO MÃ HÀNG ================= */
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
                label: `${item.productCode} (${item.brand}) • ${item.variants.length} màu`,
                brand: item.brand,
                variantsCount: item.variants.length
            }));
    }, [productGroups]);

    /* ================= LOGIC FORM TẠO PHIẾU THEO MÃ HÀNG & SKU ================= */
    const handleProductCodeChange = (code, name) => {
        form.setFieldValue(['items', name, 'productCode'], code);
        const group = productGroups.get(code);
        if (group && group.variants.length > 0) {
            // Tự động chọn variant đầu tiên khi vừa chọn Mã hàng
            handleSelectSku(group.variants[0], name);
        } else {
            form.setFieldValue(['items', name, 'variantId'], undefined);
            form.setFieldValue(['items', name, 'sku'], '');
            form.setFieldValue(['items', name, 'productName'], '');
            form.setFieldValue(['items', name, 'brand'], '');
            form.setFieldValue(['items', name, 'originCountry'], '');
            form.setFieldValue(['items', name, 'unit'], '');
            form.setFieldValue(['items', name, 'price'], undefined);
            calculateTotals();
        }
    };

    const handleSelectSku = (v, name) => {
        const productName = v.productId?.name || (v.sku.includes('_') ? v.sku.split('_')[0] : v.sku) || '';
        const brand = v.productId?.brand || 'Christian DG';
        const originCountry = v.productId?.originCountry || 'PRC';
        const unit = v.unit || 'Cây';

        form.setFieldValue(['items', name, 'productCode'], productName);
        form.setFieldValue(['items', name, 'variantId'], v._id);
        form.setFieldValue(['items', name, 'sku'], v.sku);
        form.setFieldValue(['items', name, 'productName'], productName);
        form.setFieldValue(['items', name, 'brand'], brand);
        form.setFieldValue(['items', name, 'originCountry'], originCountry);
        form.setFieldValue(['items', name, 'unit'], unit);
        form.setFieldValue(['items', name, 'price'], v.price);

        const currentQty = form.getFieldValue(['items', name, 'quantity']);
        if (!currentQty || currentQty < 1) {
            form.setFieldValue(['items', name, 'quantity'], 1);
        }

        calculateTotals();
    };

    const handleAddRemainingSkus = (productCode, remainingVariants, add) => {
        remainingVariants.forEach((v) => {
            const productName = v.productId?.name || productCode;
            const brand = v.productId?.brand || 'Christian DG';
            const originCountry = v.productId?.originCountry || 'PRC';
            const unit = v.unit || 'Cây';

            add({
                productCode,
                variantId: v._id,
                sku: v.sku,
                productName,
                brand,
                originCountry,
                unit,
                price: v.price || 0,
                quantity: 1,
                customerName: ''
            });
        });
        setTimeout(() => calculateTotals(), 100);
        message.success(`Đã thêm ${remainingVariants.length} màu của mã hàng ${productCode}`);
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
            setSubmitLoading(true);
            const values = await form.validateFields();
            const totalQty = values.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const subTotal = values.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

            const payload = {
                ...values,
                isSample: true, // Biến thể in mẫu
                totalDiscount: 0,
                totalQuantity: totalQty,
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
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleOpenPrintAllModal = async () => {
        if (!variants || variants.length === 0) {
            message.warning('Không có sản phẩm nào trong hệ thống để in');
            return;
        }

        setPrintLoading(true);
        try {
            const allItems = variants.map((v) => ({
                variantId: v._id,
                sku: v.sku,
                productName: v.productId?.name || '',
                brand: v.productId?.brand || 'N/A',
                originCountry: v.productId?.originCountry || 'N/A',
                unit: v.unit || 'Cây',
                price: v.price || 0,
                quantity: 1,
                discountPercent: 0,
                rowTotal: v.price || 0,
                customerName: ''
            }));

            const totalQty = allItems.length;
            const totalAmt = allItems.reduce((sum, it) => sum + (it.price || 0), 0);
            const defaultStaff = (staffs && staffs.length > 0) ? staffs[0] : null;

            const payload = {
                isSample: true,
                staffId: defaultStaff?._id,
                staffName: defaultStaff?.name || 'Nhân viên',
                note: 'In tem mẫu tất cả sản phẩm',
                totalQuantity: totalQty,
                subTotal: totalAmt,
                totalAmount: totalAmt,
                items: allItems
            };

            const res = await createInvoice(payload);
            const createdData = res.data?.data || res.data || res;
            message.success(`Đã tạo phiếu ${createdData.invoiceCode || ''} và đang mở bản in tất cả ${totalQty} tem...`);
            fetchInvoices();
            await triggerPrint(createdData, true);
        } catch (err) {
            message.error(err.response?.data?.message || 'Tạo phiếu in tất cả thất bại');
            setPrintLoading(false);
        }
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
            title: 'Ghi chú',
            dataIndex: 'note',
            render: (note) => note ? <span className="text-gray-700">{note}</span> : <span className="text-gray-400 italic">-</span>
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
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BarcodeOutlined/> In tem mẫu sản phẩm
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Dropdown
                        trigger={['click']}
                        disabled={printLoading || submitLoading}
                        menu={{
                            items: [
                                {
                                    key: 'all',
                                    label: 'In tem tất cả',
                                    disabled: printLoading || submitLoading,
                                    onClick: handleOpenPrintAllModal
                                },
                                {
                                    type: 'divider'
                                },
                                {
                                    key: 'custom',
                                    label: 'In tem tuỳ chọn',
                                    disabled: printLoading || submitLoading,
                                    onClick: () => {
                                        form.resetFields();
                                        form.setFieldsValue({ items: [{}] });
                                        setOpenModal(true);
                                    }
                                }
                            ]
                        }}
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={printLoading}
                            disabled={printLoading || submitLoading}
                            className="w-full sm:w-auto"
                            size={isMobile ? 'small' : 'middle'}
                        >
                            Tạo in tem ▾
                        </Button>
                    </Dropdown>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                    {/* SEARCH */}
                    <div className="flex-1 w-full">
                        <Input
                            placeholder="Mã phiếu hoặc tên nhân viên..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            value={keyword}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKeyword(val);
                                debounceSearch(val);
                            }}
                            allowClear
                            size={isMobile ? 'small' : 'middle'}
                            className="w-full"
                            style={{ borderRadius: '20px' }}
                        />
                    </div>

                    {/* DATE RANGE */}
                    <div className="w-full sm:w-auto shrink-0 sm:min-w-[260px]">
                        <RangePicker
                            className="w-full"
                            placeholder={['Từ ngày', 'Đến ngày']}
                            value={queryParams.dateFrom && queryParams.dateTo ? [queryParams.dateFrom, queryParams.dateTo] : null}
                            style={{ borderRadius: '20px' }}
                            onChange={(dates) => {
                                const newParams = {
                                    ...queryParams,
                                    page: 1,
                                    dateFrom: dates ? dates[0] : null,
                                    dateTo: dates ? dates[1] : null
                                };
                                setQueryParams(newParams);
                                fetchInvoices(newParams);
                            }}
                            size={isMobile ? 'small' : 'middle'}
                        />
                    </div>
                </div>
            </div>

            {/* TABLE LIST */}
            {isMobile ? (
                <div className="space-y-3">
                    {invoices.map((invoice) => (
                        <div
                            key={invoice._id}
                            className="border rounded-xl p-4 shadow-sm bg-white cursor-pointer"
                            onClick={() => {
                                setViewingInvoice(invoice);
                                setOpenDetail(true);
                            }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base text-blue-600">
                                        {invoice.invoiceCode}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        NV lập: {invoice.staffId?.name || invoice.staffName || 'N/A'}
                                    </div>
                                </div>
                                <Tag color={invoice.isActive ? 'green' : 'red'}>
                                    {invoice.isActive ? 'Hoạt động' : 'Đã hủy'}
                                </Tag>
                            </div>

                            <div className="mt-3 space-y-1 text-sm">
                                <div>
                                    <span className="text-gray-500">Ngày lập:</span>{' '}
                                    <strong>
                                        {new Date(invoice.createdAt).toLocaleString('vi-VN')}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-gray-500">Tổng số tem:</span>{' '}
                                    <strong className="text-blue-600">
                                        {invoice.totalQuantity || 0} tem
                                    </strong>
                                </div>
                                {invoice.note && (
                                    <div>
                                        <span className="text-gray-500">Ghi chú:</span>{' '}
                                        <span className="text-gray-700 italic">{invoice.note}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div
                                className="mt-4 flex gap-2 flex-wrap"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Button
                                    size="small"
                                    icon={<PrinterOutlined />}
                                    loading={printLoading}
                                    disabled={printLoading}
                                    onClick={() => triggerPrint(invoice, true)}
                                >
                                    In tem
                                </Button>

                                {invoice.isActive && (
                                    <Popconfirm
                                        title="Xóa vĩnh viễn phiếu in tem mẫu?"
                                        description="Phiếu này sẽ bị xóa hoàn toàn khỏi hệ thống và không thể hoàn tác."
                                        onConfirm={() => handleDelete(invoice._id)}
                                        okButtonProps={{ danger: true }}
                                        onCancel={(e) => e.stopPropagation()}
                                    >
                                        <Button danger size="small" onClick={(e) => e.stopPropagation()}>
                                            Xoá
                                        </Button>
                                    </Popconfirm>
                                )}
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
                            Trang {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize) || 1}
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
            ) : (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={invoices}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
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
                            // Chọn tất cả mặc định khi mở modal
                            setSelectedItemSkus((record.items || []).map(it => it.sku));
                            setOpenDetail(true);
                        },
                        style: { cursor: 'pointer' }
                    })}
                />
            )}

            {/* HIDDEN PRINT COMPONENT */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <ItemLabelTemplate
                    ref={labelPrintRef}
                    items={labelItems}
                    companyInfo={selectedInvoice?.companyInfo || company}
                    customerName={selectedInvoice?.customerName || 'Hàng mẫu'}
                    isMinimal={printMinimal}
                />
            </div>

            {/* MODAL CHI TIẾT PHIẾU IN TEM MẪU */}
            <Modal
                title={`Chi tiết phiếu in tem mẫu: ${viewingInvoice?.invoiceCode}`}
                open={openDetail}
                onCancel={() => {
                    setOpenDetail(false);
                    setSelectedItemSkus([]);
                }}
                footer={[
                    <Button key="close" onClick={() => { setOpenDetail(false); setSelectedItemSkus([]); }}>Đóng</Button>,
                    viewingInvoice && (
                        <Button
                            key="print"
                            type="primary"
                            icon={<PrinterOutlined />}
                            loading={printLoading}
                            disabled={selectedItemSkus.length === 0 || printLoading}
                            onClick={() => triggerPrint(
                                { ...viewingInvoice, items: (viewingInvoice.items || []).filter(it => selectedItemSkus.includes(it.sku)) },
                                true
                            )}
                        >
                            In tem ({selectedItemSkus.length})
                        </Button>
                    )
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
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-700 mb-0">Danh sách sản phẩm in tem</h4>
                        </div>
                         <Table
                            dataSource={viewingInvoice.items}
                            pagination={false}
                            rowKey={(record, idx) => record.sku + idx}
                            size="small"
                            bordered
                            scroll={{ x: 'max-content', y: '40vh' }}
                            columns={[
                                {
                                    title: (
                                        <Checkbox
                                            checked={
                                                selectedItemSkus.length === (viewingInvoice?.items || []).length &&
                                                (viewingInvoice?.items || []).length > 0
                                            }
                                            indeterminate={
                                                selectedItemSkus.length > 0 &&
                                                selectedItemSkus.length < (viewingInvoice?.items || []).length
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedItemSkus((viewingInvoice?.items || []).map(it => it.sku));
                                                } else {
                                                    setSelectedItemSkus([]);
                                                }
                                            }}
                                        />
                                    ),
                                    key: 'select',
                                    width: 48,
                                    align: 'center',
                                    render: (_, record) => (
                                        <Checkbox
                                            checked={selectedItemSkus.includes(record.sku)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedItemSkus(prev => [...prev, record.sku]);
                                                } else {
                                                    setSelectedItemSkus(prev => prev.filter(s => s !== record.sku));
                                                }
                                            }}
                                        />
                                    )
                                },
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
                confirmLoading={submitLoading}
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
                                    {fields.map(({ key, name, ...restField }) => {
                                        const itemValues = watchItems?.[name] || {};
                                        let currentProductCode = itemValues.productCode;
                                        if (!currentProductCode && itemValues.variantId) {
                                            const foundV = variants.find(v => v._id === itemValues.variantId);
                                            currentProductCode = foundV?.productId?.name || (foundV?.sku?.includes('_') ? foundV.sku.split('_')[0] : foundV?.sku);
                                        }

                                        const currentGroup = currentProductCode ? productGroups.get(currentProductCode) : null;
                                        const currentVariants = currentGroup?.variants || [];
                                        const currentVariantId = itemValues.variantId;
                                        const selectedVariant = variants.find(v => v._id === currentVariantId);
                                        const selectedSku = itemValues.sku || selectedVariant?.sku;
                                        const otherVariants = currentVariants.filter(v => v._id !== currentVariantId);

                                        return (
                                            <div key={key} className="border rounded-lg p-4 mb-4 bg-gray-50 relative">
                                                {/* Hidden fields */}
                                                <Form.Item name={[name, 'variantId']} rules={[{ required: true, message: 'Vui lòng chọn Mã hàng và click chọn SKU tương ứng' }]} hidden><Input /></Form.Item>
                                                <Form.Item name={[name, 'sku']} hidden><Input /></Form.Item>
                                                <Form.Item name={[name, 'productName']} hidden><Input /></Form.Item>
                                                <Form.Item name={[name, 'originCountry']} hidden><Input /></Form.Item>

                                                <Row gutter={12}>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item
                                                            label={<span className="font-semibold text-gray-700">Mã hàng</span>}
                                                            name={[name, 'productCode']}
                                                            rules={[{ required: true, message: 'Vui lòng chọn Mã hàng' }]}
                                                        >
                                                            <Select
                                                                showSearch
                                                                allowClear
                                                                placeholder="Tìm theo Mã hàng (VD: 8619, 8617...)"
                                                                onChange={(val) => handleProductCodeChange(val, name)}
                                                                filterOption={(input, option) =>
                                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                                }
                                                                options={productOptions}
                                                                className="w-full"
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

                                                {/* DANH SÁCH CÁC SKU CỦA MÃ HÀNG ĐỂ CLICK CHỌN */}
                                                {currentVariants.length > 0 && (
                                                    <div className="mb-3 p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                                                        <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                                                            <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 flex-wrap">
                                                                <span>Click chọn SKU mong muốn:</span>
                                                                {selectedSku && (
                                                                    <Tag color="blue" className="font-bold border-0 px-2 py-0.5">
                                                                        Đã chọn: {selectedSku}
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                            {otherVariants.length > 0 && (
                                                                <Button
                                                                    type="link"
                                                                    size="small"
                                                                    className="text-xs text-blue-600 p-0 h-auto font-medium"
                                                                    onClick={() => handleAddRemainingSkus(currentProductCode, otherVariants, add)}
                                                                >
                                                                    + Thêm {otherVariants.length} màu còn lại vào phiếu in
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {currentVariants.map((v) => {
                                                                const isSelected = currentVariantId === v._id;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={v._id}
                                                                        onClick={() => handleSelectSku(v, name)}
                                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                                                                            isSelected
                                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                                                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                                                        }`}
                                                                    >
                                                                        {isSelected && <span className="font-bold">✓</span>}
                                                                        <span className="font-mono">{v.sku}</span>
                                                                        <span className={isSelected ? 'text-blue-200' : 'text-gray-300'}>|</span>
                                                                        <span className={isSelected ? 'text-blue-100' : 'text-gray-500'}>
                                                                            Tồn: {v.inventory ?? 0}
                                                                        </span>
                                                                        <span className={isSelected ? 'text-yellow-200 font-bold' : 'text-blue-600 font-semibold'}>
                                                                            {v.price ? `${v.price.toLocaleString()}₫` : ''}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

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
                                    );
                                })}

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
