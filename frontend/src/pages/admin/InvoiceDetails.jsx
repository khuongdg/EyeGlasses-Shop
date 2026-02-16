import React from 'react';
import { Modal, Descriptions, Table, Tag, Typography, Divider, Row, Col, Button, Space, Grid } from 'antd';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const InvoiceDetails = ({ open, onClose, data }) => {
    if (!data) return null;
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const columns = [
        { title: 'STT', render: (_, __, index) => index + 1, width: 50 },
        { title: 'Mã hàng', dataIndex: 'sku' },
        { title: 'Thương hiệu', dataIndex: 'brand' },
        { title: 'Đvt', dataIndex: 'unit' },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            render: (v) => <Text strong>{v}</Text>
        },
        {
            title: 'Đơn giá',
            dataIndex: 'price',
            render: (v) => v?.toLocaleString()
        },
        {
            title: 'Chiết khấu',
            dataIndex: 'discountPercent',
            render: (v) => v > 0 ? <Tag color="red">-{v}%</Tag> : '0%'
        },
        {
            title: 'Thành tiền',
            render: (_, record) => {
                const total = record.quantity * record.price;
                const discount = (total * (record.discountPercent || 0)) / 100;
                return <Text type="danger">{(total - discount).toLocaleString()}</Text>
            },
            align: 'right'
        },
    ];

    return (
        <Modal
            title={`Chi tiết phiếu xuất: ${data.invoiceCode}`}
            open={open}
            onCancel={onClose}
            footer={[

            ]}
            width={window.innerWidth < 768 ? '100%' : 1000}
            style={{ top: 20 }}

        >
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Descriptions title="Thông tin khách hàng" bordered column={1} size="small">
                        <Descriptions.Item label="Tên khách hàng">{data.customerName}</Descriptions.Item>
                        <Descriptions.Item label="Số điện thoại">{data.customerPhone}</Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ">{data.customerAddress}</Descriptions.Item>
                        <Descriptions.Item label="Mã số thuế">{data.customerTaxCode}</Descriptions.Item>
                    </Descriptions>
                </Col>
                <Col xs={24} md={12}>
                    <Descriptions title="Thông tin giao dịch" bordered column={1} size="small">
                        <Descriptions.Item label="Nhân viên">{data.staffName}</Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">{new Date(data.createdAt).toLocaleString('vi-VN')}</Descriptions.Item>
                        <Descriptions.Item label="Phương thức thanh toán">{data.paymentMethod}</Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            {data.isActive ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã hủy</Tag>}
                        </Descriptions.Item>
                    </Descriptions>
                </Col>
            </Row>

            <Divider orientation="left">Danh sách sản phẩm</Divider>
            {!isMobile ? (
                <Table
                    dataSource={data.items}
                    columns={columns}
                    pagination={false}
                    rowKey={(record) => record.variantId + record.sku}
                    size="small"
                    bordered
                />
            ) : (
                <div className="space-y-3">
                    {data.items.map((item, index) => {
                        const total = item.quantity * item.price;
                        const discount = (total * (item.discountPercent || 0)) / 100;
                        const final = total - discount;

                        return (
                            <div
                                key={item.variantId + item.sku}
                                className="border rounded-lg p-3 shadow-sm bg-white"
                            >
                                <div className="flex justify-between mb-2">
                                    <Text strong>#{index + 1} {item.sku}</Text>
                                    <Text type="danger" strong>
                                        {final.toLocaleString()}
                                    </Text>
                                </div>

                                <div className="text-sm space-y-1">
                                    <div>Thương hiệu: {item.brand}</div>
                                    <div>ĐVT: {item.unit}</div>
                                    <div>Số lượng: <b>{item.quantity}</b></div>
                                    <div>Đơn giá: {item.price?.toLocaleString()}</div>
                                    <div>
                                        Chiết khấu:{' '}
                                        {item.discountPercent > 0
                                            ? <Tag color="red">-{item.discountPercent}%</Tag>
                                            : '0%'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            <div className="mt-5 flex justify-end">
                <div className="w-full md:w-auto text-right">
                    <Space direction="vertical">
                        <Text>Tạm tính: <b>{data.subTotal?.toLocaleString()}</b></Text>
                        <Text>Tổng chiết khấu: <b style={{ color: 'red' }}>-{data.totalDiscount?.toLocaleString()}</b></Text>
                        <Title level={4}>TỔNG THANH TOÁN: <span style={{ color: '#ff4d4f' }}>{data.totalAmount?.toLocaleString()}</span></Title>
                    </Space>
                </div>
            </div>
            {data.note && (
                <>
                    <Divider orientation="left">Ghi chú</Divider>
                    <div style={{ padding: '8px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '4px' }}>
                        {data.note}
                    </div>
                </>
            )}
        </Modal>
    );
};

export default InvoiceDetails;