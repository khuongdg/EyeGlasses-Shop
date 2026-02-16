import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Statistic, DatePicker, Skeleton, Typography,
  Space, Alert, List, Badge, Tag, Button, Modal, Table, Grid
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, ShoppingCartOutlined,
  DollarOutlined, FallOutlined, WarningOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import { getDashboardStats } from '../../services/dashboardService';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [dates, setDates] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [openLowStockModal, setOpenLowStockModal] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
      // Đảm bảo lấy đúng data từ response cấu trúc { data: { data: { ... } } }
      setStats(res.data.data);
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dates]);

  // Cấu hình biểu đồ doanh thu & vốn (Cập nhật chuẩn Ant Design Plots)
  const columnConfig = {
    data: stats ? [
      { type: 'Doanh thu', value: stats.revenue || 0 },
      { type: 'Tiền vốn', value: stats.importCost || 0 },
      { type: 'Lợi nhuận', value: stats.profit || 0 },
    ] : [],
    xField: 'type',
    yField: 'value',
    colorField: 'type',
    scale: {
      color: { range: ['#1677ff', '#ff4d4f', '#52c41a'] }
    },
    label: {
      text: (d) => `${d.value.toLocaleString()}₫`,
      position: 'top',
      style: { fontWeight: 'bold' }
    },
    tooltip: {
      items: [{ channel: 'y', valueFormatter: (v) => `${v.toLocaleString()}₫` }]
    }
  };

  // Cấu hình biểu đồ top sản phẩm
  const pieConfig = {
    data: stats?.topProducts || [],
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    label: { text: 'value', position: 'outside' },
    legend: { color: { position: 'bottom', layout: { justifyContent: 'center' } } },
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row
        justify="space-between"
        align="middle"
        gutter={[16, 16]}
        style={{ marginBottom: 24 }}
      >
        <Col xs={24} md="auto">
          <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>
            Tổng quan kinh doanh
          </Title>
        </Col>

        <Col xs={24} md="auto">
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            <Text strong>Khoảng thời gian:</Text>
            <RangePicker
              style={{ width: isMobile ? '100%' : 'auto' }}
              value={dates}
              onChange={(vals) => setDates(vals)}
              allowClear={false}
            />
          </Space>
        </Col>
      </Row>

      <Skeleton loading={loading} active>
        {/* Cảnh báo tồn kho rút gọn */}
        {stats?.lowStockList?.length > 0 && (
          <Alert
            type="warning"
            closable
            style={{ marginBottom: 24, borderRadius: '8px' }}
            message={
              <Space
                direction={isMobile ? "vertical" : "horizontal"}
                align={isMobile ? "start" : "center"}
                style={{ width: '100%' }}
              >
                <Space align="center">
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text strong>Cảnh báo tồn kho:</Text>
                </Space>

                <Text>
                  Có {stats.lowStockList.length} sản phẩm sắp hết hàng (tồn dưới 5)!
                </Text>

                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => setOpenLowStockModal(true)}
                >
                  Xem danh sách chi tiết
                </Button>
              </Space>
            }
          />
        )}

        {/* Các chỉ số tổng quát */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="shadow-sm">
              <Statistic
                title="Doanh thu thực thu"
                value={stats?.revenue || 0}
                precision={0}
                valueStyle={{ color: '#3f8600' }}
                prefix={<DollarOutlined />}
                suffix="₫"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="shadow-sm">
              <Statistic
                title="Vốn nhập hàng đã chi"
                value={stats?.importCost || 0}
                precision={0}
                valueStyle={{ color: '#cf1322' }}
                prefix={<FallOutlined />}
                suffix="₫"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="shadow-sm">
              <Statistic
                title="Lợi nhuận gộp"
                value={stats?.profit || 0}
                precision={0}
                valueStyle={{ color: (stats?.profit || 0) >= 0 ? '#1677ff' : '#cf1322' }}
                prefix={(stats?.profit || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix="₫"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className="shadow-sm">
              <Statistic
                title="Số phiếu bán hàng"
                value={stats?.totalSalesCount || 0}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Phân tích Tài chính" bordered={false}>
              <Column {...columnConfig} height={isMobile ? 250 : 350} />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              title="Top 5 sản phẩm bán chạy"
              bordered={false}
              extra={<ShoppingCartOutlined style={{ color: '#1677ff' }} />}
            >
              <Pie {...pieConfig} height={isMobile ? 250 : 350} />
            </Card>
          </Col>
        </Row>


        {/* Modal chi tiết sản phẩm sắp hết hàng */}
        <Modal
          title={<Space><WarningOutlined style={{ color: '#faad14' }} /> Danh sách sản phẩm sắp hết hàng</Space>}
          open={openLowStockModal}
          onCancel={() => setOpenLowStockModal(false)}
          footer={[<Button key="close" onClick={() => setOpenLowStockModal(false)}>Đóng</Button>]}
          width={isMobile ? '100%' : 800}
        >
          <Table
            dataSource={stats?.lowStockList}
            scroll={{ x: 600 }}
            rowKey="sku"
            columns={[
              { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
              { title: 'Mã SKU', dataIndex: 'sku', key: 'sku', render: (text) => <Tag>{text}</Tag> },
              {
                title: 'Tồn kho hiện tại',
                dataIndex: 'inventory',
                key: 'inventory',
                align: 'center',
                render: (val) => <Text strong type="danger">{val}</Text>,
                sorter: (a, b) => a.inventory - b.inventory
              },
              { title: 'Đơn vị', dataIndex: 'unit', key: 'unit' }
            ]}
            pagination={{ pageSize: 8 }}
            size="middle"
          />
        </Modal>
      </Skeleton>
    </div>
  );
};

export default Dashboard;