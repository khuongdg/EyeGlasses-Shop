import axiosClient from '../api/axiosClient';

export const getStaffs = (params) => {
    return axiosClient.get('/staffs', { params });
}

export const createStaff = (data) => {
    return axiosClient.post('/staffs/create', data);
};

export const updateStaff = (id, data) => {
    return axiosClient.patch(`/staffs/${id}`, data);
};

export const deleteStaff = (id) => {
    return axiosClient.delete(`/staffs/${id}`);
};

export const restoreStaff = (id) => {
    return axiosClient.patch(`/staffs/${id}/restore`);
};

export const searchStaffs = ({ keyword, page, limit, isActive }) => {
    return axiosClient.get('/staffs/search', {
        params: {
            keyword: typeof keyword === 'string' ? keyword.trim() : undefined,
            page,
            limit,
            isActive
        }
    });
}