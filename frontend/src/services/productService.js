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

export const createVariant = (productId, data) => {
  return axiosClient.post(`/products/${productId}/variants/create`, data);
};

export const updateVariant = (productId, variantId, data) => {
  return axiosClient.patch(`/products/${productId}/variants/${variantId}`, data);
};

export const deleteVariant = (productId, variantId) => {
  return axiosClient.delete(`/products/${productId}/variants/${variantId}`);
};

export const restoreVariant = (productId, variantId) => {
  return axiosClient.patch(`/products/${productId}/variants/${variantId}/restore`);
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
