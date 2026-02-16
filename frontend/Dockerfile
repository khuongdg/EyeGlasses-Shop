# Stage 1: Build
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Chạy lệnh build của Vite để tạo thư mục 'dist'
RUN npm run build

# Stage 2: Production (Dùng Nginx để phục vụ file tĩnh)
FROM nginx:stable-alpine
# Copy file build từ stage trước vào thư mục mặc định của Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Mở cổng 80 cho web
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]