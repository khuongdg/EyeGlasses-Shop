import axiosClient from '../api/axiosClient';

export const getCustomers = (params) => {
    return axiosClient.get('/customers', { params });
}

export const createCustomer = (data) => {
    return axiosClient.post('/customers/create', data);
};

export const updateCustomer = (id, data) => {
    return axiosClient.patch(`/customers/${id}`, data);
};

export const deleteCustomer = (id) => {
    return axiosClient.delete(`/customers/${id}`);
};

export const restoreCustomer = (id) => {
    return axiosClient.patch(`/customers/${id}/restore`);
};

export const searchCustomers = ({ keyword, page, limit }) => {
    return axiosClient.get('/customers/search', {
        params: {
            keyword: keyword?.trim(),
            page,
            limit
        }
    });
}