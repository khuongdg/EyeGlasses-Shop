import { Layout, Grid } from 'antd';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const { Content } = Layout;
const { useBreakpoint } = Grid;

const AdminLayout = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const [collapsed, setCollapsed] = useState(isMobile);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      
      {/* SIDEBAR */}
      <AdminSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* MAIN LAYOUT */}
      <Layout>
        
        {/* HEADER */}
        <AdminHeader
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* CONTENT */}
        <Content
          style={{
            margin: 16,
            padding: 20,
            background: '#fff',
            borderRadius: 12,
            minHeight: 280,
            transition: 'all 0.2s'
          }}
        >
          <Outlet />
        </Content>

      </Layout>
    </Layout>
  );
};

export default AdminLayout;
