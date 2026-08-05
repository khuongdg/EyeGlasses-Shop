import React from 'react';
import { Tag, Button, Popconfirm, Tooltip } from 'antd';
import { PrinterOutlined, BarcodeOutlined, InfoCircleOutlined } from '@ant-design/icons';

const InvoiceMobileList = ({
    invoices,
    pagination,
    handleTableChange,
    setViewingInvoice,
    setOpenDetail,
    triggerPrint,
    setLabelItems,
    setIsLabelModalOpen,
    setSelectedInvoiceForNote,
    setAdminNoteValue,
    setAdminNoteModalOpen,
    handleCancelInvoice
}) => {
    return (
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

                            <Tooltip
                                title={
                                    <div className="text-xs p-1 max-w-xs space-y-1">
                                        {invoice.note && (
                                            <div>
                                                <span className="font-semibold text-amber-300">Ghi chú phiếu:</span> {invoice.note}
                                            </div>
                                        )}
                                        {invoice.adminNote && (
                                            <div>
                                                <span className="font-semibold text-blue-300">Ghi chú nội bộ:</span> {invoice.adminNote}
                                            </div>
                                        )}
                                        {!invoice.note && !invoice.adminNote && (
                                            <span className="text-gray-300">Chưa có ghi chú</span>
                                        )}
                                    </div>
                                }
                                placement="top"
                            >
                                <Button
                                    size="small"
                                    icon={<InfoCircleOutlined className={invoice.adminNote || invoice.note ? "text-blue-500 font-bold" : ""} />}
                                    onClick={() => {
                                        setSelectedInvoiceForNote(invoice);
                                        setAdminNoteValue(invoice.adminNote || '');
                                        setAdminNoteModalOpen(true);
                                    }}
                                />
                            </Tooltip>
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
    );
};

export default InvoiceMobileList;
