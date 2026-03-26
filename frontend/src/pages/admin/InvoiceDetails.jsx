import React from 'react';
import { Modal, Descriptions, Table, Tag, Typography, Divider, Row, Col, Button, Space, Grid } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const InvoiceDetails = ({ open, onClose, data }) => {
    if (!data) return null;
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    /* ================= LOGIC XUẤT EXCEL ================= */
    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('PhieuXuatKho');

        // 1. Cấu hình cột (Width)
        worksheet.columns = [
            { key: 'stt', width: 8 },
            { key: 'sku', width: 25 },
            { key: 'brand', width: 20 },
            { key: 'unit', width: 10 },
            { key: 'quantity', width: 12 },
            { key: 'price', width: 15 },
            { key: 'discount', width: 15 },
            { key: 'total', width: 18 },
        ];

        worksheet.spliceRows(1, 1);

        // 2. Thêm Tiêu đề lớn
        const titleRow = worksheet.addRow(['PHIẾU XUẤT KHO']);
        worksheet.mergeCells('A1:H1');
        titleRow.font = { name: 'Arial', size: 16, bold: true };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.addRow([]); // Dòng trống

        // 3. Thông tin khách hàng & Giao dịch
        const infoRows = [
            ['Mã hóa đơn:', data.invoiceCode, '', 'Ngày tạo:', new Date(data.createdAt).toLocaleString('vi-VN')],
            ['Khách hàng:', data.customerName, '', 'Nhân viên:', data.staffName],
            ['Số điện thoại:', data.customerPhone, '', 'Thanh toán:', data.paymentMethod],
            ['Địa chỉ:', data.customerAddress]
        ];
        infoRows.forEach(row => {
            const r = worksheet.addRow(row);
            r.getCell(1).font = { bold: true };
            r.getCell(4).font = { bold: true };
        });
        worksheet.addRow([]); // Dòng trống

        // 4. Header Bảng sản phẩm
        const headerRow = worksheet.addRow(['STT', 'Mã hàng', 'Thương hiệu', 'ĐVT', 'Số lượng', 'Đơn giá', 'Chiết khấu (%)', 'Thành tiền']);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            cell.font = { bold: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { horizontal: 'center' };
        });

        // 5. Đổ dữ liệu sản phẩm
        data.items.forEach((item, index) => {
            const total = item.quantity * item.price;
            const discountVal = (total * (item.discountPercent || 0)) / 100;
            const row = worksheet.addRow([
                index + 1,
                item.sku,
                item.brand,
                item.unit,
                item.quantity,
                item.price,
                `${item.discountPercent || 0}%`,
                total - discountVal
            ]);

            // Căn giữa STT, ĐVT, SL
            [1, 4, 5, 7].forEach(colIdx => row.getCell(colIdx).alignment = { horizontal: 'center' });
            // Định dạng số cho Đơn giá và Thành tiền
            [6, 8].forEach(colIdx => row.getCell(colIdx).numFmt = '#,##0');

            row.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        // 6. Phần tổng kết
        worksheet.addRow([]);
        const summaryRows = [
            ['', '', '', '', '', '', 'Tạm tính:', data.subTotal],
            ['', '', '', '', '', '', 'Chiết khấu:', data.totalDiscount],
            ['', '', '', '', '', '', 'TỔNG CỘNG:', data.totalAmount]
        ];

        summaryRows.forEach((row, idx) => {
            const r = worksheet.addRow(row);
            r.getCell(7).font = { bold: true };
            r.getCell(8).font = { bold: true, color: { argb: 'FFFF0000' } };
            r.getCell(8).numFmt = '#,##0';
            if (idx === 2) { // Dòng Tổng cộng to hơn
                r.getCell(7).font = { bold: true, size: 12 };
                r.getCell(8).font = { bold: true, size: 12, color: { argb: 'FFFF0000' } };
            }
        });

        // Xuất file
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `PhieuXuat_${data.invoiceCode}.xlsx`);
    };

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
                <Button key="back" onClick={onClose}>Đóng</Button>,
                <Button
                    key="export"
                    type="primary"
                    icon={<FileExcelOutlined />}
                    onClick={exportToExcel}
                    style={{
                        backgroundColor: '#1D6F42',
                        borderColor: '#1D6F42',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#155231'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D6F42'}
                >
                    Xuất Excel
                </Button>
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