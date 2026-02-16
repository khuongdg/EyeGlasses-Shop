import axiosClient from '../api/axiosClient';

/**
 * Lấy thông tin công ty
 * GET /company
 */
export const getCompanyInfo = ({ isActive }) => {
  const params = {};
  if (isActive !== undefined) {
    params.isActive = isActive;
  }
  return axiosClient.get('/company', { params });
};

/**
 * Tạo thông tin công ty
 * POST /company/create
 */
export const createCompany = (data) => {
  return axiosClient.post('/company/create', data);
};

/**
 * Cập nhật thông tin công ty
 * PATCH /company/:companyId
 */
export const updateCompany = (companyId, data) => {
  return axiosClient.patch(`/company/${companyId}`, data);
};

/**
 * Xoá (soft delete) công ty
 * DELETE /company/:companyId
 */
export const deleteCompany = (companyId) => {
  return axiosClient.delete(`/company/${companyId}`);
};

/**
 * Khôi phục công ty
 * PATCH /company/:companyId/restore
 */
export const restoreCompany = (companyId) => {
  return axiosClient.patch(`/company/${companyId}/restore`);
};
