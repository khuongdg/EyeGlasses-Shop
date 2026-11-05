import axiosClient from '../api/axiosClient';

export const getDisposals = (params) => {
    return axiosClient.get('/disposals', { params });
};

export const getDisposalById = (id) => {
    return axiosClient.get(`/disposals/${id}`);
};

export const createDisposal = (data) => {
    return axiosClient.post('/disposals/create', data);
};

export const deleteDisposal = (id) => {
    return axiosClient.delete(`/disposals/${id}`);
};

