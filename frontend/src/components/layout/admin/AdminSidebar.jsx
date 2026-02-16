import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  BankOutlined,
  ImportOutlined,
  BoxPlotOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography } from 'antd';

const { Text } = Typography;
const { Sider } = Layout;

const AdminSidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = ({ key }) => {
    navigate(key);

    // Nếu mobile thì tự đóng sidebar sau khi chọn menu
    if (window.innerWidth < 992) {
      setCollapsed(true);
    }
  };

  return (
    <Sider
      width={220}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      breakpoint="lg"
      collapsedWidth={0}
      trigger={null} // dùng trigger ở Header
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
      }}
    >
      {/* Logo / Title */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 18,
          borderBottom: '1px solid #f0f0f0',
          background: '#fff', // Đảm bảo nền khớp với Sidebar
          transition: 'all 0.2s', // Tạo hiệu ứng mượt mà khi thu gọn
          overflow: 'hidden'
        }}
      >
        <CrownOutlined style={{ fontSize: 24, color: '#1677ff' }} />

        {!collapsed && (
          <Text
            strong
            style={{
              marginLeft: 12,
              fontSize: 18,
              color: '#1677ff',
              whiteSpace: 'nowrap'
            }}
          >
            ADMIN
          </Text>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
        items={[
          {
            key: '/admin',
            icon: <DashboardOutlined />,
            label: 'Dashboard'
          },
          {
            key: 'products-group',
            icon: <BoxPlotOutlined />,
            label: 'Kho sản phẩm',
            children: [
              { key: '/admin/products', label: 'Sản phẩm', icon: <ShoppingOutlined /> },
              { key: '/admin/import-goods', label: 'Nhập hàng kho', icon: <ImportOutlined /> },
            ],
          },
          {
            key: '/admin/customers',
            icon: <UserOutlined />,
            label: 'Khách hàng'
          },
          {
            key: '/admin/staffs',
            icon: <TeamOutlined />,
            label: 'Nhân viên'
          },
          {
            key: '/admin/invoices',
            icon: <FileTextOutlined />,
            label: 'Phiếu xuất kho'
          },
          {
            key: '/admin/debts',
            icon: <BankOutlined />,
            label: 'Quản lý Công nợ'
          },
          {
            key: '/admin/company-info',
            icon: <InfoCircleOutlined />,
            label: 'Thông tin công ty'
          }
        ]}
      />
    </Sider>
  );
};

export default AdminSidebar;
