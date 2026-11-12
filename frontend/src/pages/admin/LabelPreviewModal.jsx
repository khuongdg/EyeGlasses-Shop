import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, InputNumber, Button, Typography, Checkbox, Select, Space, Tooltip, message } from 'antd';
import { ThunderboltOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const LabelPreviewModal = ({ open, onClose, items, onPrint, companyInfo, customerName }) => {
    // State này chỉ lưu danh sách các mã hàng duy nhất để nhập giá
    const [groupItems, setGroupItems] = useState([]);
    const [selectedSkus, setSelectedSkus] = useState([]);

    // State cho tính năng áp dụng giá in hàng loạt theo giá gốc
    const [batchOriginPrice, setBatchOriginPrice] = useState(null);
    const [batchNewPrice, setBatchNewPrice] = useState(null);

    // Tính danh sách các mức giá gốc duy nhất kèm số lượng sản phẩm
    const uniquePrices = useMemo(() => {
        const map = new Map();
        groupItems.forEach(item => {
            const p = Number(item.price) || 0;
            map.set(p, (map.get(p) || 0) + 1);
        });
        return Array.from(map.entries()).map(([price, count]) => ({ price, count }));
    }, [groupItems]);

    // Danh sách options cho Select giá gốc
    const originPriceOptions = useMemo(() => {
        const list = [];
        if (uniquePrices.length > 1) {
            list.push({
                value: 'ALL',
                label: `Tất cả giá gốc (${groupItems.length} mã hàng)`
            });
        }
        uniquePrices.forEach(up => {
            list.push({
                value: up.price,
                label: `${up.price.toLocaleString('vi-VN')} ₫ (${up.count} mã hàng)`
            });
        });
        return list;
    }, [uniquePrices, groupItems.length]);

    // Số lượng sản phẩm khớp với mức giá gốc đang chọn
    const matchedCount = useMemo(() => {
        if (batchOriginPrice === 'ALL') return groupItems.length;
        if (batchOriginPrice === undefined || batchOriginPrice === null) return 0;
        return groupItems.filter(it => (Number(it.price) || 0) === Number(batchOriginPrice)).length;
    }, [groupItems, batchOriginPrice]);

    useEffect(() => {
        // Chỉ thực hiện logic khi Modal được mở (open === true)
        if (open && items) {
            // Luôn tạo một mảng mới từ items gốc để tránh bị nhân bản dữ liệu cũ
            const initialGrouped = items.map(it => ({
                ...it,
                // Giữ nguyên các thuộc tính cần thiết, khởi tạo printPrice
                printPrice: it.printPrice ?? it.price ?? 0
            }));

            setGroupItems(initialGrouped);
            // Mặc định chọn in tất cả mã hàng
            setSelectedSkus(initialGrouped.map(it => it.sku));

            // Tự động nhận diện mức giá gốc
            const distinctPrices = [...new Set(initialGrouped.map(it => Number(it.price) || 0))];
            if (distinctPrices.length > 0) {
                setBatchOriginPrice(distinctPrices[0]);
            } else {
                setBatchOriginPrice(null);
            }
            setBatchNewPrice(null);
        }
    }, [open, items]);

    // Xóa sạch dữ liệu khi đóng Modal
    const handleAfterClose = () => {
        setGroupItems([]);
        setSelectedSkus([]);
        setBatchOriginPrice(null);
        setBatchNewPrice(null);
    };

    // Áp dụng giá in mới cho tất cả sản phẩm có cùng giá gốc đã chọn
    const handleApplyBatchPrice = () => {
        if (batchOriginPrice === undefined || batchOriginPrice === null) {
            message.warning('Vui lòng chọn mức giá gốc cần áp dụng');
            return;
        }
        if (batchNewPrice === undefined || batchNewPrice === null || batchNewPrice === '') {
            message.warning('Vui lòng nhập giá hiển thị trên tem cần áp dụng');
            return;
        }

        const targetPrice = Number(batchNewPrice);
        let updatedCount = 0;

        const newGroups = groupItems.map(item => {
            const itemPrice = Number(item.price) || 0;
            const isMatched = batchOriginPrice === 'ALL' || itemPrice === Number(batchOriginPrice);
            if (isMatched) {
                updatedCount++;
                return {
                    ...item,
                    printPrice: targetPrice
                };
            }
            return item;
        });

        if (updatedCount > 0) {
            setGroupItems(newGroups);
            const originDesc = batchOriginPrice === 'ALL'
                ? 'tất cả mã hàng'
                : `mức giá gốc ${Number(batchOriginPrice).toLocaleString('vi-VN')} ₫`;
            message.success(
                `Đã cập nhật giá in thành ${targetPrice.toLocaleString('vi-VN')} ₫ cho ${updatedCount} mã hàng (${originDesc})!`
            );
        } else {
            message.info('Không tìm thấy sản phẩm nào có mức giá gốc tương ứng');
        }
    };

    // Khôi phục tất cả giá in về giá gốc
    const handleResetToOriginalPrices = () => {
        const reset = groupItems.map(it => ({
            ...it,
            printPrice: it.price || 0
        }));
        setGroupItems(reset);
        message.info('Đã khôi phục tất cả giá in về giá gốc ban đầu');
    };

    // Hàm xử lý khi nhấn nút In
    const handlePreparePrint = () => {
        const finalLabels = [];

        // Duyệt qua danh sách đã sửa giá
        groupItems.forEach(group => {
            // Chỉ in những mặt hàng được tick chọn
            if (selectedSkus.includes(group.sku)) {
                const qty = Number(group.quantity) || 0;
                // Nhân bản số lượng tem thực tế cho mỗi mã hàng
                for (let i = 0; i < qty; i++) {
                    finalLabels.push({
                        ...group,
                        tempId: `${group.sku}-${i}`
                    });
                }
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
            render: (v, record) => {
                const numVal = Number(v) || 0;
                const isMatched = batchOriginPrice === 'ALL' || (batchOriginPrice !== null && batchOriginPrice !== undefined && Number(batchOriginPrice) === numVal);
                return (
                    <Tooltip title="Nhấp để chọn mức giá gốc này lên ô thao tác nhanh">
                        <span
                            onClick={() => setBatchOriginPrice(numVal)}
                            style={{
                                cursor: 'pointer',
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: isMatched ? '#e6f4ff' : 'transparent',
                                color: isMatched ? '#0958d9' : 'inherit',
                                fontWeight: isMatched ? 600 : 'normal',
                                border: isMatched ? '1px solid #91caff' : '1px solid transparent',
                                transition: 'all 0.2s',
                                display: 'inline-block'
                            }}
                        >
                            {numVal.toLocaleString('vi-VN')} ₫
                        </span>
                    </Tooltip>
                );
            }
        },
        {
            title: 'Giá hiển thị trên tem',
            key: 'printPrice',
            render: (_, record) => (
                <InputNumber
                    value={record.printPrice}
                    onChange={(val) => {
                        setGroupItems(prev => prev.map(it => it.sku === record.sku ? { ...it, printPrice: val } : it));
                    }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={v => v.replace(/\$\s?|(,*)/g, '')}
                    style={{ width: '100%' }}
                    addonAfter="₫"
                />
            )
        },
        {
            title: (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Checkbox
                        checked={selectedSkus.length === groupItems.length && groupItems.length > 0}
                        indeterminate={selectedSkus.length > 0 && selectedSkus.length < groupItems.length}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setSelectedSkus(groupItems.map(it => it.sku));
                            } else {
                                setSelectedSkus([]);
                            }
                        }}
                    />
                </div>
            ),
            key: 'printSelect',
            align: 'center',
            width: 100,
            render: (_, record) => (
                <Checkbox
                    checked={selectedSkus.includes(record.sku)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedSkus(prev => [...prev, record.sku]);
                        } else {
                            setSelectedSkus(prev => prev.filter(k => k !== record.sku));
                        }
                    }}
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
            width={850}
            footer={[
                <Button key="cancel" onClick={onClose}>Hủy bỏ</Button>,
                <Button
                    key="print"
                    type="primary"
                    onClick={handlePreparePrint}
                    disabled={selectedSkus.length === 0}
                >
                    Xác nhận in ({groupItems.filter(item => selectedSkus.includes(item.sku)).reduce((sum, item) => sum + item.quantity, 0)} tem)
                </Button>
            ]}
        >
            <div style={{ marginBottom: 14 }}>
                <Text type="secondary">
                    Hệ thống tự động nhóm theo mã hàng. Bạn có thể tick chọn in tất cả hoặc chọn in các tem cần thiết, nhập giá in tương ứng cho từng mã hàng.
                </Text>
            </div>

            {/* Khung công cụ áp dụng nhanh theo giá gốc */}
            <div
                style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <Space size={6} align="center">
                        <ThunderboltOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                        <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                            Cập nhật nhanh giá in theo giá gốc
                        </Text>
                    </Space>
                    {matchedCount > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            (Có <Text strong style={{ color: '#1677ff' }}>{matchedCount}</Text> mã hàng tương ứng)
                        </Text>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>Giá gốc:</span>
                        <Select
                            value={batchOriginPrice}
                            onChange={(val) => setBatchOriginPrice(val)}
                            options={originPriceOptions}
                            placeholder="Chọn giá gốc"
                            style={{ minWidth: 200 }}
                            showSearch
                            optionFilterProp="label"
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>Giá hiển thị trên tem:</span>
                        <InputNumber
                            value={batchNewPrice}
                            onChange={(val) => setBatchNewPrice(val)}
                            onPressEnter={handleApplyBatchPrice}
                            placeholder="Nhập giá in mới"
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/\$\s?|(,*)/g, '')}
                            min={0}
                            style={{ width: 170 }}
                            addonAfter="₫"
                        />
                    </div>

                    <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={handleApplyBatchPrice}
                        disabled={batchOriginPrice === undefined || batchOriginPrice === null || batchNewPrice === undefined || batchNewPrice === null || batchNewPrice === ''}
                    >
                        Áp dụng
                    </Button>

                    <Button
                        icon={<ReloadOutlined />}
                        size="middle"
                        onClick={handleResetToOriginalPrices}
                        style={{ marginLeft: 'auto' }}
                        title="Khôi phục giá in của tất cả sản phẩm về lại giá gốc"
                    >
                        Đặt lại giá gốc
                    </Button>
                </div>
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
