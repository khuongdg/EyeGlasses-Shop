import React from 'react';
import { Typography, Table, Row, Col, Divider } from 'antd';

const { Title, Text } = Typography;

const ImportPrintTemplate = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    const columns = [
        { title: 'STT', render: (_, __, i) => i + 1, width: 50 },
        { title: 'Mã hàng (SKU)', dataIndex: 'sku' },
        { title: 'Xuất xứ', dataIndex: 'originCountry' },
        { title: 'Số lượng', dataIndex: 'quantity', align: 'center' },
        { title: 'Đơn giá', dataIndex: 'importPrice', render: (v) => v?.toLocaleString(), align: 'right' },
        { title: 'Thành tiền', render: (r) => (r.quantity * r.importPrice).toLocaleString(), align: 'right' },
    ];

    return (
        <div ref={ref} style={{ padding: '40px', color: '#000' }}>
            {/* Header Phiếu */}
            <Row justify="space-between" align="middle">
                <Col span={16}>
                    <Title level={3}>PHIẾU NHẬP KHO</Title>
                    <Text strong>Mã phiếu: {data.importCode}</Text> <br />
                    <Text>Ngày nhập: {new Date(data.createdAt).toLocaleString('vi-VN')}</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                    <Text strong>Hệ thống GlassShop</Text> <br />
                    <Text italic>Dữ liệu quản trị kho</Text>
                </Col>
            </Row>

            <Divider style={{ borderColor: '#000' }} />

            {/* Thông tin chung */}
            <Row gutter={24} style={{ marginBottom: 20 }}>
                <Col span={12}>
                    <Text strong>Nhân viên nhập: </Text> <Text>{data.staffName}</Text> <br />
                    <Text strong>Nhà cung cấp: </Text> <Text>{data.supplier || 'N/A'}</Text>
                </Col>
                <Col span={12}>
                    <Text strong>Ghi chú: </Text> <Text>{data.note || '...'}</Text>
                </Col>
            </Row>

            {/* Bảng hàng hóa */}
            <Table
                dataSource={data.items}
                columns={columns}
                pagination={false}
                bordered
                size="small"
                rowKey="_id"
                summary={() => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3} align="right"><Text strong>Tổng cộng:</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center"><Text strong>{data.totalQuantity}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} colSpan={2} align="right">
                            <Text strong style={{ fontSize: 16 }}>{data.totalAmount?.toLocaleString()} ₫</Text>
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />

            {/* Chữ ký */}
            <Row justify="space-around" style={{ marginTop: 50, textAlign: 'center' }}>
                <Col span={8}>
                    <Text strong>Người lập phiếu</Text> <br />
                    <Text type="secondary">(Ký, họ tên)</Text>
                </Col>
                <Col span={8}>
                    <Text strong>Thủ kho</Text> <br />
                    <Text type="secondary">(Ký, họ tên)</Text>
                </Col>
            </Row>
        </div>
    );
});

export default ImportPrintTemplate;