import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Statistic, DatePicker, Skeleton, Typography,
  Space, Alert, List, Badge, Tag, Button, Modal, Table, Grid, Select
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, ShoppingCartOutlined,
  DollarOutlined, FallOutlined, WarningOutlined
} from '@ant-design/icons';
import { Column, Pie, Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import { getDashboardStats } from '../../services/dashboardService';
import { getAllVariants } from '../../services/productService';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [dates, setDates] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [openLowStockModal, setOpenLowStockModal] = useState(false);
  const [allVariants, setAllVariants] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
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

  const fetchVariants = async () => {
    setVariantsLoading(true);
    try {
      const res = await getAllVariants({ limit: 100000 });
      const data = res.data.data || [];
      setAllVariants(data);

      // Lấy danh sách các mã hàng cha không trùng lặp
      const uniqueNames = Array.from(
        new Set(data.map((v) => v.productId?.name).filter(Boolean))
      );

      if (uniqueNames.length > 0) {
        // Chọn ngẫu nhiên tối đa 10 mã hàng làm mặc định
        const shuffled = [...uniqueNames].sort(() => 0.5 - Math.random());
        const random10 = shuffled.slice(0, 10);
        setSelectedProducts(random10);
      }
    } catch (error) {
      console.error("Lỗi tải thông tin tồn kho:", error);
    } finally {
      setVariantsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dates]);

  useEffect(() => {
    fetchVariants();
  }, []);

  // Tính toán giới hạn trục Y để tránh bị tràn/cắt cột và nhãn số tiền
  const minVal = stats ? Math.min(0, stats.revenue || 0, stats.importCost || 0, stats.profit || 0) : -1000000;
  const maxVal = stats ? Math.max(0, stats.revenue || 0, stats.importCost || 0, stats.profit || 0) : 1000000;
  const padMin = minVal < 0 ? minVal * 1.25 : 0;
  const padMax = maxVal > 0 ? maxVal * 1.25 : 1000000;

  // Cấu hình biểu đồ doanh thu & vốn (Cập nhật chuẩn Ant Design Plots)
  const lineConfig = {
    data: stats ? [
      { type: 'Doanh thu', value: stats.revenue || 0 },
      { type: 'Tiền vốn', value: stats.importCost || 0 },
      { type: 'Lợi nhuận', value: stats.profit || 0 },
    ] : [],
    xField: 'type',
    yField: 'value',
    point: {
      size: 5,
      shape: 'circle'
    },
    scale: {
      y: {
        domain: [padMin, padMax]
      }
    },
    label: {
      text: (d) => `${d.value.toLocaleString()}₫`,
      style: {
        fontWeight: 'bold',
        fill: '#595959',
        fontSize: 12
      }
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

  // Lọc ra danh sách các tên sản phẩm cha (mã hàng) không trùng lặp từ allVariants
  const productOptions = Array.from(
    new Set(allVariants.map((v) => v.productId?.name).filter(Boolean))
  ).map((name) => ({ label: name, value: name }));

  // Lọc dữ liệu biến thể theo mã hàng đã chọn
  const variantInventoryData = allVariants
    .filter((v) => selectedProducts.includes(v.productId?.name))
    .map((v) => ({
      sku: v.sku,
      inventory: v.inventory || 0,
      productName: v.productId?.name || 'N/A' // dùng làm nhóm màu
    }))
    .sort((a, b) => b.inventory - a.inventory); // sắp xếp tồn kho từ cao đến thấp

  const variantColumnConfig = {
    data: variantInventoryData,
    xField: 'sku',
    yField: 'inventory',
    colorField: 'productName',
    style: {
      radius: 4
    },
    label: {
      text: (d) => `${d.inventory.toLocaleString()}`,
      style: {
        fontWeight: 'bold',
        fill: '#595959',
        fontSize: 11
      }
    },
    legend: {
      color: {
        position: 'bottom',
        layout: { justifyContent: 'center' }
      }
    },
    tooltip: {
      items: [{ channel: 'y', valueFormatter: (v) => `${v.toLocaleString()} Cây` }]
    }
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
            <Card bordered="2px" className="shadow-sm">
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
            <Card bordered="2px" className="shadow-sm">
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
            <Card bordered="2px" className="shadow-sm">
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
            <Card bordered="2px" className="shadow-sm">
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
              <Line {...lineConfig} height={isMobile ? 250 : 350} />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              title="Top 5 sản phẩm bán chạy"
              bordered={false}
              extra={<ShoppingCartOutlined style={{ color: '#1677ff' }} />}
            >
              {stats?.topProducts?.length > 0 ? (
                <Pie {...pieConfig} height={isMobile ? 250 : 350} />
              ) : (
                <div style={{ padding: '80px 0', textAlign: 'center', color: '#8c8c8c', height: isMobile ? 250 : 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text type="secondary">Không có dữ liệu bán hàng trong kỳ</Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card
              title="Thống kê tồn kho theo biến thể"
              bordered={false}
              extra={
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: isMobile ? '100%' : 400 }}
                  placeholder="Chọn mã hàng (sản phẩm)..."
                  options={productOptions}
                  value={selectedProducts}
                  onChange={(vals) => setSelectedProducts(vals)}
                  loading={variantsLoading}
                  maxTagCount="responsive"
                />
              }
            >
              {selectedProducts.length > 0 ? (
                <Column {...variantColumnConfig} height={isMobile ? 250 : 350} />
              ) : (
                <div style={{ padding: '60px 0', textAlign: 'center', color: '#8c8c8c' }}>
                  <Text type="secondary" style={{ fontSize: '15px' }}>
                    Vui lòng chọn một hoặc nhiều mã hàng ở hộp chọn bên phải để hiển thị biểu đồ tồn kho.
                  </Text>
                </div>
              )}
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