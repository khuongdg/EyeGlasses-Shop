import axiosClient from '../api/axiosClient';

/**
 * Lấy danh sách variant theo product
 */
export const getVariants = (params = {}) => {
    return axiosClient.get(`/products/variants`, { params });
};

/**
 * Tạo variant cho product
 * qrCode sẽ được backend tự sinh
 */
export const createVariant = (productId, data) => {
    return axiosClient.post(
        `/products/${productId}/variants/create`,
        data
    );
};

/**
 * Cập nhật variant
 */
export const updateVariant = (variantId, data) => {
    return axiosClient.patch(`/variants/${variantId}`, data);
};

/**
 * Soft delete variant
 */
export const deleteVariant = (variantId) => {
    return axiosClient.delete(`/variants/${variantId}`);
};

/**
 * Restore variant
 */
export const restoreVariant = (variantId) => {
    return axiosClient.patch(`/variants/${variantId}/restore`);
};

/**
 * Search variant theo SKU
 */
export const searchVariants = (params = {}) => {
    return axiosClient.get('/variants/search', { params });
};
