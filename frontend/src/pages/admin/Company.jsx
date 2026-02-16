import { useEffect, useState } from 'react';
import {
    Card,
    Button,
    Modal,
    Form,
    Input,
    message,
    Tag,
    Space,
    Row,
    Col,
    Typography,
    Empty,
    Tooltip,
    Divider,
    Grid,
    Popconfirm
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined,
    BankOutlined
} from '@ant-design/icons';

import {
    getCompanyInfo,
    createCompany,
    updateCompany,
    deleteCompany,
    restoreCompany
} from '../../services/companyService';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const Company = () => {
    const [activeCompany, setActiveCompany] = useState(null);
    const [inactiveCompanies, setInactiveCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();
    const screens = useBreakpoint();
    const isMobile = !screens.md;


    const fetchCompanies = async () => {
        setLoading(true);
        try {
            // 1. Lấy công ty đang active
            const activeRes = await getCompanyInfo({ isActive: true });
            const data = activeRes.data.data;

            // Backend trả về mảng, ta cần lấy phần tử đầu tiên [0]
            if (Array.isArray(data) && data.length > 0) {
                setActiveCompany(data[0]);
            } else if (data && !Array.isArray(data)) {
                setActiveCompany(data); // Đề phòng trường hợp trả về object đơn
            } else {
                setActiveCompany(null);
            }
        } catch (err) {
            setActiveCompany(null);
        }

        try {
            // 2. Lấy danh sách inactive (Giữ nguyên logic mảng)
            const inactiveRes = await getCompanyInfo({ isActive: false });
            const data = inactiveRes.data.data;
            setInactiveCompanies(Array.isArray(data) ? data : (data ? [data] : []));
        } catch (err) {
            setInactiveCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editing) {
                await updateCompany(editing._id, values);
                message.success('Cập nhật thành công');
            } else {
                await createCompany(values);
                message.success('Tạo mới thành công');
            }
            setOpenModal(false);
            setEditing(null);
            form.resetFields();
            fetchCompanies();
        } catch (err) {
            message.error(err.response?.data?.message || 'Thao tác thất bại');
        }
    };

    // Component render từng Card Công ty
    const CompanyCard = ({ company, isInactive = false }) => (
        <Card
            hoverable
            className="h-full"
            bodyStyle={{ padding: 16 }}
            style={{
                borderLeft: `4px solid ${isInactive ? '#ff4d4f' : '#52c41a'}`,
                borderRadius: 12
            }}
            actions={[
                !isInactive ? (
                    <Tooltip title="Chỉnh sửa" key="edit">
                        <EditOutlined onClick={() => {
                            setEditing(company);
                            form.setFieldsValue(company);
                            setOpenModal(true);
                        }} />
                    </Tooltip>) : (
                    // Nếu inactive, có thể để một icon disabled hoặc bỏ trống phần tử này
                    <Tooltip title="Không thể sửa công ty đã ngưng hoạt động" key="edit-disabled">
                        <EditOutlined style={{ cursor: 'not-allowed', color: '#d9d9d9' }} />
                    </Tooltip>
                ),

                isInactive ? (
                    <Tooltip title="Khôi phục">
                        <ReloadOutlined key="restore" onClick={() => restoreCompany(company._id).then(fetchCompanies)} />
                    </Tooltip>
                ) : (
                    <Popconfirm
                        title="Bạn có chắc muốn xóa công ty này?"
                        onConfirm={() => deleteCompany(company._id).then(fetchCompanies)}
                    >
                        <DeleteOutlined className="text-red-500" />
                    </Popconfirm>
                ),
            ]}
        >
            <div className="mb-3 flex justify-between items-start">
                <Title level={5} style={{ margin: 0 }}>{company.name}</Title>
                <Tag color={isInactive ? 'error' : 'success'}>
                    {isInactive ? 'Ngừng hoạt động' : 'Đang sử dụng'}
                </Tag>
            </div>

            <Space direction="vertical" className="w-full text-gray-600">
                <div><PhoneOutlined className="mr-2" /> {company.phone}</div>
                <div><MailOutlined className="mr-2" /> {company.email || 'N/A'}</div>
                {company.taxCode && (
                    <div><BankOutlined className="mr-2" /> MST: {company.taxCode}</div>
                )}
                <div className="truncate">
                    <EnvironmentOutlined className="mr-2" />
                    <Text type="secondary" className="text-xs">{company.address || 'Chưa cập nhật địa chỉ'}</Text>
                </div>
            </Space>
        </Card>
    );

    return (
        <div className="px-4 md:px-6 py-4 md:py-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <Title level={3}>Quản lý Công ty</Title>
                {!activeCompany && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        block={isMobile}
                        onClick={() => {
                            setEditing(null);
                            form.resetFields();
                            setOpenModal(true);
                        }}
                    >
                        Thêm công ty mới
                    </Button>
                )}
            </div>

            <Divider orientation="left">Công ty đang sử dụng</Divider>
            <Row gutter={[16, 16]} className="mb-8">
                {activeCompany ? (
                    <Col xs={24} sm={12} md={12} lg={8} xl={6}>
                        <CompanyCard company={activeCompany} />
                    </Col>
                ) : (
                    <Col span={24}><Empty description="Chưa có công ty hoạt động" /></Col>
                )}
            </Row>

            <Divider orientation="left">Danh sách đã xóa / Ngừng hoạt động</Divider>
            <Row gutter={[16, 16]}>
                {inactiveCompanies.length > 0 ? (
                    inactiveCompanies.map(comp => (
                        <Col xs={24} sm={12} lg={8} key={comp._id}>
                            <CompanyCard company={comp} isInactive />
                        </Col>
                    ))
                ) : (
                    <Col span={24}><Empty description="Thùng rác trống" /></Col>
                )}
            </Row>

            <Modal
                title={editing ? 'Cập nhật thông tin công ty' : 'Tạo hồ sơ công ty'}
                open={openModal}
                onOk={handleSubmit}
                onCancel={() => setOpenModal(false)}
                okText="Lưu thông tin"
                cancelText="Hủy"
                width={isMobile ? "100%" : 600}
                style={isMobile ? { top: 0, paddingBottom: 0 } : {}}
            >
                <Form layout="vertical" form={form} className="mt-4">
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Tên công ty" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
                                <Input placeholder="Công ty TNHH..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
                                <Input placeholder="090..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Email" name="email">
                                <Input placeholder="example@gmail.com" />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="Mã số thuế" name="taxCode">
                                <Input placeholder="Mã số doanh nghiệp" />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="Địa chỉ công ty" name="address">
                                <Input.TextArea rows={3} placeholder="Địa chỉ chi tiết..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default Company;