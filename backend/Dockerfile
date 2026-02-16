# Sử dụng Node.js bản LTS làm base image
FROM node:20-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy các file package để cài đặt dependencies trước (tối ưu cache)
COPY package*.json ./

# Cài đặt các thư viện (chỉ cài production để giảm dung lượng image)
RUN npm install --production

# Copy toàn bộ mã nguồn backend vào container
COPY . .

# Mở cổng 3000 (cổng mà server.js của bạn đang chạy)
EXPOSE 3000

# Lệnh khởi chạy server
CMD ["node", "server.js"]