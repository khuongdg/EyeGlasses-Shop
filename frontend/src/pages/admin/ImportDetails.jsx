import { useEffect, useState, useRef } from 'react';
import { Modal, Descriptions, Table, Typography, Divider, Tag, Button, Grid } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import ImportPrintTemplate from '../../components/ImportPrintTemplate';
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const ImportDetails = ({ open, onClose, data }) => {
    if (!data) return null;

    const [printData, setPrintData] = useState(null);
    const printRef = useRef();

    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // Khởi tạo hàm in
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: printData ? `Phieu_Nhap_Kho_${printData.importCode}` : 'Phieu_Nhap_Kho',
        onAfterPrint: () => setPrintData(null),
    });

    // Hàm xử lý khi nhấn nút in
    const onActionPrint = (record) => {
        setPrintData(record);
        setTimeout(() => {
            handlePrint();
        }, 100);
    };

    const columns = [
        {
            title: 'STT',
            render: (_, __, index) => index + 1,
            width: 60,
            align: 'center',
        },
        {
            title: 'Mã hàng (SKU)',
            dataIndex: 'sku',
            key: 'sku',
            render: (text, record) => text || record.variantId?.sku || 'N/A',
        },
        {
            title: 'Xuất xứ',
            dataIndex: 'originCountry',
            key: 'originCountry',
            render: (text, record) => text || record.variantId?.productId?.originCountry || 'N/A',
        },
        {
            title: 'Đơn giá nhập',
            dataIndex: 'importPrice',
            key: 'importPrice',
            align: 'right',
            render: (v) => v?.toLocaleString() + ' ₫',
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center',
            render: (v) => <Text strong>{v}</Text>,
        },
        {
            title: 'Thành tiền',
            dataIndex: 'totalItemAmount',
            key: 'totalItemAmount',
            align: 'right',
            render: (v, record) => (record.importPrice * record.quantity).toLocaleString() + ' ₫',
        },
    ];

    return (
        <div>
            <Modal
                title={<Title level={4} style={{ margin: 0 }}>Chi tiết phiếu nhập kho</Title>}
                open={open}
                onCancel={onClose}
                width={isMobile ? "100%" : 900}
                style={isMobile ? { top: 0, paddingBottom: 0 } : {}}
                footer={[
                    <Button key="close" onClick={onClose}>Đóng</Button>,
                    <Button
                        key="print"
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={() => onActionPrint(data)} // Hoặc gọi hàm in chuyên dụng của bạn
                    >
                        In phiếu nhập
                    </Button>
                ]}
            >
                <Descriptions
                    bordered
                    column={isMobile ? 1 : 2}
                    size="small"
                >
                    <Descriptions.Item label="Mã phiếu nhập">
                        <Text strong style={{ color: '#1677ff' }}>{data.importCode}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">
                        {new Date(data.createdAt).toLocaleString('vi-VN')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nhân viên thực hiện">
                        {data.staffName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nhà cung cấp">
                        {data.supplier || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                        {data.isActive ? (
                            <Tag color="green">Hợp lệ (Đã vào kho)</Tag>
                        ) : (
                            <Tag color="red">Đã hủy (Đã hoàn kho)</Tag>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ghi chú">
                        {data.note || 'Không có ghi chú'}
                    </Descriptions.Item>
                </Descriptions>

                <Divider orientation="left" plain style={{ margin: '20px 0 10px 0' }}> Danh sách sản phẩm nhập </Divider>

                {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {data.items.map((item, index) => {
                            const total = item.importPrice * item.quantity;

                            return (
                                <div
                                    key={index}
                                    style={{
                                        border: '1px solid #f0f0f0',
                                        borderRadius: 8,
                                        padding: 12,
                                        background: '#fff'
                                    }}
                                >
                                    <Text strong>
                                        {index + 1}. {item.sku || item.variantId?.sku}
                                    </Text>

                                    <div style={{ marginTop: 6 }}>
                                        <Text type="secondary">Xuất xứ: </Text>
                                        {item.originCountry || item.variantId?.productId?.originCountry || 'N/A'}
                                    </div>

                                    <div>
                                        <Text type="secondary">Đơn giá: </Text>
                                        {item.importPrice?.toLocaleString()} ₫
                                    </div>

                                    <div>
                                        <Text type="secondary">Số lượng: </Text>
                                        <Text strong>{item.quantity}</Text>
                                    </div>

                                    <Divider style={{ margin: '8px 0' }} />

                                    <div style={{ textAlign: 'right' }}>
                                        <Text strong type="danger">
                                            {total.toLocaleString()} ₫
                                        </Text>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Tổng cộng */}
                        <div
                            style={{
                                padding: 12,
                                background: '#fafafa',
                                borderRadius: 8
                            }}
                        >
                            <Text strong>
                                Tổng SL: {data.items.reduce((s, i) => s + i.quantity, 0)}
                            </Text>
                            <br />
                            <Text strong type="danger">
                                Tổng tiền:{" "}
                                {data.items
                                    .reduce((s, i) => s + i.quantity * i.importPrice, 0)
                                    .toLocaleString()} ₫
                            </Text>
                        </div>
                    </div>
                ) : (
                    <Table
                        dataSource={data.items}
                        columns={columns}
                        pagination={false}
                        rowKey={(record, index) => record._id || index}
                        size="small"
                        bordered
                        summary={(pageData) => {
                            let totalQty = 0;
                            let totalAmount = 0;
                            pageData.forEach(({ quantity, importPrice }) => {
                                totalQty += quantity;
                                totalAmount += quantity * importPrice;
                            });

                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                                        <Table.Summary.Cell index={0} colSpan={4} align="right">
                                            <Text strong>Tổng cộng:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="center">
                                            <Text strong>{totalQty}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} align="right">
                                            <Text strong type="danger" style={{ fontSize: 16 }}>
                                                {totalAmount.toLocaleString()} ₫
                                            </Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                )}
            </Modal>

            {/* Template ẩn phục vụ việc in (không hiển thị trên màn hình) */}
            <div style={{ display: 'none' }}>
                <ImportPrintTemplate ref={printRef} data={printData} />
            </div>
        </div>
    );
};

export default ImportDetails;