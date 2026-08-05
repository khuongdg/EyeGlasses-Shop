import React from 'react';
import { Modal, Input } from 'antd';

const InvoiceAdminNoteModal = ({
    adminNoteModalOpen,
    setAdminNoteModalOpen,
    selectedInvoiceForNote,
    adminNoteValue,
    setAdminNoteValue,
    handleSaveAdminNote
}) => {
    return (
        <Modal
            title={`Ghi chú nội bộ cho phiếu: ${selectedInvoiceForNote?.invoiceCode}`}
            open={adminNoteModalOpen}
            onCancel={() => setAdminNoteModalOpen(false)}
            onOk={handleSaveAdminNote}
            okText="Lưu ghi chú"
            cancelText="Đóng"
            centered
        >
            <div style={{ marginTop: '16px' }}>
                <Input.TextArea
                    rows={4}
                    placeholder="Nhập nội dung ghi chú nội bộ cho phiếu xuất kho này..."
                    value={adminNoteValue}
                    onChange={(e) => setAdminNoteValue(e.target.value)}
                />
            </div>
        </Modal>
    );
};

export default InvoiceAdminNoteModal;
