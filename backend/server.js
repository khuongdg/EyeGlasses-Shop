const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Cấu hình CORS cho phép gửi nhận cookie (credentials: true)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://eye-glasses-shop.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (như curl hoặc mobile apps)
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
  apis: ['./routes/*.js'], // Quét tài liệu mô tả từ các file route
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});