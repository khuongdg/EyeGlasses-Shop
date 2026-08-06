import { useEffect, useState, useRef } from 'react';
import debounce from 'lodash/debounce';
import { useReactToPrint } from 'react-to-print';
import {
    Table,
    Button,
    message,
    Space,
    Tag,
    Grid,
    Popconfirm,
    Badge,
    Tooltip
} from 'antd';
import {
    PlusOutlined,
    PrinterOutlined,
    BarcodeOutlined,
    FolderOpenOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import PrintTemplate from '../../components/PrintTemplate';
import ItemLabelTemplate from '../../components/ItemLabelTemplate';
import InvoiceDetails from './InvoiceDetails';
import LabelPreviewModal from './LabelPreviewModal';
import SkuSelectModal from './SkuSelectModal';
import QrScannerModal from '../../components/QrScannerModal';

// Partials
import InvoiceFilterBar from './invoices/InvoiceFilterBar';
import InvoiceMobileList from './invoices/InvoiceMobileList';
import CreateInvoiceModal from './invoices/CreateInvoiceModal';
import InvoiceDraftListModal from './invoices/InvoiceDraftListModal';
import InvoiceAdminNoteModal from './invoices/InvoiceAdminNoteModal';
import SaveDraftConfirmModal from './invoices/SaveDraftConfirmModal';

import {
    getInvoices,
    createInvoice,
    cancelInvoice,
    getDrafts,
    saveDraft,
    deleteDraftFromDB,
    updateInvoiceAdminNote
} from '../../services/invoiceService';
import { getCustomers } from '../../services/customerService';
import { getStaffs } from '../../services/staffService';
import { getVariants, getVariantBySku } from '../../services/variantService';
import { Form } from 'antd';

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
    const [adminNoteModalOpen, setAdminNoteModalOpen] = useState(false);
    const [selectedInvoiceForNote, setSelectedInvoiceForNote] = useState(null);
    const [adminNoteValue, setAdminNoteValue] = useState('');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [bulkDiscount, setBulkDiscount] = useState(null);
    const [selectedItemIndexes, setSelectedItemIndexes] = useState([]);
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
        paymentMethod: null,
        isActive: null,
        page: 1,
        limit: 10
    });

    const [keyword, setKeyword] = useState('');
    const screens = Grid.useBreakpoint();

    /* ================= LOGIC FETCH DỮ LIỆU ================= */
    const fetchInvoices = async (params = queryParams) => {
        setLoading(true);
        try {
            const res = await getInvoices(params);
            setInvoices(res.data.data);
            setPagination({
                current: res.data.page || params.page || 1,
                pageSize: res.data.limit || params.limit || 10,
                total: res.data.total || 0
            });
        } catch {
            message.error('Không thể tải danh sách phiếu xuất');
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [cusRes, staffRes, varRes] = await Promise.all([
                getCustomers({ limit: 1000, isActive: true }),
                getStaffs({ limit: 1000, isActive: true }),
                getVariants({ limit: 1000 })
            ]);
            setCustomers(cusRes.data.data);
            setStaffs(staffRes.data.data);
            setVariants(varRes.data.data);
        } catch {
            message.error('Lỗi tải dữ liệu danh mục');
        }
    };

    const fetchDraftsList = async () => {
        try {
            const res = await getDrafts();
            setDraftsList(res.data.data || []);
        } catch {
            console.error('Lỗi tải bản nháp');
        }
    };

    useEffect(() => {
        fetchInvoices(); // Load danh sách phiếu lần đầu
        fetchInitialData(); // Load danh mục dùng trong Modal
        fetchDraftsList();
    }, []);

    // Khôi phục bản nháp khi mở lại trang nếu người dùng chưa tắt modal
    useEffect(() => {
        if (!draftRestored && customers.length > 0 && staffs.length > 0 && variants.length > 0) {
            const savedModalState = localStorage.getItem('is_invoice_modal_open');
            const savedDraft = localStorage.getItem('current_invoice_draft');
            if (savedModalState === 'true' && savedDraft) {
                try {
                    const parsedDraft = JSON.parse(savedDraft);
                    if (parsedDraft && (parsedDraft.customerId || (parsedDraft.items && parsedDraft.items.length > 0))) {
                        form.setFieldsValue(parsedDraft);
                        setOpenModal(true);
                        setIsFormModified(true);
                    }
                } catch {
                    console.error('Lỗi khôi phục bản nháp từ localStorage');
                }
            }
            setDraftRestored(true);
        }
    }, [customers, staffs, variants, draftRestored, form]);

    /* ================= THAO TÁC BẢN NHÁP ================= */
    const updateActiveDraft = () => {
        if (openModal) {
            const currentValues = form.getFieldsValue(true);
            localStorage.setItem('current_invoice_draft', JSON.stringify(currentValues));
        }
    };

    const handleSaveDraft = async () => {
        try {
            const currentValues = form.getFieldsValue(true);
            await saveDraft({
                id: currentEditingDraftId,
                formData: currentValues
            });

            localStorage.removeItem('is_invoice_modal_open');
            localStorage.removeItem('current_invoice_draft');

            setShowSaveDraftConfirm(false);
            setOpenModal(false);
            setIsFormModified(false);
            setCurrentEditingDraftId(null);
            form.resetFields();

            fetchDraftsList();
            message.success('Đã lưu bản nháp thành công');
        } catch (err) {
            console.error('Lỗi khi lưu bản nháp:', err);
            message.error(err?.response?.data?.message || 'Lỗi khi lưu bản nháp');
        }
    };

    const handleDiscard = () => {
        localStorage.removeItem('is_invoice_modal_open');
        localStorage.removeItem('current_invoice_draft');
        setShowSaveDraftConfirm(false);
        setOpenModal(false);
        setIsFormModified(false);
        setCurrentEditingDraftId(null);
        form.resetFields();
    };

    const handleCancelCreate = () => {
        if (isFormModified) {
            setShowSaveDraftConfirm(true);
        } else {
            handleDiscard();
        }
    };

    const handleEditDraft = (draftRecord) => {
        const draftData = draftRecord.formData || draftRecord;
        const formattedData = {
            ...draftData,
            customerId: typeof draftData.customerId === 'object' ? draftData.customerId?._id : draftData.customerId,
            staffId: typeof draftData.staffId === 'object' ? draftData.staffId?._id : draftData.staffId,
            items: draftData.items || []
        };
        setCurrentEditingDraftId(draftRecord._id || draftRecord.id);
        form.setFieldsValue(formattedData);
        setTimeout(() => {
            calculateTotals();
        }, 100);
        setIsFormModified(false);
        setIsDraftListModalOpen(false);
        setOpenModal(true);
        localStorage.setItem('is_invoice_modal_open', 'true');
        localStorage.setItem('current_invoice_draft', JSON.stringify(formattedData));
    };

    const handleDeleteDraft = async (draftId) => {
        try {
            await deleteDraftFromDB(draftId);
            fetchDraftsList();
            message.success('Đã xóa bản nháp');
        } catch {
            message.error('Lỗi khi xóa bản nháp');
        }
    };

    /* ================= TÌM KIẾM & PHÂN TRANG ================= */
    const debounceSearch = useRef(
        debounce((val) => {
            const newParams = { ...queryParams, page: 1, keyword: val };
            setQueryParams(newParams);
            fetchInvoices(newParams);
        }, 500)
    ).current;

    const handleTableChange = (pag, filters) => {
        const paymentMethodVal = filters?.paymentMethod && filters.paymentMethod.length > 0 ? filters.paymentMethod[0] : null;
        const isActiveVal = filters?.isActive && filters.isActive.length > 0 ? filters.isActive[0] : null;

        const newParams = {
            ...queryParams,
            page: pag.current,
            limit: pag.pageSize,
            paymentMethod: paymentMethodVal,
            isActive: isActiveVal
        };
        setQueryParams(newParams);
        fetchInvoices(newParams);
    };

    /* ================= THÊM NHANH SẢN PHẨM ================= */
    const handleSkuModalConfirm = (selectedIds) => {
        const currentItems = form.getFieldValue('items') || [];
        const existingVariantIds = currentItems
            .filter(item => item && item.variantId)
            .map(item => item.variantId);

        const idsToAdd = selectedIds.filter(id => !existingVariantIds.includes(id));
        const idsToRemove = existingVariantIds.filter(id => !selectedIds.includes(id));

        let updatedItems = currentItems.filter(item => item && !idsToRemove.includes(item.variantId));

        idsToAdd.forEach(id => {
            const v = variants.find(x => x._id === id);
            if (v) {
                updatedItems.push({
                    variantId: v._id,
                    sku: v.sku,
                    brand: v.productId?.brand || 'N/A',
                    originCountry: v.productId?.originCountry || 'N/A',
                    unit: v.unit || 'Cây',
                    price: v.price,
                    quantity: 1,
                    discountPercent: bulkDiscount != null ? bulkDiscount : 0
                });
            }
        });

        form.setFieldsValue({ items: updatedItems });
        calculateTotals();
        updateActiveDraft();
        setIsFormModified(true);
        setIsSkuModalOpen(false);
    };

    /* ================= TÍNH TOÁN REAL-TIME ================= */
    const calculateRowTotal = (nameIndex) => {
        const item = watchItems?.[nameIndex];
        if (!item) return 0;
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const discount = Number(item.discountPercent || 0);
        const total = qty * price;
        return total - (total * discount) / 100;
    };

    const calculateTotals = () => {
        const items = form.getFieldValue('items') || [];
        let totalQty = 0;
        let subTotal = 0;
        let totalDiscount = 0;

        items.forEach((item) => {
            if (item) {
                const qty = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                const discount = Number(item.discountPercent || 0);
                const itemSubTotal = qty * price;
                const itemDiscount = (itemSubTotal * discount) / 100;

                totalQty += qty;
                subTotal += itemSubTotal;
                totalDiscount += itemDiscount;
            }
        });

        const totalAmount = subTotal - totalDiscount;

        form.setFieldsValue({
            totalQuantity: totalQty,
            subTotal: subTotal,
            totalDiscount: totalDiscount,
            totalAmount: totalAmount
        });

        updateActiveDraft();
    };

    /* ================= IN ẤN ================= */
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: selectedInvoice ? `PhieuXuat_${selectedInvoice.invoiceCode}` : 'PhieuXuat',
        onAfterPrint: () => setSelectedInvoice(null),
    });

    const triggerPrint = (record) => {
        setSelectedInvoice(record);
        setTimeout(() => {
            handlePrint();
        }, 500);
    };

    /* ================= THAO TÁC CƠ SỞ DỮ LIỆU ================= */
    const handleCreate = async () => {
        try {
            setSubmitLoading(true);
            const values = await form.validateFields();
            if (!values.items || values.items.length === 0) {
                message.error('Vui lòng thêm ít nhất 1 sản phẩm');
                setSubmitLoading(false);
                return;
            }

            await createInvoice(values);
            message.success('Tạo phiếu xuất kho thành công! Tồn kho đã tự động trừ.');

            if (currentEditingDraftId) {
                await deleteDraftFromDB(currentEditingDraftId);
                fetchDraftsList();
            }

            localStorage.removeItem('is_invoice_modal_open');
            localStorage.removeItem('current_invoice_draft');

            setOpenModal(false);
            form.resetFields();
            setIsFormModified(false);
            setCurrentEditingDraftId(null);
            fetchInvoices(1);
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.message || 'Không thể tạo phiếu xuất');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancelInvoice = async (id) => {
        try {
            await cancelInvoice(id);
            message.success('Đã hủy phiếu xuất! Tồn kho đã được hoàn lại.');
            fetchInvoices();
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể hủy phiếu xuất');
        }
    };

    const handleSaveAdminNote = async () => {
        if (!selectedInvoiceForNote) return;
        try {
            await updateInvoiceAdminNote(selectedInvoiceForNote._id, adminNoteValue);
            message.success('Đã cập nhật ghi chú nội bộ thành công');
            setAdminNoteModalOpen(false);
            fetchInvoices();
        } catch {
            message.error('Không thể cập nhật ghi chú nội bộ');
        }
    };

    const extractSkuFromText = (text) => {
        if (!text) return '';
        const trimmed = text.trim();
        const match = trimmed.match(/(?:Mã hàng|SKU):\s*([A-Za-z0-9_-]+)/i);
        if (match && match[1]) {
            return match[1].trim();
        }
        return trimmed.replace(/\.$/, '').trim();
    };

    const handleScanProductAdd = async (rawText) => {
        const sku = extractSkuFromText(rawText);
        if (!sku) {
            message.error('Mã QR không chứa SKU hợp lệ');
            return;
        }

        try {
            setVariantLoading(true);
            const res = await getVariantBySku(sku);
            const foundVariant = res.data.data;

            if (!foundVariant) {
                message.error(`Không tìm thấy sản phẩm có mã SKU: ${sku}`);
                return;
            }

            const targetSku = foundVariant.sku || sku;
            const currentItems = form.getFieldValue('items') || [];
            const existingIndex = currentItems.findIndex(item => item && (item.sku === targetSku || item.variantId === foundVariant._id));

            if (existingIndex >= 0) {
                const updatedItems = [...currentItems];
                const currentQty = updatedItems[existingIndex].quantity || 0;
                updatedItems[existingIndex] = {
                    ...updatedItems[existingIndex],
                    quantity: currentQty + 1
                };
                form.setFieldsValue({ items: updatedItems });
                message.success(`Đã tăng số lượng SKU ${targetSku} lên ${currentQty + 1}`);
            } else {
                const newItem = {
                    variantId: foundVariant._id,
                    sku: targetSku,
                    brand: foundVariant.productId?.brand || 'N/A',
                    originCountry: foundVariant.productId?.originCountry || 'N/A',
                    unit: foundVariant.unit || 'Cây',
                    price: foundVariant.price,
                    quantity: 1,
                    discountPercent: bulkDiscount != null ? bulkDiscount : 0
                };
                form.setFieldsValue({ items: [...currentItems, newItem] });
                message.success(`Đã thêm sản phẩm: ${targetSku}`);
            }

            calculateTotals();
            updateActiveDraft();
            setIsFormModified(true);
        } catch {
            message.error(`Lỗi khi tìm kiếm sản phẩm SKU: ${sku}`);
        } finally {
            setVariantLoading(false);
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
            if (bulkDiscount != null) {
                form.setFieldValue(['items', name, 'discountPercent'], bulkDiscount);
            } else {
                form.setFieldValue(['items', name, 'discountPercent'], 0);
            }
            calculateTotals();
            updateActiveDraft();
        }
    };

    /* ================= TABLE COLUMNS ================= */
    const columns = [
        { title: 'Mã phiếu', dataIndex: 'invoiceCode', className: 'whitespace-nowrap' },
        { title: 'Khách hàng', className: 'whitespace-nowrap', render: (_, record) => record.customerId?.name || 'N/A' },
        { title: 'Nhân viên', className: 'whitespace-nowrap', render: (_, record) => record.staffId?.name || 'N/A' },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            className: 'whitespace-nowrap',
            render: (v) => v?.toLocaleString()
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            className: 'whitespace-nowrap',
            render: (method) => {
                const labels = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', DEBT: 'Công nợ' };
                return labels[method] || method;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            className: 'whitespace-nowrap',
            render: (v) =>
                v ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Không hoạt động</Tag>
        },
        {
            title: 'Hành động',
            align: 'center',
            className: 'whitespace-nowrap',
            render: (_, record) => (
                <Space size="small">
                    {record.isActive && (
                        <>
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

                            <Tooltip
                                title={
                                    <div className="text-xs p-1 max-w-xs space-y-1">
                                        {record.note && (
                                            <div>
                                                <span className="font-semibold text-amber-300">Ghi chú phiếu:</span> {record.note}
                                            </div>
                                        )}
                                        {record.adminNote && (
                                            <div>
                                                <span className="font-semibold text-blue-300">Ghi chú nội bộ:</span> {record.adminNote}
                                            </div>
                                        )}
                                        {!record.note && !record.adminNote && (
                                            <span className="text-gray-300">Chưa có ghi chú (Click để thêm)</span>
                                        )}
                                    </div>
                                }
                                placement="top"
                            >
                                <Button
                                    icon={<InfoCircleOutlined className={record.adminNote || record.note ? "text-blue-500 font-bold" : ""} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoiceForNote(record);
                                        setAdminNoteValue(record.adminNote || '');
                                        setAdminNoteModalOpen(true);
                                    }}
                                />
                            </Tooltip>
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
            <InvoiceFilterBar
                keyword={keyword}
                setKeyword={setKeyword}
                debounceSearch={debounceSearch}
                queryParams={queryParams}
                setQueryParams={setQueryParams}
                fetchInvoices={fetchInvoices}
            />

            {/* TABLE LIST */}
            {screens.md ? (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={invoices}
                    scroll={{ x: 'max-content' }}
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
                <InvoiceMobileList
                    invoices={invoices}
                    pagination={pagination}
                    handleTableChange={handleTableChange}
                    setViewingInvoice={setViewingInvoice}
                    setOpenDetail={setOpenDetail}
                    triggerPrint={triggerPrint}
                    setLabelItems={setLabelItems}
                    setIsLabelModalOpen={setIsLabelModalOpen}
                    setSelectedInvoiceForNote={setSelectedInvoiceForNote}
                    setAdminNoteValue={setAdminNoteValue}
                    setAdminNoteModalOpen={setAdminNoteModalOpen}
                    handleCancelInvoice={handleCancelInvoice}
                />
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

            {/* MODAL TẠO PHIẾU XUẤT KHO */}
            <CreateInvoiceModal
                openModal={openModal}
                handleCreate={handleCreate}
                submitLoading={submitLoading}
                handleCancelCreate={handleCancelCreate}
                form={form}
                customers={customers}
                staffs={staffs}
                bulkDiscount={bulkDiscount}
                setBulkDiscount={setBulkDiscount}
                selectedItemIndexes={selectedItemIndexes}
                setSelectedItemIndexes={setSelectedItemIndexes}
                variants={variants}
                handleProductChange={handleProductChange}
                calculateRowTotal={calculateRowTotal}
                calculateTotals={calculateTotals}
                updateActiveDraft={updateActiveDraft}
                setIsFormModified={setIsFormModified}
                setIsSkuModalOpen={setIsSkuModalOpen}
                setIsQrModalOpen={setIsQrModalOpen}
                watchItems={watchItems}
                watchTotalQty={watchTotalQty}
                watchSubTotal={watchSubTotal}
                watchTotalDiscount={watchTotalDiscount}
                watchTotalAmount={watchTotalAmount}
            />

            {/* MODAL CHỌN SKU THỦ CÔNG */}
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

            {/* MODAL QUÉT MÃ QR/BARCODE BẰNG CAMERA */}
            <QrScannerModal
                open={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                onScanSuccess={handleScanProductAdd}
            />

            {/* MODAL HỎI LƯU NHÁP */}
            <SaveDraftConfirmModal
                showSaveDraftConfirm={showSaveDraftConfirm}
                setShowSaveDraftConfirm={setShowSaveDraftConfirm}
                handleDiscard={handleDiscard}
                handleSaveDraft={handleSaveDraft}
            />

            {/* MODAL DANH SÁCH PHIẾU NHÁP */}
            <InvoiceDraftListModal
                isDraftListModalOpen={isDraftListModalOpen}
                setIsDraftListModalOpen={setIsDraftListModalOpen}
                draftsList={draftsList}
                handleEditDraft={handleEditDraft}
                handleDeleteDraft={handleDeleteDraft}
            />

            {/* MODAL GHI CHÚ NỘI BỘ ADMIN */}
            <InvoiceAdminNoteModal
                adminNoteModalOpen={adminNoteModalOpen}
                setAdminNoteModalOpen={setAdminNoteModalOpen}
                selectedInvoiceForNote={selectedInvoiceForNote}
                adminNoteValue={adminNoteValue}
                setAdminNoteValue={setAdminNoteValue}
                handleSaveAdminNote={handleSaveAdminNote}
            />
        </div>
    );
};

export default Invoices;
