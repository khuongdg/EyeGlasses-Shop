import React from 'react';
import { Layout, Menu } from 'antd';
import {
    ShopOutlined,
    FileTextOutlined,
    UserOutlined,
    BoxPlotOutlined,
    ImportOutlined,
    ShoppingOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const StaffSidebar = ({ collapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            key: '/staff/invoices',
            icon: <FileTextOutlined />,
            label: 'Phiếu xuất kho'
        },
        {
            key: '/staff/customers',
            icon: <UserOutlined />,
            label: 'Khách hàng'
        },
        {
            key: 'products-group',
            icon: <BoxPlotOutlined />,
            label: 'Kho sản phẩm',
            children: [
                { key: '/staff/products', label: 'Sản phẩm', icon: <ShoppingOutlined /> },
                { key: '/staff/import-goods', label: 'Nhập hàng kho', icon: <ImportOutlined /> },
            ],
        },
    ];

    return (
        <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="shadow-md">
            <div className="flex items-center justify-center py-6">
                <ShopOutlined style={{ fontSize: 32, color: '#1677ff' }} />
                {!collapsed && <span className="ml-3 font-bold text-lg">Staff Portal</span>}
            </div>
            <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                defaultOpenKeys={['products-group']}
                items={menuItems}
                onClick={({ key }) => navigate(key)}
            />
        </Sider>
    );
};

export default StaffSidebar;