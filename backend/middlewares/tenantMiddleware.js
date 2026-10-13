const { tenantStorage } = require('../database/tenantManager');

exports.tenantMiddleware = (req, res, next) => {
  // Ưu tiên đọc dbName từ req.user (do authMiddleware giải mã từ JWT Token)
  // Nếu không có, mặc định kết nối vào 'invoice_db' (Thuận Thiên)
  const dbName = req.user?.dbName || 'invoice_db';
  const tenantSlug = req.user?.tenantSlug || 'thuanthien';

  tenantStorage.run({ dbName, tenantSlug }, () => {
    next();
  });
};
