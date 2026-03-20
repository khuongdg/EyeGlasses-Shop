import axiosClient from '../api/axiosClient';

export const getProducts = (params) => {
  return axiosClient.get('/products', { params });
};

export const createProduct = (data) => {
  return axiosClient.post('/products/create', data);
};

export const updateProduct = (id, data) => {
  return axiosClient.patch(`/products/${id}`, data);
};

export const deleteProduct = (id) => {
  return axiosClient.delete(`/products/${id}`);
};

export const restoreProduct = (id) => {
  return axiosClient.patch(`/products/${id}/restore`);
};

export const getProductDetail = (slug) => {
  return axiosClient.get(`/products/${slug}/variants`);
};

export const createVariant = (slug, data) => {
  return axiosClient.post(`/products/${slug}/variants/create`, data);
};

export const updateVariant = (slug, variantId, data) => {
  return axiosClient.patch(`/products/${slug}/variants/${variantId}`, data);
};

export const deleteVariant = (slug, variantId) => {
  return axiosClient.delete(`/products/${slug}/variants/${variantId}`);
};

export const restoreVariant = (slug, variantId) => {
  return axiosClient.patch(`/products/${slug}/variants/${variantId}/restore`);
};

export const searchProducts = ({ keyword, page, limit }) => {
  return axiosClient.get('/products/search', {
    params: {
      keyword: keyword?.trim(),
      page,
      limit
    }
  });
}

/**
 * AI Bulk Import: Gửi danh sách sản phẩm từ Excel lên để xử lý thông minh
 * @param {Array} productList - Danh sách sản phẩm đã chuẩn hóa từ Excel
 */
export const aiBulkImport = async (productList) => {
  const url = '/products/ai-import';
  return axiosClient.post(url, { products: productList });
};