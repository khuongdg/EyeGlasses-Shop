const { getActiveConnection, getTenantConnection } = require('./tenantManager');

// Khởi tạo sẵn kết nối mặc định cho invoice_db (Thuận Thiên)
const defaultConn = getTenantConnection('invoice_db');

// Proxy đối tượng connection để khi gọi phương thức (như startSession, model, v.v...)
// nó sẽ tự động chạy trên Active Connection của Tenant tương ứng với Request đó
const invoiceConnectionProxy = new Proxy(defaultConn, {
  get(target, prop, receiver) {
    const activeConn = getActiveConnection();
    const value = Reflect.get(activeConn, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeConn);
    }
    return value;
  }
});

module.exports = invoiceConnectionProxy;