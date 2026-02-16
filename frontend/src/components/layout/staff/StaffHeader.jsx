import React, { useState } from 'react';
import { Layout, Button, Dropdown, Avatar, Space, Typography, Modal, Form, Input, message } from 'antd';
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    UserOutlined,
    LogoutOutlined,
    KeyOutlined,
    LockOutlined
} from '@ant-design/icons';
import { changePassword } from '../../../services/authService';

const { Header } = Layout;
const { Text } = Typography;

const StaffHeader = ({ collapsed, setCollapsed }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (values) => {
        setLoading(true);
        try {
            await changePassword({
                currentPassword: values.oldPassword, // Ánh xạ đúng key Backend
                newPassword: values.newPassword
            });
            message.success('Đổi mật khẩu thành công!');
            setIsModalOpen(false);
            form.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
        } finally {
            setLoading(false);
        }
    };

    const items = [
        {
            key: 'logout',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: () => {
                localStorage.clear();
                window.location.href = '/login';
            }
        },
        { type: 'divider' },
        { key: 'cp', label: 'Đổi mật khẩu', icon: <KeyOutlined />, onClick: () => setIsModalOpen(true) },
    ];

    return (
        <Header className="bg-white px-4 flex justify-between items-center shadow-sm">
            <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="text-lg"
            />

            <Dropdown menu={{ items }} placement="bottomRight">
                <div className="flex items-center gap-3 cursor-pointer p-1">
                    <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                    <Text strong>Nhân viên</Text>
                </div>
            </Dropdown>

            <Modal
                title="Đổi mật khẩu nhân viên"
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={() => setIsModalOpen(false)}
                confirmLoading={loading}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleChangePassword}>
                    <Form.Item label="Mật khẩu hiện tại" name="oldPassword" rules={[{ required: true }]}>
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                    <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true, min: 6 }]}>
                        <Input.Password prefix={<KeyOutlined />} />
                    </Form.Item>
                    <Form.Item
                        label="Xác nhận lại"
                        name="confirm"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                    return Promise.reject(new Error('Mật khẩu không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<KeyOutlined />} />
                    </Form.Item>
                </Form>
            </Modal>
        </Header>
    );
};

export default StaffHeader;