import React, { useState } from 'react';
import { Modal, Form, Input, message, Layout, Dropdown, Avatar, Button, Space, Typography, Tag } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LockOutlined,
  KeyOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { changePassword, logout } from '../../../services/authService';

const { Header } = Layout;
const { Text } = Typography;

const AdminHeader = ({ collapsed, setCollapsed }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const companyName = localStorage.getItem('companyName') || 'Mắt Kính Thuận Thiên';

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Lỗi khi gọi API đăng xuất:', e);
    }
    localStorage.clear();
    window.location.href = '/login';
  };

  const items = [
    {
      key: 'logout',
      label: 'Đăng xuất',
      title: null,
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
      title: null,
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
        borderLeft: '1px solid #f0f0f0',
        borderBottom: '1px solid #f0f0f0',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{ fontSize: 18, width: 64, height: 64 }}
        />
        <Tag icon={<ShopOutlined />} color="blue" style={{ fontSize: 14, padding: '4px 10px', borderRadius: 6 }}>
          {companyName}
        </Tag>
      </div>

      <Dropdown menu={{ items }} placement="bottomRight" arrow>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
          <Avatar
            style={{ backgroundColor: '#1677ff' }}
            icon={<UserOutlined />}
          />
          <Text strong style={{ display: collapsed ? 'none' : 'inline' }}>Admin</Text>
        </div>
      </Dropdown>

      <Modal
        title={
          <Space>
            <LockOutlined />
            <span>Đổi mật khẩu tài khoản</span>
          </Space>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText="Cập nhật"
        cancelText="Hủy"
        destroyOnClose
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