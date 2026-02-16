import React, { useState } from 'react';
import { Modal, Form, Input, message, Divider, Layout, Dropdown, Avatar, Button, Space, Typography } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LockOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { changePassword } from '../../../services/authService';

const { Header } = Layout;
const { Text } = Typography;

const AdminHeader = ({ collapsed, setCollapsed }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Xử lý gọi API đổi mật khẩu
  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      // Logic gửi oldPassword và newPassword lên backend
      await changePassword({
        currentPassword: values.currentPassword,
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

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // Danh sách menu trong Dropdown
  const items = [
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout
    },
    {
      type: 'divider',
    },
    {
      key: 'change-password',
      label: 'Đổi mật khẩu',
      icon: <KeyOutlined />,
      onClick: () => setIsModalOpen(true) 
    },
  ];

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        zIndex: 1
      }}
    >
      {/* Nút hamburger để thu gọn/mở rộng Sidebar */}
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{ fontSize: 18, width: 64, height: 64 }}
      />

      {/* User dropdown hiển thị thông tin admin và các tùy chọn */}
      <Dropdown menu={{ items }} placement="bottomRight" arrow>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
          <Avatar
            style={{ backgroundColor: '#1677ff' }}
            icon={<UserOutlined />}
          />
          <Text strong style={{ display: collapsed ? 'none' : 'inline' }}>Admin</Text>
        </div>
      </Dropdown>

      {/* Modal Đổi mật khẩu */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            <span>Đổi mật khẩu tài khoản</span>
          </Space>
        }
        open={isModalOpen}
        onOk={() => form.submit()} // Kích hoạt submit form
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText="Cập nhật"
        cancelText="Hủy"
        destroyOnClose // Xóa dữ liệu form khi đóng modal
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
          requiredMark="optional"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Nhập mật khẩu cũ" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
            ]}
            hasFeedback
          >
            <Input.Password prefix={<KeyOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Vui lòng xác nhận lại mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<KeyOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Xác nhận mật khẩu" />
          </Form.Item>
        </Form>
      </Modal>
    </Header>
  );
};

export default AdminHeader;