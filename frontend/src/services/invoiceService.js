import axiosClient from '../api/axiosClient';

/**
 * Lấy danh sách phiếu xuất kho
 * Có thể mở rộng sau: search, page, dateFrom, dateTo...
 */
export const getInvoices = (params) => {
  return axiosClient.get('/invoices', { params });
};

/**
 * Tạo phiếu xuất kho
 * payload phải khớp InvoiceSchema backend
 */
export const createInvoice = (data) => {
  return axiosClient.post('/invoices/create', data);
};

/**
 * Huỷ phiếu xuất kho (soft delete)
 */
export const cancelInvoice = (invoiceId) => {
  return axiosClient.delete(`/invoices/${invoiceId}/cancel`);
};


export const getDebts = (params) => {
  return axiosClient.get('/invoices/debts', { params });
};

export const payDebt = (debtId, data) => {
  return axiosClient.patch(`/invoices/debts/${debtId}/pay`, data);
};

/**
 * Lấy danh sách bản nháp từ database
 */
export const getDrafts = () => {
  return axiosClient.get('/invoices/drafts');
};

/**
 * Lưu bản nháp lên database
 * Nếu data có draftId → cập nhật, ngược lại → tạo mới
 */
export const saveDraft = (data) => {
  return axiosClient.post('/invoices/drafts', data);
};

/**
 * Xóa bản nháp khỏi database
 */
export const deleteDraftFromDB = (draftId) => {
  return axiosClient.delete(`/invoices/drafts/${draftId}`);
};

/**
 * Cập nhật ghi chú nội bộ (adminNote) của phiếu xuất kho
 */
export const updateInvoiceAdminNote = (invoiceId, adminNote) => {
  return axiosClient.patch(`/invoices/${invoiceId}/admin-note`, { adminNote });
};