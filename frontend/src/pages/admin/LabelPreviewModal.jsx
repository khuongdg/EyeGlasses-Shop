import React, { useState, useEffect } from 'react';
import { Modal, Table, InputNumber, Button, Typography } from 'antd';

const { Text } = Typography;

const LabelPreviewModal = ({ open, onClose, items, onPrint, companyInfo, customerName }) => {
    // State này chỉ lưu danh sách các mã hàng duy nhất để nhập giá
    const [groupItems, setGroupItems] = useState([]);

    useEffect(() => {
        // Chỉ thực hiện logic khi Modal được mở (open === true)
        if (open && items) {
            // Luôn tạo một mảng mới từ items gốc để tránh bị nhân bản dữ liệu cũ
            const initialGrouped = items.map(it => ({
                ...it,
                // Giữ nguyên các thuộc tính cần thiết, khởi tạo printPrice
                printPrice: it.printPrice || it.price || 0
            }));

            setGroupItems(initialGrouped);
        }
    }, [open, items]);

    // 2. Xóa sạch dữ liệu KHI ĐÓNG MODAL (Thay thế cho destroyOnClose)
    const handleAfterClose = () => {
        setGroupItems([]);
    };

    // Hàm xử lý khi nhấn nút In
    const handlePreparePrint = () => {
        const finalLabels = [];

        // Duyệt qua danh sách đã sửa giá
        groupItems.forEach(group => {
            const qty = Number(group.quantity) || 0;
            // Nhân bản số lượng tem thực tế cho mỗi mã hàng
            for (let i = 0; i < qty; i++) {
                finalLabels.push({
                    ...group,
                    tempId: `${group.sku}-${i}`
                });
            }
        });

        onPrint(finalLabels); // Gửi mảng "phẳng" (ví dụ 8 item) sang máy in
    };

    const columns = [
        {
            title: 'Mã hàng (SKU)',
            dataIndex: 'sku',
            key: 'sku',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Số tem sẽ in',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (qty) => <Text>{qty} tem</Text>
        },
        {
            title: 'Giá gốc',
            dataIndex: 'price',
            render: v => v?.toLocaleString() + ' ₫',
        },
        {
            title: 'Giá hiển thị trên tem',
            key: 'printPrice',
            render: (_, record, index) => (
                <InputNumber
                    value={record.printPrice}
                    onChange={(val) => {
                        const newGroups = [...groupItems];
                        newGroups[index].printPrice = val;
                        setGroupItems(newGroups);
                    }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={v => v.replace(/\$\s?|(,*)/g, '')}
                    style={{ width: '100%' }}
                    addonAfter="₫"
                />
            )
        }
    ];

    return (
        <Modal
            title="Cấu hình giá in Tem nhãn"
            open={open}
            onCancel={onClose}
            afterClose={handleAfterClose}
            width={700}
            footer={[
                <Button key="cancel" onClick={onClose}>Hủy bỏ</Button>,
                <Button
                    key="print"
                    type="primary"
                    onClick={handlePreparePrint}
                >
                    Xác nhận in ({groupItems.reduce((sum, item) => sum + item.quantity, 0)} tem)
                </Button>
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                    Hệ thống tự động nhóm theo mã hàng. Bạn chỉ cần nhập giá 1 lần cho mỗi mã,
                    máy sẽ in đủ số lượng tem tương ứng với phiếu xuất kho.
                </Text>
            </div>
            <Table
                dataSource={groupItems}
                columns={columns}
                pagination={false}
                rowKey="sku"
                size="small"
                bordered
            />
        </Modal>
    );
};

export default LabelPreviewModal;