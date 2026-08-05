import React from 'react';
import { Modal, Table, Button, Space, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const InvoiceDraftListModal = ({
    isDraftListModalOpen,
    setIsDraftListModalOpen,
    draftsList,
    handleEditDraft,
    handleDeleteDraft
}) => {
    return (
        <Modal
            title={<span className="font-bold text-gray-800">Danh sách phiếu nháp</span>}
            open={isDraftListModalOpen}
            onCancel={() => setIsDraftListModalOpen(false)}
            width={850}
            centered
            footer={[
                <Button key="close" className="rounded-full" onClick={() => setIsDraftListModalOpen(false)}>
                    Đóng
                </Button>
            ]}
        >
            <div className="my-4">
                <Table
                    rowKey={record => record._id || record.id}
                    dataSource={draftsList}
                    locale={{ emptyText: 'Chưa có phiếu nháp nào được lưu' }}
                    scroll={{ x: 'max-content' }}
                    columns={[
                        {
                            title: 'Thời gian lưu',
                            dataIndex: 'updatedAt',
                            key: 'updatedAt',
                            width: 150,
                            className: 'whitespace-nowrap',
                            render: (v) => {
                                if (!v) return <span className="text-gray-400">—</span>;
                                const d = new Date(v);
                                return (
                                    <span className="font-mono text-xs text-gray-500">
                                        {isNaN(d) ? v : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                );
                            }
                        },
                        {
                            title: 'Khách hàng',
                            dataIndex: 'customerName',
                            key: 'customerName',
                            className: 'whitespace-nowrap',
                            render: (name) => <span className="font-medium text-gray-800">{name || 'Chưa chọn'}</span>
                        },
                        {
                            title: 'Nhân viên',
                            dataIndex: 'staffName',
                            key: 'staffName',
                            className: 'whitespace-nowrap',
                            render: (name) => <span className="text-gray-600">{name || 'Chưa chọn'}</span>
                        },
                        {
                            title: 'Số sản phẩm',
                            dataIndex: 'items',
                            key: 'items',
                            width: 120,
                            className: 'whitespace-nowrap',
                            render: (items) => <span>{(items || []).length} sản phẩm</span>
                        },
                        {
                            title: 'Tạm tính',
                            dataIndex: 'subTotal',
                            key: 'subTotal',
                            width: 130,
                            className: 'whitespace-nowrap',
                            render: (val) => <span className="font-semibold text-gray-800">{(val || 0).toLocaleString()}₫</span>
                        },
                        {
                            title: 'Hành động',
                            key: 'action',
                            width: 150,
                            align: 'center',
                            className: 'whitespace-nowrap',
                            render: (_, record) => (
                                <Space size="small">
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => handleEditDraft(record)}
                                    >
                                        Sửa tiếp
                                    </Button>
                                    <Popconfirm
                                        title="Xóa bản nháp?"
                                        description="Hành động này không thể hoàn tác!"
                                        onConfirm={() => handleDeleteDraft(record._id || record.id)}
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                </Space>
                            )
                        }
                    ]}
                />
            </div>
        </Modal>
    );
};

export default InvoiceDraftListModal;
