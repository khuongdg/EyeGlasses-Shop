import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  Table,
  Button,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tag,
  Space,
  Grid,
  Upload,
  Dropdown,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  FileExcelOutlined,
  SearchOutlined,
  DownloadOutlined,
  DownOutlined
} from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
  getCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  aiBulkImport
} from '../../services/customerService';

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();

  const [form] = Form.useForm();
  const [importLoading, setImportLoading] = useState(false);

  /* ================= FETCH ================= */
  const fetchCustomers = async (
    keyword = searchKeyword,
    page = pagination.current,
    pageSize = pagination.pageSize,
    status = statusFilter
  ) => {
    setLoading(true);
    try {
      const isActiveVal = status === 'ACTIVE' ? true : (status === 'INACTIVE' ? false : undefined);
      const res = await getCustomers({ keyword, page, limit: pageSize, isActive: isActiveVal });

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
    fetchCustomers('', 1, pagination.pageSize, statusFilter);
  }, [statusFilter]);

  /* ================= DOWNLOAD TEMPLATE EXCEL ================= */
  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // SHEET 1: ĐIỀN DỮ LIỆU KHÁCH HÀNG
      const worksheet1 = workbook.addWorksheet('Template_KhachHang');
      worksheet1.columns = [
        { header: 'Tên khách hàng', key: 'name', width: 25 },
        { header: 'Số điện thoại', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Mã số thuế', key: 'taxCode', width: 18 },
        { header: 'Địa chỉ', key: 'address', width: 35 },
      ];
      worksheet1.spliceRows(1, 1);

      const headerRow = worksheet1.addRow([
        'Tên khách hàng',
        'Số điện thoại',
        'Email',
        'Mã số thuế',
        'Địa chỉ'
      ]);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        cell.font = { name: 'Arial', bold: true, color: { argb: 'FF006100' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      headerRow.height = 25;

      const sampleData = [
        ['Nguyễn Văn A', '0901234567', 'nguyenvana@gmail.com', '0312345678', '123 Nguyễn Trãi, Q.5, TP.HCM'],
        ['Trần Thị B', '0987654321', 'tranthib@gmail.com', '', '456 Lê Hồng Phong, Q.10, TP.HCM'],
        ['Mắt Kính Việt Long', '0912345678', 'contact@vietlong.com', '0309876543', '789 Trần Hưng Đạo, Tây Ninh']
      ];

      sampleData.forEach((row) => {
        const r = worksheet1.addRow(row);
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(4).alignment = { horizontal: 'center' };
        r.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // SHEET 2: HƯỚNG DẪN & LƯU Ý
      const worksheet2 = workbook.addWorksheet('Hướng_Dẫn_Lưu_Ý');
      worksheet2.columns = [
        { width: 28 },
        { width: 75 }
      ];

      const guideTitle = worksheet2.addRow(['QUY ĐỊNH & HƯỚNG DẪN NHẬP FILE KHÁCH HÀNG (IMPORT EXCEL)']);
      worksheet2.mergeCells('A1:B1');
      guideTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1D6F42' } };
      guideTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      guideTitle.height = 35;
      worksheet2.addRow([]);

      const guidelines = [
        ['1. Tên khách hàng:', 'Bắt buộc phải điền tên khách hàng hoặc tên công ty.'],
        ['2. Số điện thoại:', 'Bắt buộc điền SĐT gồm 10 chữ số (Ví dụ: 0901234567). Hệ thống sẽ tự động bù số 0 đầu nếu Excel làm mất.'],
        ['3. Email, Mã số thuế & Địa chỉ:', 'Tùy chọn. Có thể để trống nếu chưa có thông tin.'],
        ['4. Lưu ý về tên cột:', 'TUYỆT ĐỐI không thay đổi tiêu đề dòng 1 ở Sheet 1 ("Tên khách hàng", "Số điện thoại", "Email", "Mã số thuế", "Địa chỉ").'],
        ['5. Lưu ý dữ liệu mẫu:', 'Dữ liệu ở Sheet 1 chỉ là mẫu tham khảo, hãy thay thế bằng thông tin thực tế trước khi tải lên hệ thống.']
      ];

      guidelines.forEach((guideline) => {
        const row = worksheet2.addRow(guideline);
        row.height = 30;
        row.getCell(1).font = { name: 'Arial', bold: true, color: { argb: 'FFFF0000' } };
        row.getCell(1).alignment = { vertical: 'middle' };
        row.getCell(2).font = { name: 'Arial', italic: true };
        row.getCell(2).alignment = { vertical: 'middle', wrapText: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Mau_Nhap_Khach_Hang.xlsx');
      message.success('Tải file mẫu khách hàng kèm hướng dẫn thành công!');
    } catch (err) {
      console.error('Download template error:', err);
      message.error('Không thể tạo file mẫu Excel');
    }
  };

  /* ================= AI IMPORT LOGIC ================= */
  const handleAIImport = (file) => {
    const reader = new FileReader();
    setImportLoading(true);

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log("1. Dữ liệu thô từ Excel:", rawData);

        const processedData = rawData.map((item, index) => {
          let phone = String(item['Điện thoại'] || item['Số điện thoại'] || item['SDT'] || '').replace(/\D/g, '');
          if (phone.length === 9 && phone.startsWith('9') || phone.length === 9) {
            phone = '0' + phone;
          }

          return {
            name: (item['Tên khách hàng'] || item['Khách hàng'] || item['Name'])?.toString().trim(),
            phone: phone,
            email: item['Email']?.toString().trim(),
            taxCode: (item['Mã số thuế'] || item['MST'] || item['TaxCode'])?.toString().trim(),
            address: (item['Địa chỉ'] || item['Address'])?.toString().trim(),
            originalLine: index + 2
          };
        });

        const validData = processedData.filter(item => item.name && /^0\d{9}$/.test(item.phone));
        const invalidData = processedData.filter(item => !item.name || !/^0\d{9}$/.test(item.phone));

        console.log("2. Danh sách khách hàng hợp lệ:");
        console.table(validData);

        if (invalidData.length > 0) {
          console.warn("3. Danh sách dòng bị lỗi/bỏ qua:", invalidData);
        }

        if (validData.length === 0) {
          throw new Error('Không có dữ liệu hợp lệ. Kiểm tra cột "Tên khách hàng" và "Điện thoại"');
        }

        const res = await aiBulkImport(validData);
        const { createdCount, updatedCount, errors } = res.data.data;

        Modal.success({
          title: 'Kết quả AI Import Khách Hàng',
          content: (
            <div>
              <p>Thêm mới thành công: <b>{createdCount}</b></p>
              <p>Cập nhật thông tin: <b>{updatedCount}</b></p>
              {errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-500 font-semibold">Các dòng bị lỗi trên Server:</p>
                  <ul className="max-h-40 overflow-y-auto text-xs text-red-400">
                    {errors.map((err, i) => (
                      <li key={i}>- {err.name}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
        });

        fetchCustomers('', 1, pagination.pageSize);
      } catch (err) {
        console.error("Lỗi Import:", err);
        message.error(err.message || 'Lỗi xử lý file Excel');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  /* ================= EXCEL MENU ITEMS ================= */
  const excelMenuItems = [
    {
      key: 'download_template',
      label: <span style={{ fontWeight: 600 }}>Tải file mẫu Excel</span>,
      icon: <DownloadOutlined />,
      onClick: downloadTemplate
    },
    {
      type: 'divider'
    },
    {
      key: 'import_excel',
      label: (
        <Upload
          accept=".xlsx, .xls"
          showUploadList={false}
          beforeUpload={handleAIImport}
          disabled={importLoading}
          style={{ width: '100%' }}
        >
          <div style={{ width: '100%', fontWeight: 600 }}>Import Excel Khách hàng</div>
        </Upload>
      ),
      icon: <FileExcelOutlined />
    }
  ];

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

  /* ================= TABLE ================= */
  const columns = [
    {
      title: 'Tên khách hàng',
      dataIndex: 'name'
    },
    {
      title: 'SĐT',
      dataIndex: 'phone'
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
        val ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Không hoạt động</Tag>
    },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space wrap>
          {record.isActive && (
            <Button
              size="small"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpenModal(true);
              }}
            >
              Sửa
            </Button>
          )}

          {record.isActive ? (
            <Button
              danger
              size="small"
              onClick={() => handleDelete(record._id)}
            >
              Huỷ
            </Button>
          ) : (
            <Space size="small">
              <Button
                size="small"
                type="dashed"
                onClick={() => handleRestore(record._id)}
              >
                Khôi phục
              </Button>
              <Popconfirm
                title="Bạn có chắc chắn muốn xoá vĩnh viễn khách hàng này khỏi hệ thống?"
                onConfirm={() => handleDelete(record._id)}
                okButtonProps={{ danger: true }}
                okText="Xoá"
                cancelText="Huỷ"
              >
                <Button danger size="small">
                  Xoá
                </Button>
              </Popconfirm>
            </Space>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <Input
            placeholder="Tìm theo tên / SĐT / Mã KH"
            prefix={<SearchOutlined />}
            allowClear
            className="flex-1"
            style={{ borderRadius: '20px' }}
            onChange={(e) => {
              const val = e.target.value;
              setSearchKeyword(val);
              debounceSearch(val);
            }}
          />

          <Select
            className="w-full sm:w-44"
            style={{ borderRadius: '20px' }}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'INACTIVE', label: 'Không hoạt động' }
            ]}
          />
        </div>

        <Space wrap>
          {/* Menu thao tác Excel chuẩn giống trang Sản phẩm */}
          <Dropdown
            menu={{ items: excelMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              loading={importLoading}
              className="text-white bg-[#1D6F42] border-[#1D6F42] 
                         hover:!bg-[#278950] hover:!text-white hover:!border-[#278950] 
                         focus:!bg-[#1D6F42] focus:!text-white focus:!border-[#1D6F42]
                         active:!bg-[#155231] 
                         transition-all duration-200"
            >
              Thao tác Excel <DownOutlined />
            </Button>
          </Dropdown>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpenModal(true);
            }}
          >
            Thêm thủ công
          </Button>
        </Space>
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
                    {customer.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {customer.phone}
                  </div>
                </div>

                <Tag color={customer.isActive ? 'green' : 'red'}>
                  {customer.isActive ? 'Hoạt động' : 'Không hoạt động'}
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
                const val = e.target.value || '';
                e.target.value = val.replace(/\D/g, '');
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
