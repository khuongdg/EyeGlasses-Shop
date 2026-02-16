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
  Grid
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
  getCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer
} from '../../services/customerService';

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState('');

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();


  const [form] = Form.useForm();

  /* ================= FETCH ================= */
  const fetchCustomers = async (
    keyword = '',
    page = pagination.current,
    pageSize = pagination.pageSize
  ) => {
    setLoading(true);
    try {
      const res = keyword
        ? await searchCustomers({ keyword, page, limit: pageSize })
        : await getCustomers({ page, limit: pageSize });

      setCustomers(res.data.data);
      setPagination({
        current: page,
        pageSize,
        total: res.data.total
      });
    } catch (err) {
      console.error(err);
      message.error('Không tải được khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers('', 1, pagination.pageSize);
  }, []);

  /* ================= DEBOUNCE SEARCH ================= */
  const debounceSearch = useRef(
    debounce((value) => {
      const keyword = value.trim();
      setSearchKeyword(keyword);
      fetchCustomers(keyword, 1, pagination.pageSize);
    }, 400)
  ).current;

  /* ================= CREATE / UPDATE ================= */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editing) {
        await updateCustomer(editing._id, values);
        message.success('Cập nhật khách hàng thành công');
      } else {
        await createCustomer(values);
        message.success('Tạo khách hàng thành công');
      }

      setOpenModal(false);
      setEditing(null);
      form.resetFields();
      fetchCustomers(searchKeyword, pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  /* ================= DELETE / RESTORE ================= */
  const handleDelete = async (id) => {
    await deleteCustomer(id);
    message.success('Đã xoá khách hàng');
    fetchCustomers(searchKeyword, pagination.current, pagination.pageSize);
  };

  const handleRestore = async (id) => {
    await restoreCustomer(id);
    message.success('Đã khôi phục khách hàng');
    fetchCustomers(searchKeyword, pagination.current, pagination.pageSize);
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
      title: 'Tên khách hàng',
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
      title: 'Mã số thuế',
      dataIndex: 'taxCode'
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      render: (val) =>
        val ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
    },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space wrap>
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
          Thêm khách hàng
        </Button>
      </div>

      {/* TABLE */}
      {screens.sm ? (
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={customers}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              fetchCustomers(searchKeyword, page, pageSize);
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <div
              key={customer._id}
              className="border rounded-lg p-4 shadow-sm bg-white"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base">
                    {highlightText(customer.name, searchKeyword)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {highlightText(customer.phone, searchKeyword)}
                  </div>
                </div>

                <Tag color={customer.isActive ? 'green' : 'red'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Tag>
              </div>

              <div className="mt-2 text-sm text-gray-600 space-y-1">
                {customer.email && <div>Email: {customer.email}</div>}
                {customer.taxCode && <div>MST: {customer.taxCode}</div>}
                {customer.address && <div>Địa chỉ: {customer.address}</div>}
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <Button
                  size="small"
                  disabled={!customer.isActive}
                  onClick={() => {
                    setEditing(customer);
                    form.setFieldsValue(customer);
                    setOpenModal(true);
                  }}
                >
                  Sửa
                </Button>

                {customer.isActive ? (
                  <Button
                    danger
                    size="small"
                    onClick={() => handleDelete(customer._id)}
                  >
                    Xoá
                  </Button>
                ) : (
                  <Button
                    size="small"
                    type="dashed"
                    onClick={() => handleRestore(customer._id)}
                  >
                    Khôi phục
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination cho mobile */}
          <div className="flex justify-center pt-2">
            <Button
              disabled={pagination.current === 1}
              onClick={() =>
                fetchCustomers(
                  searchKeyword,
                  pagination.current - 1,
                  pagination.pageSize
                )
              }
            >
              Previous
            </Button>

            <span className="px-4 self-center text-sm">
              Trang {pagination.current}
            </span>

            <Button
              disabled={
                pagination.current * pagination.pageSize >= pagination.total
              }
              onClick={() =>
                fetchCustomers(
                  searchKeyword,
                  pagination.current + 1,
                  pagination.pageSize
                )
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* MODAL */}
      <Modal
        title={editing ? 'Cập nhật khách hàng' : 'Tạo khách hàng'}
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
            label="Tên khách hàng"
            name="name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              {
                pattern: /^0\d{9}$/,
                message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'
              }
            ]}
          >
            <Input
              placeholder="0xxxxxxxxx"
              maxLength={10}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
              }}
            />
          </Form.Item>


          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                type: 'email',
                message: 'Email không đúng định dạng'
              }
            ]}
          >
            <Input placeholder="example@email.com" />
          </Form.Item>


          <Form.Item label="Mã số thuế" name="taxCode">
            <Input />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customer;
