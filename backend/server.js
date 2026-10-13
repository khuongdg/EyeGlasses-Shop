require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { tenantStorage, preloadTenantConnections } = require('./database/tenantManager');

const app = express();

// Cấu hình CORS cho phép gửi nhận cookie (credentials: true)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'https://eye-glasses-shop.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^http:\/\/localhost(:\d+)?$/.test(origin) || 
                      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
                      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
                      origin.endsWith('.vercel.app');
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Middleware tự chế giải mã cookie để đọc refreshToken từ request
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        req.cookies[name] = decodeURIComponent(value);
      }
    });
  }
  next();
});

app.use(express.json());
app.use(bodyParser.json());

// Global Multi-Tenant Context Resolver Middleware
// Tự động phân luồng Database context cho TẤT CẢ các API request (kể cả GET/Public)
app.use((req, res, next) => {
  let dbName = 'invoice_db';
  let tenantSlug = 'thuanthien';

  // 1. Đọc từ Authorization Bearer Token nếu có
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'glassshop_secret_key_2026');
      if (decoded.dbName) dbName = decoded.dbName;
      if (decoded.tenantSlug) tenantSlug = decoded.tenantSlug;
      req.user = decoded;
    } catch (err) {
      // Ignored invalid token on public routes
    }
  }

  // 2. Đọc từ Custom Header nếu có
  if (req.headers['x-tenant-id']) {
    const headerSlug = req.headers['x-tenant-id'];
    if (headerSlug === 'glassshop') {
      dbName = 'glass_shop_db';
      tenantSlug = 'glassshop';
    } else if (headerSlug === 'thuanthien') {
      dbName = 'invoice_db';
      tenantSlug = 'thuanthien';
    }
  }

  // Chạy toàn bộ xử lý Request trong context Database tương ứng
  tenantStorage.run({ dbName, tenantSlug }, () => {
    next();
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/products', require('./routes/productRoute'));
app.use('/api/customers', require('./routes/customerRoute'));
app.use('/api/company', require('./routes/companyRoute'));
app.use('/api/staffs', require('./routes/staffRoute'));
app.use('/api/invoices', require('./routes/invoiceRoute'));
app.use('/api/imports', require('./routes/importRoute'));
app.use('/api/dashboard', require('./routes/dashboardRoute'));

// Tự động ping giữ Backend Render không bị ngủ (Self-ping every 10 mins)
const https = require('https');
const http = require('http');
setInterval(() => {
  const backendUrl = process.env.RENDER_EXTERNAL_URL || 'https://eyeglasses-shop.onrender.com/api/health';
  if (backendUrl.startsWith('https')) {
    https.get(backendUrl, () => {}).on('error', () => {});
  } else {
    http.get(backendUrl, () => {}).on('error', () => {});
  }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;

// Cấu hình tài liệu API bằng Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mắt Kính Thuận Thiên API',
      version: '1.0.0',
      description: 'Tài liệu hướng dẫn sử dụng và kiểm thử API hệ thống Mắt Kính Thuận Thiên',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Mở kết nối trước cho tất cả các Tenant DBs để log hiển thị đầy đủ ngay khi khởi động
  preloadTenantConnections();
});