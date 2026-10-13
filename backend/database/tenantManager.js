const mongoose = require('mongoose');
const { AsyncLocalStorage } = require('async_hooks');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
require('dotenv').config();

// AsyncLocalStorage để lưu trữ context dbName của từng Request
const tenantStorage = new AsyncLocalStorage();

// Cache lưu trữ các Mongoose Connection theo dbName
const connectionCache = new Map();

// Registry lưu trữ toàn bộ Mongoose Schema trong hệ thống
const schemaRegistry = new Map();

// Danh sách các Tenant mặc định
const TENANTS = [
  { slug: 'thuanthien', dbName: 'invoice_db', name: 'Mắt Kính Thuận Thiên' },
  { slug: 'glassshop', dbName: 'glass_shop_db', name: 'Mắt Kính Việt Long' }
];

/**
 * Đăng ký Schema vào Registry toàn cục
 */
function registerSchema(modelName, schema) {
  if (modelName && schema && !schemaRegistry.has(modelName)) {
    schemaRegistry.set(modelName, schema);
  }
}

/**
 * Lấy ra DB Name hiện tại từ AsyncLocalStorage context, mặc định là 'invoice_db'
 */
function getActiveDbName() {
  const store = tenantStorage.getStore();
  return store?.dbName || 'invoice_db';
}

/**
 * Lấy hoặc khởi tạo Mongoose Connection cho một Database cụ thể
 * Đăng ký sẵn toàn bộ Schema lên Connection để các câu lệnh populate() hoạt động chính xác.
 */
function getTenantConnection(dbName = 'invoice_db') {
  let conn = connectionCache.get(dbName);

  if (!conn) {
    const baseUri = process.env.INVOICE_DB_URI || 'mongodb://localhost:27017/invoice_db';
    let uri = baseUri;

    if (uri.includes('/invoice_db')) {
      uri = uri.replace('/invoice_db', `/${dbName}`);
    } else {
      uri = uri.replace(/\.net\/([^?]*)/, `.net/${dbName}`);
    }

    conn = mongoose.createConnection(uri);

    conn.on('connected', () => {
      console.log(`[TenantManager] Connected to database: ${dbName}`);
    });

    conn.on('error', (err) => {
      console.error(`[TenantManager] Database ${dbName} connection error:`, err.message);
    });

    connectionCache.set(dbName, conn);
  }

  // Đăng ký toàn bộ Schema có sẵn lên Connection này để hỗ trợ .populate()
  for (const [modelName, schema] of schemaRegistry.entries()) {
    if (!conn.models[modelName]) {
      conn.model(modelName, schema);
    }
  }

  return conn;
}

/**
 * Mở kết nối trước cho tất cả các Tenant DB khi Server vừa khởi động
 */
function preloadTenantConnections() {
  TENANTS.forEach((tenant) => {
    getTenantConnection(tenant.dbName);
  });
}

/**
 * Lấy Connection hiện tại dựa trên Request context
 */
function getActiveConnection() {
  return getTenantConnection(getActiveDbName());
}

/**
 * Tạo Mongoose Model Proxy động theo Database context của từng Request
 */
function createTenantModelProxy(modelName, schema) {
  if (modelName && schema) {
    registerSchema(modelName, schema);
  }

  return new Proxy(function () {}, {
    // Xử lý khi gọi `new Model(...)`
    construct(target, args) {
      const conn = getActiveConnection();
      const Model = conn.models[modelName] || conn.model(modelName, schema);
      return new Model(...args);
    },
    // Xử lý các static methods (Model.find, Model.findOne, Model.create, Model.schema...)
    get(target, prop, receiver) {
      const conn = getActiveConnection();
      const Model = conn.models[modelName] || conn.model(modelName, schema);
      const value = Reflect.get(Model, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(Model);
      }
      return value;
    },
    // Xử lý khi gọi Model(...) trực tiếp
    apply(target, thisArg, args) {
      const conn = getActiveConnection();
      const Model = conn.models[modelName] || conn.model(modelName, schema);
      return Reflect.apply(Model, thisArg, args);
    }
  });
}

module.exports = {
  tenantStorage,
  getActiveDbName,
  getTenantConnection,
  getActiveConnection,
  createTenantModelProxy,
  registerSchema,
  preloadTenantConnections,
  TENANTS
};
