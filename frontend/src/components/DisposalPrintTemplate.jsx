import React from 'react';
import { Typography, Table, Row, Col, Divider } from 'antd';

const { Title, Text } = Typography;

const DisposalPrintTemplate = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    const columns = [
        { title: 'STT', render: (_, __, i) => i + 1, width: 50, align: 'center' },
        { title: 'Mã hàng', dataIndex: 'productName', render: (v, r) => v || (r.sku?.includes('_') ? r.sku.split('_')[0] : r.sku) },
        { title: 'Mã SKU', dataIndex: 'sku' },
        { title: 'Màu sắc', dataIndex: 'colorCode', render: (v) => v || '-' },
        { title: 'Thương hiệu', dataIndex: 'brand', render: (v) => v || 'N/A' },
        { title: 'ĐVT', dataIndex: 'unit', render: (v) => v || 'Cây', align: 'center', width: 70 },
        { title: 'SL Hủy', dataIndex: 'quantity', align: 'center', width: 80, render: (v) => <strong>{v}</strong> },
    ];

    const companyName = data.companyInfo?.name || localStorage.getItem('companyName') || 'Mắt Kính Thuận Thiên';

    return (
        <div ref={ref} style={{ padding: '40px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
            {/* Header Phiếu */}
            <Row justify="space-between" align="middle">
                <Col span={15}>
                    <Text strong style={{ fontSize: 16 }}>{companyName}</Text> <br />
                    {data.companyInfo?.address && <Text style={{ fontSize: 12 }}>{data.companyInfo.address}<br /></Text>}
                    <Text strong>Mã phiếu hủy: {data.disposalCode}</Text> <br />
                    <Text>Thời gian lập: {new Date(data.createdAt).toLocaleString('vi-VN')}</Text>
                </Col>
                <Col span={9} style={{ textAlign: 'right' }}>
                    <Title level={3} style={{ margin: 0, color: '#cf1322' }}>PHIẾU HỦY KHO</Title>
                    <Text italic style={{ fontSize: 12 }}>Biên bản xác nhận hủy sản phẩm</Text>
                </Col>
            </Row>

            <Divider style={{ borderColor: '#000', margin: '16px 0' }} />

            {/* Thông tin chung */}
            <Row gutter={24} style={{ marginBottom: 20 }}>
                <Col span={12}>
                    <Text strong>Nhân viên lập phiếu: </Text> <Text>{data.staffName || data.staffId?.name || 'N/A'}</Text> <br />
                    <Text strong>Tổng số lượng hủy: </Text> <Text strong style={{ color: '#cf1322' }}>{data.totalQuantity || 0} sản phẩm</Text>
                </Col>
                <Col span={12}>
                    <Text strong>Lý do hủy: </Text> <Text style={{ color: '#cf1322' }}>{data.reason || 'N/A'}</Text> <br />
                    {data.note && <><Text strong>Ghi chú: </Text> <Text>{data.note}</Text></>}
                </Col>
            </Row>

            {/* Bảng sản phẩm hủy */}
            <Table
                dataSource={data.items || []}
                columns={columns}
                pagination={false}
                bordered
                size="small"
                rowKey={(r, idx) => r._id || r.sku || idx}
                summary={() => (
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                            <Text strong>TỔNG SỐ LƯỢNG HỦY:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">
                            <Text strong style={{ color: '#cf1322', fontSize: 14 }}>{data.totalQuantity || 0}</Text>
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />

            {/* Chữ ký */}
            <Row justify="space-between" style={{ marginTop: 50, textAlign: 'center' }}>
                <Col span={8}>
                    <Text strong>Người lập phiếu</Text> <br />
                    <Text italic style={{ fontSize: 11 }}>(Ký, ghi rõ họ tên)</Text>
                    <div style={{ height: 70 }}></div>
                    <Text>{data.staffName || data.staffId?.name || ''}</Text>
                </Col>
                <Col span={8}>
                    <Text strong>Thủ kho</Text> <br />
                    <Text italic style={{ fontSize: 11 }}>(Ký, ghi rõ họ tên)</Text>
                    <div style={{ height: 70 }}></div>
                </Col>
                <Col span={8}>
                    <Text strong>Người duyệt / Quản lý</Text> <br />
                    <Text italic style={{ fontSize: 11 }}>(Ký, ghi rõ họ tên)</Text>
                    <div style={{ height: 70 }}></div>
                </Col>
            </Row>
        </div>
    );
});

DisposalPrintTemplate.displayName = 'DisposalPrintTemplate';
export default DisposalPrintTemplate;

