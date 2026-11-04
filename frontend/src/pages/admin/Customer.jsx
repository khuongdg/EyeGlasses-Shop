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
  Popconfirm,
  Tooltip,
  Card,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  FileExcelOutlined,
  SearchOutlined,
  DownloadOutlined,
  DownOutlined,
  ExportOutlined,
  HistoryOutlined,
  EyeOutlined
} from '@ant-design/icons';
import debounce from 'lodash/debounce';

import {
  getCustomers,
  searchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  aiBulkImport,
  getCustomerInvoices
} from '../../services/customerService';
import VietnamAddressInput from '../../components/VietnamAddressInput';
import InvoiceDetails from './InvoiceDetails';

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
  const [exportLoading, setExportLoading] = useState(false);

  /* ================= LỊCH SỬ MUA HÀNG ================= */
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyInvoices, setHistoryInvoices] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStats, setHistoryStats] = useState({ totalOrders: 0, totalSpent: 0, totalQuantity: 0 });
  const [historyPagination, setHistoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchCustomerHistory = async (customer, page = 1, pageSize = 10) => {
    if (!customer) return;
    setHistoryLoading(true);
    try {
      const res = await getCustomerInvoices(customer._id, {
        page,
        limit: pageSize
      });
      setHistoryInvoices(res.data.data || []);
      setHistoryPagination({
        current: page,
        pageSize,
        total: res.data.total || 0
      });
      if (res.data.stats) {
        setHistoryStats(res.data.stats);
      } else {
        const activeList = (res.data.data || []).filter(inv => inv.isActive !== false);
        setHistoryStats({
          totalOrders: activeList.length,
          totalSpent: activeList.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
          totalQuantity: activeList.reduce((sum, inv) => sum + (inv.totalQuantity || 0), 0)
        });
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử mua hàng:', err);
      message.error('Không thể tải lịch sử mua hàng');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (customer) => {
    setHistoryCustomer(customer);
    setIsHistoryOpen(true);
    fetchCustomerHistory(customer, 1, 10);
  };

  const handleViewInvoiceDetail = (invoice) => {
    setSelectedInvoiceForDetail(invoice);
    setIsDetailOpen(true);
  };

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
        { header: 'Tỉnh / Thành phố', key: 'province', width: 24 },
        { header: 'Phường / Xã', key: 'ward', width: 22 },
        { header: 'Địa chỉ cụ thể', key: 'street', width: 32 },
      ];
      worksheet1.spliceRows(1, 1);

      const headerRow = worksheet1.addRow([
        'Tên khách hàng',
        'Số điện thoại',
        'Email',
        'Mã số thuế',
        'Tỉnh / Thành phố',
        'Phường / Xã',
        'Địa chỉ cụ thể'
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
        ['Nguyễn Văn A', '0901234567', 'nguyenvana@gmail.com', '0312345678', 'Thành phố Hồ Chí Minh', 'Phường Bến Thành', '123 Nguyễn Trãi'],
        ['Trần Thị B', '0987654321', 'tranthib@gmail.com', '', 'Thành phố Hà Nội', 'Phường Dịch Vọng', '456 Cầu Giấy'],
        ['Mắt Kính Việt Long', '0912345678', 'contact@vietlong.com', '0309876543', 'Tỉnh Tây Ninh', 'Phường 1', '789 Trần Hưng Đạo']
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
        ['3. Email & Mã số thuế:', 'Tùy chọn. Có thể để trống nếu chưa có thông tin.'],
        ['4. Địa chỉ khách hàng:', 'Chia thành 3 cột: "Tỉnh / Thành phố", "Phường / Xã" và "Địa chỉ cụ thể" (Số nhà, tên đường). Hệ thống sẽ tự động kết hợp thành địa chỉ hoàn chỉnh.'],
        ['5. Lưu ý về tên cột:', 'TUYỆT ĐỐI không thay đổi tiêu đề dòng 1 ở Sheet 1 ("Tên khách hàng", "Số điện thoại", "Email", "Mã số thuế", "Tỉnh / Thành phố", "Phường / Xã", "Địa chỉ cụ thể").'],
        ['6. Lưu ý dữ liệu mẫu:', 'Dữ liệu ở Sheet 1 chỉ là mẫu tham khảo, hãy thay thế bằng thông tin thực tế trước khi tải lên hệ thống.']
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

          // Xử lý lấy địa chỉ từ các cột phân tách mới hoặc cột địa chỉ cũ
          const province = (item['Tỉnh / Thành phố'] || item['Tỉnh/Thành phố'] || item['Tỉnh'] || item['Thành phố'] || item['Province'])?.toString().trim();
          const ward = (item['Phường / Xã'] || item['Phường/Xã'] || item['Phường'] || item['Xã'] || item['Ward'])?.toString().trim();
          const street = (item['Địa chỉ cụ thể'] || item['Số nhà'] || item['Số nhà, tên đường'] || item['Street'])?.toString().trim();

          let address = '';
          if (province || ward || street) {
            address = [street, ward, province].filter(Boolean).join(', ');
          } else {
            address = (item['Địa chỉ'] || item['Address'])?.toString().trim() || '';
          }

          return {
            name: (item['Tên khách hàng'] || item['Khách hàng'] || item['Name'])?.toString().trim(),
            phone: phone,
            email: item['Email']?.toString().trim(),
            taxCode: (item['Mã số thuế'] || item['MST'] || item['TaxCode'])?.toString().trim(),
            address: address,
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

  /* ================= EXPORT KHÁCH HÀNG EXCEL ================= */
  const exportCustomersToExcel = async () => {
    setExportLoading(true);
    try {
      const params = { limit: 100000 };
      if (searchKeyword) params.keyword = searchKeyword;
      if (statusFilter !== 'ALL') params.isActive = statusFilter === 'ACTIVE';

      const res = await getCustomers(params);
      const customerList = res.data.data || [];

      if (customerList.length === 0) {
        message.warning('Không có dữ liệu khách hàng để xuất!');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('DanhSach_KhachHang');

      // 1. Cấu hình độ rộng các cột (giống file mẫu kèm cột STT ở đầu)
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Tên khách hàng', key: 'name', width: 25 },
        { header: 'Số điện thoại', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Mã số thuế', key: 'taxCode', width: 18 },
        { header: 'Tỉnh / Thành phố', key: 'province', width: 24 },
        { header: 'Phường / Xã', key: 'ward', width: 22 },
        { header: 'Địa chỉ cụ thể', key: 'street', width: 32 },
      ];
      worksheet.spliceRows(1, 1);

      // 2. Dòng tiêu đề cột (định dạng xanh lá đặc trưng của file mẫu)
      const headerRow = worksheet.addRow([
        'STT',
        'Tên khách hàng',
        'Số điện thoại',
        'Email',
        'Mã số thuế',
        'Tỉnh / Thành phố',
        'Phường / Xã',
        'Địa chỉ cụ thể'
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

      // 3. Đổ dữ liệu khách hàng
      customerList.forEach((c, idx) => {
        let province = '';
        let ward = '';
        let street = '';

        if (c.address) {
          const parts = c.address.split(',').map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 3) {
            province = parts[parts.length - 1];
            ward = parts[parts.length - 2];
            street = parts.slice(0, parts.length - 2).join(', ');
          } else if (parts.length === 2) {
            province = parts[1];
            ward = '';
            street = parts[0];
          } else {
            street = c.address;
          }
        }

        const r = worksheet.addRow([
          idx + 1,
          c.name || '',
          c.phone || '',
          c.email || '',
          c.taxCode || '',
          province,
          ward,
          street
        ]);
        r.height = 22;

        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }; // STT
        r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };   // Tên
        r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }; // SĐT
        r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };   // Email
        r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }; // MST
        r.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };   // Tỉnh/TP
        r.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };   // Phường/Xã
        r.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };   // Địa chỉ cụ thể

        r.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // 4. Xuất file về máy
      const buffer = await workbook.xlsx.writeBuffer();
      const dateStr = new Date().toISOString().slice(0, 10);
      saveAs(new Blob([buffer]), `Danh_Sach_Khach_Hang_${dateStr}.xlsx`);
      message.success('Xuất thông tin khách hàng thành công!');
    } catch (err) {
      console.error('Lỗi xuất Excel khách hàng:', err);
      message.error('Không thể xuất thông tin khách hàng ra file Excel');
    } finally {
      setExportLoading(false);
    }
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
          disabled={importLoading || exportLoading}
          style={{ width: '100%' }}
        >
          <div style={{ width: '100%', fontWeight: 600 }}>Import Excel Khách hàng</div>
        </Upload>
      ),
      icon: <FileExcelOutlined />
    },
    {
      type: 'divider'
    },
    {
      key: 'export_excel',
      label: <span style={{ fontWeight: 600 }}>Xuất thông tin khách hàng</span>,
      icon: <ExportOutlined />,
      onClick: exportCustomersToExcel
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
      dataIndex: 'name',
      render: (name, record) => (
        <Tooltip title="Nhấn để xem lịch sử mua hàng">
          <span
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-1.5"
            onClick={() => handleOpenHistory(record)}
          >
            {name}
          </span>
        </Tooltip>
      )
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
      align: 'center',
      render: (_, record) => (
        <Space wrap>
          <Tooltip title="Xem lịch sử mua hàng">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleOpenHistory(record)}
            >
              Lịch sử
            </Button>
          </Tooltip>

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
              loading={importLoading || exportLoading}
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
                  <div
                    className="font-semibold text-base text-blue-600 cursor-pointer hover:underline flex items-center gap-1.5"
                    onClick={() => handleOpenHistory(customer)}
                  >
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
                  icon={<HistoryOutlined />}
                  onClick={() => handleOpenHistory(customer)}
                >
                  Lịch sử mua
                </Button>

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
        onCancel={() => {
          setOpenModal(false);
          setEditing(null);
          form.resetFields();
        }}
        okText="Lưu"
        cancelText="Huỷ"
        width="90%"
        style={{ maxWidth: 640 }}
        destroyOnClose
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
            <VietnamAddressInput placeholder="Số nhà, tên đường, khu phố..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL LỊCH SỬ MUA HÀNG */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base sm:text-lg">
            <HistoryOutlined className="text-blue-600" />
            <span>
              Lịch sử mua hàng - <span className="text-blue-600 font-bold">{historyCustomer?.name}</span>
            </span>
          </div>
        }
        open={isHistoryOpen}
        onCancel={() => setIsHistoryOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsHistoryOpen(false)}>
            Đóng
          </Button>
        ]}
        width="95%"
        style={{ maxWidth: 1000 }}
        destroyOnClose
      >
        {historyCustomer && (
          <div className="space-y-4 pt-2">
            {/* THÔNG TIN KHÁCH HÀNG */}
            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-500">SĐT:</span>{' '}
                  <strong className="text-gray-800">{historyCustomer.phone || 'Chưa có'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">MST:</span>{' '}
                  <strong className="text-gray-800">{historyCustomer.taxCode || 'Chưa có'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{' '}
                  <strong className="text-gray-800">{historyCustomer.email || 'Chưa có'}</strong>
                </div>
              </div>
              <div className="pt-1.5 border-t border-gray-200/60">
                <span className="text-gray-500">Địa chỉ:</span>{' '}
                <strong className="text-gray-800 break-words leading-relaxed">{historyCustomer.address || 'Chưa có'}</strong>
              </div>
            </div>

            {/* THỐNG KÊ MUA HÀNG */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card size="small" className="border-blue-100 bg-blue-50/40">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Tổng số phiếu xuất</span>}
                  value={historyStats.totalOrders || 0}
                  suffix="phiếu"
                  valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                />
              </Card>
              <Card size="small" className="border-purple-100 bg-purple-50/40">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Tổng sản phẩm đã mua</span>}
                  value={historyStats.totalQuantity || 0}
                  suffix="cái"
                  valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                />
              </Card>
              <Card size="small" className="border-green-100 bg-green-50/40">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Tổng tiền chi tiêu</span>}
                  value={(historyStats.totalSpent || 0).toLocaleString('vi-VN')}
                  suffix="đ"
                  valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                />
              </Card>
            </div>

            {/* BẢNG PHIẾU XUẤT KHO CỦA KHÁCH */}
            <Table
              rowKey="_id"
              loading={historyLoading}
              dataSource={historyInvoices}
              scroll={{ x: 'max-content' }}
              pagination={{
                current: historyPagination.current,
                pageSize: historyPagination.pageSize,
                total: historyPagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20'],
                onChange: (page, pageSize) => {
                  fetchCustomerHistory(historyCustomer, page, pageSize);
                }
              }}
              columns={[
                {
                  title: 'Mã phiếu',
                  dataIndex: 'invoiceCode',
                  key: 'invoiceCode',
                  render: (code, record) => (
                    <span
                      onClick={() => handleViewInvoiceDetail(record)}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {code}
                    </span>
                  )
                },
                {
                  title: 'Ngày mua',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date) => (date ? new Date(date).toLocaleString('vi-VN') : '—')
                },
                {
                  title: 'Nhân viên bán',
                  dataIndex: 'staffName',
                  key: 'staffName',
                  render: (name) => name || '—'
                },
                {
                  title: 'Số lượng',
                  dataIndex: 'totalQuantity',
                  key: 'totalQuantity',
                  align: 'center',
                  render: (q) => <Tag color="blue">{q || 0}</Tag>
                },
                {
                  title: 'Tổng tiền',
                  dataIndex: 'totalAmount',
                  key: 'totalAmount',
                  align: 'right',
                  render: (amount) => (
                    <strong className="text-green-600">
                      {amount != null ? `${amount.toLocaleString('vi-VN')} đ` : '—'}
                    </strong>
                  )
                },
                {
                  title: 'Thanh toán',
                  dataIndex: 'paymentMethod',
                  key: 'paymentMethod',
                  align: 'center',
                  render: (method) => {
                    switch (method) {
                      case 'CASH':
                        return <Tag color="blue">Tiền mặt</Tag>;
                      case 'TRANSFER':
                        return <Tag color="cyan">Chuyển khoản</Tag>;
                      case 'DEBT':
                        return <Tag color="orange">Công nợ</Tag>;
                      default:
                        return <Tag>{method || 'Chưa rõ'}</Tag>;
                    }
                  }
                },
                {
                  title: 'Trạng thái',
                  key: 'status',
                  align: 'center',
                  render: (_, record) => {
                    // Nếu phiếu đã bị hủy
                    if (record.isActive === false) {
                      return <Tag color="default">Đã huỷ</Tag>;
                    }

                    // Nếu là Công nợ: hiển thị mức hoàn thành giống mục Quản lý Công nợ
                    if (record.paymentMethod === 'DEBT') {
                      const debtStatus = record.debt?.status;
                      if (debtStatus === 'COMPLETED') {
                        return <Tag color="green">Hoàn thành</Tag>;
                      }
                      if (debtStatus === 'PARTIAL') {
                        const paid = (record.debt?.paidAmount || 0).toLocaleString('vi-VN');
                        const remaining = (record.debt?.remainingAmount || 0).toLocaleString('vi-VN');
                        return (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <Tag color="orange" className="!mr-0">Trả một phần</Tag>
                            <span className="text-xs text-red-500 font-semibold whitespace-nowrap">
                              Còn nợ: {remaining}₫
                            </span>
                          </div>
                        );
                      }
                      if (debtStatus === 'CANCELLED') {
                        return <Tag color="default">Đã huỷ</Tag>;
                      }
                      return <Tag color="red">Chưa trả</Tag>;
                    }

                    // Tiền mặt / Chuyển khoản: đã hoàn thành thanh toán
                    if (record.paymentMethod === 'CASH' || record.paymentMethod === 'TRANSFER') {
                      return <Tag color="green">Hoàn thành</Tag>;
                    }

                    // Hàng mẫu / Không thu tiền
                    if (record.isSample || record.paymentMethod === 'NONE') {
                      return <Tag color="blue">Hàng mẫu</Tag>;
                    }

                    return <Tag color="green">Hoàn thành</Tag>;
                  }
                },
                {
                  title: 'Thao tác',
                  key: 'action',
                  align: 'center',
                  render: (_, record) => (
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewInvoiceDetail(record)}
                    >
                      Chi tiết
                    </Button>
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* MODAL CHI TIẾT PHIẾU XUẤT KHO */}
      <InvoiceDetails
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        data={selectedInvoiceForDetail}
      />
    </div>
  );
};

export default Customer;
