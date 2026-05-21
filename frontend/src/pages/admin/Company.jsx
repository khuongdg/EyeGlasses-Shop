import { useEffect, useState } from 'react';
import {
    Card,
    Button,
    Modal,
    Form,
    Input,
    message,
    Tag,
    Row,
    Col,
    Typography,
    Empty,
    Grid,
    Descriptions,
    Space,
    Divider
} from 'antd';
import {
    EditOutlined,
    PlusOutlined,
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined,
    BankOutlined,
    ShopOutlined,
    LockOutlined
} from '@ant-design/icons';

import {
    getCompanyInfo,
    createCompany,
    updateCompany
} from '../../services/companyService';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const Company = () => {
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [form] = Form.useForm();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    /* ================= TẢI DỮ LIỆU DUY NHẤT ================= */
    const fetchCompanyData = async () => {
        setLoading(true);
        try {
            const res = await getCompanyInfo({ isActive: true });
            const data = res.data?.data;

            if (Array.isArray(data) && data.length > 0) {
                setCompany(data[0]);
            } else if (data && !Array.isArray(data)) {
                setCompany(data);
            } else {
                setCompany(null);
            }
        } catch (err) {
            console.error(err);
            message.error('Không thể tải thông tin cấu hình cửa hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanyData();
    }, []);

    /* ================= XỬ LÝ LƯU / CẬP NHẬT ================= */
    const handleSubmit = async () => {
        try {
            // Step 1: Kiểm tra validate toàn bộ form ở client
            const values = await form.validateFields();
            console.log(">>> KHỐI DỮ LIỆU ĐÃ VƯỢT QUA VALIDATE CLIENT:", values);

            // Step 2: Gọi API cập nhật và truyền toàn bộ values (bao gồm cả adminPassword)
            if (company?._id) {
                console.log(">>> ĐANG GỬI API PATCH CẬP NHẬT SANG BACKEND...");
                const res = await updateCompany(company._id, values);

                if (res.data?.success) {
                    message.success('Cập nhật thông tin cửa hàng thành công');
                    setOpenModal(false);
                    fetchCompanyData();
                }
            } else {
                const res = await createCompany(values);
                if (res.data?.success) {
                    message.success('Khởi tạo hồ sơ cửa hàng thành công');
                    setOpenModal(false);
                    fetchCompanyData();
                }
            }
        } catch (err) {
            // In ra để phân biệt rõ lỗi do chưa điền mật khẩu hay lỗi do Backend trả về
            console.log(">>> BẮT ĐƯỢC LỖI TẠI HÀM SUBMIT:", err);

            if (err.errorFields) {
                // Lỗi do client chưa điền đủ form (như cái ảnh bạn chụp)
                message.error('Vui lòng điền đầy đủ các trường bắt buộc và Mật khẩu Admin!');
            } else {
                // Lỗi do Backend trả về (Ví dụ: Mật khẩu sai, status 400/401)
                message.error(err.response?.data?.message || 'Mật khẩu Admin không chính xác. Lưu thất bại!');
            }
        }
    };
    const openEditModal = () => {
        if (company) {
            // Đổ dữ liệu cũ vào form, loại bỏ trường password của lần nhập trước nếu có
            form.setFieldsValue({
                ...company,
                adminPassword: ''
            });
        } else {
            form.resetFields();
        }
        setOpenModal(true);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen flex flex-col justify-start items-center">
            <div className="w-full max-w-4xl">

                {/* TIÊU ĐỀ CHÍNH */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                    <Space direction="vertical" size={1}>
                        <Title level={3} style={{ margin: 0 }}>Thông tin Công ty</Title>
                        <Text type="secondary" className="text-xs">Thông tin này sẽ in trực tiếp lên tem nhãn kính mắt và phiếu xuất kho</Text>
                    </Space>

                    {company && (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={openEditModal}
                            className="w-full sm:w-auto"
                        >
                            Chỉnh sửa thông tin
                        </Button>
                    )}
                </div>

                {/* KHỐI HIỂN THỊ PROFILE ĐỘC BẢN */}
                <Card
                    loading={loading}
                    className="shadow-md border-t-4 border-t-[#1D6F42] rounded-xl overflow-hidden bg-white"
                >
                    {company ? (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4 border-b pb-5">
                                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-[#1D6F42] text-3xl shadow-inner">
                                    <ShopOutlined />
                                </div>
                                <div className="text-center sm:text-left flex-1">
                                    <Title level={4} style={{ margin: '0 0 4px 0' }}>{company.name}</Title>
                                    <Space wrap className="justify-center sm:justify-start">
                                        <Tag color="success" className="rounded-full px-3">Hệ thống đang hoạt động</Tag>
                                        {company.taxCode && <Tag color="blue" className="rounded-full">MST: {company.taxCode}</Tag>}
                                    </Space>
                                </div>
                            </div>

                            <Descriptions
                                bordered
                                column={1}
                                size={isMobile ? "small" : "middle"}
                                className="bg-gray-50/50 rounded-lg overflow-hidden shadow-inner"
                                labelStyle={{
                                    width: isMobile ? '35%' : '25%',
                                    background: '#f8fafc',
                                    fontWeight: 'bold',
                                    color: '#334155',
                                    borderRight: '1px solid #f1f5f9'
                                }}
                                contentStyle={{
                                    background: '#ffffff',
                                    color: '#0f172a'
                                }}
                            >
                                <Descriptions.Item label={<Space><PhoneOutlined className="text-green-600" /><span>Số điện thoại</span></Space>}>
                                    <Text copyable strong>{company.phone}</Text>
                                </Descriptions.Item>

                                <Descriptions.Item label={<Space><MailOutlined className="text-blue-500" /><span>Email cửa hàng</span></Space>}>
                                    {company.email ? <Text copyable>{company.email}</Text> : <Text type="secondary" italic>Chưa cấu hình</Text>}
                                </Descriptions.Item>

                                <Descriptions.Item label={<Space><BankOutlined className="text-amber-500" /><span>Mã số thuế</span></Space>}>
                                    {company.taxCode ? <Text copyable strong>{company.taxCode}</Text> : <Text type="secondary" italic>Chưa cấu hình</Text>}
                                </Descriptions.Item>

                                <Descriptions.Item label={<Space><EnvironmentOutlined className="text-red-500" /><span>Địa chỉ cơ sở</span></Space>}>
                                    <Text className="text-gray-700">{company.address || <Text type="secondary" italic>Chưa cấu hình địa chỉ chi tiết</Text>}</Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    ) : (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <Space direction="vertical" size={2}>
                                    <Text type="secondary">Hồ sơ cấu hình doanh nghiệp trống.</Text>
                                    <Text type="secondary" className="text-xs">Vui lòng khởi tạo thông tin ban đầu để hoàn thiện biên lai xuất kho</Text>
                                </Space>
                            }
                            className="py-8"
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={openEditModal}
                                className="bg-[#1D6F42] border-[#1D6F42] hover:!bg-[#278950]"
                            >
                                Khởi tạo hồ sơ ngay
                            </Button>
                        </Empty>
                    )}
                </Card>
            </div>

            {/* MODAL EDIT / CREATE RÚT GỌN CHUNG MỘT FORM */}
            <Modal
                title={company?._id ? (
                    <Space><EditOutlined className="text-[#1D6F42]" /> <span className="text-base font-semibold">Cập nhật hồ sơ hệ thống</span></Space>
                ) : (
                    <Space><PlusOutlined className="text-blue-600" /> <span className="text-base font-semibold">Khởi tạo thông tin hệ thống</span></Space>
                )}
                open={openModal}
                onOk={handleSubmit}
                onCancel={() => setOpenModal(false)}
                okText="Xác nhận & Lưu"
                cancelText="Hủy bỏ"
                width={isMobile ? "100%" : 550}
                okButtonProps={{ className: "bg-[#1D6F42] border-[#1D6F42] hover:!bg-[#278950]" }}
                style={isMobile ? { top: 0, paddingBottom: 0 } : {}}
                maskClosable={false}
            >
                <Form layout="vertical" form={form} className="mt-4">
                    <Form.Item
                        label={<b>Tên doanh nghiệp / Cửa hàng</b>}
                        name="name"
                        rules={[{ required: true, message: 'Tên cửa hàng không được để trống' }]}
                    >
                        <Input placeholder="Ví dụ: Siêu Thị Mắt Kính Christian DG" className="rounded-md" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<b>Số điện thoại liên hệ</b>}
                                name="phone"
                                rules={[{ required: true, message: 'Nhập hotline liên hệ' }]}
                            >
                                <Input placeholder="0901234567" className="rounded-md" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item label={<b>Email nhận thông báo</b>} name="email">
                                <Input placeholder="hotro@christiandg.com" className="rounded-md" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label={<b>Mã số thuế doanh nghiệp (Nếu có)</b>} name="taxCode">
                        <Input placeholder="Mã số doanh nghiệp gồm 10 hoặc 13 chữ số" className="rounded-md font-mono" />
                    </Form.Item>

                    <Form.Item label={<b>Địa chỉ chi tiết cửa hàng</b>} name="address">
                        <Input.TextArea rows={3} placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." className="rounded-md" />
                    </Form.Item>

                    {/* PHẦN XÁC THỰC MẬT KHẨU ADMIN TRƯỚC KHI LƯU */}
                    <Divider className="my-4" />
                    <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                        <Form.Item
                            label={<span className="text-red-700 font-semibold">Mật khẩu xác nhận của Admin</span>}
                            name="adminPassword"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu Admin để xác thực quyền thay đổi!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="text-red-500" />}
                                placeholder="Nhập mật khẩu tài khoản Admin của bạn"
                                className="rounded-md"
                            />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Company;