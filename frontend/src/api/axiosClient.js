import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Cho phép truyền nhận cookie (refreshToken)
});

// Request Interceptor: Gắn token vào Header trước khi gửi yêu cầu
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Quản lý trạng thái Refresh Token để tránh gọi trùng lặp nhiều lần
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Xử lý kết quả và tự động refresh token khi hết hạn
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra nếu lỗi 401 (Unauthorized) và chưa từng retry request này
    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      const errorMessage = error.response.data?.message || "";
      
      // Không tiến hành làm mới token nếu request ban đầu là API Login hoặc Refresh
      const isAuthRequest = originalRequest.url && (
        originalRequest.url.includes('/auth/login') || 
        originalRequest.url.includes('/auth/refresh')
      );

      if (!isAuthRequest) {
        if (isRefreshing) {
          // Nếu đang có tiến trình làm mới token chạy, xếp request này vào hàng đợi
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosClient(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Gọi API refresh token (sử dụng axios gốc để tránh trigger interceptor của axiosClient)
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );

          if (res.data && res.data.success) {
            const newToken = res.data.data.token;
            localStorage.setItem('token', newToken);

            // Cập nhật Authorization cho request gốc
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Giải phóng hàng đợi và thực hiện lại tất cả request lỗi
            processQueue(null, newToken);
            isRefreshing = false;

            return axiosClient(originalRequest);
          }
        } catch (refreshError) {
          // Nếu làm mới thất bại (Refresh Token hết hạn), đăng xuất người dùng
          processQueue(refreshError, null);
          isRefreshing = false;

          localStorage.removeItem('token');
          localStorage.removeItem('role');

          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;