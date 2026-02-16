import axiosClient from '../api/axiosClient';

export const login = (data) => {
    console.log('AuthService Login Data:', data);
    return axiosClient.post('/auth/login', data);
};

export const changePassword = (data) => {
    console.log('AuthService Change Password Data:', data);
    return axiosClient.patch('/auth/change-password', data);
};
