import React, { useEffect, useState } from 'react';
import {
    Table, Tag, Button, Space, Modal, Form, Grid,
    InputNumber, Input, message, Progress, Typography, Timeline, Card, Row, Col
} from 'antd';
import { DollarOutlined, HistoryOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getDebts, payDebt } from '../../services/invoiceService';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const Debts = () => {
    const [loading, setLoading] = useState(false);
    const [debts, setDebts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [form] = Form.useForm();

    const screens = useBreakpoint();
    const isMobile = !screens.md;

    /* ================= FETCH DATA ================= */
    const fetchDebts = async () => {
        setLoading(true);
        try {
            const res = await getDebts(); // Thay bằng endpoint thật
            setDebts(res.data.data);
        } catch (err) {
            message.error('Không thể tải danh sách công nợ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    /* ================= HANDLERS ================= */
    const handlePayment = async (values) => {
        try {
            await payDebt(selectedDebt._id, values);
            message.success('Ghi nhận thanh toán thành công');
            setIsModalOpen(false);
            form.resetFields();
            fetchDebts();
        } catch (err) {
            message.error(err.response?.data?.message || 'Thanh toán thất bại');
        }
    };

    /* ================= TABLE COLUMNS ================= */
    const columns = [
        {
            title: 'Mã phiếu',
            dataIndex: ['invoiceId', 'invoiceCode'],
            key: 'invoiceCode',
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.customerName}</Text>
                    <Text type="secondary" size="small">{record.customerPhone}</Text>
                </Space>
            )
        },
        {
            title: 'Tổng nợ',
            dataIndex: 'totalAmount',
            render: (val) => val.toLocaleString() + '₫'
        },
        {
            title: 'Tiến độ thanh toán',
            key: 'progress',
            width: 250,
            render: (_, record) => {
                const percent = Math.round((record.paidAmount / record.totalAmount) * 100);
                return (
                    <div style={{ width: '100%' }}>
                        <Progress
                            percent={percent}
                            size="small"
                            status={record.status === 'COMPLETED' ? 'success' : 'active'}
                        />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                            Đã trả: {record.paidAmount.toLocaleString()}₫
                        </Text>
                    </div>
                );
            }
        },
        {
            title: 'Còn lại',
            dataIndex: 'remainingAmount',
            render: (val) => <Text type="danger" strong>{val.toLocaleString()}₫</Text>,
            sorter: (a, b) => a.remainingAmount - b.remainingAmount
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (status) => {
                const config = {
                    UNPAID: { color: 'red', text: 'Chưa trả' },
                    PARTIAL: { color: 'orange', text: 'Trả một phần' },
                    COMPLETED: { color: 'green', text: 'Hoàn thành' },
                    CANCELLED: { color: 'default', text: 'Đã hủy phiếu' }
                };
                return <Tag color={config[status]?.color}>{config[status]?.text}</Tag>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status !== 'COMPLETED' && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<DollarOutlined />}
                            onClick={() => {
                                setSelectedDebt(record);
                                setIsModalOpen(true);
                            }}
                        >
                            Thu tiền
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<HistoryOutlined />}
                        onClick={() => {
                            setSelectedDebt(record);
                            setIsHistoryOpen(true);
                        }}
                    >
                        Lịch sử
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={3}>Quản lý Công nợ</Title>

            <Card style={{ marginBottom: 20 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                        <Card variant="borderless" style={{ background: '#fff7e6' }}>
                            <Text type="secondary">Tổng công nợ chưa thu</Text>
                            <Title level={4} style={{ margin: 0, color: '#fa8c16' }}>
                                {(Array.isArray(debts) ? debts : []).reduce((sum, d) => sum + (d.remainingAmount || 0), 0).toLocaleString()}₫
                            </Title>
                        </Card>
                    </Col>
                </Row>
            </Card>

            {!isMobile ? (
                <Table
                    dataSource={debts}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            ) : (
                <div className="space-y-3">
                    {debts.map((record) => {
                        const percent = Math.round((record.paidAmount / record.totalAmount) * 100);

                        const statusConfig = {
                            UNPAID: { color: 'red', text: 'Chưa trả' },
                            PARTIAL: { color: 'orange', text: 'Trả một phần' },
                            COMPLETED: { color: 'green', text: 'Hoàn thành' },
                            CANCELLED: { color: 'default', text: 'Đã hủy phiếu' }
                        };

                        return (
                            <div
                                key={record._id}
                                className="border rounded-lg p-4 shadow-sm bg-white"
                            >
                                <div className="flex justify-between mb-2">
                                    <Text strong>{record.invoiceId?.invoiceCode}</Text>
                                    <Tag color={statusConfig[record.status]?.color}>
                                        {statusConfig[record.status]?.text}
                                    </Tag>
                                </div>

                                <div className="text-sm mb-2">
                                    <div><b>{record.customerName}</b></div>
                                    <div className="text-gray-500">{record.customerPhone}</div>
                                </div>

                                <div className="mb-2">
                                    <Progress
                                        percent={percent}
                                        size="small"
                                        status={record.status === 'COMPLETED' ? 'success' : 'active'}
                                    />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Đã trả: {record.paidAmount.toLocaleString()}₫
                                    </Text>
                                </div>

                                <div className="flex justify-between mb-3">
                                    <div>
                                        <Text type="secondary">Còn lại</Text><br />
                                        <Text type="danger" strong>
                                            {record.remainingAmount.toLocaleString()}₫
                                        </Text>
                                    </div>
                                    <div>
                                        <Text type="secondary">Tổng nợ</Text><br />
                                        <Text>
                                            {record.totalAmount.toLocaleString()}₫
                                        </Text>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {record.status !== 'COMPLETED' && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            block
                                            icon={<DollarOutlined />}
                                            onClick={() => {
                                                setSelectedDebt(record);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            Thu tiền
                                        </Button>
                                    )}

                                    <Button
                                        size="small"
                                        block
                                        icon={<HistoryOutlined />}
                                        onClick={() => {
                                            setSelectedDebt(record);
                                            setIsHistoryOpen(true);
                                        }}
                                    >
                                        Lịch sử
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* MODAL THU TIỀN */}
            <Modal
                title="Ghi nhận thu tiền nợ"
                width={isMobile ? '100%' : 520}
                style={isMobile ? { top: 0 } : {}}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
            >
                {selectedDebt && (
                    <div style={{ marginBottom: 20, padding: 10, background: '#fafafa' }}>
                        <Text>Đang thu nợ cho phiếu: <b>{selectedDebt.invoiceId?.invoiceCode}</b></Text><br />
                        <Text>Số tiền còn lại: <b style={{ color: 'red' }}>{selectedDebt.remainingAmount.toLocaleString()}₫</b></Text>
                    </div>
                )}
                <Form form={form} layout="vertical" onFinish={handlePayment}>
                    <Form.Item
                        name="amount"
                        label="Số tiền thu đợt này"
                        rules={[
                            { required: true, message: 'Nhập số tiền' },
                            { type: 'number', max: selectedDebt?.remainingAmount, message: 'Không vượt quá số nợ' }
                        ]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={v => v.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="₫"
                        />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea placeholder="Ví dụ: Khách trả qua chuyển khoản Vietcombank..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL LỊCH SỬ TRẢ NỢ */}
            <Modal
                title="Lịch sử thanh toán"
                open={isHistoryOpen}
                onCancel={() => setIsHistoryOpen(false)}
                footer={null}
                width={isMobile ? '100%' : 600}
                style={isMobile ? { top: 0 } : {}}
            >
                <Timeline style={{ marginTop: 20 }}>
                    {selectedDebt?.paymentHistory?.length > 0 ? (
                        selectedDebt.paymentHistory.map((h, i) => (
                            <Timeline.Item key={i} color="green">
                                <Text strong>{new Date(h.paymentDate).toLocaleString()}</Text> <br />
                                <Text>Đã nộp: <b style={{ color: '#52c41a' }}>{h.amount.toLocaleString()}₫</b></Text> <br />
                                <Text type="secondary">Nội dung: {h.note || 'Không có ghi chú'}</Text>
                            </Timeline.Item>
                        ))
                    ) : (
                        <Text type="secondary">Chưa có lịch sử thanh toán nào.</Text>
                    )}
                    {selectedDebt?.status === 'COMPLETED' && (
                        <Timeline.Item dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />} color="green">
                            <Text strong>Đã hoàn thành thanh toán</Text>
                        </Timeline.Item>
                    )}
                </Timeline>
            </Modal>
        </div>
    );
};

export default Debts;