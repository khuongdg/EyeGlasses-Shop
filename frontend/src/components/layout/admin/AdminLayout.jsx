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
    <Layout style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* SIDEBAR */}
      <AdminSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Backdrop overlay on mobile when sidebar is open */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(129, 125, 125, 0.1)',
            zIndex: 999, // Just below Sider (zIndex: 1000)
            transition: 'opacity 0.2s',
          }}
        />
      )}

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
