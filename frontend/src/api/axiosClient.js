import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 1. Request Interceptor: Gắn token vào Header trước khi gửi yêu cầu
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. Response Interceptor: Xử lý kết quả trả về và bắt lỗi Token
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về dữ liệu nếu yêu cầu thành công
    return response;
  },
  (error) => {
    // Kiểm tra nếu lỗi trả về là 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      const errorMessage = error.response.data?.message || "";

      // Kiểm tra cụ thể các thông báo liên quan đến Token
      if (errorMessage.includes("Invalid token") || errorMessage.includes("expired")) {
        // Xóa thông tin cũ để tránh vòng lặp lỗi
        localStorage.removeItem('token');
        localStorage.removeItem('role');

        // Thông báo cho người dùng
        console.error("Phiên làm việc hết hạn hoặc Token không hợp lệ.");

        // Điều hướng về trang login nếu không phải đang ở trang login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;