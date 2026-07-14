import React, { useEffect, useState, useRef } from 'react';
import debounce from 'lodash/debounce';
import {
    Table, Tag, Button, Space, Modal, Form, Grid,
    InputNumber, Input, message, Progress, Typography, Timeline, Card, Row, Col
} from 'antd';
import { DollarOutlined, HistoryOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
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

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalRemaining, setTotalRemaining] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [keyword, setKeyword] = useState('');

    const screens = useBreakpoint();
    const isMobile = !screens.md;

    /* ================= FETCH DATA ================= */
    const fetchDebts = async (currentPage = page, currentPageSize = pageSize, searchKeyword = keyword) => {
        setLoading(true);
        try {
            const res = await getDebts({ page: currentPage, limit: currentPageSize, keyword: searchKeyword });
            setDebts(res.data.data);
            setTotal(res.data.total || 0);
            setTotalRemaining(res.data.totalRemaining || 0);
            setTotalPaid(res.data.totalPaid || 0);
        } catch (err) {
            message.error('Không thể tải danh sách công nợ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts(page, pageSize, keyword);
    }, [page, pageSize]);

    const debounceSearch = useRef(
        debounce((value) => {
            const trimmed = value.trim();
            setPage((prevPage) => {
                if (prevPage === 1) {
                    fetchDebts(1, pageSize, trimmed);
                }
                return 1;
            });
        }, 400)
    ).current;

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
            width: 160,
            render: (text) => <b style={{ whiteSpace: 'nowrap' }}>{text}</b>
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 250,
            render: (_, record) => (
                <Space direction="vertical" size={0} style={{ whiteSpace: 'nowrap' }}>
                    <Text strong>{record.customerName}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.customerPhone}</Text>
                </Space>
            )
        },
        {
            title: 'Tổng nợ',
            dataIndex: 'totalAmount',
            width: 120,
            render: (val) => <span style={{ whiteSpace: 'nowrap' }}>{val.toLocaleString()}₫</span>
        },
        {
            title: 'Tiến độ thanh toán',
            key: 'progress',
            width: 200,
            render: (_, record) => {
                const percent = Math.round((record.paidAmount / record.totalAmount) * 100);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
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
            width: 140,
            sorter: (a, b) => a.remainingAmount - b.remainingAmount,
            render: (val) => <span style={{ whiteSpace: 'nowrap' }}><Text type="danger" strong>{val.toLocaleString()}₫</Text></span>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            render: (status) => {
                const config = {
                    UNPAID: { color: 'red', text: 'Chưa trả' },
                    PARTIAL: { color: 'orange', text: 'Trả một phần' },
                    COMPLETED: { color: 'green', text: 'Hoàn thành' },
                    CANCELLED: { color: 'default', text: 'Đã hủy phiếu' }
                };
                return <span style={{ whiteSpace: 'nowrap' }}><Tag color={config[status]?.color}>{config[status]?.text}</Tag></span>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 180,
            render: (_, record) => (
                <Space style={{ whiteSpace: 'nowrap' }}>
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
                    <Col xs={24} sm={12}>
                        <Card variant="borderless" style={{ background: '#fff7e6' }}>
                            <Text type="secondary">Tổng công nợ chưa thu</Text>
                            <Title level={4} style={{ margin: 0, color: '#fa8c16' }}>
                                {totalRemaining.toLocaleString()}₫
                            </Title>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card variant="borderless" style={{ background: '#f6ffed' }}>
                            <Text type="secondary">Tổng công nợ đã thu</Text>
                            <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                                {totalPaid.toLocaleString()}₫
                            </Title>
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* FILTER BAR */}
            <div className="mb-4">
                <Input
                    placeholder="Tìm theo mã phiếu, tên hoặc số điện thoại khách hàng..."
                    prefix={<SearchOutlined />}
                    allowClear
                    value={keyword}
                    onChange={(e) => {
                        const val = e.target.value;
                        setKeyword(val);
                        debounceSearch(val);
                    }}
                    style={{ width: '100%', borderRadius: '20px' }}
                />
            </div>

            {!isMobile ? (
                <Table
                    className="no-wrap-table"
                    dataSource={debts}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        onChange: (p, ps) => {
                            setPage(p);
                            setPageSize(ps);
                        }
                    }}
                    scroll={{ x: 'max-content' }}
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

                    {/* Mobile Pagination */}
                    <div className="flex justify-center gap-3 pt-4">
                        <Button
                            disabled={page === 1}
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        >
                            Trước
                        </Button>

                        <span className="self-center text-sm">
                            Trang {page} / {Math.ceil(total / pageSize) || 1}
                        </span>

                        <Button
                            disabled={page * pageSize >= total}
                            onClick={() => setPage(prev => prev + 1)}
                        >
                            Sau
                        </Button>
                    </div>
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

            <style dangerouslySetInnerHTML={{
                __html: `
                    .no-wrap-table .ant-table-cell {
                        white-space: nowrap !important;
                    }
                `
            }} />
        </div>
    );
};

export default Debts;