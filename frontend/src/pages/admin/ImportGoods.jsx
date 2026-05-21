import { useEffect, useState, useRef } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, InputNumber, Grid,
    message, Space, Row, Col, Divider, Typography, DatePicker, Card, Tag, Upload
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, PrinterOutlined, SearchOutlined,
    ImportOutlined, FileExcelOutlined
} from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';

import { getAllImports, createImport, cancelImport } from '../../services/importService';
import { getStaffs } from '../../services/staffService';
import { getVariants } from '../../services/variantService';
import ImportDetails from './ImportDetails';
import ImportPrintTemplate from '../../components/ImportPrintTemplate';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const ImportGoods = () => {
    const [imports, setImports] = useState([]);
    const [variants, setVariants] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [form] = Form.useForm();

    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [queryParams, setQueryParams] = useState({ keyword: '', dateFrom: null, dateTo: null });

    const watchItems = Form.useWatch('items', form);

    const [openDetail, setOpenDetail] = useState(false);
    const [viewingImport, setViewingImport] = useState(null);

    const [printData, setPrintData] = useState(null);
    const printRef = useRef();

    const screens = useBreakpoint();
    const isMobile = !screens.md;

    /* ================= LOGIC IMPORT EXCEL CHO PHIẾU NHẬP ================= */
    const handleExcelImportForForm = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                console.log("Dữ liệu thô từ file mẫu dùng chung:", rawData);

                const formItems = [];
                const notFoundSkus = [];

                rawData.forEach(item => {
                    // 1. Tự động kết hợp [Mã hàng] và [Mã màu] thành SKU hệ thống giống bên Products
                    const rawProductCode = String(item['Mã hàng'] || '').trim();
                    const rawColorCode = String(item['Mã màu'] || item['Màu'] || '').trim().toUpperCase();

                    // Trường hợp file có sẵn cột SKU thì lấy luôn, nếu không có thì tự động nối chuỗi dạng BIEN_THE
                    const generatedSku = item['SKU']
                        ? String(item['SKU']).trim().toUpperCase()
                        : `${rawProductCode}_${rawColorCode}`.toUpperCase();

                    // Lấy thông tin Giá vốn và Số lượng từ file mẫu
                    const excelPrice = Number(item['Giá vốn'] || item['Giá nhập'] || 0);
                    const excelQty = Number(item['Số lượng'] || item['SL'] || 0);

                    // Nếu dòng trống hoặc không có số lượng thực nhập thì bỏ qua
                    if ((!rawProductCode && !item['SKU']) || excelQty <= 0) return;

                    // 2. Định vị sản phẩm trong hệ thống để lấy _id liên kết khóa ngoại
                    const targetVariant = variants.find(v => v.sku.toUpperCase() === generatedSku);

                    if (targetVariant) {
                        formItems.push({
                            variantId: targetVariant._id,
                            sku: targetVariant.sku,
                            originCountry: targetVariant.productId?.originCountry || 'N/A',
                            importPrice: excelPrice,
                            quantity: excelQty
                        });
                    } else {
                        notFoundSkus.push(generatedSku);
                    }
                });

                if (formItems.length === 0) {
                    throw new Error("Không tìm thấy sản phẩm nào khớp trong hệ thống. Hãy chắc chắn bạn đã thực hiện bước Import tạo sản phẩm ở trang Sản phẩm trước.");
                }

                // 3. Đẩy toàn bộ dữ liệu sạch thu thập được trực tiếp lên form giao diện
                form.setFieldsValue({ items: formItems });
                message.success(`Đã đồng bộ tự động thành công ${formItems.length} sản phẩm nhập kho!`);

                // Nếu phát hiện SKU nối chuỗi bị lệch danh mục thì báo cáo ngay
                if (notFoundSkus.length > 0) {
                    Modal.warning({
                        title: 'Lưu ý: SKU chưa được khởi tạo',
                        content: `Hệ thống phát hiện mã SKU [ ${notFoundSkus.join(', ')} ] chưa được tạo ở trang sản phẩm nên không thể thực hiện nhập kho cho dòng này.`
                    });
                }

            } catch (err) {
                message.error(err.message || "Lỗi đọc cấu trúc file Excel dùng chung");
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    // Khởi tạo hàm in
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: printData ? `Phieu_Nhap_Kho_${printData.importCode}` : 'Phieu_Nhap_Kho',
        onAfterPrint: () => setPrintData(null),
    });

    const onActionPrint = (record) => {
        setPrintData(record);
        setTimeout(() => { handlePrint(); }, 100);
    };

    /* ================= FETCH DATA ================= */
    const fetchImports = async (page = 1, pageSize = 10) => {
        setLoading(true);
        try {
            const res = await getAllImports({ ...queryParams, page, limit: pageSize });
            setImports(res.data.data);
            setPagination({ current: page, pageSize: pageSize, total: res.data.total });
        } catch (err) {
            message.error('Không thể tải lịch sử nhập kho');
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [varRes, staffRes] = await Promise.all([
                getVariants({ limit: 1000 }),
                getStaffs({ limit: 1000 })
            ]);
            setVariants(varRes.data.data);
            setStaffs(staffRes.data.data);
        } catch {
            message.error('Lỗi tải dữ liệu danh mục sản phẩm hoặc nhân viên');
        }
    };

    useEffect(() => {
        fetchInitialData();
        fetchImports();
    }, []);

    /* ================= LOGIC TÍNH TOÁN REAL-TIME ================= */
    useEffect(() => {
        if (watchItems) {
            const totalQty = watchItems.reduce((sum, item) => sum + (item?.quantity || 0), 0);
            const totalAmount = watchItems.reduce((sum, item) => sum + ((item?.quantity || 0) * (item?.importPrice || 0)), 0);
            form.setFieldsValue({ totalQuantity: totalQty, totalAmount: totalAmount });
        }
    }, [watchItems, form]);

    /* ================= HÀNH ĐỘNG ================= */
    const handleCreateImport = async () => {
        try {
            const values = await form.validateFields();
            await createImport(values);
            message.success('Nhập kho thành công, tồn kho đã tăng');
            setOpenModal(false);
            form.resetFields();
            fetchImports(1);
        } catch (err) {
            message.error(err.response?.data?.message || 'Lỗi tạo phiếu nhập');
        }
    };

    const handleCancel = async (id) => {
        Modal.confirm({
            title: 'Xác nhận hủy phiếu nhập?',
            content: 'Hệ thống sẽ trừ lại số lượng tồn kho tương ứng của các mã hàng này.',
            okText: 'Xác nhận hủy',
            okType: 'danger',
            onOk: async () => {
                try {
                    await cancelImport(id);
                    message.success('Đã hủy phiếu và hoàn tồn kho');
                    fetchImports();
                    fetchInitialData();
                } catch (err) {
                    message.error(err.response?.data?.message || 'Không thể hủy phiếu');
                }
            }
        });
    };

    const handleImportProductChange = (val, name) => {
        const v = variants.find((x) => x._id === val);
        if (v) {
            form.setFieldValue(['items', name, 'sku'], v.sku);
            form.setFieldValue(['items', name, 'originCountry'], v.productId?.originCountry || 'N/A');
        }
    };

    const columns = [
        { title: 'Mã phiếu', dataIndex: 'importCode', render: (v) => <b style={{ color: '#1677ff' }}>{v}</b> },
        { title: 'Ngày nhập', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString('vi-VN') },
        { title: 'Nhân viên', dataIndex: 'staffName' },
        { title: 'Nhà cung cấp', dataIndex: 'supplier', render: (v) => v || '-' },
        { title: 'Tổng SL', dataIndex: 'totalQuantity', align: 'center' },
        { title: 'Tổng vốn', dataIndex: 'totalAmount', render: (v) => <Text strong>{v?.toLocaleString()}₫</Text> },
        { title: 'Trạng thái', dataIndex: 'isActive', render: (v) => v ? <Tag color="green">Hợp lệ</Tag> : <Tag color="red">Đã hủy</Tag> },
        {
            title: 'Thao tác',
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<PrinterOutlined />} title="In phiếu nhập" onClick={(e) => { e.stopPropagation(); onActionPrint(record); }} />
                    {record.isActive && (
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleCancel(record._id); }} />
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '20px' }}>
            {/* ... Bảng quản lý và bộ lọc giữ nguyên ... */}
            <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col flex="auto"><Title level={3} style={{ margin: 0 }}>Quản lý Nhập kho</Title></Col>
                <Col>
                    <Button type="primary" size={isMobile ? "middle" : "large"} block={isMobile} icon={<ImportOutlined />} onClick={() => setOpenModal(true)}>
                        Nhập hàng vào kho
                    </Button>
                </Col>
            </Row>

            <Card style={{ marginTo: 0, marginBottom: 16 }} size="small">
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} md={8}>
                        <Text strong>Tìm kiếm</Text>
                        <Input placeholder="Mã phiếu nhập..." prefix={<SearchOutlined />} value={queryParams.keyword} onChange={e => setQueryParams({ ...queryParams, keyword: e.target.value })} onPressEnter={() => fetchImports(1)} />
                    </Col>
                    <Col xs={24} md={8}>
                        <Text strong>Khoảng thời gian</Text>
                        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={(dates, strings) => setQueryParams({ ...queryParams, dateFrom: strings[0], dateTo: strings[1] })} />
                    </Col>
                    <Col xs={24} md={8}>
                        <Space direction={isMobile ? "vertical" : "horizontal"} className={isMobile ? "w-full" : ""}>
                            <Button type="primary" block={isMobile} onClick={() => fetchImports(1)}>Lọc dữ liệu</Button>
                            <Button block={isMobile} onClick={() => { setQueryParams({ keyword: '', dateFrom: null, dateTo: null }); fetchImports(1); }}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {!isMobile ? (
                <Table dataSource={imports} columns={columns} rowKey="_id" loading={loading} pagination={{ ...pagination, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }} onChange={(p) => fetchImports(p.current, p.pageSize)} onRow={(record) => ({ onClick: () => { setViewingImport(record); setOpenDetail(true); }, style: { cursor: 'pointer' } })} />
            ) : (
                <div className="space-y-3">
                    {imports.map((record) => (
                        <Card key={record._id} size="small" className="shadow-sm" onClick={() => { setViewingImport(record); setOpenDetail(true); }}>
                            <div className="flex justify-between mb-2">
                                <Text strong style={{ color: '#1677ff' }}>{record.importCode}</Text>
                                {record.isActive ? <Tag color="green">Hợp lệ</Tag> : <Tag color="red">Đã hủy</Tag>}
                            </div>
                            <div className="text-sm mb-2">
                                <div>Ngày nhập: {new Date(record.createdAt).toLocaleString('vi-VN')}</div>
                                <div>Nhân viên: {record.staffName}</div>
                                <div>Nhà cung cấp: {record.supplier || '-'}</div>
                            </div>
                            <div className="flex justify-between mb-2">
                                <div><Text type="secondary">Tổng SL</Text><br /><Text strong>{record.totalQuantity}</Text></div>
                                <div><Text type="secondary">Tổng vốn</Text><br /><Text strong>{record.totalAmount?.toLocaleString()}₫</Text></div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="small" block icon={<PrinterOutlined />} onClick={(e) => { e.stopPropagation(); onActionPrint(record); }}>In phiếu</Button>
                                {record.isActive && <Button size="small" danger block icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleCancel(record._id); }}>Hủy </Button>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* MODAL NHẬP HÀNG */}
            <Modal
                title={<Title level={4}><ImportOutlined /> Tạo phiếu nhập kho mới</Title>}
                open={openModal}
                onCancel={() => setOpenModal(false)}
                onOk={handleCreateImport}
                width={isMobile ? '100%' : 1100}
                style={isMobile ? { top: 0 } : {}}
                maskClosable={false}
            >
                <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
                    <Row gutter={24}>
                        <Col xs={24} md={8}>
                            <Form.Item label="Nhân viên nhập" name="staffId" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
                                <Select
                                    showSearch
                                    placeholder="Chọn nhân viên thực hiện"
                                    optionFilterProp="label"
                                    onChange={(val, obj) => form.setFieldValue('staffName', obj.label)}
                                    options={staffs.map(s => ({ value: s._id, label: s.name }))}
                                />
                            </Form.Item>
                            <Form.Item name="staffName" hidden><Input /></Form.Item>
                        </Col>
                        <Col xs={24} md={16}>
                            <Form.Item label="Nhà cung cấp / Ghi chú nguồn hàng" name="supplier">
                                <Input placeholder="Nhập tên nhà cung cấp hoặc địa điểm nhập hàng" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" plain>Danh sách sản phẩm nhập</Divider>

                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Row key={key} gutter={12} align="bottom" style={{ marginBottom: 8 }}>
                                        <Col xs={24} md={6}>
                                            <Form.Item name={[name, 'sku']} hidden><Input /></Form.Item>
                                            <Form.Item name={[name, 'originCountry']} hidden><Input /></Form.Item>

                                            <Form.Item {...restField} name={[name, 'variantId']} label={name === 0 ? "Chọn sản phẩm (SKU)" : ""} rules={[{ required: true }]}>
                                                <Select
                                                    showSearch
                                                    placeholder="Tìm mã SKU hoặc tên"
                                                    filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                                                    onChange={(val) => handleImportProductChange(val, name)}
                                                    options={variants.map(v => ({ value: v._id, label: `${v.sku} - ${v.productId?.name} - ${v.inventory}` }))}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={5}>
                                            <Form.Item {...restField} name={[name, 'importPrice']} label={name === 0 ? "Giá vốn (VND)" : ""} rules={[{ required: true }]}>
                                                <InputNumber
                                                    className="w-full"
                                                    min={0}
                                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                    parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                                    addonAfter="₫"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={12} md={3}>
                                            <Form.Item {...restField} name={[name, 'quantity']} label={name === 0 ? "Số lượng" : ""} rules={[{ required: true }]}>
                                                <InputNumber min={1} className="w-full" placeholder="SL" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={12} md={4}>
                                            <Form.Item label={name === 0 ? "Thành tiền (VND)" : ""}>
                                                <div style={{ display: 'flex' }}>
                                                    <Text strong color="blue" style={{ marginTop: '2px', flexGrow: 1, fontSize: '16px' }}>
                                                        {((watchItems?.[name]?.quantity || 0) * (watchItems?.[name]?.importPrice || 0)).toLocaleString()}₫
                                                    </Text>
                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} disabled={fields.length === 1}
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                                                    />
                                                </div>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                ))}

                                {/* KHU VỰC THAO TÁC CỦA FORM LIST */}
                                <Row gutter={12} style={{ marginTop: 10 }}>
                                    <Col xs={24} md={12}>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            Thêm dòng sản phẩm
                                        </Button>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        {/* Nút Import tự động bằng file Excel */}
                                        <Upload
                                            accept=".xlsx, .xls"
                                            showUploadList={false}
                                            beforeUpload={handleExcelImportForForm}
                                        >
                                            <Button
                                                block
                                                icon={<FileExcelOutlined />}
                                                className="text-white bg-[#1D6F42] border-[#1D6F42] 
                                                        hover:!bg-[#278950] hover:!text-white hover:!border-[#278950] 
                                                        focus:!bg-[#1D6F42] focus:!text-white focus:!border-[#1D6F42]
                                                        active:!bg-[#155231] 
                                                        transition-all duration-200"
                                            >
                                                Automatic Data By Excel
                                            </Button>
                                        </Upload>
                                    </Col>
                                </Row>
                            </>
                        )}
                    </Form.List>

                    {/* ... Khối tổng kết ghi chú phía dưới giữ nguyên ... */}
                    <div style={{ marginTop: 24, padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <Row justify="end" gutter={[24, 24]}>
                            <Col xs={24} md={12}>
                                <Form.Item label={<Text strong>Ghi chú phiếu nhập</Text>} name="note">
                                    <Input.TextArea rows={3} placeholder="Nhập nội dung mua..." />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Space direction="vertical" size="middle" className="w-full">
                                    <Row justify="space-around" align="middle">
                                        <Col>
                                            <Text type="secondary">Tổng số lượng nhập:</Text>
                                            <Title level={4} style={{ margin: 0, display: 'flex', justifyContent: 'center' }}>{Form.useWatch('totalQuantity', form) || 0}</Title>
                                        </Col>
                                        <Col>
                                            <Text type="secondary">Tổng vốn đầu tư:</Text>
                                            <Title level={4} style={{ margin: 0, color: '#1677ff' }}>
                                                {Form.useWatch('totalAmount', form)?.toLocaleString() || 0}₫
                                            </Title>
                                        </Col>
                                    </Row>
                                </Space>
                            </Col>
                        </Row>
                        <Form.Item name="totalQuantity" hidden><Input /></Form.Item>
                        <Form.Item name="totalAmount" hidden><Input /></Form.Item>
                    </div>
                </Form>
            </Modal>

            <ImportDetails open={openDetail} onClose={() => setOpenDetail(false)} data={viewingImport} />
            <div style={{ display: 'none' }}><ImportPrintTemplate ref={printRef} data={printData} /></div>
        </div>
    );
};

export default ImportGoods;