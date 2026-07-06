import axiosClient from '../api/axiosClient';

export const login = (data) => {
    return axiosClient.post('/auth/login', data);
};

export const changePassword = (data) => {
    return axiosClient.patch('/auth/change-password', data);
};

export const logout = () => {
    return axiosClient.post('/auth/logout');
};
