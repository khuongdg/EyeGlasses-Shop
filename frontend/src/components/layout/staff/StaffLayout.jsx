import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import StaffSidebar from './StaffSidebar';
import StaffHeader from './StaffHeader';

const { Content } = Layout;

const StaffLayout = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <StaffSidebar collapsed={collapsed} />
            <Layout>
                <StaffHeader collapsed={collapsed} setCollapsed={setCollapsed} />
                <Content style={{ margin: '16px', padding: '16px', background: '#fff', borderRadius: '8px' }}>
                    {/* Nơi hiển thị các trang con của Staff */}
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default StaffLayout;