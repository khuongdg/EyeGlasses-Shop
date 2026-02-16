import { useEffect, useState, useRef } from 'react';
import {
    Table,
    Button,
    Input,
    Modal,
    Form,
    message,
    Tag,
    Space,
    Select,
    Grid
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
    getStaffs,
    searchStaffs,
    createStaff,
    updateStaff,
    deleteStaff,
    restoreStaff
} from '../../services/staffService';

const Staff = () => {
    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(null);

    const [searchKeyword, setSearchKeyword] = useState('');

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    const [form] = Form.useForm();

    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    /* ================= FETCH ================= */
    const fetchStaffs = async ({
        keyword = '',
        page = pagination.current,
        pageSize = pagination.pageSize,
        isActive
    } = {}) => {
        setLoading(true);
        try {
            const res = keyword
                ? await searchStaffs({
                    keyword,
                    page,
                    limit: pageSize,
                    isActive
                })
                : await getStaffs({
                    page,
                    limit: pageSize,
                    isActive
                });

            setStaffs(res.data.data);
            setPagination({
                current: page,
                pageSize,
                total: res.data.total
            });
        } catch (err) {
            console.error(err);
            message.error('Không tải được nhân viên');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffs({ page: 1, pageSize: pagination.pageSize });
    }, []);

    /* ================= DEBOUNCE SEARCH ================= */
    const debounceSearch = useRef(
        debounce((value) => {
            const keyword = value.trim();
            setSearchKeyword(keyword);
            fetchStaffs({
                keyword,
                page: 1,
                pageSize: pagination.pageSize
            });
        }, 400)
    ).current;

    /* ================= CREATE / UPDATE ================= */
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (editing) {
                await updateStaff(editing._id, values);
                message.success('Cập nhật nhân viên thành công');
            } else {
                await createStaff(values);
                message.success('Tạo nhân viên thành công');
            }

            setOpenModal(false);
            setEditing(null);
            form.resetFields();
            fetchStaffs(searchKeyword, pagination.current, pagination.pageSize);
        } catch (err) {
            message.error(err.response?.data?.message || 'Thao tác thất bại');
        }
    };

    /* ================= DELETE / RESTORE ================= */
    const handleDelete = async (id) => {
        await deleteStaff(id);
        message.success('Đã xoá nhân viên');
        fetchStaffs(searchKeyword, pagination.current, pagination.pageSize);
    };

    const handleRestore = async (id) => {
        await restoreStaff(id);
        message.success('Đã khôi phục nhân viên');
        fetchStaffs(searchKeyword, pagination.current, pagination.pageSize);
    };

    const highlightText = (text = '', keyword = '') => {
        if (!keyword) return text;

        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.split(regex).map((part, index) =>
            part.toLowerCase() === keyword.toLowerCase() ? (
                <span
                    key={index}
                    className="bg-yellow-300 px-1 font-semibold rounded"
                >
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    /* ================= TABLE ================= */
    const columns = [
        {
            title: 'Mã NV',
            dataIndex: 'staffCode'
        },
        {
            title: 'Tên nhân viên',
            dataIndex: 'name',
            render: (text) => highlightText(text, searchKeyword)
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            render: (text) => highlightText(text, searchKeyword)
        },
        {
            title: 'Email',
            dataIndex: 'email'
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address'
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            filters: [
                { text: 'Active', value: true },
                { text: 'Inactive', value: false }
            ],
            render: (val) =>
                val ? (
                    <Tag color="green">Active</Tag>
                ) : (
                    <Tag color="red">Inactive</Tag>
                )
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        disabled={!record.isActive}
                        onClick={() => {
                            setEditing(record);
                            form.setFieldsValue(record);
                            setOpenModal(true);
                        }}
                    >
                        Sửa
                    </Button>

                    {record.isActive ? (
                        <Button danger size="small" onClick={() => handleDelete(record._id)}>
                            Xoá
                        </Button>
                    ) : (
                        <Button
                            size="small"
                            type="dashed"
                            onClick={() => handleRestore(record._id)}
                        >
                            Khôi phục
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <Input
                    placeholder="Tìm theo tên / SĐT"
                    allowClear
                    className="w-full sm:w-72"
                    onChange={(e) => debounceSearch(e.target.value)}
                />

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditing(null);
                        form.resetFields();
                        setOpenModal(true);
                    }}
                >
                    Thêm nhân viên
                </Button>
            </div>

            {/* TABLE */}
            {screens.sm ? (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={staffs}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true
                    }}
                    onChange={(tablePagination, filters) => {
                        fetchStaffs({
                            keyword: searchKeyword,
                            page: tablePagination.current,
                            pageSize: tablePagination.pageSize,
                            isActive: filters.isActive?.[0]
                        });
                    }}
                />
            ) : (
                <div className="space-y-3">
                    {staffs.map((staff) => (
                        <div
                            key={staff._id}
                            className="border rounded-lg p-4 shadow-sm bg-white"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base">
                                        {highlightText(staff.name, searchKeyword)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Mã NV: {staff.staffCode}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {highlightText(staff.phone, searchKeyword)}
                                    </div>
                                </div>

                                <Tag color={staff.isActive ? 'green' : 'red'}>
                                    {staff.isActive ? 'Active' : 'Inactive'}
                                </Tag>
                            </div>

                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                                {staff.email && <div>Email: {staff.email}</div>}
                                {staff.address && <div>Địa chỉ: {staff.address}</div>}
                            </div>

                            <div className="mt-3 flex gap-2 flex-wrap">
                                <Button
                                    size="small"
                                    disabled={!staff.isActive}
                                    onClick={() => {
                                        setEditing(staff);
                                        form.setFieldsValue(staff);
                                        setOpenModal(true);
                                    }}
                                >
                                    Sửa
                                </Button>

                                {staff.isActive ? (
                                    <Button
                                        danger
                                        size="small"
                                        onClick={() => handleDelete(staff._id)}
                                    >
                                        Xoá
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        type="dashed"
                                        onClick={() => handleRestore(staff._id)}
                                    >
                                        Khôi phục
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Mobile Pagination */}
                    <div className="flex justify-center gap-3 pt-2">
                        <Button
                            disabled={pagination.current === 1}
                            onClick={() =>
                                fetchStaffs({
                                    keyword: searchKeyword,
                                    page: pagination.current - 1,
                                    pageSize: pagination.pageSize
                                })
                            }
                        >
                            Trước
                        </Button>

                        <span className="self-center text-sm">
                            Trang {pagination.current}
                        </span>

                        <Button
                            disabled={
                                pagination.current * pagination.pageSize >= pagination.total
                            }
                            onClick={() =>
                                fetchStaffs({
                                    keyword: searchKeyword,
                                    page: pagination.current + 1,
                                    pageSize: pagination.pageSize
                                })
                            }
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}


            {/* MODAL */}
            <Modal
                title={editing ? 'Cập nhật nhân viên' : 'Tạo nhân viên'}
                open={openModal}
                onOk={handleSubmit}
                onCancel={() => setOpenModal(false)}
                okText="Lưu"
                cancelText="Huỷ"
                width="90%"
                style={{ maxWidth: 600 }}
            >
                <Form layout="vertical" form={form}>
                    <Form.Item
                        label="Tên nhân viên"
                        name="name"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Số điện thoại"
                        name="phone"
                        rules={[
                            { required: true },
                            {
                                pattern: /^0\d{9}$/,
                                message: 'SĐT phải gồm 10 chữ số và bắt đầu bằng 0'
                            }
                        ]}
                    >
                        <Input maxLength={10} />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ type: 'email' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Địa chỉ"
                        name="address"
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Staff;
